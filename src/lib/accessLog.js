// Access history & audit for the Share stage.
//
// A living, chronological record of what actually happened to your shared data:
// grants you made, invites you sent, and — the part that matters most for an
// audit — the times someone (or the local AI) actually reached a slice of your
// wiki. On a real Pod this feed comes from the server's access log; here it's a
// plausible demo, clearly labelled, merged with the real lifecycle of whatever
// grants are live so the section is never empty and always reflects your grants.
//
// Nothing here is sent anywhere; it lives only in the browser.

import { grantStatus, scopeLabel } from "./shareDemo.js";

const HOUR = 3_600_000;
const DAY = 86_400_000;
const hoursAgo = (n) => new Date(Date.now() - n * HOUR);
const daysAgo = (n) => new Date(Date.now() - n * DAY);

// Event-type metadata: icon, label, and a tone for the timeline dot.
export const AUDIT_EVENT_TYPES = {
  granted: { icon: "🔓", label: "Access granted", tone: "accent" },
  invited: { icon: "✉️", label: "Invite sent", tone: "accent" },
  accessed: { icon: "👁", label: "Read your wiki", tone: "good" },
  commented: { icon: "💬", label: "Added a comment", tone: "good" },
  edited: { icon: "✎", label: "Made an edit", tone: "good" },
  revoked: { icon: "⛔", label: "Access revoked", tone: "warn" },
  expiring: { icon: "⏳", label: "Expiring soon", tone: "warn" },
};

// Synthetic access events — the "someone actually reached your data" half of the
// audit, referencing the same cast as the demo grants so history reads as one
// coherent life. Each is clearly an example.
const DEMO_ACCESS_EVENTS = [
  {
    id: "ev-ai-1",
    type: "accessed",
    who: "Sovereign AI (on this device)",
    what: "grounded an Ask-your-Wiki answer",
    detail: "Read 3 observations locally to answer a question — never left your device.",
    at: hoursAgo(3),
  },
  {
    id: "ev-nora-1",
    type: "accessed",
    who: "Nora",
    what: "your Care stream",
    detail: "Opened your recent Care observations — checking in, as agreed.",
    at: hoursAgo(20),
  },
  {
    id: "ev-repair-1",
    type: "edited",
    who: "Repair Café collective",
    what: "the shared Stewardship logbook",
    detail: "Added a fix and what it taught them.",
    at: daysAgo(1),
  },
  {
    id: "ev-birdcount-1",
    type: "accessed",
    who: "Tidal Marsh bird-count",
    what: "your Noticing observations",
    detail: "Pulled two sightings into the group record.",
    at: daysAgo(2),
  },
  {
    id: "ev-public-1",
    type: "accessed",
    who: "Everyone (public)",
    what: "a published Creativity piece",
    detail: "3 anonymous views of the finished work you made public.",
    at: daysAgo(3),
  },
  {
    id: "ev-eric-1",
    type: "commented",
    who: "Eric",
    what: "a workshop work-in-progress",
    detail: "Left a note on your latest Mastery observation.",
    at: daysAgo(4),
  },
  {
    id: "ev-revoked-1",
    type: "revoked",
    who: "A former study group",
    what: "your Epistemology stream",
    detail: "You ended this share when the study wrapped up.",
    at: daysAgo(8),
  },
];

// Merge the live grant lifecycle with the demo access events into one feed,
// newest first. Grant-derived events carry `grantId` so a row in the audit can
// offer to revoke the grant behind it.
export function buildAuditFeed(grants = []) {
  const events = [];

  for (const g of grants) {
    const who = g.subject?.kind === "public" ? "Everyone (public)" : g.subject?.name || "Someone";
    const what = scopeLabel(g.scope);
    events.push({
      id: `grant-${g.id}`,
      type: g.pending ? "invited" : "granted",
      who,
      what,
      detail: g.purpose || (g.pending ? "Waiting for them to accept." : "You granted this access."),
      at: g.createdAt instanceof Date ? g.createdAt : new Date(),
      grantId: g.id,
    });
    if (grantStatus(g) === "expiring") {
      events.push({
        id: `expiring-${g.id}`,
        type: "expiring",
        who,
        what,
        detail: "This grant lapses soon — renew it or let it end.",
        at: hoursAgo(1),
        grantId: g.id,
      });
    }
  }

  return [...events, ...DEMO_ACCESS_EVENTS].sort(
    (a, b) => (b.at?.getTime?.() ?? 0) - (a.at?.getTime?.() ?? 0),
  );
}

// Compact relative-time label for the feed.
export function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  const hrs = Math.round(mins / 60);
  const days = Math.round(hrs / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}
