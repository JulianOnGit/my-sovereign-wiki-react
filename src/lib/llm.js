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

const LS_KEY = "ssw.llm.config";

const DEFAULT_MODELS = {
  anthropic: "claude-opus-4-8",
  openai: "gpt-4o-mini",
};

export function getLLMConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY));
    return { provider: "none", key: "", ...(raw || {}) };
  } catch {
    return { provider: "none", key: "" };
  }
}

export function setLLMConfig(config) {
  localStorage.setItem(LS_KEY, JSON.stringify(config));
}

export function clearLLMConfig() {
  localStorage.removeItem(LS_KEY);
}

export function llmAvailable() {
  const c = getLLMConfig();
  return c.provider !== "none" && !!c.key.trim();
}

export function llmProviderLabel() {
  const c = getLLMConfig();
  if (c.provider === "anthropic") return "Claude";
  if (c.provider === "openai") return "OpenAI";
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

/// Low-level: run one prompt through the configured provider. Throws if no
/// provider is configured or the call fails.
export async function runLLM({ system, prompt, maxTokens = 1024 }) {
  const config = getLLMConfig();
  if (config.provider === "none" || !config.key.trim()) {
    throw new Error("No AI provider configured.");
  }
  const args = { key: config.key.trim(), model: config.model, system, prompt, maxTokens };
  if (config.provider === "anthropic") return callAnthropic(args);
  if (config.provider === "openai") return callOpenAI(args);
  throw new Error(`Unknown provider: ${config.provider}`);
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
