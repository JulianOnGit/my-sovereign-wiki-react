// Organise insights — the sovereign AI's read-out of the whole corpus.
//
// Where `organise.js` links observations and extracts entities, this module
// draws the higher-order picture the Organise tab presents: it groups the Pod
// by *value stream* (the reflective lenses the user captured through) and, for
// each, tells the same six-part story every user journey follows —
//   observation → analysis → efflorescence → attribution → safety/responsibility
// — plus corpus-wide totals and the connections that bridge one stream to
// another. Pure and dependency-free: it runs locally over the user's own data
// and invents nothing that isn't already in the observations.

// ── Value streams ────────────────────────────────────────────────────────────
// One per reflective lens (see Capture's LENSES), mapped to the user journey it
// serves. Each carries the journey's own arc vocabulary — what its *observation*
// and *analysis* stages are called, and the kind of efflorescence it tends to
// bear — so the Organise pattern cards narrate every stream in the user's own
// framework (observation → analysis → efflorescence) rather than generic copy.
// `observation` is a singular noun the card pluralises with a trailing "s".

export const VALUE_STREAMS = [
  { lens: "Culture", journey: "Cultural appreciation", observation: "cultural observation", analysis: "cultural analysis", efflorescence: "cultural efflorescences", icon: "🏛️" },
  { lens: "Risk", journey: "World-risk awareness", observation: "risk observation", analysis: "risk analysis", efflorescence: "risk-response efflorescences", icon: "⚠️" },
  { lens: "Care", journey: "Care", observation: "care observation", analysis: "care analysis", efflorescence: "care-provision efflorescences", icon: "🤲" },
  { lens: "Values", journey: "Moral philosophy", observation: "philosophical observation", analysis: "moral analysis", efflorescence: "value-advocative efflorescences", icon: "⚖️" },
  { lens: "Truth & evidence", journey: "Epistemology", observation: "epistemological observation", analysis: "epistemic analysis", efflorescence: "truth-aligned efflorescences", icon: "🔎" },
  { lens: "Creativity", journey: "Creativity", observation: "creative observation", analysis: "creative analysis", efflorescence: "creative efflorescences", icon: "🎨" },
  { lens: "Future", journey: "Future modelling", observation: "prediction and model observation", analysis: "model analysis", efflorescence: "model-efflorescences", icon: "🔮" },
  { lens: "Learning", journey: "Learning", observation: "knowledge observation", analysis: "knowledge analysis", efflorescence: "productive efflorescences", icon: "📚" },
  { lens: "Enjoyment", journey: "Leisure", observation: "experiential observation", analysis: "experiential analysis", efflorescence: "joyful efflorescences", icon: "☀️" },
  { lens: "Groundedness", journey: "Calmness and groundedness", observation: "regulatory observation", analysis: "regulatory analysis", efflorescence: "insight-efflorescences", icon: "🧘" },
  { lens: "Appreciation", journey: "Love of life and benevolence", observation: "bliss and gratitude observation", analysis: "appreciative analysis", efflorescence: "vivacity and good-will efflorescences", icon: "🙏" },
  { lens: "Society & environment", journey: "Love of the world and society", observation: "environment and good-angel observation", analysis: "environmental analysis", efflorescence: "environmental and good-human efflorescences", icon: "🌍" },
  { lens: "Conversation", journey: "Love of the conversational partner", observation: "heard and hearing observation", analysis: "empathetic analysis", efflorescence: "listening, including, and empathising efflorescences", icon: "💬" },
  { lens: "Universal love", journey: "Universal love for all", observation: "eternal-love observation", analysis: "love analysis", efflorescence: "love efflorescences", icon: "💞" },
  { lens: "Close observation", journey: "Noticing, observing, awareness", observation: "acute-awareness observation", analysis: "observational analysis", efflorescence: "acute-awareness efflorescences", icon: "👁️" },
  { lens: "Mastery", journey: "Skill, mastery, artisanry", observation: "skill and achievement observation", analysis: "mastery analysis", efflorescence: "milestone and achievement efflorescences", icon: "🛠️" },
  { lens: "Problem solving", journey: "Ingenuity, problem solving", observation: "problem and solution observation", analysis: "problem-solution analysis", efflorescence: "problem-solution efflorescences", icon: "🧩" },
  { lens: "Stewardship", journey: "Stewardship", observation: "embetterment observation", analysis: "embetterment analysis", efflorescence: "benefaction efflorescences", icon: "🌱" },
];

const STREAM_BY_LENS = Object.fromEntries(VALUE_STREAMS.map((s) => [s.lens, s]));

// How an observation came to be known — the attribution/provenance question,
// phrased for read-back.
const ATTRIBUTION_LABEL = {
  saw: "seen or heard directly",
  told: "shared by someone",
  remembered: "recalled from memory",
  measured: "measured",
  inferred: "inferred",
  generated: "system-generated",
  modelling: "modelled as a possibility",
};

// Efflorescence types that represent something emerging (i.e. not "nothing yet").
const REAL_EFFLORESCENCE = (item) =>
  item.efflorescenceType &&
  item.efflorescenceType !== "nothing yet" &&
  (item.efflorescence || "").trim();

function headline(item) {
  return (
    item.title ||
    (item.body || "").trim().split("\n")[0].slice(0, 72) ||
    "(observation)"
  );
}

// The single strongest value stream an observation belongs to: its first
// recognised lens. Used to attribute cross-stream connections.
function primaryStream(item) {
  for (const lens of item.lenses || []) if (STREAM_BY_LENS[lens]) return lens;
  return null;
}

// ── The read-out ─────────────────────────────────────────────────────────────

/// Derive the whole Organise insight model from the captured observations.
/// Returns corpus totals, a per-value-stream story, the connections that bridge
/// streams, and the entities the agent surfaced.
export function deriveInsights(items) {
  const byId = new Map(items.map((i) => [i.id, i]));

  // Per-stream aggregation.
  const buckets = new Map();
  const bucket = (lens) => {
    if (!buckets.has(lens)) {
      buckets.set(lens, {
        ...STREAM_BY_LENS[lens],
        items: [],
        efflorescences: [],
        attributions: new Map(),
        sensitive: 0,
      });
    }
    return buckets.get(lens);
  };

  for (const item of items) {
    for (const lens of item.lenses || []) {
      if (!STREAM_BY_LENS[lens]) continue;
      const b = bucket(lens);
      b.items.push(item);
      if (REAL_EFFLORESCENCE(item)) {
        b.efflorescences.push({
          type: item.efflorescenceType,
          text: item.efflorescence.trim(),
          from: headline(item),
        });
      }
      if (item.encounterMode)
        b.attributions.set(item.encounterMode, (b.attributions.get(item.encounterMode) || 0) + 1);
      if (item.sensitivity === "sensitive") b.sensitive += 1;
    }
  }

  const maxCount = Math.max(1, ...[...buckets.values()].map((b) => b.items.length));
  const streams = [...buckets.values()]
    .map((b) => {
      // The dominant attribution mode, phrased for the "attribution" line.
      const topMode = [...b.attributions.entries()].sort((x, y) => y[1] - x[1])[0];
      return {
        lens: b.lens,
        journey: b.journey,
        efflorescenceLabel: b.efflorescence,
        icon: b.icon,
        count: b.items.length,
        strength: b.items.length / maxCount,
        efflorescences: b.efflorescences,
        efflorescenceCount: b.efflorescences.length,
        attribution: topMode ? ATTRIBUTION_LABEL[topMode[0]] ?? topMode[0] : null,
        sensitive: b.sensitive,
      };
    })
    .sort((a, b) => b.count - a.count || a.journey.localeCompare(b.journey));

  // Corpus totals.
  const entityCounts = new Map();
  for (const item of items)
    for (const m of item.mentions || []) entityCounts.set(m, (entityCounts.get(m) || 0) + 1);

  const edges = new Set();
  for (const item of items)
    for (const relId of item.related || []) {
      if (!byId.has(relId)) continue;
      edges.add([item.id, relId].sort().join("↔"));
    }

  const efflorescenceTotal = items.filter(REAL_EFFLORESCENCE).length;
  const sensitiveTotal = items.filter((i) => i.sensitivity === "sensitive").length;

  const totals = {
    observations: items.length,
    connections: edges.size,
    entities: entityCounts.size,
    streams: streams.length,
    efflorescences: efflorescenceTotal,
    sensitive: sensitiveTotal,
  };

  // Cross-stream bridges: related links whose two ends sit in different value
  // streams — where curiosity crosses from one journey into another. Deduped
  // per unordered stream pair, richest example kept.
  const seenPairs = new Set();
  const bridges = [];
  for (const item of items) {
    const from = primaryStream(item);
    if (!from) continue;
    for (const relId of item.related || []) {
      const other = byId.get(relId);
      if (!other) continue;
      const to = primaryStream(other);
      if (!to || to === from) continue;
      const key = [from, to].sort().join("↔");
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      bridges.push({
        from: STREAM_BY_LENS[from].journey,
        fromIcon: STREAM_BY_LENS[from].icon,
        to: STREAM_BY_LENS[to].journey,
        toIcon: STREAM_BY_LENS[to].icon,
        a: headline(item),
        b: headline(other),
      });
    }
  }

  const topEntities = [...entityCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 24);

  return { totals, streams, bridges, topEntities };
}
