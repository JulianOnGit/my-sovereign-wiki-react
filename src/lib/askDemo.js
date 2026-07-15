// Simulated & derived content for the "Ask your Wiki" stage.
//
// The Ask page is grounded RAG over the user's own Pod — but on a fresh Pod it
// would be a blank box with nothing to retrieve. So, exactly like Explore, Ask
// falls back to the curated demo graph (see demoData.js) and shows a set of
// example questions plus a plausible question history. Both are written to land
// on the demo graph, so every example actually returns a grounded, cited answer.
//
// Each entry is tagged with the eudaimonic *value stream* (user journey) it
// serves and the point in that journey's arc it probes —
// observation → analysis → efflorescence → attribution → safety/responsibility —
// so the mapping from "a question" to "a way of living well" stays legible.
//
// Nothing here is written to the Pod or sent anywhere; it lives only in the
// browser and is clearly labelled as an example.

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

// ── Example questions ────────────────────────────────────────────────────────
// Curated to hit the three demo trails (craft/history, flood/care, calm/love)
// while spanning as many user journeys as the sample graph can honestly answer.

export const ASK_EXAMPLES = [
  {
    journey: "Cultural appreciation",
    icon: "🏛️",
    query: "What have I noticed about local craft, and where did those traditions come from?",
    probes: "observation → analysis",
  },
  {
    journey: "World-risk awareness",
    icon: "🌊",
    query: "How is the flood risk near my home changing over time?",
    probes: "risk observation → attribution",
  },
  {
    journey: "Care",
    icon: "🫶",
    query: "Who around me is most exposed when the creek rises, and how could I look out for them?",
    probes: "care observation → responsibility",
  },
  {
    journey: "Creativity",
    icon: "🎨",
    query: "What could I make from the things I've been observing on my walks?",
    probes: "immersion → efflorescence",
  },
  {
    journey: "Stewardship",
    icon: "🛠️",
    query: "What small thing could make my street safer than it was before?",
    probes: "embetterment → benefaction",
  },
  {
    journey: "Calmness & groundedness",
    icon: "🌅",
    query: "Which small daily rituals keep me steady?",
    probes: "regulatory observation → insight",
  },
  {
    journey: "Universal love & benevolence",
    icon: "💛",
    query: "Where have I seen quiet, everyday kindness lately?",
    probes: "gratitude observation → good-will efflorescence",
  },
  {
    journey: "Learning",
    icon: "📚",
    query: "What have I recently understood that I didn't know before?",
    probes: "knowledge observation → productive efflorescence",
  },
];

// ── Question history ─────────────────────────────────────────────────────────
// A plausible trail of past questions, so the page reads as one you return to
// rather than start cold. `sources` is how many Pod resources that answer was
// grounded in — the same provenance count the live answer reports. Re-running
// any of these runs real retrieval over the active graph.

export const ASK_HISTORY = [
  {
    query: "What was that thing about mason's marks being signatures?",
    journey: "Cultural appreciation",
    sources: 2,
    at: daysAgo(2),
  },
  {
    query: "Remind me who I need to reach first if the creek floods",
    journey: "Care",
    sources: 3,
    at: daysAgo(4),
  },
  {
    query: "What creative projects have emerged from what I've seen?",
    journey: "Creativity",
    sources: 2,
    at: daysAgo(6),
  },
  {
    query: "What am I quietly grateful for this week?",
    journey: "Love of life",
    sources: 3,
    at: daysAgo(9),
  },
  {
    query: "What did I decide about the flood phone tree?",
    journey: "Stewardship",
    sources: 2,
    at: daysAgo(12),
  },
];

// ── Inspiration loop ─────────────────────────────────────────────────────────
// A self-running "the AI is thinking of questions for you" reel that sits under
// the search box before you've asked anything. Each entry is a question the wiki
// could raise on your behalf and a grounded-feeling answer drawn from the demo
// graph. The UI types the question out, "thinks", then reveals the answer with a
// Read more — an impression of a mind at work, purely decorative but honest that
// it's an example. Clicking a question runs it for real against the graph.

export const ASK_INSPIRATIONS = [
  {
    journey: "Cultural appreciation",
    icon: "🏛️",
    question: "What thread runs through the small things you've noticed on your walks?",
    answer:
      "A quiet fascination with makers. The carved mason's marks on the Rennie Bridge, " +
      "the luthier thinning a soundboard by feel at the market — again and again you stop " +
      "for the anonymous craft hidden in everyday things. Your notes read like someone " +
      "learning to see the hand behind the object, and starting to want to make something " +
      "of their own from it.",
  },
  {
    journey: "Care",
    icon: "🫶",
    question: "Is there anyone you've written about who could use looking out for?",
    answer:
      "Mr Alvarez keeps surfacing. He's 82, two doors down, and his bedroom faces Miller's " +
      "Creek — the note flags he wouldn't hear a late-night flood alert and no one is " +
      "checking on him when it storms. You already sketched a phone tree that reaches him " +
      "first; the harder question your notes raise is whether it's been set up, or is still " +
      "just an idea.",
  },
  {
    journey: "Creativity",
    icon: "🎨",
    question: "What have you gathered lately that's quietly asking to become a project?",
    answer:
      "The mason's marks. Across three notes you've collected symbols from the Rennie Bridge " +
      "and Kingsley Mill and wondered who cut them — and then, almost as an aside, imagined a " +
      "letterpress specimen sheet of the district's forgotten makers. That's the shape of a " +
      "real project hiding in your observations, one you could actually make.",
  },
  {
    journey: "Calm & groundedness",
    icon: "🌅",
    question: "What steadies you — and are you protecting it?",
    answer:
      "Ten minutes at the kitchen window before anyone's up, coffee steaming, the low light " +
      "coming up Halden Street. You called it 'a settledness worth protecting' and noticed " +
      "the ritual is really the pause, not the coffee. The notes suggest it's the small hinge " +
      "your calmer days turn on — worth guarding deliberately rather than by luck.",
  },
  {
    journey: "Universal love",
    icon: "💛",
    question: "Whose everyday kindness have you been meaning to return?",
    answer:
      "Mr Okafor, the 6am bus driver, who holds the bus a beat at Halden Street for the " +
      "runners every morning — unthanked. You noticed how much that tiny, unglamorous " +
      "kindness keeps other people's mornings from unravelling, and floated leaving a written " +
      "thank-you for him and the early-shift drivers. It's still sitting in your notes as an idea.",
  },
];

// Human "3 days ago" style label for a timestamp, kept tiny and dependency-free.
export function agoLabel(date) {
  const d = date instanceof Date ? date : new Date(date);
  const secs = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  const mins = Math.round(secs / 60);
  const hrs = Math.round(mins / 60);
  const days = Math.round(hrs / 24);
  if (secs < 45) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}
