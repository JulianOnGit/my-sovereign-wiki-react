// Wiki surface — turn the raw captured nodes into something that reads like an
// actual wiki: an index of articles and a generated article per topic/entity,
// with a lead summary, themed sections, and links between articles.
//
// Everything here is derived live from the graph (a page is a query, never a
// stored document). This is the local generator; the optional LLM layer can
// replace `lead` with model-written prose without changing the structure.

import { collectTopics } from "./pages.js";

const asDate = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d : null);

/// The article index: every topic/entity that has observations, ranked by how
/// much it connects (a proxy for how "central" the article is).
export function buildWikiIndex(items) {
  return collectTopics(items).map((t) => ({
    name: t.name,
    count: t.items.length,
    updated: t.items.map((i) => i.createdAt).filter(asDate).sort((a, b) => b - a)[0] ?? null,
  }));
}

/// A generated article for one topic: lead + sourced sections + connections.
export function buildArticle(items, topicName) {
  const topics = collectTopics(items);
  const allNames = topics.map((t) => t.name);
  const bucket = topics.find((t) => t.name.toLowerCase() === topicName.toLowerCase());
  const sources = bucket ? bucket.items : [];

  // Co-occurring topics become this article's connections / wikilink targets.
  const co = new Map();
  for (const obs of sources) {
    for (const name of [...(obs.tags || []), ...(obs.mentions || [])]) {
      if (name.toLowerCase() === topicName.toLowerCase()) continue;
      co.set(name, (co.get(name) || 0) + 1);
    }
  }
  const related = [...co.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const interpretations = sources.filter((o) => o.interpretation).map((o) => o.interpretation);
  const questions = sources.filter((o) => o.uncertainty).map((o) => o.uncertainty);
  const emerged = sources
    .filter((o) => o.efflorescence || o.efflorescenceType)
    .map((o) => [o.efflorescenceType, o.efflorescence].filter(Boolean).join(" — "));

  return {
    title: topicName,
    lead: localLead(topicName, sources, related),
    llm: null, // filled in by the optional LLM layer
    sources,
    interpretations,
    questions,
    emerged,
    related,
    linkTargets: allNames,
  };
}

// A plain-language lead paragraph assembled from the sources (no LLM).
function localLead(topic, sources, related) {
  if (sources.length === 0) return `Nothing in your Pod mentions ${topic} yet.`;

  const dates = sources.map((s) => s.createdAt).filter(asDate).sort((a, b) => a - b);
  const n = sources.length;
  let lead = `${topic} appears across ${n} observation${n === 1 ? "" : "s"} in your wiki`;
  if (dates.length) {
    const first = dates[0].toLocaleDateString();
    const last = dates[dates.length - 1].toLocaleDateString();
    lead += first === last ? ` (${first})` : ` (${first} – ${last})`;
  }
  lead += ".";

  const top = related.slice(0, 3).map((r) => r.name);
  if (top.length) {
    lead += ` It connects most closely to ${listSentence(top)}.`;
  }

  const salient = sources.find((o) => o.interpretation) || sources[0];
  const gist = (salient.interpretation || salient.body || "").trim().split("\n")[0];
  if (gist) lead += ` Most recently: ${gist.length > 160 ? `${gist.slice(0, 159)}…` : gist}`;

  return lead;
}

function listSentence(names) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
