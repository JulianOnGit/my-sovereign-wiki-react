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
