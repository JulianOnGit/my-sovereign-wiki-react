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
