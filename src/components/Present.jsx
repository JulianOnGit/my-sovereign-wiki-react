import { useMemo, useState } from "react";
import { collectTopics, collectDates, nodeView } from "../lib/pages.js";
import { DEMO_ITEMS, DEMO_BY_ID, EXPLORE_CHAINS } from "../lib/demoData.js";
import { useRoute } from "../lib/router.js";

// Present/Compose stage — navigable, human pages generated live from the graph.
// A single component with an internal breadcrumb: the index (a graph-network
// home + exploration chains + topics + dates), a topic/person/date page, and the
// one-node "brain map" view.
//
// The home view leads with the knowledge graph itself — a force-laid network of
// observations wired by their AI-drawn links — so Explore reads as *your Pod, as
// a graph* from the first glance. Below it, exploration chains walk that graph as
// problem-solving: not an automated sequence played at you, but an interactive
// walk where each stage offers a list of continuations, one of which threads on
// to the solution node while the others branch off into the wider network.

// Roughly one node visit in three surfaces an emergent "solution" among the
// related links — a lure to an epiphantic resolution the walk has converged on.
const SOLUTION_CHANCE = 0.33;

function headline(item) {
  return item.title || item.body.trim().split("\n")[0].slice(0, 72) || "(observation)";
}

// What makes an emerged efflorescence a *source of inspiration* — named by the
// kind it is, why that kind is fertile, and concrete moves you can make with it.
// Keyed on the observation's efflorescence type, so the discovery reads as a
// specific invitation rather than a generic "you found something".
const INSPIRATION_KINDS = {
  "a question": {
    kind: "An open question",
    why: "It marks a live edge of what you know — the kind of gap that pulls reading, noticing, and conversation toward it.",
    moves: [
      "Phrase it in a single sharp sentence.",
      "Name one person or source that holds part of the answer.",
      "Set a small search or experiment to move off zero.",
    ],
  },
  "an insight": {
    kind: "A principle to carry",
    why: "It's a compression of something you lived — a rule of thumb that now travels far beyond where you found it.",
    moves: [
      "Write it as a one-line maxim you could hand to someone else.",
      "Find one unrelated situation it already explains.",
      "Watch for the next place it applies, and test it there.",
    ],
  },
  "something to learn": {
    kind: "A skill to pursue",
    why: "It's an appetite pointed at a specific capability — a direction for practice you'll feel yourself improve along.",
    moves: [
      "Pick the smallest first rep you could do today.",
      "Choose who, or what, you'll learn it from.",
      "Book a regular slot so the practice compounds.",
    ],
  },
  "something to make": {
    kind: "A making prompt",
    why: "It points at something that doesn't exist yet but could — a concrete artefact you're now equipped to bring into the world.",
    moves: [
      "Sketch the smallest version you could finish this week.",
      "List what you'd need — materials, references, a first collaborator.",
      "Give it a deadline so it leaves your head.",
    ],
  },
  "an idea": {
    kind: "An idea to develop",
    why: "It's a hypothesis with legs — a connection worth testing before you either build on it or let it go.",
    moves: [
      "State the idea and the bet it's making in one line.",
      "Design the cheapest test that could prove it wrong.",
      "Share it with one person who'll poke holes.",
    ],
  },
  "something to do": {
    kind: "An action to take",
    why: "It's a clear next move — the rare inspiration that asks for nothing more than for you to actually do it.",
    moves: [
      "Decide the very next physical step.",
      "Put it in the calendar with a time, not a someday.",
      "Tell someone, so it's harder to quietly drop.",
    ],
  },
  "something to protect": {
    kind: "Something worth safeguarding",
    why: "It names something valuable that's quietly at risk — inspiration as a reason to build a small defence around what matters.",
    moves: [
      "Name exactly what you're protecting, and from what.",
      "Set the simplest safeguard that would hold under stress.",
      "Decide who else needs to know it exists.",
    ],
  },
  "something to appreciate": {
    kind: "A thing to savour",
    why: "It's a small good you'd otherwise walk past — inspiration that asks to be noticed and kept, not fixed or optimised.",
    moves: [
      "Return to it once more, deliberately, without rushing.",
      "Note what exactly makes it good, in a line.",
      "Protect the conditions that let it happen again.",
    ],
  },
  "a feeling": {
    kind: "A feeling to honour",
    why: "It's a signal from underneath the reasoning — inspiration in the form of something felt that's worth taking seriously.",
    moves: [
      "Name the feeling as precisely as you can.",
      "Ask what it's pointing at, or asking for.",
      "Give it one small, fitting response.",
    ],
  },
  _default: {
    kind: "A new thread",
    why: "It's a loose end the exploration turned up — a starting point with more in it than first appears.",
    moves: [
      "Write down why it caught your attention.",
      "Follow it to one more source or person.",
      "Decide the first small step it suggests.",
    ],
  },
};

function inspirationFraming(item) {
  const type = (item?.efflorescenceType || "").toLowerCase().trim();
  const base = INSPIRATION_KINDS[type] || INSPIRATION_KINDS._default;
  const lenses = item?.lenses || [];
  const bridge =
    lenses.length >= 2
      ? `It sits where ${lenses[0].toLowerCase()} meets ${lenses[1].toLowerCase()}.`
      : lenses.length === 1
        ? `It comes through the lens of ${lenses[0].toLowerCase()}.`
        : "";
  return { ...base, bridge };
}

function ObservationRow({ item, onOpen }) {
  return (
    <button type="button" className="obs-row" onClick={() => onOpen(item.id)}>
      <span className="obs-row-title">{headline(item)}</span>
      <span className="obs-row-date">{item.createdAt.toLocaleDateString()}</span>
    </button>
  );
}

// ── Graph-network home ───────────────────────────────────────────────────────
// A small, deterministic force layout so the home view *looks like* a graph
// network without any external library. Seeded so a given seed always lays out
// the same way; bumping the seed (via Refresh) re-settles it into a fresh shape.

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildNetwork(items, seed) {
  const W = 100;
  const H = 60;
  const rng = mulberry32((seed || 1) * 2654435761);
  const nodes = items.map((it) => ({
    id: it.id,
    label: it.title || headline(it),
    x: 12 + rng() * (W - 24),
    y: 10 + rng() * (H - 20),
    vx: 0,
    vy: 0,
    deg: 0,
  }));
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const edges = [];
  const seen = new Set();
  items.forEach((it) =>
    (it.related || []).forEach((r) => {
      if (!index.has(r) || !index.has(it.id)) return;
      const key = it.id < r ? it.id + "|" + r : r + "|" + it.id;
      if (seen.has(key)) return;
      seen.add(key);
      const a = index.get(it.id);
      const b = index.get(r);
      edges.push([a, b]);
      nodes[a].deg += 1;
      nodes[b].deg += 1;
    }),
  );

  // A few passes of repulsion + edge springs + gentle gravity — enough to settle
  // a dozen nodes into a legible constellation.
  const K = 20;
  for (let iter = 0; iter < 280; iter++) {
    const cool = 1 - iter / 340;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        const d2 = dx * dx + dy * dy || 0.01;
        const d = Math.sqrt(d2);
        const f = ((K * K) / d2) * 0.9;
        const ux = dx / d;
        const uy = dy / d;
        nodes[i].vx += ux * f;
        nodes[i].vy += uy * f;
        nodes[j].vx -= ux * f;
        nodes[j].vy -= uy * f;
      }
    }
    edges.forEach(([a, b]) => {
      let dx = nodes[b].x - nodes[a].x;
      let dy = nodes[b].y - nodes[a].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = (d - K) * 0.08;
      const ux = dx / d;
      const uy = dy / d;
      nodes[a].vx += ux * f;
      nodes[a].vy += uy * f;
      nodes[b].vx -= ux * f;
      nodes[b].vy -= uy * f;
    });
    nodes.forEach((n) => {
      n.vx += (W / 2 - n.x) * 0.008;
      n.vy += (H / 2 - n.y) * 0.008;
      n.x += n.vx * cool;
      n.y += n.vy * cool;
      n.vx *= 0.85;
      n.vy *= 0.85;
    });
  }

  // Normalise the settled cloud back into the viewport with padding.
  const pad = 9;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const s = Math.min((W - pad * 2) / (maxX - minX || 1), (H - pad * 2) / (maxY - minY || 1));
  nodes.forEach((n) => {
    n.x = pad + (n.x - minX) * s;
    n.y = pad + (n.y - minY) * s;
    n.r = 1.9 + Math.min(n.deg, 4) * 0.35;
  });
  return { nodes, edges, W, H };
}

function GraphNetwork({ items, seed, onOpen }) {
  const { nodes, edges, W, H } = useMemo(() => buildNetwork(items, seed), [items, seed]);
  if (nodes.length === 0) return null;
  return (
    <svg
      className="explore-graph"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="A network graph of your observations and the links between them. Select a node to open that observation."
    >
      <g className="graph-edges">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            className="graph-edge"
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
          />
        ))}
      </g>
      {nodes.map((n) => (
        <g
          key={n.id}
          className="graph-node"
          role="button"
          tabIndex={0}
          onClick={() => onOpen(n.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(n.id);
            }
          }}
        >
          <circle className="graph-node-halo" cx={n.x} cy={n.y} r={n.r + 2.4} />
          <circle className="graph-node-dot" cx={n.x} cy={n.y} r={n.r} />
          <text className="graph-node-label" x={n.x} y={n.y - n.r - 1.4} textAnchor="middle">
            {n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Continuation helpers ─────────────────────────────────────────────────────
// The branch continuations offered at each stage are drawn live from the graph:
// unwalked observations that share a lens, topic, or place with the frontier
// node. This keeps the "other threads from here" honest — they are real edges in
// the network, not scripted decoys.

function sharedConnector(a, b) {
  const lens = (a.lenses || []).find((l) => (b.lenses || []).includes(l));
  if (lens) return `shared lens · ${lens.toLowerCase()}`;
  const place = (a.mentions || []).find((m) => (b.mentions || []).includes(m));
  if (place) return `same place · ${place}`;
  const tag = (a.tags || []).find((t) => (b.tags || []).includes(t));
  if (tag) return `shared topic · ${tag}`;
  return "AI-linked";
}

function branchContinuations(frontier, allItems, excludeIds, max = 2) {
  const skip = new Set(excludeIds);
  const score = (it) => {
    let s = 0;
    (frontier.lenses || []).forEach((l) => (it.lenses || []).includes(l) && (s += 2));
    (frontier.mentions || []).forEach((m) => (it.mentions || []).includes(m) && (s += 2));
    (frontier.tags || []).forEach((t) => (it.tags || []).includes(t) && (s += 1));
    return s;
  };
  return allItems
    .filter((it) => !skip.has(it.id) && score(it) > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, max)
    .map((it) => ({ item: it, connector: sharedConnector(frontier, it) }));
}

// One exploration chain, walked interactively. It leads with the problem and its
// payoff, then reveals one node at a time: at each stage the frontier offers a
// list of continuations — the golden one that *continues the chain* toward the
// solution, plus branch continuations that peel off into the wider graph. Follow
// the golden thread all the way and you arrive at the solution node.
function Chain({ chain, onOpen }) {
  const steps = useMemo(
    () => chain.steps.map((s) => ({ ...s, item: DEMO_BY_ID.get(s.id) })).filter((s) => s.item),
    [chain],
  );
  const [revealed, setRevealed] = useState(0);

  const atSolution = revealed >= steps.length - 1;
  const frontier = steps[revealed];
  const nextStep = atSolution ? null : steps[revealed + 1];
  const walkedIds = steps.slice(0, revealed + 1).map((s) => s.id);
  const branches = atSolution
    ? []
    : branchContinuations(frontier.item, DEMO_ITEMS, [...walkedIds, nextStep.id]);

  return (
    <div className="card chain-card">
      <div className="chain-head">
        <span className="chain-journey">
          <span className="chain-journey-icon" aria-hidden="true">
            {chain.icon}
          </span>
          {chain.journey}
        </span>
        <span className="chain-progress">
          {revealed + 1} / {steps.length}
          {revealed > 0 && (
            <button type="button" className="chain-restart" onClick={() => setRevealed(0)}>
              ⟲ restart
            </button>
          )}
        </span>
      </div>

      <div className="chain-frame">
        <p className="chain-problem">
          <span className="chain-frame-label chain-frame-label-problem">The problem</span>
          {chain.problem}
        </p>
        <p className="chain-payoff">
          <span className="chain-frame-label chain-frame-label-payoff">What it gets you</span>
          {chain.payoff}
        </p>
      </div>

      <ol className="trail-steps">
        {steps.slice(0, revealed + 1).map((step, i) => {
          const isSolution = atSolution && i === steps.length - 1;
          return (
            <li
              key={step.id}
              className={
                "trail-step" +
                (i === 0 ? " is-spark" : "") +
                (isSolution ? " is-inspiration" : "") +
                (step.turn ? " is-turn" : "")
              }
            >
              {step.connector && (
                <div className="trail-connector">
                  <span className="trail-connector-line" aria-hidden="true" />
                  <span className="trail-connector-label">↳ {step.connector}</span>
                </div>
              )}
              <button type="button" className="trail-node" onClick={() => onOpen(step.item.id)}>
                <span className="chain-step-top">
                  <span className="chain-phase">{step.phase}</span>
                  <span className="trail-role">{step.role}</span>
                </span>
                <span className="trail-headline">{headline(step.item)}</span>
                <span className="trail-snippet">{step.item.body.slice(0, 120)}…</span>
                <span className="trail-lenses">
                  {step.item.lenses.slice(0, 3).map((l) => (
                    <span key={l} className="tag tag-lens">
                      {l}
                    </span>
                  ))}
                </span>
                {isSolution && step.item.efflorescence && (
                  <span className="trail-effloresced">
                    ✨ {step.item.efflorescenceType}: {step.item.efflorescence}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {!atSolution && (
        <div className="chain-continue">
          <span className="chain-continue-label">Where next? — choose a continuation</span>

          <button
            type="button"
            className="chain-cont chain-cont-golden"
            onClick={() => setRevealed(revealed + 1)}
          >
            <span className="chain-cont-top">
              <span className="chain-phase">{nextStep.phase}</span>
              <span className="chain-cont-lead">Continues the chain →</span>
            </span>
            <span className="chain-cont-headline">{headline(nextStep.item)}</span>
            {nextStep.connector && (
              <span className="chain-cont-connector">↳ {nextStep.connector}</span>
            )}
          </button>

          {branches.map((b) => (
            <button
              key={b.item.id}
              type="button"
              className="chain-cont chain-cont-branch"
              onClick={() => onOpen(b.item.id)}
            >
              <span className="chain-cont-top">
                <span className="chain-cont-lead chain-cont-lead-branch">
                  Branches into the graph ↗
                </span>
              </span>
              <span className="chain-cont-headline">{headline(b.item)}</span>
              <span className="chain-cont-connector">↳ {b.connector}</span>
            </button>
          ))}
        </div>
      )}

      {atSolution && (
        <div className="chain-solved">
          <span className="chain-solved-badge">✨ Solution reached</span>
          <button type="button" className="chain-restart chain-restart-solid" onClick={() => setRevealed(0)}>
            ⟲ Walk it again
          </button>
        </div>
      )}
    </div>
  );
}

export default function Present({ items }) {
  const { segments, navigate } = useRoute();
  // View derived from the hash: #/explore, #/explore/topic/<name>,
  // #/explore/date/<date>, #/explore/node/<id>.
  const kind = ["topic", "date", "node", "solution"].includes(segments[1]) ? segments[1] : "index";
  const value = segments[2];

  // Example mode: default on when the user has no data of their own, so Explore
  // is never a dead end. Users with data can toggle it to preview the vision.
  const [demo, setDemo] = useState(items.length === 0);
  const data = demo ? DEMO_ITEMS : items;

  // Layout seed for the home graph. Refresh bumps it so the network re-settles
  // into a fresh constellation and returns the user to the home view.
  const [graphSeed, setGraphSeed] = useState(1);

  const topics = useMemo(() => collectTopics(data), [data]);
  const dates = useMemo(() => collectDates(data), [data]);

  // Rolled fresh each time a node is opened (keyed on its id): whether this visit
  // reveals the emergent solution lure among the related links.
  const solutionLure = useMemo(() => Math.random() < SOLUTION_CHANCE, [value]);

  const openNode = (id) => navigate("explore", "node", id);
  const openTopic = (name) => navigate("explore", "topic", name);
  const goIndex = () => navigate("explore");

  // Refresh: re-lay the graph and return to the home explore view.
  const refresh = () => {
    setGraphSeed((s) => s + 1);
    goIndex();
  };

  // Toggling the example resets the route so a demo/real node id can't linger in
  // the hash and resolve against the wrong graph.
  const setDemoMode = (on) => {
    setDemo(on);
    goIndex();
  };

  // ── Index ──────────────────────────────────────────────────────────────────
  if (kind === "index") {
    return (
      <div className="present">
        <div className="explore-topbar">
          <div className="explore-topbar-text">
            <h1 className="explore-home-title">Explore</h1>
            <p className="muted explore-home-sub">
              Your Pod as a living graph — wander the network, or follow a chain to
              something new.
            </p>
          </div>
          <button
            type="button"
            className="explore-refresh"
            onClick={refresh}
            title="Refresh — re-lay the graph and return to the Explore home"
          >
            ⟳ Refresh
          </button>
        </div>

        {demo ? (
          <div className="demo-banner">
            <span>
              ✨ <strong>Example graph.</strong> Sample observations, shown to
              demonstrate how Explore connects your data.
              {items.length > 0 && " Your own graph is hidden while this is on."}
            </span>
            {items.length > 0 && (
              <button className="demo-toggle" onClick={() => setDemoMode(false)}>
                Show my graph
              </button>
            )}
          </div>
        ) : (
          <div className="demo-banner demo-banner-plain">
            <span>Every page below is a live view over your own graph.</span>
            <button className="demo-toggle" onClick={() => setDemoMode(true)}>
              ✨ See an example
            </button>
          </div>
        )}

        <div className="card explore-graph-card">
          <div className="explore-graph-head">
            <h2 className="section-heading">Knowledge graph</h2>
            <span className="muted graph-hint">
              {data.length} observations, linked by shared topics and AI — tap a node to open it
            </span>
          </div>
          <GraphNetwork items={data} seed={graphSeed} onOpen={openNode} />
        </div>

        {demo && (
          <div className="card trails-intro">
            <h2 className="section-heading">Exploration chains</h2>
            <p className="muted">
              A chain walks your graph as problem-solving, not idle wandering — and
              you walk it yourself. Each starts from a real problem, and at every
              stage offers a list of continuations: one golden thread that carries
              the Epiphantic arc onward toward the solution, and branches that peel
              off into the wider graph. Follow the thread to the end, or wander off
              it whenever a branch tempts you.
            </p>
          </div>
        )}

        {demo &&
          EXPLORE_CHAINS.map((chain) => <Chain key={chain.id} chain={chain} onOpen={openNode} />)}

        <div className="card">
          <h2 className="section-heading">Topic &amp; people pages</h2>
          <p className="muted">
            Every page is a live view over the graph — nothing is duplicated.
          </p>
          <div className="topic-grid">
            {topics.map((t) => (
              <button
                key={t.name}
                type="button"
                className="topic-tile"
                onClick={() => openTopic(t.name)}
              >
                <span className="topic-name">{t.name}</span>
                <span className="topic-count">{t.items.length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="section-heading">Dates</h2>
          <div className="date-list">
            {dates.map((d) => (
              <button
                key={d.date}
                type="button"
                className="date-row"
                onClick={() => navigate("explore", "date", d.date)}
              >
                <span>{d.date}</span>
                <span className="topic-count">{d.items.length}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Topic / person page ──────────────────────────────────────────────────────
  if (kind === "topic") {
    const bucket = topics.find((t) => t.name === value);
    return (
      <div className="present">
        <div className="crumb-row">
          <button className="crumb" onClick={goIndex}>
            ← All pages
          </button>
          <button className="crumb crumb-refresh" onClick={refresh} title="Back to the Explore graph">
            ⟳ Explore home
          </button>
        </div>
        <div className="card">
          <h2 className="page-title">{value}</h2>
          <p className="muted">
            {bucket?.items.length ?? 0} observation
            {(bucket?.items.length ?? 0) === 1 ? "" : "s"}, most recent first.
          </p>
          <div className="obs-rows">
            {bucket?.items.map((item) => (
              <ObservationRow key={item.id} item={item} onOpen={openNode} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Date page ────────────────────────────────────────────────────────────────
  if (kind === "date") {
    const bucket = dates.find((d) => d.date === value);
    return (
      <div className="present">
        <div className="crumb-row">
          <button className="crumb" onClick={goIndex}>
            ← All pages
          </button>
          <button className="crumb crumb-refresh" onClick={refresh} title="Back to the Explore graph">
            ⟳ Explore home
          </button>
        </div>
        <div className="card">
          <h2 className="page-title">{value}</h2>
          <p className="muted">Everything that happened on this day.</p>
          <div className="obs-rows">
            {bucket?.items.map((item) => (
              <ObservationRow key={item.id} item={item} onOpen={openNode} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Discovered inspiration node ──────────────────────────────────────────────
  // A terminal node the walk surfaces: it reads like an ordinary observation, but
  // a spotlight falls on the one line of inspiration the exploration turned up. It
  // has no onward links — the only move is to start a new exploration.
  if (kind === "solution") {
    const src = data.find((i) => i.id === value) || DEMO_BY_ID.get(value) || null;
    const framing = inspirationFraming(src);
    const line = src?.efflorescence || "a new thread worth following";
    const srcTopics = src ? [...new Set([...src.tags, ...src.mentions])] : [];
    return (
      <div className="present">
        <div className="card node-focus inspiration-node">
          <span className="badge badge-inspiration">✨ new inspiration</span>
          <h2 className="page-title">
            {src ? headline(src) : "A new source of inspiration"}
          </h2>
          {src?.body && (
            <>
              <span className="inspiration-context-label">Where it came from</span>
              <p className="body">{src.body}</p>
            </>
          )}

          <div className="enrich enrich-efflorescence inspiration-spotlight">
            <span className="enrich-label">A new source of inspiration was discovered</span>
            <span className="inspiration-kind">{framing.kind}</span>
            <p className="inspiration-line">{line}</p>
            <p className="inspiration-why">
              {framing.why}
              {framing.bridge ? " " + framing.bridge : ""}
            </p>
            <div className="inspiration-do">
              <span className="inspiration-do-label">What you can do with it</span>
              <ul className="inspiration-do-list">
                {framing.moves.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          </div>

          {srcTopics.length > 0 && (
            <div className="node-topics">
              {srcTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="tag tag-lens"
                  onClick={() => openTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="inspiration-actions">
          <button type="button" className="solution-restart" onClick={refresh}>
            ⟲ Start a new exploration
          </button>
        </div>
      </div>
    );
  }

  // ── One-node brain map ───────────────────────────────────────────────────────
  const node = nodeView(data, value);
  if (!node) {
    return (
      <div className="present">
        <div className="crumb-row">
          <button className="crumb" onClick={goIndex}>
            ← All pages
          </button>
          <button className="crumb crumb-refresh" onClick={refresh} title="Back to the Explore graph">
            ⟳ Explore home
          </button>
        </div>
        <p className="empty">That observation is no longer in your Pod.</p>
      </div>
    );
  }

  return (
    <div className="present">
      <div className="crumb-row">
        <button className="crumb" onClick={goIndex}>
          ← All pages
        </button>
        <button className="crumb crumb-refresh" onClick={refresh} title="Back to the Explore graph">
          ⟳ Explore home
        </button>
      </div>

      <div className="card node-focus">
        <span className="badge badge-observation">focus</span>
        <h2 className="page-title">{headline(node.focus)}</h2>
        {node.focus.body && <p className="body">{node.focus.body}</p>}
        {(node.focus.efflorescenceType || node.focus.efflorescence) && (
          <p className="enrich enrich-efflorescence">
            <span className="enrich-label">Emerged</span>
            {[node.focus.efflorescenceType, node.focus.efflorescence]
              .filter(Boolean)
              .join(" — ")}
          </p>
        )}
        {node.topics.length > 0 && (
          <div className="node-topics">
            {node.topics.map((t) => (
              <button key={t} type="button" className="tag tag-lens" onClick={() => openTopic(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="node-connections">
        <div className="card">
          <h3 className="section-heading">Related · AI-linked</h3>
          {solutionLure && (
            <button
              type="button"
              className="solution-lure"
              onClick={() => navigate("explore", "solution", node.focus.id)}
            >
              <span className="solution-lure-badge">✨ Inspiration</span>
              <span className="solution-lure-text">
                <span className="solution-lure-title">A new source of inspiration was discovered</span>
                <span className="solution-lure-sub">
                  Following the links turned up a fresh spark — follow it →
                </span>
              </span>
            </button>
          )}
          {node.related.length === 0 ? (
            !solutionLure && (
              <p className="muted">No related observations yet — run Organise to link this up.</p>
            )
          ) : (
            <div className="obs-rows">
              {node.related.map((item) => (
                <ObservationRow key={item.id} item={item} onOpen={openNode} />
              ))}
            </div>
          )}
        </div>

        {node.backlinks.length > 0 && (
          <div className="card">
            <h3 className="section-heading">Linked from</h3>
            <div className="obs-rows">
              {node.backlinks.map((item) => (
                <ObservationRow key={item.id} item={item} onOpen={openNode} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
