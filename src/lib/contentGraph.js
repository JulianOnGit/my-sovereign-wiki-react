// Content Connections graph model — the wiki, as a network.
//
// This mirrors the nlp-graph knowledge graph (documents → concepts → co-occurrence)
// but over the data the Pod already holds: every observation is a *content object*,
// every tag / lens / person it names is a *topic* node, and every attachment
// (image, PDF, doc) is a *file* node hanging off its observation. Content objects
// are wired to each other three ways:
//
//   • item → topic     the observation carries that tag / lens / mention
//   • item → item      an AI-drawn "related" link (see Organise)
//   • item → file      the observation has that attachment
//
// Two observations that share a topic are therefore connected *through* the topic
// node — the same shape nlp-graph uses to let a document reach another via a shared
// concept. The visualisation (ContentGraph.jsx) lays this out with live physics and,
// on click, brings a node to the centre and illuminates its direct connections.
//
// Files carry tags too. For now those tags come from the filename and the parent
// observation's own topics ("for images we can use metadata / filenames"); real
// content extraction / OCR is a later pass, so nothing here reads file bytes.

export function slug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function headline(item) {
  return (
    item.title ||
    (item.body || "").trim().split("\n")[0].slice(0, 72) ||
    "(observation)"
  );
}

// Best-effort filename from an attachment URL (strips query/hash, decodes %xx).
export function fileNameFromUrl(url) {
  try {
    const clean = String(url).split(/[?#]/)[0];
    const last = clean.replace(/\/+$/, "").split("/").pop() || clean;
    return decodeURIComponent(last);
  } catch {
    return String(url);
  }
}

// Coarse kind from the extension — drives node colour and the file glyph.
export function fileKind(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "heic"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["txt", "md", "markdown", "doc", "docx", "rtf", "odt"].includes(ext)) return "doc";
  return "file";
}

const STOP = new Set([
  "the", "and", "for", "with", "img", "image", "photo", "scan", "doc", "final",
  "copy", "new", "file", "download", "screenshot", "untitled", "version",
]);

// Derive tag-ish tokens from a filename: drop the extension, split on
// separators, keep only tokens that read like real words. CDN/encoded names
// (e.g. Amazon's `71i53mFNiUL._AC_UF1000,1000_QL80_.jpg`) must yield NOTHING —
// any token carrying a digit is code, not a word. This is the lightweight
// "tags from filename / metadata" step, ahead of real OCR.
const WORDISH = /^[a-z]{3,24}$/; // letters only — rejects ql80, uf1000, hashes
const hasVowel = (w) => /[aeiouy]/.test(w);

export function tagsFromFilename(name) {
  const base = String(name).replace(/\.[a-z0-9]+$/i, "");
  return [
    ...new Set(
      base
        .split(/[\s_\-.,+()[\]]+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => WORDISH.test(w) && hasVowel(w) && !STOP.has(w)),
    ),
  ].slice(0, 5);
}

// A stable hue per topic label, so a topic keeps its colour across renders and
// related topics stay visually distinct (nlp-graph colours by community; here we
// colour deterministically by the label so the mapping is legible and stable).
export function hueFor(label) {
  let h = 0;
  const s = String(label);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

const TYPE = {
  item: { baseRadius: 7 },
  topic: { baseRadius: 5 },
  file: { baseRadius: 6 },
};

/// Assemble the content graph from wiki items.
///
/// Options:
///   showTopics    include tag / lens / mention nodes (default true)
///   showFiles     include attachment nodes (default true)
///   minTopicDegree  drop topics referenced by fewer than N objects (leaf topics);
///                   like nlp-graph's min_concept_degree. "auto" (the default)
///                   adapts: topic-heavy graphs show only shared topics so the
///                   overview stays legible, small graphs show everything.
///                   Items are never dropped.
///
/// Returns { nodes, edges, byId, neighbors } where `neighbors` is
/// Map<nodeId, Set<nodeId>> for the click-to-illuminate highlight.
export function buildContentGraph(items, opts = {}) {
  const { showTopics = true, showFiles = true, minTopicDegree = "auto" } = opts;

  const nodes = new Map();
  const edges = [];
  const edgeSeen = new Set();
  const topicRefs = new Map(); // topic id -> Set of content-object ids (its degree)

  const addEdge = (a, b, kind) => {
    if (!a || !b || a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (edgeSeen.has(key)) return;
    edgeSeen.add(key);
    edges.push({ id: `e${edges.length}`, source: a, target: b, kind });
  };

  // Central junk guard: no topic node may be URL-ish, absurdly long, or a
  // code-like token (3+ consecutive digits, e.g. "uf1000") — whatever layer it
  // came from (user tags, AI entities, filenames).
  const junkTopic = (label) =>
    label.length < 2 ||
    label.length > 40 ||
    /https?:|[\\/]/.test(label) ||
    (!/\s/.test(label) && /\d{3,}/.test(label));

  const addTopic = (rawLabel, ownerId, subtype) => {
    const label = String(rawLabel || "").trim();
    if (!label || junkTopic(label)) return;
    const id = `topic:${slug(label)}`;
    if (!id.replace("topic:", "")) return;
    if (!nodes.has(id)) {
      nodes.set(id, { id, label, type: "topic", subtype, hue: hueFor(label) });
    }
    if (!topicRefs.has(id)) topicRefs.set(id, new Set());
    topicRefs.get(id).add(ownerId);
    addEdge(ownerId, id, "topic");
  };

  // ── Content objects (observations) + their files ──────────────────────────
  for (const item of items) {
    const id = `item:${item.id}`;
    nodes.set(id, {
      id,
      label: headline(item),
      type: "item",
      itemId: item.id,
      body: item.body || "",
      efflorescence: item.efflorescence || "",
      efflorescenceType: item.efflorescenceType || "",
      createdAt: item.createdAt,
      topics: [...new Set([...(item.tags || []), ...(item.lenses || []), ...(item.mentions || [])])],
      mediaCount: (item.media || []).length,
    });

    if (showTopics) {
      (item.tags || []).forEach((t) => addTopic(t, id, "tag"));
      (item.lenses || []).forEach((t) => addTopic(t, id, "lens"));
      (item.mentions || []).forEach((t) => addTopic(t, id, "person"));
    }

    if (showFiles) {
      (item.media || []).forEach((url, i) => {
        const name = fileNameFromUrl(url);
        const fid = `file:${item.id}:${i}`;
        const kind = fileKind(name);
        const fileTags = tagsFromFilename(name);
        // Encoded/CDN filenames carry no words — label those by what they are
        // and where they came from ("image · media-amazon.com") instead of the
        // raw token soup.
        let label = name;
        if (!fileTags.length && name.length > 20) {
          let host = "";
          try {
            host = new URL(url).host.replace(/^www\./, "");
          } catch {
            /* relative or odd URL — generic label below */
          }
          label = host ? `${kind} · ${host}` : `${kind} attachment`;
        }
        nodes.set(fid, {
          id: fid,
          label,
          type: "file",
          kind,
          url,
          parent: id,
          fileTags,
          // Files inherit their observation's topics plus any read off the filename.
          topics: [...new Set([...fileTags, ...(item.tags || [])])],
        });
        addEdge(id, fid, "file");
        // Merge the file into the topic graph via its filename-derived tags.
        if (showTopics) fileTags.forEach((t) => addTopic(t, fid, "tag"));
      });
    }
  }

  // ── Related links (item ↔ item), only where both ends are present ──────────
  const itemIds = new Set(items.map((i) => `item:${i.id}`));
  for (const item of items) {
    for (const r of item.related || []) {
      const target = `item:${r}`;
      if (itemIds.has(target)) addEdge(`item:${item.id}`, target, "related");
    }
  }

  // ── Prune leaf topics below the degree floor (keeps the overview legible) ──
  // "auto" mirrors nlp-graph: once single-use topics dominate the node count,
  // show only the shared ones by default.
  const floor = minTopicDegree === "auto" ? (topicRefs.size > 48 ? 2 : 1) : minTopicDegree;
  if (showTopics && floor > 1) {
    for (const [id, refs] of topicRefs) {
      if (refs.size < floor) nodes.delete(id);
    }
  }
  const kept = new Set(nodes.keys());
  const liveEdges = edges.filter((e) => kept.has(e.source) && kept.has(e.target));

  // ── Degrees, neighbours, radius ───────────────────────────────────────────
  const degree = new Map([...kept].map((id) => [id, 0]));
  const neighbors = new Map([...kept].map((id) => [id, new Set()]));
  for (const e of liveEdges) {
    degree.set(e.source, degree.get(e.source) + 1);
    degree.set(e.target, degree.get(e.target) + 1);
    neighbors.get(e.source).add(e.target);
    neighbors.get(e.target).add(e.source);
  }

  const nodeList = [...nodes.values()].map((n) => {
    const d = degree.get(n.id) || 0;
    const base = (TYPE[n.type] || TYPE.item).baseRadius;
    return { ...n, degree: d, radius: base + Math.min(3.4 * Math.sqrt(d), 16) };
  });

  return {
    nodes: nodeList,
    edges: liveEdges,
    byId: new Map(nodeList.map((n) => [n.id, n])),
    neighbors,
  };
}

// Small corpus stats for the header bar (mirrors nlp-graph's stat row).
export function graphStats(graph) {
  const counts = { item: 0, topic: 0, file: 0 };
  for (const n of graph.nodes) counts[n.type] = (counts[n.type] || 0) + 1;
  return {
    objects: counts.item,
    topics: counts.topic,
    files: counts.file,
    links: graph.edges.length,
  };
}
