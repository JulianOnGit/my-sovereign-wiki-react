// The architecture of a good life, as a map of dimensions → areas → capabilities,
// and the real-world supports whose access to the relevant slice of your wiki is
// what lets each capability function.
//
// The premise made concrete: your physiotherapist can only help your exercise if
// they can see your exercise log; a housing service can only steady your home if
// it can read the relevant notes. So a capability "maintains" the access grants
// that enable it — and this map shows, per dimension and capability, exactly which
// supports hold access, and lets you revoke any of them in place.
//
// The five dimensions are named as in Reflect's "Areas of your life"; the
// capabilities follow a fuller good-life architecture. Nothing here is sent
// anywhere — it lives only in the browser and is clearly an example.

// Short helper so the capability lists below stay readable.
const caps = (pairs) => pairs.map(([key, name]) => ({ key, name }));

export const GOOD_LIFE_DOMAINS = [
  {
    key: "values",
    name: "Living your values",
    icon: "🕊️",
    tone: "virtue",
    blurb: "Body, mind, and home in good order — the ground you act well from.",
    groups: [
      { key: "body", name: "Body", capabilities: caps([
        ["body-cleanliness", "Cleanliness"], ["body-exercise", "Exercise"], ["body-sleep", "Sleep"],
        ["body-diet", "Diet"], ["body-comfort", "Comfort"],
      ]) },
      { key: "mind", name: "Mind", capabilities: caps([
        ["mind-clarity", "Clarity"], ["mind-congruence", "Congruence"], ["mind-hope", "Hope"],
        ["mind-unafraidness", "Unafraidness"], ["mind-happiness", "Happiness"],
      ]) },
      { key: "home", name: "Home", capabilities: caps([
        ["home-orderliness", "Orderliness"], ["home-alignment", "Alignment"], ["home-cleanliness", "Cleanliness"],
        ["home-maintenance", "Maintenance"], ["home-safety", "Safety"],
      ]) },
    ],
  },
  {
    key: "work",
    name: "Doing meaningful work",
    icon: "🧭",
    tone: "phronesis",
    blurb: "Work, projects, and routines that carry you forward on purpose.",
    groups: [
      { key: "work", name: "Work", capabilities: caps([
        ["work-engaging", "Engaging"], ["work-communication", "Communication"], ["work-progression", "Progression"],
        ["work-enjoyment", "Enjoyment"], ["work-safety", "Safety"],
      ]) },
      { key: "projects", name: "Projects", capabilities: caps([
        ["projects-structure", "Structure"], ["projects-technical", "Technical"], ["projects-roadmap", "Roadmap"],
        ["projects-operational", "Operational"], ["projects-results", "Results"],
      ]) },
      { key: "routines", name: "Routines", capabilities: caps([
        ["routines-prioritisation", "Prioritisation"], ["routines-planning", "Planning"],
        ["routines-time", "Time management"], ["routines-decisions", "Decision management"],
        ["routines-reflection", "Reflection"],
      ]) },
    ],
  },
  {
    key: "connection",
    name: "Connection with others",
    icon: "🤝",
    tone: "social",
    blurb: "The people you're bound to — partner, family, friends, and community.",
    groups: [
      { key: "partner", name: "Partner", capabilities: caps([
        ["partner-affection", "Affection"], ["partner-trust", "Trust"], ["partner-communication", "Communication"],
        ["partner-shared-life", "Shared life"], ["partner-safety", "Safety"],
      ]) },
      { key: "family", name: "Family", capabilities: caps([
        ["family-care", "Care"], ["family-support", "Support"], ["family-stability", "Stability"],
        ["family-responsibility", "Responsibility"], ["family-belonging", "Belonging"],
      ]) },
      { key: "friendships", name: "Friendships", capabilities: caps([
        ["friends-contact", "Contact"], ["friends-enjoyment", "Enjoyment"], ["friends-loyalty", "Loyalty"],
        ["friends-conversation", "Conversation"], ["friends-support", "Mutual support"],
      ]) },
      { key: "community", name: "Community", capabilities: caps([
        ["community-belonging", "Belonging"], ["community-contribution", "Contribution"],
        ["community-recognition", "Recognition"], ["community-purpose", "Shared purpose"],
        ["community-local", "Local connection"],
      ]) },
    ],
  },
  {
    key: "wellbeing",
    name: "Everyday wellbeing",
    icon: "🌿",
    tone: "material",
    blurb: "The material conditions a life stands on — enough, and secure.",
    groups: [
      { key: "needs", name: null, capabilities: caps([
        ["need-money", "Money"], ["need-shelter", "Shelter"], ["need-food", "Food"], ["need-clothing", "Clothing"],
        ["need-tools", "Tools"], ["need-transport", "Transport"], ["need-documents", "Documents"],
        ["need-infrastructure", "Infrastructure"], ["need-future", "Future certainty"], ["need-justice", "Justice"],
      ]) },
    ],
  },
  {
    key: "supported",
    name: "Feeling well-supported",
    icon: "🔥",
    tone: "courage",
    blurb: "What lets you hold your ground and act for what's right.",
    groups: [
      { key: "courage", name: null, capabilities: caps([
        ["courage-knowledge", "Moral knowledge"], ["courage-rhetoric", "Rhetorical skills"],
        ["courage-evidence", "Evidence & documentation"], ["courage-advocacy", "Advocacy"],
        ["courage-conflict", "Conflict navigation"], ["courage-boundaries", "Boundary assertion"],
        ["courage-institutions", "Institutional navigation"], ["courage-fortitude", "Emotional fortitude"],
      ]) },
    ],
  },
];

// The supports that enable a capability by holding access to the relevant slice
// of your wiki — a physiotherapist reading your exercise log, a housing service
// steadying your home, a mentor following your progress. Each is scoped to one
// capability and clearly an example.
export const SUPPORT_GRANTS = [
  { id: "sg-physio", capability: "body-exercise", holder: "Movewell Physiotherapy", role: "Physiotherapist", icon: "🧑‍⚕️", access: "view", purpose: "Reads your exercise log to tailor your rehab plan." },
  { id: "sg-gp", capability: "body-sleep", holder: "Dr. Anya Rao", role: "General practitioner", icon: "🩺", access: "view", purpose: "Reviews your sleep to support your health." },
  { id: "sg-dietitian", capability: "body-diet", holder: "Nourish Dietetics", role: "Dietitian", icon: "🥗", access: "comment", purpose: "Follows your diet notes and leaves guidance." },
  { id: "sg-counsellor", capability: "mind-hope", holder: "Safe Harbour Counselling", role: "Counsellor", icon: "💬", access: "comment", purpose: "Supports your wellbeing between sessions." },
  { id: "sg-homecare", capability: "home-maintenance", holder: "Neighbourly Home Support", role: "Home-support worker", icon: "🧰", access: "view", purpose: "Coordinates upkeep and repairs at home." },
  { id: "sg-mentor", capability: "work-progression", holder: "Priya (mentor)", role: "Career mentor", icon: "🧑‍🏫", access: "comment", purpose: "Follows your progress to advise your next step." },
  { id: "sg-collab", capability: "projects-results", holder: "Studio Collective", role: "Project collaborators", icon: "👥", access: "edit", purpose: "Works with you on shared project outcomes." },
  { id: "sg-coach", capability: "routines-time", holder: "Focus Coaching", role: "Productivity coach", icon: "⏱️", access: "view", purpose: "Reviews how you spend your time to help you plan." },
  { id: "sg-partner", capability: "partner-shared-life", holder: "Sam", role: "Partner", icon: "💞", access: "edit", purpose: "Shares the running of your life together." },
  { id: "sg-family", capability: "family-care", holder: "Mara (sister)", role: "Family", icon: "👪", access: "comment", purpose: "Stays close to how you're doing, to care for you." },
  { id: "sg-friend", capability: "friends-support", holder: "Jordan", role: "Close friend", icon: "🫂", access: "comment", purpose: "Your go-to for mutual support." },
  { id: "sg-community", capability: "community-local", holder: "Rowan Street neighbours", role: "Community group", icon: "🏘️", access: "view", purpose: "Keeps you connected to the street." },
  { id: "sg-finance", capability: "need-money", holder: "Fair Futures Financial", role: "Financial counsellor", icon: "💰", access: "view", purpose: "Helps you keep your finances secure." },
  { id: "sg-housing", capability: "need-shelter", holder: "Housing Connect", role: "Housing service", icon: "🏠", access: "view", purpose: "Assists with keeping your housing stable." },
  { id: "sg-legal", capability: "need-justice", holder: "Community Legal Centre", role: "Legal aid", icon: "⚖️", access: "comment", purpose: "Advises on your rights, reading only what's relevant." },
  { id: "sg-advocate", capability: "courage-advocacy", holder: "Your advocate", role: "Advocate", icon: "📣", access: "comment", purpose: "Speaks up alongside you when it matters." },
  { id: "sg-union", capability: "courage-institutions", holder: "Workers' Union", role: "Union support", icon: "🤝", access: "comment", purpose: "Helps you navigate institutions and stand your ground." },
];

/// Build the live map: attach each support grant to its capability, and count
/// per domain. `spanning` (whole-wiki grants, e.g. the local AI) reach every
/// capability and are surfaced separately.
export function buildGoodLifeArchitecture(supportGrants = [], spanning = []) {
  const byCap = new Map();
  for (const g of supportGrants) {
    if (!byCap.has(g.capability)) byCap.set(g.capability, []);
    byCap.get(g.capability).push(g);
  }

  const domains = GOOD_LIFE_DOMAINS.map((d) => {
    let grantCount = 0;
    const groups = d.groups.map((grp) => {
      const capabilities = grp.capabilities.map((c) => {
        const grants = byCap.get(c.key) || [];
        grantCount += grants.length;
        return { ...c, grants };
      });
      return { ...grp, capabilities };
    });
    return { ...d, groups, grantCount };
  });

  return { domains, spanning };
}
