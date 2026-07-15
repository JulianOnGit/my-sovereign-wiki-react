// Organise stage — the "sovereign AI overnode", implemented as a fully local,
// transparent, dependency-free pass over the user's own observations.
//
// Deliberately no hosted LLM and no data leaving the Pod: relatedness is a
// TF-IDF cosine-similarity vector index and entity extraction is rule-based.
// This keeps the "AI is sovereign" promise literal — the agent runs on the
// user's device over the user's data, and everything it concludes is written
// back into the Pod as ordinary triples (schema:mentions, ssw:relatedTo) that
// any Solid tool can read, audit, or delete. A stronger model can be swapped in
// later behind the same interface without changing where trust sits.

const STOPWORDS = new Set(
  ("the a an and or but if then else of to in on at by for with from into over " +
    "is are was were be been being it its this that these those i me my we our you " +
    "your they them their he she his her as so not no yes do does did done have has " +
    "had will would can could should may might must just about which who what when " +
    "where why how than too very can't won't don't more most some any all each")
    .split(" "),
);

// Capitalised words that commonly start sentences — filtered out of the
// proper-noun heuristic so "The", "Today" etc. aren't mistaken for entities.
const NAME_STOP = new Set([
  "The", "A", "An", "I", "It", "This", "That", "These", "Those", "We", "My", "Our",
  "You", "Your", "They", "He", "She", "But", "And", "Or", "If", "So", "Then",
  "Today", "Tomorrow", "Yesterday", "When", "Where", "What", "Why", "How", "There",
  "Here", "After", "Before", "During", "While", "Because",
]);

export function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// Everything meaningful the composer can capture, joined for indexing.
function itemText(item) {
  return [
    item.title,
    item.body,
    item.interpretation,
    item.uncertainty,
    item.efflorescence,
    item.context,
    (item.tags || []).join(" "),
    (item.lenses || []).join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

// Build a TF-IDF vector per observation across the whole corpus.
function buildVectors(items) {
  const docs = items.map((it) => ({ id: it.id, tokens: tokenize(itemText(it)) }));
  const df = new Map();
  for (const d of docs) {
    for (const t of new Set(d.tokens)) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = Math.max(docs.length, 1);
  return docs.map((d) => {
    const tf = new Map();
    for (const t of d.tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Map();
    const len = Math.max(d.tokens.length, 1);
    for (const [t, f] of tf) {
      const idf = Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;
      vec.set(t, (f / len) * idf);
    }
    return { id: d.id, vec };
  });
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [t, w] of a) {
    na += w * w;
    if (b.has(t)) dot += w * b.get(t);
  }
  for (const [, w] of b) nb += w * w;
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// For each observation, the top-N most similar others above a threshold.
export function relatedLinks(items, { topN = 4, threshold = 0.08 } = {}) {
  const vectors = buildVectors(items);
  const result = new Map();
  for (const a of vectors) {
    const sims = [];
    for (const b of vectors) {
      if (a.id === b.id) continue;
      const score = cosine(a.vec, b.vec);
      if (score >= threshold) sims.push({ id: b.id, score });
    }
    sims.sort((x, y) => y.score - x.score);
    result.set(a.id, sims.slice(0, topN));
  }
  return result;
}

// Entities an observation refers to: the user's own tags (declared entities)
// plus capitalised proper-noun candidates extracted from the title and body.
export function extractEntities(item) {
  const found = new Set((item.tags || []).filter(Boolean));
  const text = [item.title, item.body].filter(Boolean).join(". ");
  const re = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/g;
  let match;
  while ((match = re.exec(text))) {
    const candidate = match[1].trim();
    if (candidate.length < 3) continue;
    if (NAME_STOP.has(candidate)) continue;
    // Skip all-caps single tokens that are likely acronyms of stopwords, keep
    // genuine multi-word or capitalised names.
    found.add(candidate);
  }
  return [...found];
}

// Run the whole organise pass and return a per-item plan plus a summary the UI
// can show — what the agent extracted and linked, before it is written back.
export function organise(items) {
  const related = relatedLinks(items);
  const plan = new Map();
  let entityCount = 0;
  let linkCount = 0;
  for (const item of items) {
    const mentions = extractEntities(item);
    const links = (related.get(item.id) || []).map((r) => r.id);
    entityCount += mentions.length;
    linkCount += links.length;
    plan.set(item.id, { mentions, related: links });
  }
  // Distinct entities across the corpus, for the summary and topic index.
  const distinctEntities = new Set();
  for (const { mentions } of plan.values()) mentions.forEach((m) => distinctEntities.add(m));

  return {
    plan,
    summary: {
      items: items.length,
      entities: entityCount,
      distinctEntities: distinctEntities.size,
      links: linkCount,
    },
  };
}
