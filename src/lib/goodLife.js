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

export const GOOD_LIFE_DOMAINS = [
  {
    key: "virtue",
    name: "Virtue-enablement",
    icon: "🕊️",
    tone: "virtue",
    blurb: "Acting well — living from considered values, gratitude, and goodwill.",
    capabilities: [
      { key: "moral-clarity", name: "Moral clarity", enables: "Acting from considered values", journeys: ["philosophy"] },
      { key: "gratitude", name: "Gratitude & benevolence", enables: "Appreciating life and wishing others well", journeys: ["benevolence"] },
      { key: "goodwill", name: "Universal goodwill", enables: "Extending care beyond your own circle", journeys: ["universal"] },
    ],
  },
  {
    key: "phronesis",
    name: "Practical wisdom",
    icon: "🧭",
    tone: "phronesis",
    blurb: "Knowing what's worth doing, and how — judgement, foresight, skill, and attention.",
    capabilities: [
      { key: "judgement", name: "Sound judgement", enables: "Weighing evidence and risk well", journeys: ["risk", "epistemology"] },
      { key: "foresight", name: "Foresight", enables: "Anticipating what's ahead", journeys: ["future"] },
      { key: "mastery", name: "Learning & mastery", enables: "Growing skill on purpose", journeys: ["learning", "mastery"] },
      { key: "ingenuity", name: "Creative problem-solving", enables: "Making things and solving problems", journeys: ["creativity", "ingenuity"] },
      { key: "attention", name: "Close attention", enables: "Noticing what others would miss", journeys: ["noticing"] },
    ],
  },
  {
    key: "social",
    name: "Social goods",
    icon: "🤝",
    tone: "social",
    blurb: "Being with and for others — care, belonging, and real dialogue.",
    capabilities: [
      { key: "care", name: "Care for others", enables: "Supporting the people who need it", journeys: ["care"] },
      { key: "belonging", name: "Belonging & culture", enables: "Shared meaning and community", journeys: ["culture"] },
      { key: "dialogue", name: "Dialogue", enables: "Being heard, and truly hearing others", journeys: ["partner"] },
    ],
  },
  {
    key: "material",
    name: "Material goods",
    icon: "🌿",
    tone: "material",
    blurb: "The conditions of a life well-lived — rest, groundedness, and everyday security.",
    capabilities: [
      { key: "rest", name: "Rest & enjoyment", enables: "Replenishing joy and leisure", journeys: ["leisure"] },
      { key: "groundedness", name: "Groundedness", enables: "Steadiness and calm", journeys: ["calm"] },
      { key: "security", name: "Everyday security", enables: "Health, home, and resources", journeys: [] },
    ],
  },
  {
    key: "courage",
    name: "Moral courage-enablement",
    icon: "🔥",
    tone: "courage",
    blurb: "Doing what feels right even when it's hard — stewardship, standing for the world, integrity.",
    capabilities: [
      { key: "stewardship", name: "Stewardship", enables: "Leaving things better than you found them", journeys: ["stewardship"] },
      { key: "world", name: "Standing for the world", enables: "Acting for society and the environment", journeys: ["world"] },
      { key: "integrity", name: "Integrity under pressure", enables: "Boundaries, speaking up, standing firm", journeys: [] },
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
