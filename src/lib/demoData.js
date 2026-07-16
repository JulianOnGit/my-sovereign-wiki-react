// Demo graph for the Explore stage.
//
// A curated, richly interconnected set of observations that shows the app at
// its best before the user has captured much of their own. It exists to make
// one thing tangible: that a purpose-driven walk through connected data can
// carry an initial spark of curiosity to a previously untapped spark of
// inspiration — crossing from one value stream into another on the way.
//
// Nothing here is written to the Pod or sent anywhere. These items live only in
// the browser and are shown, clearly labelled, in Explore's example mode.

// Days-ago → Date, so the demo always reads as recent.
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

// Fill an observation with the same defaults the rest of the app expects, so
// each definition below carries only what matters to the story.
function obs(o) {
  return {
    title: "",
    body: "",
    media: [],
    tags: [],
    mentions: [],
    related: [],
    lenses: [],
    efflorescence: "",
    efflorescenceType: "",
    interpretation: "",
    uncertainty: "",
    context: "",
    when: "",
    encounterMode: "",
    sensitivity: "private",
    audience: "",
    attributedTo: "you",
    type: "observation",
    revision: 1,
    modifiedAt: null,
    ...o,
  };
}

// ── The graph ────────────────────────────────────────────────────────────────
// Three journeys' worth of observations. They interlink both explicitly (the
// AI-derived `related` edges) and implicitly (shared topics and mentions that
// the Present/Explore engine joins into pages) — so trails can hop between them
// exactly the way a real graph lets curiosity wander.

export const DEMO_ITEMS = [
  // Trail 1 · Cultural appreciation → Creativity & mastery
  obs({
    id: "demo-bridge-marks",
    title: "Odd carved marks on the Rennie Bridge",
    body: "Crossing the old Rennie Bridge I noticed little chiselled symbols on the third pier — a crossed arrow, a comb shape. Ten years of walking past and I'd never seen them.",
    lenses: ["Close observation", "Culture"],
    tags: ["stone", "symbols", "bridge"],
    mentions: ["Rennie Bridge"],
    efflorescenceType: "a question",
    efflorescence: "Who cut these marks, and what were they saying?",
    encounterMode: "saw",
    media: ["https://pod.example/wiki/rennie-bridge_mason-marks_pier3.jpg"],
    related: ["demo-masons-history"],
    createdAt: daysAgo(12),
  }),
  obs({
    id: "demo-masons-history",
    title: "Mason's marks were medieval signatures",
    body: "Those symbols are banker marks — each mason cut his own into the stones he dressed, and the same signatures turn up on Kingsley Mill across town. The Guild of Masons could tally a man's work by them and vouch for its quality: a signature and a warranty in one.",
    lenses: ["Learning", "Truth & evidence", "Culture"],
    tags: ["stone", "craft", "history"],
    mentions: ["Rennie Bridge", "Guild of Masons", "Kingsley Mill"],
    efflorescenceType: "an insight",
    efflorescence: "Craft once carried its maker's name inside the work itself.",
    encounterMode: "told",
    media: ["https://pod.example/wiki/guild-of-masons_banker-marks_survey.pdf"],
    related: ["demo-bridge-marks", "demo-luthier", "demo-mark-specimen"],
    createdAt: daysAgo(9),
  }),
  obs({
    id: "demo-luthier",
    title: "The luthier who works by feel",
    body: "At the maker's market I watched Esther Vane, a luthier, thinning a violin soundboard with a finger plane — tap, listen, shave a whisker more. No calipers. The skill lived in her hands, not the measurement.",
    lenses: ["Mastery", "Close observation", "Creativity"],
    tags: ["craft", "hands", "music"],
    mentions: ["Esther Vane"],
    efflorescenceType: "something to learn",
    efflorescence: "Pick one hand-tool skill and practise it by feel this month.",
    encounterMode: "saw",
    related: ["demo-masons-history", "demo-mark-specimen"],
    createdAt: daysAgo(6),
  }),
  obs({
    id: "demo-mark-specimen",
    title: "A specimen sheet of local mason's marks",
    body: "What if I documented every banker mark on the Rennie Bridge and Kingsley Mill, then set them as a small letterpress specimen sheet — the town's anonymous makers, finally collected on one page.",
    lenses: ["Creativity", "Stewardship", "Mastery"],
    tags: ["craft", "print", "stone"],
    mentions: ["Rennie Bridge", "Kingsley Mill"],
    efflorescenceType: "something to make",
    efflorescence: "A printed specimen sheet of the district's mason's marks.",
    encounterMode: "modelling",
    media: ["https://pod.example/wiki/specimen-sheet_letterpress_draft.png"],
    related: ["demo-masons-history", "demo-luthier"],
    createdAt: daysAgo(3),
  }),

  // Trail 2 · World-risk awareness → Care & stewardship
  obs({
    id: "demo-creek-rose",
    title: "Miller's Creek rose frighteningly fast",
    body: "Two hours of rain and the creek behind the house went from ankle-deep to over the footbridge. It dropped by morning, but the speed of it stayed with me.",
    lenses: ["Risk", "Close observation"],
    tags: ["creek", "storm", "flood"],
    mentions: ["Miller's Creek"],
    efflorescenceType: "a feeling",
    efflorescence: "A jolt of how little warning we'd get.",
    encounterMode: "saw",
    related: ["demo-flood-zone"],
    createdAt: daysAgo(11),
  }),
  obs({
    id: "demo-flood-zone",
    title: "Our street sits in the 1-in-50 flood band",
    body: "Checked the council flood map. The lower houses are inside the 1-in-50 line, and the notes say intense downpours are trending up. The map is a snapshot; the risk is moving.",
    lenses: ["Risk", "Truth & evidence", "Future"],
    tags: ["flood", "maps", "climate"],
    mentions: ["Miller's Creek"],
    efflorescenceType: "an insight",
    efflorescence: "The safe line on the map isn't fixed — it drifts with the climate.",
    encounterMode: "inferred",
    media: ["https://pod.example/wiki/council_flood-map_millers-creek.pdf"],
    related: ["demo-creek-rose", "demo-neighbour"],
    createdAt: daysAgo(8),
  }),
  obs({
    id: "demo-neighbour",
    title: "Mr Alvarez is closest to the water",
    body: "Mr Alvarez, two doors down, is 82 and his bedroom faces the creek. He wouldn't hear a late-night alert, and no one's checking on him when it storms.",
    lenses: ["Care", "Values"],
    tags: ["neighbours", "community"],
    mentions: ["Mr Alvarez", "Miller's Creek"],
    efflorescenceType: "something to do",
    efflorescence: "Make sure someone reaches him first when the creek rises.",
    encounterMode: "remembered",
    sensitivity: "sensitive",
    related: ["demo-flood-zone", "demo-phone-tree"],
    createdAt: daysAgo(5),
  }),
  obs({
    id: "demo-phone-tree",
    title: "A flood phone tree for the street",
    body: "When the creek gauge passes a mark, three of us each ring three neighbours — Mr Alvarez first. Low-tech, no app, works in a blackout. A page of names is the whole system.",
    lenses: ["Stewardship", "Conversation", "Society & environment", "Problem solving"],
    tags: ["community", "safety", "flood"],
    mentions: ["Mr Alvarez"],
    efflorescenceType: "something to protect",
    efflorescence: "A street flood-alert phone tree that reaches the most exposed first.",
    encounterMode: "modelling",
    media: ["https://pod.example/wiki/street_phone-tree_contacts.txt"],
    related: ["demo-neighbour"],
    createdAt: daysAgo(2),
  }),

  // Trail 3 · Calm & groundedness → Universal love
  obs({
    id: "demo-morning-light",
    title: "Ten minutes of morning light",
    body: "Coffee at the kitchen window before anyone was up, watching the low winter light come up Halden Street. Steam curling, nothing else moving. Nothing happened, and that was the whole point.",
    lenses: ["Groundedness", "Close observation"],
    tags: ["morning", "light", "stillness"],
    mentions: ["Halden Street"],
    efflorescenceType: "a feeling",
    efflorescence: "A settledness worth protecting.",
    encounterMode: "saw",
    related: ["demo-coffee-ritual"],
    createdAt: daysAgo(7),
  }),
  obs({
    id: "demo-coffee-ritual",
    title: "The coffee is really a ritual",
    body: "The coffee isn't the point — the pause is. Same three minutes, same chair. A small daily hinge between sleep and the day's demands.",
    lenses: ["Appreciation", "Enjoyment"],
    tags: ["coffee", "ritual", "morning"],
    efflorescenceType: "something to appreciate",
    efflorescence: "A tiny reliable joy that asks nothing of anyone.",
    encounterMode: "inferred",
    related: ["demo-morning-light", "demo-bus-driver"],
    createdAt: daysAgo(4),
  }),
  obs({
    id: "demo-bus-driver",
    title: "The 6am driver always waits a beat",
    body: "Mr Okafor, the early driver, holds the bus a moment at the Halden Street stop for the runners every morning, unthanked. That small unglamorous kindness keeps a lot of people's mornings from unravelling.",
    lenses: ["Universal love", "Care", "Appreciation"],
    tags: ["kindness", "community"],
    mentions: ["Mr Okafor", "Halden Street"],
    efflorescenceType: "an idea",
    efflorescence: "Leave a written thank-you for Mr Okafor and the early-shift drivers.",
    encounterMode: "saw",
    related: ["demo-coffee-ritual"],
    createdAt: daysAgo(1),
  }),

  // A reading note — gives the graph a doc-with-file to show and gives Ask a
  // clean grounding case ("did I read Jurassic Park?" → no; the wiki holds this).
  obs({
    id: "demo-reading-overstory",
    title: "Finished reading The Overstory",
    body: "Finished Richard Powers' The Overstory on the porch this evening. The chestnut chapters landed hardest — a family photographing one tree for a century. It reframed the street trees on Halden Street as slow neighbours rather than scenery.",
    lenses: ["Learning", "Appreciation"],
    tags: ["books", "reading", "trees"],
    mentions: ["Richard Powers", "Halden Street"],
    efflorescenceType: "an idea",
    efflorescence: "Photograph the Halden Street plane tree once a month, for years.",
    encounterMode: "read",
    media: ["https://pod.example/wiki/the-overstory_reading-notes.md"],
    related: ["demo-morning-light"],
    createdAt: daysAgo(10),
  }),
];

export const DEMO_BY_ID = new Map(DEMO_ITEMS.map((it) => [it.id, it]));

// ── The person behind the graph ──────────────────────────────────────────────
// Reflect reads a whole life back from above, so the example needs a life to
// read — a concrete "someone who gains". This is that person: the same quietly
// observant note-taker behind the Explore trails and the Ask examples, now seen
// whole. Each `gains` entry names the eudaimonic value streams (user journeys)
// the trail serves and what Reflect drew out of the raw notes. Story only;
// nothing here is written to the Pod or sent anywhere.

export const DEMO_STORY = {
  intro:
    "These are a few weeks in the life of one quietly observant person. They walk " +
    "the same streets most days, and lately they've started jotting down the small " +
    "things they notice — a carved mark on an old bridge, how fast the creek rose " +
    "one night, ten still minutes at the kitchen window. On its own each note is a " +
    "scrap. Read back together, Reflect shows them a shape they couldn't see from " +
    "inside the days: a life quietly reaching toward flourishing.",
  gains: [
    {
      journeys: ["Cultural appreciation", "Skill & mastery", "Creativity"],
      surfaced:
        "A symbol they'd walked past for ten years pulled them into the history of " +
        "local craft — and out the other side with something of their own to make: " +
        "a printed specimen sheet of the district's forgotten mason's marks.",
    },
    {
      journeys: ["World-risk awareness", "Care", "Stewardship"],
      surfaced:
        "A fright about how fast the creek rose became an understanding of the flood " +
        "band their street sits in — then a recognition of the neighbour most exposed " +
        "to it, and a low-tech phone tree to reach him first when it storms.",
    },
    {
      journeys: ["Calm & groundedness", "Universal love", "Noticing"],
      surfaced:
        "Guarding one small morning ritual taught them to notice the unthanked " +
        "kindnesses that hold ordinary days together — the bus driver who always " +
        "waits a beat — and to want to return them.",
    },
  ],
};

// ── Curiosity trails ─────────────────────────────────────────────────────────
// Each trail is a purpose-driven sequence of navigational hops: a starting
// curiosity, the queries that follow one connection to the next, and the
// inspiration it arrives at. The `connector` on each step names *why* the hop
// happens — the shared topic, shared place, or AI-drawn link the walk followed.
// Every trail deliberately crosses value streams at least once (`turn: true`),
// which is where the previously-untapped spark tends to appear.

export const DEMO_TRAILS = [
  {
    id: "trail-bridge",
    from: "Cultural appreciation",
    to: "Creativity & mastery",
    title: "A carved mark becomes something to make",
    hook: "A symbol you'd walked past for years pulls you into the history of craft — and, by way of a stranger's hands, out the other side with a project of your own.",
    steps: [
      { id: "demo-bridge-marks", role: "Spark of curiosity", connector: null },
      { id: "demo-masons-history", role: "Analysis", connector: "followed the topic · stone" },
      { id: "demo-luthier", role: "Unexpected turn", connector: "AI-linked · craft", turn: true },
      { id: "demo-mark-specimen", role: "Spark of inspiration", connector: "followed the topic · craft" },
    ],
  },
  {
    id: "trail-creek",
    from: "World-risk awareness",
    to: "Care & stewardship",
    title: "A fright about fast water becomes a safeguard",
    hook: "Noticing how quickly the creek rose leads through the flood maps to the neighbour most exposed — and to a concrete way to protect him.",
    steps: [
      { id: "demo-creek-rose", role: "Spark of curiosity", connector: null },
      { id: "demo-flood-zone", role: "Analysis", connector: "same place · Miller's Creek" },
      { id: "demo-neighbour", role: "A turn toward care", connector: "AI-linked · who's exposed", turn: true },
      { id: "demo-phone-tree", role: "Spark of inspiration", connector: "followed the topic · community" },
    ],
  },
  {
    id: "trail-morning",
    from: "Calm & groundedness",
    to: "Universal love",
    title: "A quiet ten minutes widens into a kindness",
    hook: "A still moment at the window turns into noticing a small daily ritual — and then an unthanked kindness you want to return.",
    steps: [
      { id: "demo-morning-light", role: "Spark of curiosity", connector: null },
      { id: "demo-coffee-ritual", role: "Analysis", connector: "same time of day · morning" },
      { id: "demo-bus-driver", role: "Spark of inspiration", connector: "AI-linked · a shared kindness", turn: true },
    ],
  },
];

// ── Exploration chains ────────────────────────────────────────────────────────
// The same graph, walked as *problem-solving* rather than idle wandering. Each
// chain is an Epiphantic-style arc — it turns a felt problem into an integrated
// solution — themed to one of the user journeys and led with its payoff, so the
// benefit is legible before you take a single step. Each hop carries an
// Epiphantic `phase` (the move being made) alongside its narrative `role`, and
// still resolves to a real, clickable observation in the graph above.

export const EXPLORE_CHAINS = [
  {
    id: "chain-bridge",
    journey: "Cultural appreciation → Creativity",
    icon: "🏛️",
    problem: "A curiosity with nowhere to land: whose marks are these, and why do they matter?",
    payoff: "You end up with something to make — the district's forgotten makers, collected on one page.",
    from: "Cultural appreciation",
    to: "Creativity & mastery",
    steps: [
      { id: "demo-bridge-marks", phase: "Problem seed", role: "A mark you can't explain", connector: null },
      { id: "demo-masons-history", phase: "Impasse mapped", role: "The makers are anonymous, unrecorded", connector: "followed the topic · stone" },
      { id: "demo-luthier", phase: "Candidate component", role: "A component appears: craft lives in the hands", connector: "AI-linked · craft", turn: true },
      { id: "demo-mark-specimen", phase: "Offered solution", role: "The resolution: preserve them, and make", connector: "followed the topic · craft" },
    ],
  },
  {
    id: "chain-creek",
    journey: "World-risk awareness → Care",
    icon: "🌊",
    problem: "Fast water and little warning — and no one has worked out who is most exposed.",
    payoff: "You end up with a safeguard that reaches the most vulnerable neighbour first, even in a blackout.",
    from: "World-risk awareness",
    to: "Care & stewardship",
    steps: [
      { id: "demo-creek-rose", phase: "Problem seed", role: "The fright: how fast it rose", connector: null },
      { id: "demo-flood-zone", phase: "Impasse mapped", role: "The risk is real, and moving", connector: "same place · Miller's Creek" },
      { id: "demo-neighbour", phase: "Target outcome", role: "What matters: reach the most exposed first", connector: "AI-linked · who's exposed", turn: true },
      { id: "demo-phone-tree", phase: "Deployed resolution", role: "A low-tech phone tree that just works", connector: "followed the topic · community" },
    ],
  },
  {
    id: "chain-morning",
    journey: "Calm & groundedness → Universal love",
    icon: "☕",
    problem: "The day's demands keep eroding your calm — and the small kindnesses that steady others go unthanked.",
    payoff: "You end up protecting one grounding ritual, and returning a kindness you'd stopped seeing.",
    from: "Calm & groundedness",
    to: "Universal love",
    steps: [
      { id: "demo-morning-light", phase: "Problem seed", role: "The pull of the day's demands", connector: null },
      { id: "demo-coffee-ritual", phase: "Component identified", role: "The hinge that protects the calm", connector: "same time of day · morning" },
      { id: "demo-bus-driver", phase: "Offered solution", role: "Return the unthanked kindness", connector: "AI-linked · a shared kindness", turn: true },
    ],
  },
];
