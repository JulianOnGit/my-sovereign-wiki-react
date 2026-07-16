// Optional LLM layer — the user's own sovereign AI.
//
// Everything in this app works with zero LLM (local heuristics). When the user
// supplies their own API key (Claude or OpenAI, stored only in this browser's
// localStorage and called directly from the browser), the LLM upgrades the
// quality of generated wiki prose and semantic synthesis. The key is theirs, the
// calls are theirs — consistent with the sovereignty story. Nothing is sent
// anywhere unless the user has configured a provider and explicitly triggers it.
//
// Note: we call the provider REST endpoints directly with fetch rather than
// pulling in a provider SDK — it keeps the bundle small and lets one thin client
// support both Claude and OpenAI uniformly. For a production Claude integration
// the official @anthropic-ai/sdk is the recommended path.

import { loadSettings as loadLocalAISettings, completeChat, probeLocal } from "./chat.js";

const LS_KEY = "ssw.llm.config";

const DEFAULT_MODELS = {
  anthropic: "claude-opus-4-8",
  openai: "gpt-4o-mini",
};

// ── Local model availability (probed, cached ~60s) ───────────────────────────
// Mirrors the reference providers' Auto provider: availability is re-checked
// lazily so starting Ollama/Msty takes effect without a reload. The probe is
// fired at module load so by the time a user reaches an AI button the answer
// is in; `llmAvailable()` stays synchronous for render-time gating.
const PROBE_TTL = 60_000;
let localProbe = { ok: false, at: 0, pending: null };

export function refreshLocalLLM(force = false) {
  const now = Date.now();
  if (!force && (localProbe.pending || now - localProbe.at < PROBE_TTL)) {
    return localProbe.pending || Promise.resolve(localProbe.ok);
  }
  localProbe.pending = probeLocal(loadLocalAISettings()).then((ok) => {
    localProbe = { ok, at: Date.now(), pending: null };
    return ok;
  });
  return localProbe.pending;
}
refreshLocalLLM();

export function localLLMReady() {
  refreshLocalLLM(); // keep the cache warm; still synchronous for callers
  return localProbe.ok;
}

export function getLLMConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY));
    // Default is "auto": use a configured key if one is saved, else the local
    // model server when it's running, else nothing — zero-config sovereignty.
    return { provider: "auto", key: "", ...(raw || {}) };
  } catch {
    return { provider: "auto", key: "" };
  }
}

export function setLLMConfig(config) {
  localStorage.setItem(LS_KEY, JSON.stringify(config));
}

export function clearLLMConfig() {
  localStorage.removeItem(LS_KEY);
}

// Resolve what "auto" means right now: an explicit key wins, else the local
// server if reachable, else none.
function resolveProvider(c = getLLMConfig()) {
  if (c.provider === "anthropic" || c.provider === "openai") {
    return c.key.trim() ? c.provider : "none";
  }
  if (c.provider === "local") return localLLMReady() ? "local" : "none";
  if (c.provider === "auto") return localLLMReady() ? "local" : "none";
  return "none";
}

export function llmAvailable() {
  return resolveProvider() !== "none";
}

export function llmProviderLabel() {
  const p = resolveProvider();
  if (p === "anthropic") return "Claude";
  if (p === "openai") return "OpenAI";
  if (p === "local") {
    const model = loadLocalAISettings().model;
    return model ? `local AI (${model})` : "local AI";
  }
  return "local engine";
}

// ── Provider calls ───────────────────────────────────────────────────────────

async function callAnthropic({ key, model, system, prompt, maxTokens }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      // Required to call the Messages API directly from a browser.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODELS.anthropic,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 180)}`);
  }
  const data = await res.json();
  if (data.stop_reason === "refusal") throw new Error("The model declined this request.");
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

async function callOpenAI({ key, model, system, prompt, maxTokens }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODELS.openai,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI API ${res.status}: ${(await res.text()).slice(0, 180)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// The user's local model server (Msty / Ollama / LM Studio), reusing the exact
// endpoint the "Ask your LLM" tab is configured with. No key required.
async function callLocal({ system, prompt, maxTokens }) {
  const settings = loadLocalAISettings();
  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];
  return completeChat(settings, messages, { maxTokens, temperature: 0.2 });
}

/// Low-level: run one prompt through the configured provider. Throws if no
/// provider is configured or the call fails.
export async function runLLM({ system, prompt, maxTokens = 1024 }) {
  const config = getLLMConfig();
  const provider = resolveProvider(config);
  if (provider === "none") {
    throw new Error("No AI provider available — start your local model server or add a key in Govern.");
  }
  if (provider === "local") return callLocal({ system, prompt, maxTokens });
  const args = { key: config.key.trim(), model: config.model, system, prompt, maxTokens };
  if (provider === "anthropic") return callAnthropic(args);
  if (provider === "openai") return callOpenAI(args);
  throw new Error(`Unknown provider: ${provider}`);
}

// ── High-level tasks ─────────────────────────────────────────────────────────

const WIKI_SYSTEM =
  "You are the summariser for a person's private knowledge wiki. Write a concise, " +
  "neutral, encyclopedic overview of the given topic using ONLY the user's own notes " +
  "provided below. Do not invent facts, names, dates, numbers, or claims that are not " +
  "present in the notes. If the notes are thin, keep the summary short. Two to four " +
  "sentences. No preamble, no headings — just the overview paragraph.";

/// Model-written lead paragraph for a wiki article, grounded in its sources.
export async function generateArticleSummary(article) {
  const lines = [];
  lines.push(`Topic: ${article.title}`);
  if (article.sources.length) {
    lines.push("\nObservations:");
    for (const o of article.sources.slice(0, 12)) {
      const text = (o.title ? `${o.title}: ` : "") + (o.body || "");
      lines.push(`- ${text.trim().slice(0, 240)}`);
    }
  }
  if (article.interpretations.length) {
    lines.push("\nInterpretations:");
    article.interpretations.slice(0, 6).forEach((t) => lines.push(`- ${t.slice(0, 200)}`));
  }
  if (article.questions.length) {
    lines.push("\nOpen questions:");
    article.questions.slice(0, 6).forEach((t) => lines.push(`- ${t.slice(0, 200)}`));
  }
  if (article.emerged.length) {
    lines.push("\nWhat emerged:");
    article.emerged.slice(0, 6).forEach((t) => lines.push(`- ${t.slice(0, 200)}`));
  }
  if (article.related.length) {
    lines.push(`\nRelated topics: ${article.related.map((r) => r.name).join(", ")}`);
  }

  return runLLM({ system: WIKI_SYSTEM, prompt: lines.join("\n"), maxTokens: 512 });
}

const ASK_SYSTEM =
  "You are the retrieval assistant for a person's private knowledge wiki. Answer the " +
  "question using ONLY the numbered notes provided — they are the user's own " +
  "observations, retrieved from their Pod. Ground every claim in those notes and cite " +
  "them inline with bracketed numbers like [1] or [2], matching the note numbers you " +
  "used. Use no outside knowledge and invent nothing — no facts, names, dates, or " +
  "numbers that are not in the notes. If the notes do not answer the question, say so " +
  "plainly (e.g. \"Your notes don't cover that yet\") instead of guessing. Be concise " +
  "and plain: two to five sentences, no preamble, no headings.";

// Render the retrieved notes as the numbered, bracket-cited block both Ask
// prompts share, so [1]/[2] in the model's answer line up with the sources the
// UI lists below it.
function numberedSources(sources) {
  return sources.map((s, i) => {
    const it = s.item;
    const head = it.title || (it.body || "").trim().split("\n")[0] || "(observation)";
    const detail = [it.body, it.interpretation, it.context]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);
    return `[${i + 1}] ${head}${detail && detail !== head ? ` — ${detail}` : ""}`;
  });
}

/// Grounded RAG synthesis (Retrieve stage). Given the ranked citations the local
/// index already retrieved, the user's own AI writes a natural-language answer
/// that may draw ONLY on those notes and must cite them by their 1-based number,
/// so every claim traces back to a real resource in the Pod. Retrieval stays
/// local (provenance); the model only composes over what was already grounded.
export async function answerFromSources({ query, sources }) {
  const lines = [
    `Question: ${query}`,
    "",
    "Notes (your own observations):",
    ...numberedSources(sources),
  ];
  return runLLM({ system: ASK_SYSTEM, prompt: lines.join("\n"), maxTokens: 400 });
}

const ASK_NO_MATCH_SYSTEM =
  "You are the retrieval assistant for a person's private knowledge wiki. Their " +
  "question found NO direct match in their notes. Use no outside knowledge and invent " +
  "nothing — no facts, names, dates, or numbers that are not in the notes below. Using " +
  "ONLY the numbered notes below — the closest things their Pod actually contains — " +
  "write a brief, genuinely helpful reply that: (1) says plainly their notes don't " +
  "directly cover the question; and (2) points them to what their wiki DOES hold that " +
  "is nearest or related, citing those notes inline with bracketed numbers like [1] " +
  "or [2]. If even these notes are unrelated to the question, say so honestly and " +
  "suggest capturing an observation on the topic. Be concise and plain: two to four " +
  "sentences, no preamble, no headings.";

/// Grounded reply for a retrieval miss. When the local index finds nothing above
/// the relevance bar, the user's own AI still composes a sensible, honest answer
/// over the CLOSEST notes the Pod holds — admitting nothing matched exactly and
/// pointing at what the wiki does contain, cited by number. Same sovereign
/// contract as answerFromSources: only the provided notes, nothing invented.
export async function answerWhenNoMatch({ query, sources }) {
  const lines = [
    `Question (no direct match found): ${query}`,
    "",
    "Closest notes your Pod does contain (your own observations):",
    ...numberedSources(sources),
  ];
  return runLLM({ system: ASK_NO_MATCH_SYSTEM, prompt: lines.join("\n"), maxTokens: 400 });
}
