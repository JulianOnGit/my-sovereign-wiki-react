// Eudaimonia — the model of the user's semantic ecosystem: a picture of the
// capacities for a good life, read out of the raw captured observations.
//
// Five capabilities (each a cluster of concrete aspects), five developmental
// stages, an open-ended set of projects that advance them, a roadmap of where
// the person is on the journey, and a prioritisation matrix (effort × benefit).
//
// This module is the *local* engine: pure, dependency-free heuristics that work
// with zero LLM. When an API key is present, the LLM layer enriches these same
// structures — it never replaces where the model lives.

// ── The framework ────────────────────────────────────────────────────────────

export const CAPABILITIES = [
  {
    key: "virtue",
    name: "Living your values",
    blurb: "Acting well: honesty, temperance, compassion, justice, gratitude.",
    aspects: ["honesty", "temperance", "compassion", "justice", "patience", "gratitude", "humility"],
  },
  {
    key: "phronesis",
    name: "Doing meaningful work",
    blurb: "Meaningful, worthwhile work — reflection, foresight, prioritisation, learning.",
    aspects: ["judgement", "reflection", "foresight", "prioritisation", "learning", "insight", "mastery"],
  },
  {
    key: "social",
    name: "Connection with others",
    blurb: "Being with and for others: relationships, community, belonging, contribution.",
    aspects: ["relationships", "community", "belonging", "contribution", "communication", "care"],
  },
  {
    key: "material",
    name: "Everyday wellbeing",
    blurb: "The conditions of life: health, home, finances, resources, environment.",
    aspects: ["health", "home", "finances", "resources", "environment", "rest", "energy"],
  },
  {
    key: "courage",
    name: "Feeling well-supported",
    blurb: "Feeling able to do what feels right to you, however you express it — integrity, boundaries, standing for your values.",
    aspects: ["integrity", "speaking up", "boundaries", "standing for values", "difficult action", "stewardship"],
  },
];

export const STAGES = [
  { key: "safety", name: "Getting settled", blurb: "The basics in place — health, stability, and everyday security." },
  { key: "order", name: "Getting organised", blurb: "Bringing in structure — routines, systems, a manageable day-to-day." },
  { key: "identity", name: "Knowing yourself", blurb: "Getting clear on who you are — your values, purpose, and what feels authentic." },
  { key: "better", name: "Living and working", blurb: "Growing on purpose — goals, skills, projects, and steady progress." },
  { key: "makariotic", name: "Flourishing", blurb: "Really thriving — meaning, joy, gratitude, love, and giving back." },
];

export const stageIndex = (key) => STAGES.findIndex((s) => s.key === key);

// ── Signal lexicons (local heuristic) ────────────────────────────────────────

const CAPABILITY_KEYWORDS = {
  virtue: ["honest", "kind", "fair", "patient", "grateful", "gratitude", "humble", "generous", "integrity", "forgive", "compassion", "just"],
  phronesis: ["decide", "decision", "plan", "learn", "reflect", "understand", "judg", "strategy", "foresight", "prioriti", "analyse", "analyze", "insight", "skill", "master", "practice"],
  social: ["friend", "family", "team", "community", "colleague", "meet", "conversation", "relationship", "help", "support", "belong", "together", "eric", "nora", "partner", "care"],
  material: ["money", "health", "home", "rent", "budget", "tool", "buy", "fix", "resource", "sleep", "exercise", "food", "energy", "house", "finance", "wealth"],
  courage: ["speak", "stand", "confront", "boundary", "difficult", "brave", "refuse", "challenge", "defend", "truth", "integrity", "steward", "protect"],
};

// Reflective lenses map cleanly onto capabilities — the strongest local signal.
const LENS_CAPABILITY = {
  Culture: "social",
  Risk: "phronesis",
  Care: "social",
  Values: "virtue",
  "Truth & evidence": "phronesis",
  Creativity: "phronesis",
  Future: "phronesis",
  Learning: "phronesis",
  Enjoyment: "material",
  Groundedness: "material",
  Appreciation: "virtue",
  "Society & environment": "courage",
  Conversation: "social",
  "Universal love": "virtue",
  "Close observation": "phronesis",
  Mastery: "phronesis",
  "Problem solving": "phronesis",
  Stewardship: "courage",
};

const STAGE_KEYWORDS = {
  safety: ["settled", "secure", "safe", "health", "stable", "steady", "afford", "basics", "wellbeing", "rest", "calm"],
  order: ["organis", "organiz", "plan", "schedule", "tidy", "system", "routine", "sort", "structure", "manage", "clean", "backlog", "declutter"],
  identity: ["who", "value", "purpose", "believe", "identity", "meaning", "authentic", "principle", "vocation", "calling", "self"],
  better: ["goal", "improve", "grow", "build", "develop", "progress", "better", "ambition", "project", "learn", "practice", "milestone"],
  makariotic: ["grateful", "joy", "flourish", "love", "bliss", "fulfil", "content", "peace", "thrive", "blessed", "awe", "gratitude", "beauty", "wonder"],
};

// Actionable efflorescence types become candidate projects.
const ACTIONABLE = new Set([
  "an idea",
  "a question",
  "something to learn",
  "something to make",
  "something to discuss",
  "something to do",
  "something to protect",
]);

// Rough effort by the kind of thing that emerged (1 = light, 4 = heavy).
const EFFORT_BY_TYPE = {
  "a question": 1,
  "an idea": 1,
  "something to discuss": 2,
  "something to do": 2,
  "something to learn": 3,
  "something to protect": 3,
  "something to make": 4,
};

function itemText(item) {
  return [
    item.title, item.body, item.interpretation, item.uncertainty,
    item.efflorescence, item.context, (item.tags || []).join(" "),
    (item.mentions || []).join(" "),
  ].filter(Boolean).join(" ").toLowerCase();
}

function countHits(text, keywords) {
  let n = 0;
  for (const k of keywords) if (text.includes(k)) n += 1;
  return n;
}

// ── The analysis ─────────────────────────────────────────────────────────────

/// Build the whole semantic-ecosystem model from the captured observations.
/// Returns capability strengths, per-stage signal + current frontier, derived
/// projects with effort/benefit, and a short list of surfaced entities.
export function analyseEcosystem(items) {
  const capScore = Object.fromEntries(CAPABILITIES.map((c) => [c.key, 0]));
  const capAspects = Object.fromEntries(CAPABILITIES.map((c) => [c.key, new Set()]));
  const stageScore = Object.fromEntries(STAGES.map((s) => [s.key, 0]));

  for (const item of items) {
    const text = itemText(item);

    for (const c of CAPABILITIES) {
      const hits = countHits(text, CAPABILITY_KEYWORDS[c.key]);
      capScore[c.key] += hits;
      for (const aspect of c.aspects) if (text.includes(aspect.split(" ")[0])) capAspects[c.key].add(aspect);
    }
    for (const lens of item.lenses || []) {
      const cap = LENS_CAPABILITY[lens];
      if (cap) capScore[cap] += 2; // lenses are a deliberate, strong signal
    }
    for (const s of STAGES) stageScore[s.key] += countHits(text, STAGE_KEYWORDS[s.key]);
  }

  const maxCap = Math.max(1, ...Object.values(capScore));
  const capabilities = CAPABILITIES.map((c) => ({
    ...c,
    score: capScore[c.key],
    strength: capScore[c.key] / maxCap, // 0..1
    activeAspects: [...capAspects[c.key]],
  }));

  const totalStage = Math.max(1, Object.values(stageScore).reduce((a, b) => a + b, 0));
  const stages = STAGES.map((s) => ({
    ...s,
    score: stageScore[s.key],
    share: stageScore[s.key] / totalStage,
  }));

  // Focus = the stage with the most activity; frontier = the furthest stage that
  // shows meaningful signal (how far up the journey the person is reaching).
  const focusStage = stages.reduce((a, b) => (b.score > a.score ? b : a), stages[0]);
  const frontierStage =
    [...stages].reverse().find((s) => s.share >= 0.12) ?? stages[0];

  const projects = deriveProjects(items, capabilities);

  return { capabilities, stages, focusStage, frontierStage, projects };
}

/// Turn actionable observations and capability gaps into an open-ended set of
/// projects, each mapped to a capability + stage and scored for the matrix.
function deriveProjects(items, capabilities) {
  const capByKey = Object.fromEntries(capabilities.map((c) => [c.key, c]));
  const weakest = [...capabilities].sort((a, b) => a.strength - b.strength)[0];
  const projects = [];

  // 1) Projects the user has already gestured at (efflorescences).
  for (const item of items) {
    if (!ACTIONABLE.has(item.efflorescenceType)) continue;
    const title = (item.efflorescence || "").trim() ||
      `Follow up: ${(item.title || item.body).trim().split("\n")[0]}`;
    const capability = inferCapability(item, capByKey);
    const stage = inferStage(item);
    const effort = EFFORT_BY_TYPE[item.efflorescenceType] ?? 2;
    // Foundational stages and weak-capability work carry more benefit; more
    // linked observations mean it matters more in the person's life.
    const foundational = 4 - Math.min(stageIndex(stage), 3); // safety/order weigh higher
    const gapBoost = capability === weakest.key ? 1 : 0;
    const connectedness = Math.min(2, (item.related || []).length);
    const benefit = clamp(1 + Math.round((foundational + gapBoost + connectedness) / 2), 1, 4);
    projects.push({
      id: `proj-${item.id}`,
      title: trimTitle(title),
      capability,
      stage,
      effort,
      benefit,
      sources: [item.id],
      rationale: `Emerged as ${item.efflorescenceType} from "${trimTitle(item.title || item.body, 40)}".`,
    });
  }

  // 2) A starter project for the weakest capability, if it is under-served.
  if (weakest.strength < 0.25) {
    const stage = STAGES[Math.min(1, STAGES.length - 1)].key;
    projects.push({
      id: `proj-gap-${weakest.key}`,
      title: `Strengthen ${weakest.name.toLowerCase()}`,
      capability: weakest.key,
      stage,
      effort: 2,
      benefit: 4,
      sources: [],
      rationale: `Your captures touch ${weakest.name.toLowerCase()} the least — a small first step would balance the picture.`,
    });
  }

  return projects.sort((a, b) => priorityRank(b) - priorityRank(a));
}

function inferCapability(item, capByKey) {
  for (const lens of item.lenses || []) {
    const cap = LENS_CAPABILITY[lens];
    if (cap && capByKey[cap]) return cap;
  }
  const text = itemText(item);
  let best = "phronesis";
  let bestHits = -1;
  for (const c of CAPABILITIES) {
    const hits = countHits(text, CAPABILITY_KEYWORDS[c.key]);
    if (hits > bestHits) {
      bestHits = hits;
      best = c.key;
    }
  }
  return best;
}

function inferStage(item) {
  const text = itemText(item);
  let best = "better";
  let bestHits = -1;
  for (const s of STAGES) {
    const hits = countHits(text, STAGE_KEYWORDS[s.key]);
    if (hits > bestHits) {
      bestHits = hits;
      best = s.key;
    }
  }
  return best;
}

// ── Prioritisation matrix ────────────────────────────────────────────────────
// Axes: effort (left = high, right = low) and benefit (bottom = low, top = high),
// so the top-right quadrant is low-effort / high-benefit — the quick wins.

export function quadrantOf(project) {
  const lowEffort = project.effort <= 2;
  const highBenefit = project.benefit >= 3;
  if (lowEffort && highBenefit) return "quick-wins";
  if (!lowEffort && highBenefit) return "major";
  if (lowEffort && !highBenefit) return "fill-ins";
  return "reconsider";
}

export const QUADRANTS = {
  "quick-wins": { name: "Quick wins", hint: "Easy and worthwhile — do these first", tone: "good" },
  major: { name: "Big projects", hint: "Worthwhile but takes real effort — plan for these", tone: "accent" },
  "fill-ins": { name: "Nice extras", hint: "Easy but minor — when you have spare time", tone: "muted" },
  reconsider: { name: "Maybe skip", hint: "A lot of effort for little payoff — is it worth it?", tone: "warn" },
};

// Rank used for default ordering: benefit dominates, effort breaks ties.
export function priorityRank(project) {
  return project.benefit * 2 - project.effort;
}

// Normalised 0..1 position for plotting (x: right = low effort; y: up = high benefit).
export function matrixPosition(project) {
  return {
    x: 1 - (project.effort - 1) / 3,
    y: (project.benefit - 1) / 3,
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function trimTitle(s, n = 80) {
  const t = (s || "").trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}
