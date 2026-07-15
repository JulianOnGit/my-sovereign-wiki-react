// Present/Compose stage — pages are queries, not stored documents.
//
// Every page here is derived on demand from the graph of observations: topic and
// person pages ("everything related to Eric, chronologically"), date pages
// ("everything that happened on that day"), and the one-node "brain map" view
// (a focus observation and everything linked to it). Nothing is duplicated —
// the pages are live views, so they stay correct as the Pod changes.

const time = (item) => (item.createdAt instanceof Date ? item.createdAt.getTime() : 0);
const newestFirst = (a, b) => time(b) - time(a);

/// Topic & person pages: every tag and AI-extracted entity becomes a navigable
/// page listing the observations that reference it, most recent first. Topics
/// are ranked by how much they connect.
export function collectTopics(items) {
  const map = new Map();
  const add = (rawName, item) => {
    const name = (rawName || "").trim();
    if (!name) return;
    if (!map.has(name)) map.set(name, { name, items: [] });
    const bucket = map.get(name);
    if (!bucket.items.some((i) => i.id === item.id)) bucket.items.push(item);
  };
  for (const item of items) {
    for (const t of item.tags) add(t, item);
    for (const m of item.mentions) add(m, item);
  }
  for (const bucket of map.values()) bucket.items.sort(newestFirst);
  return [...map.values()].sort(
    (a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name),
  );
}

/// Date pages: observations grouped by calendar day, days newest first.
export function collectDates(items) {
  const map = new Map();
  for (const item of items) {
    const d = item.createdAt;
    const key = d instanceof Date && !Number.isNaN(d.getTime())
      ? d.toISOString().slice(0, 10)
      : "undated";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()]
    .map(([date, its]) => ({ date, items: its.sort(newestFirst) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/// One-node "brain map" view: a focus observation plus everything connected to
/// it — AI-linked related items (outbound), back-links (observations that link
/// to it), and the topics/entities it shares with the rest of the graph.
export function nodeView(items, id) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const focus = byId.get(id);
  if (!focus) return null;

  const related = (focus.related || []).map((r) => byId.get(r)).filter(Boolean);
  const relatedIds = new Set(related.map((r) => r.id));
  const backlinks = items.filter(
    (i) => i.id !== id && !relatedIds.has(i.id) && (i.related || []).includes(id),
  );
  const topics = [...new Set([...focus.tags, ...focus.mentions])];

  return { focus, related, backlinks, topics };
}
