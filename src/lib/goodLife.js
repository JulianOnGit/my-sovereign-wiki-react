// The five dimensions of a good life, as an *architectural map* of the
// capabilities each dimension is built from — and the access grants that keep
// those capabilities functioning.
//
// The premise: a capability isn't purely private. Many only work when someone
// else can reach part of your wiki — a neighbour who can see your Care stream can
// actually check in on you; a group who can read your Stewardship log can build
// on it. So each capability "maintains" a set of access grants, and this map
// shows, per dimension and per capability, exactly which grants are live — and
// lets you control them in place.
//
// Grants are tied to your value streams (journeys). Each capability names the
// journeys that power it, so a journey-scoped grant lands under the right
// capability. Grants that span the whole wiki (or a single note) aren't
// capability-specific and are surfaced separately as reaching across everything.

// Capability names follow Reflect's "Areas of your life" — the same common,
// humane vocabulary (honesty, care, health, home, standing for your values…)
// rather than clinical terms. The richer per-dimension breakdown takes its cue
// from the good-life architecture, without copying it. Each capability names the
// value streams (journeys) that power it, so a journey-scoped grant lands under
// the right one; capabilities with no grant yet stay fully private.
export const GOOD_LIFE_DOMAINS = [
  {
    key: "virtue",
    name: "Virtue-enablement",
    icon: "🕊️",
    tone: "virtue",
    blurb: "Living your values — being honest, fair, and kind, and grateful for what's good.",
    capabilities: [
      { key: "honesty", name: "Honesty", enables: "Being truthful with yourself and others", journeys: [] },
      { key: "compassion", name: "Compassion", enables: "Meeting others with kindness", journeys: ["universal"] },
      { key: "justice", name: "Fairness", enables: "Giving each their due", journeys: ["philosophy"] },
      { key: "gratitude", name: "Gratitude", enables: "Appreciating what's good in life", journeys: ["benevolence"] },
      { key: "patience", name: "Patience", enables: "Staying steady when things are hard", journeys: [] },
      { key: "humility", name: "Humility", enables: "Holding your own views lightly", journeys: [] },
    ],
  },
  {
    key: "phronesis",
    name: "Practical wisdom",
    icon: "🧭",
    tone: "phronesis",
    blurb: "Doing meaningful work — good judgement, foresight, learning, and craft.",
    capabilities: [
      { key: "judgement", name: "Judgement", enables: "Weighing things up well", journeys: ["risk", "epistemology"] },
      { key: "reflection", name: "Reflection", enables: "Making sense of what you notice", journeys: ["noticing"] },
      { key: "foresight", name: "Foresight", enables: "Seeing where things are heading", journeys: ["future"] },
      { key: "prioritisation", name: "Prioritisation", enables: "Knowing what matters most", journeys: [] },
      { key: "learning", name: "Learning", enables: "Growing your understanding", journeys: ["learning"] },
      { key: "insight", name: "Insight", enables: "Seeing what others miss, and making from it", journeys: ["creativity", "ingenuity"] },
      { key: "mastery", name: "Mastery", enables: "Getting good at your craft", journeys: ["mastery"] },
    ],
  },
  {
    key: "social",
    name: "Social goods",
    icon: "🤝",
    tone: "social",
    blurb: "Connection with others — care, belonging, contribution, and real conversation.",
    capabilities: [
      { key: "care", name: "Care", enables: "Looking out for the people who need it", journeys: ["care"] },
      { key: "relationships", name: "Relationships", enables: "Close, trusting bonds", journeys: [] },
      { key: "belonging", name: "Belonging", enables: "Feeling part of something bigger", journeys: ["culture"] },
      { key: "community", name: "Community", enables: "Shared life and shared purpose", journeys: [] },
      { key: "contribution", name: "Contribution", enables: "Giving something back", journeys: [] },
      { key: "communication", name: "Communication", enables: "Being heard, and truly hearing others", journeys: ["partner"] },
    ],
  },
  {
    key: "material",
    name: "Material goods",
    icon: "🌿",
    tone: "material",
    blurb: "Everyday wellbeing — health, home, resources, rest, and energy.",
    capabilities: [
      { key: "health", name: "Health", enables: "Body and mind well", journeys: [] },
      { key: "home", name: "Home", enables: "A settled place to be", journeys: [] },
      { key: "finances", name: "Finances", enables: "Enough, and secure", journeys: [] },
      { key: "resources", name: "Resources", enables: "The things you need, to hand", journeys: [] },
      { key: "rest", name: "Rest", enables: "Time to replenish and enjoy", journeys: ["leisure"] },
      { key: "energy", name: "Energy", enables: "Feeling grounded and up to the day", journeys: ["calm"] },
    ],
  },
  {
    key: "courage",
    name: "Moral courage-enablement",
    icon: "🔥",
    tone: "courage",
    blurb: "Feeling well-supported — integrity, boundaries, and standing for what's right.",
    capabilities: [
      { key: "integrity", name: "Integrity", enables: "Living in line with your values", journeys: [] },
      { key: "speaking-up", name: "Speaking up", enables: "Saying the hard thing when it counts", journeys: [] },
      { key: "boundaries", name: "Boundaries", enables: "Protecting what matters to you", journeys: [] },
      { key: "standing", name: "Standing for your values", enables: "Acting for the wider world", journeys: ["world"] },
      { key: "difficult-action", name: "Difficult action", enables: "Doing what's right when it's costly", journeys: [] },
      { key: "stewardship", name: "Stewardship", enables: "Leaving things better than you found them", journeys: ["stewardship"] },
    ],
  },
];

/// Build the live domain → capability → grants map from the current grants.
/// Journey-scoped grants attach to the capability their value stream powers;
/// everything else (whole-wiki, topic, single-note) is returned as `spanning`,
/// since it isn't tied to one capability.
export function mapGoodLife(grants) {
  const journeyToCap = new Map();
  for (const domain of GOOD_LIFE_DOMAINS)
    for (const cap of domain.capabilities)
      for (const jk of cap.journeys) journeyToCap.set(jk, cap.key);

  const byCap = new Map();
  const spanning = [];
  for (const g of grants || []) {
    const capKey = g.scope?.kind === "journey" ? journeyToCap.get(g.scope.key) : undefined;
    if (capKey) {
      if (!byCap.has(capKey)) byCap.set(capKey, []);
      byCap.get(capKey).push(g);
    } else {
      spanning.push(g);
    }
  }

  const domains = GOOD_LIFE_DOMAINS.map((domain) => {
    const capabilities = domain.capabilities.map((cap) => ({
      ...cap,
      grants: byCap.get(cap.key) || [],
    }));
    return {
      ...domain,
      capabilities,
      grantCount: capabilities.reduce((n, c) => n + c.grants.length, 0),
    };
  });

  return { domains, spanning };
}
