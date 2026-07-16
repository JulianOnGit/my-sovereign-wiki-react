// Semantic embeddings over the user's local model server, with a TF-IDF
// fallback — the same backend ladder nlp-graph uses (TF-IDF always works;
// auto-upgrade to real embeddings when a model is available).
//
// The embeddings come from the Local AI endpoint's OpenAI-compatible
// `POST /embeddings` (Ollama, Msty, LM Studio all expose it). Which model is
// used comes from the Local AI settings (`embedModel`, blank = the chat model).
// Everything stays on-device: texts go only to the user's own local server.
//
// The first call probes the endpoint once per session; on failure every caller
// silently degrades to the TF-IDF path in organise.js, so nothing breaks when
// no local server is running.

import { loadSettings, apiBase, apiHeaders } from "./chat.js";

// text → number[] vector, cached for the session. Wiki notes are small and few,
// so an in-memory map is plenty (and re-embedding after reload is cheap).
const cache = new Map();

// unknown | ok | down — resolved by the first embed attempt.
let backend = { state: "unknown", model: null };

export function embeddingsBackend() {
  return { ...backend };
}

/// Force a fresh probe next time (e.g. after the user edits the endpoint).
export function resetEmbeddings() {
  backend = { state: "unknown", model: null };
  cache.clear();
}

function embedModelOf(settings) {
  return (settings.embedModel || "").trim() || settings.model;
}

// Hard ceiling per request: a local server that accepts the connection but
// stalls (e.g. a chat-only model asked to embed) must NEVER hang the caller —
// retrieval falls back to TF-IDF instead. Chat/RAG latency depends on this.
const EMBED_TIMEOUT_MS = 8000;

async function requestEmbeddings(texts) {
  const settings = loadSettings();
  const model = embedModelOf(settings);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), EMBED_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${apiBase(settings)}/embeddings`, {
      method: "POST",
      headers: apiHeaders(settings),
      body: JSON.stringify({ model, input: texts }),
      signal: ctl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`embeddings: HTTP ${res.status}`);
  const data = await res.json();
  const rows = data?.data;
  if (!Array.isArray(rows) || rows.length !== texts.length) {
    throw new Error("embeddings: malformed response");
  }
  // Preserve input order via the index field when present.
  const out = new Array(texts.length);
  rows.forEach((r, i) => {
    const idx = typeof r.index === "number" ? r.index : i;
    out[idx] = r.embedding;
  });
  if (out.some((v) => !Array.isArray(v) || !v.length)) {
    throw new Error("embeddings: empty vector");
  }
  backend = { state: "ok", model };
  return out;
}

/// Embed texts via the local server, or return null when it isn't available.
/// Never throws — callers treat null as "fall back to TF-IDF".
export async function tryEmbed(texts) {
  if (backend.state === "down") return null;
  const misses = [];
  const missIdx = [];
  texts.forEach((t, i) => {
    if (!cache.has(t)) {
      misses.push(t);
      missIdx.push(i);
    }
  });
  try {
    if (misses.length) {
      // Batch in chunks so a big corpus doesn't build one huge request.
      const CHUNK = 24;
      for (let at = 0; at < misses.length; at += CHUNK) {
        const slice = misses.slice(at, at + CHUNK);
        const vecs = await requestEmbeddings(slice);
        slice.forEach((t, i) => cache.set(t, vecs[i]));
      }
    }
    return texts.map((t) => cache.get(t));
  } catch {
    backend = { state: "down", model: null };
    return null;
  }
}

export function cosineVec(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// The same "everything meaningful" text the TF-IDF index uses (organise.js),
// so both backends rank over identical material.
export function itemEmbedText(item) {
  return [
    item.title,
    item.body,
    item.interpretation,
    item.efflorescence,
    (item.tags || []).join(" "),
    (item.mentions || []).join(" "),
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1200);
}

/// Semantic related-links: for each item, its top-N most similar others by
/// embedding cosine. Returns Map<id, [{id, score}]> like organise.relatedLinks,
/// or null when embeddings are unavailable (caller falls back to TF-IDF).
export async function semanticRelatedLinks(items, { topN = 4, threshold = 0.55 } = {}) {
  if (items.length < 2) return null;
  const vecs = await tryEmbed(items.map(itemEmbedText));
  if (!vecs) return null;
  const result = new Map();
  for (let i = 0; i < items.length; i++) {
    const sims = [];
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const score = cosineVec(vecs[i], vecs[j]);
      if (score >= threshold) sims.push({ id: items[j].id, score });
    }
    sims.sort((a, b) => b.score - a.score);
    result.set(items[i].id, sims.slice(0, topN));
  }
  return result;
}

/// Semantic retrieval: rank items against a query by embedding cosine.
/// Returns [{item, score, matched: []}] (same shape organise.search returns)
/// or null when embeddings are unavailable.
export async function semanticSearch(items, query, { topN = 6 } = {}) {
  if (!items.length || !query.trim()) return null;
  const vecs = await tryEmbed([query, ...items.map(itemEmbedText)]);
  if (!vecs) return null;
  const [qv, ...dvs] = vecs;
  return items
    .map((item, i) => ({ item, score: cosineVec(qv, dvs[i]), matched: [] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
