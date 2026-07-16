// Seed observations — a rich, cross-linked demo graph so the Wiki reads like a
// living notebook even before the user has captured anything of their own.
//
// These are plain observation items in exactly the shape lib/pod.js#thingToItem
// produces, so every derived view (articles, topics, wikilinks, connections)
// works on them unchanged. They are used ONLY as a fallback when the Pod has no
// items yet: the moment the user captures a real observation, their own graph
// takes over and the seed disappears.
//
// The set is built to walk the eighteen user journeys the app is designed
// around — one observation per journey — and each note traces the full arc of a
// journey through the data model: body = observation, interpretation = analysis,
// efflorescence/efflorescenceType = the journey's characteristic efflorescence,
// encounterMode + mentions = attribution, uncertainty + sensitivity = safety,
// and the actionable efflorescence = responsibility. The lens on each note is
// the journey it realises.
//
//   Cultural appreciation ─ World-risk awareness ─ Care ─ Moral philosophy ─
//   Epistemology ─ Creativity ─ Future modelling ─ Learning ─ Leisure ─
//   Calmness & groundedness ─ Love of life & benevolence ─ Love of the world &
//   society ─ Love of the conversational partner ─ Universal love ─ Noticing &
//   awareness ─ Skill & mastery ─ Ingenuity & problem-solving ─ Stewardship.
//
// The register is deliberately contemporary — work, the city, digital life,
// health, family, systems — rather than pastoral, and recurring people (Nora,
// Eric, Priya, Sam) and concepts (Attention, Trust, Provenance, Reciprocity,
// Systems thinking, Signal-vs-noise, Deep time) co-occur across many notes, so
// topic pages cross-link into a real web rather than a list of orphans.

// Prototype seed items carry an `id` starting with "seed-" so the UI can tell
// them apart from real Pod things (and, e.g., not offer to delete them).
export const isSeedId = (id) => typeof id === "string" && id.startsWith("seed-");

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d;
};

// Fill in the defaults every WikiItem carries so seed notes only declare what
// they actually set — keeping the data below readable.
function obs(o) {
  return {
    title: "",
    body: "",
    media: [],
    tags: [],
    type: "observation",
    encounterMode: "",
    context: "",
    when: "",
    interpretation: "",
    uncertainty: "",
    efflorescence: "",
    efflorescenceType: "",
    lenses: [],
    sensitivity: "private",
    audience: "",
    attributedTo: "user",
    modifiedAt: null,
    revision: 1,
    mentions: [],
    related: [],
    ...o,
    createdAt: daysAgo(o.createdAtDaysAgo ?? 0),
  };
}

export const SEED_ITEMS = [
  // ── Cultural appreciation ──────────────────────────────────────────────────
  obs({
    id: "seed-lion-dance",
    createdAtDaysAgo: 1,
    title: "The lion dance stopped George Street",
    body:
      "A lion dance troupe wound between the office towers at lunch — drums cracking " +
      "off the glass, the lion bowing at each shopfront for the red envelopes. Priya's " +
      "cousins run the troupe; she said the bow isn't performance, it's a blessing the " +
      "shop is meant to pay forward all year.",
    tags: ["Ritual", "Reciprocity", "Belonging"],
    mentions: ["Priya"],
    encounterMode: "saw",
    context: "George Street, lunch hour",
    when: "today",
    interpretation:
      "What read as street theatre to the crowd filming it was a live economy of " +
      "blessing and obligation — the culture is the meaning, not the spectacle. " +
      "Reciprocity again: nothing is meant to leave empty-handed.",
    uncertainty:
      "Where's the line between appreciating a tradition that isn't mine and turning it " +
      "into content? A hundred phones were up, and mine nearly joined them.",
    efflorescenceType: "something to appreciate",
    efflorescence:
      "Ask Priya to walk me through the troupe's etiquette before next year — and watch it without filming.",
    lenses: ["Culture", "Appreciation", "Universal love"],
    related: ["seed-safe-word", "seed-community-garden"],
  }),

  // ── World-risk awareness ───────────────────────────────────────────────────
  obs({
    id: "seed-safe-word",
    createdAtDaysAgo: 3,
    title: "The scam call used my cousin's voice",
    body:
      "Nora rang shaken — a call in what sounded exactly like my cousin Jesse's voice, " +
      "crying, needing bail money wired right now. Jesse was asleep three suburbs away. " +
      "Thirty seconds of his podcast is all a voice-clone needs.",
    tags: ["Trust", "Provenance", "Risk"],
    mentions: ["Nora"],
    encounterMode: "told",
    context: "phone, evening",
    interpretation:
      "The attack surface isn't the technology, it's the trust between people who love " +
      "each other. You can't out-tech a forged voice; you can only agree on a secret the " +
      "forgery won't know.",
    uncertainty:
      "How many of the family are reachable enough to actually set this up before someone loses money to it?",
    efflorescenceType: "something to protect",
    efflorescence:
      "Set a family safe-word this week, and teach Nora to hang up and call back on a known number — always.",
    lenses: ["Risk", "Care", "Truth & evidence"],
    sensitivity: "sensitive",
    related: ["seed-misleading-chart", "seed-quiet-teammate"],
  }),

  // ── Care ───────────────────────────────────────────────────────────────────
  obs({
    id: "seed-quiet-teammate",
    createdAtDaysAgo: 5,
    title: "Sam went quiet in the standup",
    body:
      "Sam's camera's been off a week and his messages have shrunk to thumbs-up reacts. " +
      "Today he pushed commits at 2am and again at 6am. I DMed 'not about work — you okay?' " +
      "and we ended up on a call for an hour.",
    tags: ["Care", "Attention", "Belonging"],
    mentions: ["Sam"],
    encounterMode: "inferred",
    context: "remote work",
    interpretation:
      "The signal wasn't in what he said, it was in the shape of his absence. Care starts " +
      "as noticing a pattern and being willing to look foolish for asking about it.",
    uncertainty:
      "Did reaching out help, or just add 'manage my lead's worry' to his load? I can't always tell.",
    efflorescenceType: "something to do",
    efflorescence:
      "Quietly cover his on-call this fortnight, and check whether the team's load is the actual leak.",
    lenses: ["Care", "Close observation", "Conversation"],
    sensitivity: "sensitive",
    related: ["seed-hard-conversation", "seed-upstream-bug"],
  }),

  // ── Moral philosophy ───────────────────────────────────────────────────────
  obs({
    id: "seed-dark-pattern",
    createdAtDaysAgo: 8,
    title: "The metric that wanted me to lie a little",
    body:
      "We could lift retention 4% by defaulting the notifications toggle to on and burying " +
      "the off switch two screens deep. The deck called it 'reducing friction.' It's the exact " +
      "move I resent when other apps pull it on me.",
    tags: ["Values", "Integrity", "Trust"],
    mentions: ["Priya"],
    encounterMode: "saw",
    context: "product review",
    interpretation:
      "A dark pattern is a small betrayal amortised across a million users, so no single one " +
      "is big enough to feel. The test of a value is whether it costs you the 4% — otherwise " +
      "it's just a preference.",
    uncertainty:
      "Is refusing the easy win principled, or a luxury I can afford because I'm not the one carrying the growth target?",
    efflorescenceType: "a question",
    efflorescence:
      "Argue for opt-in as the default and measure honest retention instead. Write down what I'd want done to me.",
    lenses: ["Values", "Truth & evidence", "Stewardship"],
    related: ["seed-misleading-chart", "seed-safe-word"],
  }),

  // ── Epistemology ───────────────────────────────────────────────────────────
  obs({
    id: "seed-misleading-chart",
    createdAtDaysAgo: 11,
    title: "The chart that lied with a true axis",
    body:
      "A post went viral showing a 'collapse' — until you noticed the y-axis started at 94%. " +
      "The numbers were all real; the framing did the deceiving. Priya pointed out the same " +
      "trick hides in half the dashboards we ship ourselves.",
    tags: ["Calibration", "Signal vs noise", "Provenance"],
    mentions: ["Priya"],
    encounterMode: "saw",
    context: "social feed",
    interpretation:
      "Truth and framing are independent variables — exactly like confidence and accuracy. " +
      "A fact can be marshalled to mislead without a single false number in it.",
    uncertainty:
      "How do I audit my own charts for this without turning into the person who distrusts every graph on principle?",
    efflorescenceType: "something to learn",
    efflorescence:
      "Read up on calibration and axis honesty; add a 'does the axis start at zero, and should it?' step to our review.",
    lenses: ["Truth & evidence", "Risk", "Problem solving"],
    related: ["seed-safe-word", "seed-dark-pattern"],
  }),

  // ── Creativity ─────────────────────────────────────────────────────────────
  obs({
    id: "seed-found-sound",
    createdAtDaysAgo: 14,
    title: "We built a whole track from a bus-brake squeal",
    body:
      "Sampled the pneumatic hiss of the 380's brakes, pitched it down two octaves, and it " +
      "became the bassline. Four hours in the studio with Eric and we had a track that started " +
      "as street noise nobody else heard as music.",
    tags: ["Craft", "Remix", "Play"],
    mentions: ["Eric"],
    encounterMode: "saw",
    context: "the studio",
    interpretation:
      "Creativity is mostly re-hearing the ordinary as raw material. The interesting edge is " +
      "where deliberate craft meets a sound I didn't compose — the city co-wrote it.",
    uncertainty:
      "When does sampling honour a source and when does it just strip-mine it? A bus can't consent, but people can.",
    efflorescenceType: "something to make",
    efflorescence:
      "An EP of 'found city' tracks — one sound sampled from the commute each week for a season.",
    lenses: ["Creativity", "Close observation", "Enjoyment"],
    related: ["seed-latte-art", "seed-lion-dance"],
  }),

  // ── Future modelling ───────────────────────────────────────────────────────
  obs({
    id: "seed-three-futures",
    createdAtDaysAgo: 17,
    title: "Three futures on the kitchen whiteboard",
    body:
      "Spent the evening sketching three five-year paths — stay and go deep, jump to the " +
      "startup, go independent. Not to pick one, but to see which risks show up in all three. " +
      "Debt and burnout were in every branch.",
    tags: ["Deep time", "Systems thinking", "Foresight"],
    encounterMode: "modelling",
    context: "kitchen whiteboard",
    interpretation:
      "A model's value isn't the prediction, it's the invariants it exposes — the things true " +
      "down every branch are the ones actually worth managing now, before I've chosen.",
    uncertainty:
      "Am I modelling to decide, or modelling to feel in control of something that's mostly luck and timing?",
    efflorescenceType: "an idea",
    efflorescence:
      "Build a runway buffer that de-risks all three paths, then decide from safety instead of fear.",
    lenses: ["Future", "Groundedness", "Problem solving"],
    related: ["seed-plateau-break", "seed-upstream-bug"],
  }),

  // ── Learning ───────────────────────────────────────────────────────────────
  obs({
    id: "seed-plateau-break",
    createdAtDaysAgo: 20,
    title: "Three weeks stuck, then the pattern clicked",
    body:
      "Kept bouncing off async Rust — the borrow checker fighting me every line. Then one " +
      "mental model landed ('who owns this, and for how long?') and a week of confusion " +
      "reorganised itself in a single afternoon.",
    tags: ["Learning", "Mastery", "Calibration"],
    mentions: ["Eric"],
    encounterMode: "saw",
    context: "learning at night",
    interpretation:
      "Learning isn't linear accumulation; it's sudden re-crystallisation around one key idea. " +
      "The flat, frustrating weeks were the pressure that made the phase change possible.",
    uncertainty:
      "Can I trust a plateau enough to stay in it, when being stuck and being about-to-break feel identical from inside?",
    efflorescenceType: "something to learn",
    efflorescence:
      "Keep a 'stuck log' — note each plateau and the key that eventually broke it, so I trust the next one.",
    lenses: ["Learning", "Mastery", "Problem solving"],
    related: ["seed-latte-art", "seed-three-futures"],
  }),

  // ── Leisure ────────────────────────────────────────────────────────────────
  obs({
    id: "seed-pickup-game",
    createdAtDaysAgo: 23,
    title: "Five-a-side with total strangers",
    body:
      "Turned up alone to the Tuesday court, got waved onto a team, and for ninety minutes " +
      "nobody knew or cared what anyone did for work. Pure play — nutmegged a guy, got nutmegged " +
      "right back, laughed either way.",
    tags: ["Play", "Flow", "Belonging"],
    encounterMode: "saw",
    context: "the community court",
    when: "Tuesday night",
    interpretation:
      "Joy that serves no purpose isn't wasted; it's the point the useful hours are in service " +
      "of. The uselessness is the whole feature, not a bug to justify.",
    uncertainty:
      "Why do I keep needing to reframe leisure as 'recovery' instead of just letting it be good on its own?",
    efflorescenceType: "something to appreciate",
    efflorescence: "Make Tuesday football a standing, undeletable line in the calendar.",
    lenses: ["Enjoyment", "Groundedness", "Universal love"],
    related: ["seed-phone-free-hour", "seed-sunrise-run"],
  }),

  // ── Calmness & groundedness ────────────────────────────────────────────────
  obs({
    id: "seed-phone-free-hour",
    createdAtDaysAgo: 26,
    title: "The first hour, no glass",
    body:
      "Left the phone charging in the kitchen and had coffee on the back step before the feed " +
      "could tell me what to feel. Magpie carolling, steam off the mug, cold tiles. Nothing " +
      "happened, which was exactly the point.",
    tags: ["Attention", "Rest", "Stillness"],
    encounterMode: "saw",
    when: "just after sunrise",
    context: "the back step",
    interpretation:
      "Calm isn't an achievement to unlock; it's a channel that's always on, drowned out by the " +
      "noise I choose to import. The apps are engineered to harvest the exact attention stillness needs.",
    uncertainty:
      "Does naming it 'a practice' quietly turn peace into one more task I can fail at?",
    efflorescenceType: "an insight",
    efflorescence:
      "Guard the first waking hour as phone-free — protect the input, not just the output.",
    lenses: ["Groundedness", "Risk", "Close observation"],
    related: ["seed-pickup-game", "seed-sunrise-run"],
  }),

  // ── Love of life & benevolence ─────────────────────────────────────────────
  obs({
    id: "seed-sunrise-run",
    createdAtDaysAgo: 29,
    title: "First run since the surgery",
    body:
      "Cleared to run again. Made four slow kilometres along the river as the sun came up and " +
      "had to stop — not winded, just flooded with gratitude that this body still does this at " +
      "all. Grinned at every stranger on the path.",
    tags: ["Gratitude", "Vitality", "Wonder"],
    encounterMode: "saw",
    context: "the river path",
    when: "dawn",
    interpretation:
      "Coming back from losing something recalibrates the baseline. Ordinary function, once it's " +
      "been in doubt, reveals itself as the miracle it always was — and the goodwill just overflows.",
    uncertainty:
      "Will the gratitude survive contact with a normal stressful Tuesday, or fade the moment health goes back to background?",
    efflorescenceType: "something to appreciate",
    efflorescence:
      "Bank this feeling — a note to my future self for the days I'm ungrateful for a working body.",
    lenses: ["Appreciation", "Universal love", "Groundedness"],
    sensitivity: "sensitive",
    related: ["seed-phone-free-hour", "seed-pickup-game"],
  }),

  // ── Love of the world & society ────────────────────────────────────────────
  obs({
    id: "seed-community-garden",
    createdAtDaysAgo: 32,
    title: "The verge nobody owned, now everyone does",
    body:
      "The dead strip by the station is a garden now — a dozen neighbours, one working bee, a " +
      "'take what you need' herb bed. Met more of my own street in one Saturday than in three " +
      "years of living here.",
    tags: ["Stewardship", "Community", "Reciprocity"],
    mentions: ["Nora"],
    encounterMode: "saw",
    context: "the station verge",
    when: "Saturday",
    interpretation:
      "Shared stewardship of a small commons manufactures the neighbourliness we keep saying has " +
      "vanished. You don't find community and then act; you act and community precipitates out.",
    uncertainty:
      "Who waters it in February when the novelty's gone? Commons die of quiet Tuesdays, not grand failures.",
    efflorescenceType: "something to do",
    efflorescence: "Set up a dead-simple watering roster so it survives its own honeymoon.",
    lenses: ["Society & environment", "Stewardship", "Care"],
    related: ["seed-lion-dance", "seed-repo-left-better"],
  }),

  // ── Love of the conversational partner ─────────────────────────────────────
  obs({
    id: "seed-hard-conversation",
    createdAtDaysAgo: 35,
    title: "I steelmanned the thing I hated",
    body:
      "Tense disagreement with Sam over the re-org. Instead of reloading my argument while he " +
      "talked, I tried to say his case back better than he'd put it himself. He went quiet, then: " +
      "'okay, you actually get it.' The heat left the room.",
    tags: ["Listening", "Trust", "Care"],
    mentions: ["Sam"],
    encounterMode: "saw",
    context: "one-on-one",
    interpretation:
      "Being heard is disarming in a way winning never is. The efflorescence of a conversation " +
      "isn't agreement — it's the other person feeling accurately understood before you differ.",
    uncertainty:
      "Is steelmanning always honest, or can it become a technique — performing understanding to lower someone's guard?",
    efflorescenceType: "an insight",
    efflorescence:
      "In any hard talk, earn the right to respond by restating their point until they actually nod.",
    lenses: ["Conversation", "Care", "Universal love"],
    related: ["seed-quiet-teammate", "seed-night-bus"],
  }),

  // ── Universal love for all ─────────────────────────────────────────────────
  obs({
    id: "seed-night-bus",
    createdAtDaysAgo: 38,
    title: "The driver waited for the running man",
    body:
      "Last bus, and the driver saw a man sprinting half a block back — held the doors, engine " +
      "idling, for nothing but kindness. The whole tired bus softened. One unrequired mercy " +
      "rearranged a dozen moods at midnight.",
    tags: ["Compassion", "Reciprocity", "Belonging"],
    encounterMode: "saw",
    context: "the night bus",
    when: "midnight",
    interpretation:
      "Goodwill is contagious in a way cynicism pretends it isn't. An unrequired kindness is a " +
      "public good — it pays out to strangers who'll never trace it back to the giver.",
    uncertainty:
      "Why is it easier to believe in the spread of cruelty than of kindness, when I keep catching the latter in the act?",
    efflorescenceType: "something to do",
    efflorescence:
      "Look for one chance a day to be the person who holds the door — literal or otherwise.",
    lenses: ["Universal love", "Care", "Appreciation"],
    related: ["seed-hard-conversation", "seed-community-garden"],
  }),

  // ── Noticing & awareness ───────────────────────────────────────────────────
  obs({
    id: "seed-anomaly-logs",
    createdAtDaysAgo: 41,
    title: "The 3ms nobody else saw",
    body:
      "Everyone called the latency graph flat. But one endpoint had a faint sawtooth — 3ms " +
      "creeping up, resetting on every deploy. A memory leak, weeks away from taking down prod, " +
      "hiding inside 'normal'.",
    tags: ["Attention", "Signal vs noise", "Systems thinking"],
    mentions: ["Priya"],
    encounterMode: "saw",
    context: "on-call",
    interpretation:
      "Acute attention is a trainable skill, not a mood. The longer I held the graph, the more the " +
      "pattern separated from the noise — the same stillness that makes a bird appear out of the reeds.",
    uncertainty:
      "How many real anomalies do I miss because I glance where I should stare? And how much staring is just anxiety in disguise?",
    efflorescenceType: "something to appreciate",
    efflorescence:
      "Slowness is a form of respect — for a place, a person, or a system. Meet each on its own timescale.",
    lenses: ["Close observation", "Problem solving", "Groundedness"],
    related: ["seed-upstream-bug", "seed-misleading-chart"],
  }),

  // ── Skill & mastery ────────────────────────────────────────────────────────
  obs({
    id: "seed-latte-art",
    createdAtDaysAgo: 44,
    title: "The rosetta finally poured clean",
    body:
      "Six weeks of ugly blobs, then this morning the milk folded into a clean rosetta first " +
      "try — right pour height, right wrist, no thinking. The moment the technique disappears and " +
      "it just happens.",
    tags: ["Craft", "Mastery", "Flow"],
    mentions: ["Eric"],
    encounterMode: "saw",
    context: "the kitchen",
    interpretation:
      "Mastery is mostly the patience to stay through the boring, ugly middle. The breakthrough is " +
      "an invisible hundred reps cashing in at once — the tool, or the milk, disappears when it's right.",
    uncertainty:
      "How do I tell productive patience from stubbornly flogging a dead technique? They feel identical until one of them breaks.",
    efflorescenceType: "an insight",
    efflorescence:
      "Breakthroughs are back-loaded: the plateau IS the work, not the wait before the work starts.",
    lenses: ["Mastery", "Creativity", "Close observation"],
    related: ["seed-plateau-break", "seed-found-sound"],
  }),

  // ── Ingenuity & problem-solving ────────────────────────────────────────────
  obs({
    id: "seed-upstream-bug",
    createdAtDaysAgo: 47,
    title: "The bug was six services upstream",
    body:
      "Chased a corrupt cart total for two days at the checkout. The bad value entered a currency " +
      "service three hops back and rode a queue before surfacing where nobody was looking. Symptom " +
      "and cause shared no code at all.",
    tags: ["Systems thinking", "Debugging", "Craft"],
    mentions: ["Eric"],
    encounterMode: "inferred",
    context: "the incident channel",
    interpretation:
      "Symptoms are where problems surface, not where they live. Eric's rule — 'trace the water, " +
      "don't patch the stain' — is really a rule about every system, arguments and org charts included.",
    uncertainty:
      "How often am I patching the visible stain in my own habits while the real leak runs on upstream, unwatched?",
    efflorescenceType: "an idea",
    efflorescence:
      "A team runbook: before fixing a recurring incident, trace it to where the bad data actually enters.",
    lenses: ["Problem solving", "Mastery", "Stewardship"],
    related: ["seed-anomaly-logs", "seed-three-futures"],
  }),

  // ── Stewardship ────────────────────────────────────────────────────────────
  obs({
    id: "seed-repo-left-better",
    createdAtDaysAgo: 50,
    title: "Left the codebase better than I found it",
    body:
      "The onboarding docs that cost me a week were still wrong for the next hire. Spent a Friday " +
      "fixing them and deleting 200 lines of dead config nobody had dared touch. Sam merged it with " +
      "a single '🙏'.",
    tags: ["Stewardship", "Reciprocity", "Deep time"],
    mentions: ["Sam"],
    encounterMode: "saw",
    context: "the repo",
    when: "Friday afternoon",
    interpretation:
      "Stewardship is paying forward to a stranger — the next hire I'll never meet. The campsite rule " +
      "scales: leave every system a little better than you found it and the commons compounds quietly.",
    uncertainty:
      "Does invisible maintenance get valued anywhere it actually counts, or only when it's absent and something breaks?",
    efflorescenceType: "something to do",
    efflorescence:
      "Make 'leave-it-better' a standing habit — one small unasked-for improvement per repo I touch.",
    lenses: ["Stewardship", "Problem solving", "Universal love"],
    related: ["seed-community-garden", "seed-upstream-bug"],
  }),
];
