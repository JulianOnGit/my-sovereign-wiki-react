// Fine-grained sharing model + a built-in demo of grants across the value
// streams, so the Share stage reads like a living consent dashboard before the
// user has shared anything of their own.
//
// A grant answers four questions — the same ones an RDF triple + policy do:
//   • Subject   — WHO is being granted access (the agent): a person, a group,
//                 the public, or an AI.
//   • Resource  — WHAT part of the wiki (the object): the whole wiki, one value
//                 stream, a single topic, or one observation.
//   • Facets    — WHICH slices of each item are exposed (observation, analysis,
//                 efflorescence, attribution, safety, responsibility). Every
//                 journey in the plan walks that same arc, so facets let you
//                 share the bloom without the private doubt underneath it.
//   • Access    — WHAT they may do (view, comment, edit, full control).
// plus an optional expiry and a plain-language purpose.
//
// Nothing here is written to a server. These grants live only in the browser and
// are shown, clearly labelled, as the prototype's fine-grained consent layer —
// the UX that compiles down to the resource-level ACLs the Pod enforces today.

// ── Subjects — WHO ────────────────────────────────────────────────────────────
export const SUBJECT_KINDS = {
  person: { label: "A person", icon: "👤", needsName: true, needsWebId: true },
  group: { label: "A group", icon: "👥", needsName: true, needsWebId: true },
  public: { label: "Everyone (public)", icon: "🌐", needsName: false, needsWebId: false },
  agent: { label: "An AI agent", icon: "🤖", needsName: true, needsWebId: false },
};

// ── Access — WHAT they may do ─────────────────────────────────────────────────
// Mapped to concrete Solid access modes so a whole-wiki grant can be enforced
// for real by the honest ACL layer below the composer.
export const ACCESS_LEVELS = {
  view: { label: "View", icon: "👁", verb: "view", blurb: "Read only", modes: { read: true } },
  comment: {
    label: "View & comment",
    icon: "💬",
    verb: "view and comment on",
    blurb: "Read and add notes",
    modes: { read: true, append: true },
  },
  edit: {
    label: "View & edit",
    icon: "✎",
    verb: "view and edit",
    blurb: "Read and change",
    modes: { read: true, append: true, write: true },
  },
  control: {
    label: "Full control",
    icon: "🔑",
    verb: "fully control",
    blurb: "Read, change, and re-share",
    modes: { read: true, append: true, write: true, controlRead: true, controlWrite: true },
  },
};

// ── Facets — WHICH slices of each item ────────────────────────────────────────
// The shared arc every journey follows. Keep this order canonical everywhere.
export const FACETS = {
  observation: { label: "Observation", icon: "◉", blurb: "The raw thing noticed" },
  analysis: { label: "Analysis", icon: "◈", blurb: "Interpretation & sense-making" },
  efflorescence: { label: "Efflorescence", icon: "✻", blurb: "Ideas & actions that bloomed" },
  attribution: { label: "Attribution", icon: "⚑", blurb: "Provenance — who & what it credits" },
  safety: { label: "Safety", icon: "🛡", blurb: "Sensitivity, uncertainty, guardrails" },
  responsibility: { label: "Responsibility", icon: "⚖", blurb: "Duties & commitments arising" },
};
export const FACET_KEYS = Object.keys(FACETS);

// ── Resources — WHAT part of the wiki (the value streams) ─────────────────────
// The user journeys from the hackathon plan, each a value stream you can scope a
// grant to. `lens` ties a stream back to the reflective lenses observations are
// captured under, so a real graph can be filtered to just that stream.
export const JOURNEYS = [
  { key: "culture", name: "Cultural appreciation", icon: "🏛", lens: "Culture" },
  { key: "risk", name: "World-risk awareness", icon: "⚠️", lens: "Risk" },
  { key: "care", name: "Care", icon: "🫧", lens: "Care" },
  { key: "philosophy", name: "Moral philosophy", icon: "⚖️", lens: "Values" },
  { key: "epistemology", name: "Epistemology", icon: "🔍", lens: "Truth & evidence" },
  { key: "creativity", name: "Creativity", icon: "🎨", lens: "Creativity" },
  { key: "future", name: "Future modelling", icon: "🔮", lens: "Future" },
  { key: "learning", name: "Learning", icon: "📚", lens: "Learning" },
  { key: "leisure", name: "Leisure", icon: "🌿", lens: "Enjoyment" },
  { key: "calm", name: "Calmness & groundedness", icon: "🧘", lens: "Groundedness" },
  { key: "benevolence", name: "Love of life & benevolence", icon: "💗", lens: "Appreciation" },
  { key: "world", name: "Love of the world & society", icon: "🌍", lens: "Society & environment" },
  { key: "partner", name: "Love of the conversational partner", icon: "🤝", lens: "Conversation" },
  { key: "universal", name: "Universal love for all", icon: "♾️", lens: "Universal love" },
  { key: "noticing", name: "Noticing & awareness", icon: "👁", lens: "Close observation" },
  { key: "mastery", name: "Skill & mastery", icon: "🛠", lens: "Mastery" },
  { key: "ingenuity", name: "Ingenuity & problem solving", icon: "💡", lens: "Problem solving" },
  { key: "stewardship", name: "Stewardship", icon: "🌱", lens: "Stewardship" },
];
export const JOURNEY_BY_KEY = Object.fromEntries(JOURNEYS.map((j) => [j.key, j]));

export const SCOPE_KINDS = {
  wiki: { label: "The whole wiki", icon: "📚" },
  journey: { label: "One value stream", icon: "🧭" },
  topic: { label: "One topic", icon: "🏷" },
  observation: { label: "A single observation", icon: "📝" },
};

// ── Date + summary helpers ────────────────────────────────────────────────────
const DAY = 86_400_000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
export const daysFromNow = (n) => new Date(Date.now() + n * DAY);

export function formatDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/// Active / expiring / expired / pending — drives the status pill and sorting.
export function grantStatus(grant) {
  if (grant.pending) return "pending";
  if (grant.expiresAt instanceof Date) {
    const daysLeft = (grant.expiresAt.getTime() - Date.now()) / DAY;
    if (daysLeft < 0) return "expired";
    if (daysLeft <= 7) return "expiring";
  }
  return "active";
}

export function scopeIcon(scope) {
  if (scope.kind === "journey") return JOURNEY_BY_KEY[scope.key]?.icon ?? "🧭";
  return SCOPE_KINDS[scope.kind]?.icon ?? "📚";
}

export function scopeLabel(scope) {
  switch (scope.kind) {
    case "journey":
      return JOURNEY_BY_KEY[scope.key]?.name ?? "A value stream";
    case "topic":
      return scope.name;
    case "observation":
      return scope.title || "an observation";
    default:
      return "Whole wiki";
  }
}

/// Plain-language facet phrase: "everything in", or "the observation and
/// analysis of", used to build the grant sentence and the facet summary.
export function facetsPhrase(facets) {
  if (!facets || facets.length >= FACET_KEYS.length) return "everything in";
  const labels = FACET_KEYS.filter((k) => facets.includes(k)).map((k) =>
    FACETS[k].label.toLowerCase(),
  );
  if (labels.length === 0) return "nothing in";
  if (labels.length === 1) return `the ${labels[0]} of`;
  const head = labels.slice(0, -1).join(", ");
  return `the ${head} and ${labels[labels.length - 1]} of`;
}

function resourcePhrase(scope) {
  switch (scope.kind) {
    case "journey":
      return `your ${JOURNEY_BY_KEY[scope.key]?.name ?? "value stream"} stream`;
    case "topic":
      return `everything about ${scope.name}`;
    case "observation":
      return `the note “${scope.title || "…"}”`;
    default:
      return "your whole wiki";
  }
}

/// The one-sentence, plain-language reading of a grant — shown live under the
/// composer and as the subtitle of each share.
export function grantSentence(grant) {
  const who = grant.subject.kind === "public" ? "Everyone" : grant.subject.name || "Someone";
  const verb = ACCESS_LEVELS[grant.access]?.verb ?? "view";
  const facet = facetsPhrase(grant.facets);
  const resource = resourcePhrase(grant.scope);
  let tail = ".";
  if (grant.pending) tail = " — once they accept.";
  else if (grant.expiresAt instanceof Date) tail = ` until ${formatDate(grant.expiresAt)}.`;
  return `${who} can ${verb} ${facet} ${resource}${tail}`;
}

// ── The built-in demo of grants ───────────────────────────────────────────────
// A narratively coherent spread across the value streams and the four grant
// dimensions — enough variety that the dashboard feels lived-in: people and
// groups, every access level, whole-wiki through single-note scope, facet
// subsets that keep private doubt private, expiries, a pending invite, and the
// local AI. They reuse the seed graph's cast (Nora, Eric, the Repair café, the
// Tidal marsh) so Share reads as the same life as the rest of the app.
function demo(o) {
  return {
    facets: FACET_KEYS,
    purpose: "",
    origin: "demo",
    pending: false,
    sensitive: false,
    createdAt: daysAgo(o.createdDaysAgo ?? 0),
    expiresAt: o.expiresInDays ? daysFromNow(o.expiresInDays) : null,
    ...o,
  };
}

export const DEMO_GRANTS = [
  demo({
    id: "grant-care-nora",
    subject: { kind: "person", name: "Nora", webId: "https://nora.solidcommunity.au/profile/card#me" },
    scope: { kind: "journey", key: "care" },
    facets: ["observation", "analysis"],
    access: "comment",
    purpose: "So she can follow how I'm working through the elm, and check in on me.",
    createdDaysAgo: 4,
    expiresInDays: 21,
  }),
  demo({
    id: "grant-elm-circle",
    subject: { kind: "group", name: "Rowan Street neighbours", webId: "https://rowan-st.solidcommunity.au/profile/card#me" },
    scope: { kind: "observation", id: "seed-grief-elm", title: "They cut the elm on Rowan Street" },
    facets: ["observation", "analysis", "responsibility"],
    access: "comment",
    purpose: "Planning the memorial planting together — this one note, nothing else.",
    createdDaysAgo: 2,
    expiresInDays: 5,
    sensitive: true,
  }),
  demo({
    id: "grant-mastery-eric",
    subject: { kind: "person", name: "Eric", webId: "https://eric.solidweb.org/profile/card#me" },
    scope: { kind: "journey", key: "mastery" },
    facets: ["observation", "efflorescence"],
    access: "comment",
    purpose: "Trading works-in-progress from the workshop — his to me, mine to him.",
    createdDaysAgo: 12,
  }),
  demo({
    id: "grant-creativity-public",
    subject: { kind: "public", name: "", webId: null },
    scope: { kind: "journey", key: "creativity" },
    facets: ["observation", "efflorescence"],
    access: "view",
    purpose: "Publish the blooms, not the doubts — the finished pieces only.",
    createdDaysAgo: 20,
  }),
  demo({
    id: "grant-stewardship-repair",
    subject: { kind: "group", name: "Repair Café collective", webId: "https://repair-cafe.solidcommunity.au/profile/card#me" },
    scope: { kind: "journey", key: "stewardship" },
    facets: ["observation", "efflorescence", "responsibility"],
    access: "edit",
    purpose: "A shared logbook of fixes and what each one taught us.",
    createdDaysAgo: 16,
  }),
  demo({
    id: "grant-noticing-birdcount",
    subject: { kind: "group", name: "Tidal Marsh bird-count", webId: "https://marsh-survey.solidcommunity.au/profile/card#me" },
    scope: { kind: "journey", key: "noticing" },
    facets: ["observation"],
    access: "view",
    purpose: "Contribute sightings to the group record — just the raw observations.",
    createdDaysAgo: 11,
    expiresInDays: 60,
  }),
  demo({
    id: "grant-epistemology-study",
    subject: { kind: "person", name: "Dr. Halden · calibration study", webId: "https://halden.datapod.igrant.io/profile/card#me" },
    scope: { kind: "journey", key: "epistemology" },
    facets: ["analysis", "attribution"],
    access: "view",
    purpose: "Anonymised input to a study on how people calibrate confidence.",
    createdDaysAgo: 6,
    expiresInDays: 90,
  }),
  demo({
    id: "grant-ai-local",
    subject: { kind: "agent", name: "Sovereign AI (on this device)", webId: null },
    scope: { kind: "wiki" },
    facets: FACET_KEYS,
    access: "view",
    purpose: "Grounds Ask-your-Wiki answers locally — runs in your session, no separate credential.",
    createdDaysAgo: 30,
  }),
  demo({
    id: "grant-benevolence-mara",
    subject: { kind: "person", name: "Mara (sister)", webId: "https://mara.solidcommunity.au/profile/card#me" },
    scope: { kind: "journey", key: "benevolence" },
    facets: ["observation", "efflorescence"],
    access: "view",
    purpose: "Invited — waiting for her to accept before anything is shared.",
    createdDaysAgo: 1,
    pending: true,
  }),
];
