// Local LLM chat client + on-device conversation history for the "Local AI" tab.
//
// Talks to a local, OpenAI-compatible endpoint — Msty Studio's local API,
// Ollama's `/v1`, LM Studio, llama.cpp's server, etc. Nothing leaves the
// device: the model runs locally and the conversation history is persisted to
// the browser's localStorage. That keeps the app's promise literal — sovereign
// by default, your chats in your own custody rather than shipped to a hosted
// provider — the same stance the Organise/Retrieve stages take (see
// `src/lib/organise.js`), now with a real generative model behind it.
//
// Defaults below mirror the reference `reference llm files/.env`
// (OPENAI_BASE_URL / OPENAI_API_KEY / LLM_MODEL) so it works against Msty out of
// the box; every value is editable in the UI and remembered per browser.

const SETTINGS_KEY = "ssw.localai.settings";
const CONVOS_KEY = "ssw.localai.conversations";

export const DEFAULT_SETTINGS = {
  baseUrl: "http://localhost:11964/v1",
  apiKey: "ollama",
  model: "qwen3:4b",
  // Embedding model for the semantic index (blank = use `model`). Ollama serves
  // e.g. `nomic-embed-text` at the same /v1 endpoint; Msty/LM Studio similar.
  embedModel: "",
  temperature: 0.4,
  system: "",
};

// ── Settings (localStorage) ──────────────────────────────────────────────────
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage disabled or over quota — settings just won't persist */
  }
}

// ── Conversation history (localStorage) ──────────────────────────────────────
export function loadConversations() {
  try {
    const list = JSON.parse(localStorage.getItem(CONVOS_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveConversations(list) {
  try {
    localStorage.setItem(CONVOS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function newConversation() {
  return {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "New conversation",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// A conversation is titled from its first user turn, like the Msty sidebar.
export function deriveTitle(text) {
  const clean = (text || "").trim().replace(/\s+/g, " ");
  if (!clean) return "New conversation";
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
// Exported so the rest of the app (llm.js runLLM, embeddings.js) can reuse the
// same endpoint the Local AI tab is configured with — one local server, many
// features (chat, organise, wiki summaries, embeddings).
export function apiBase(settings) {
  return (settings.baseUrl || DEFAULT_SETTINGS.baseUrl).replace(/\/+$/, "");
}

export function apiHeaders(settings) {
  const headers = { "Content-Type": "application/json" };
  // Local servers accept any bearer (e.g. the literal "ollama"); include it only
  // when set so a server that rejects the header can be used by clearing the key.
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;
  return headers;
}

const base = apiBase;
const authHeaders = apiHeaders;

// Reasoning models (Qwen3, etc.) wrap their scratch-work in <think>…</think>.
// Strip completed blocks from a finished answer — and an unterminated trailing
// block too (a stream that ended mid-think must not leak scratch-work).
export function stripThink(text) {
  let t = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const open = t.indexOf("<think>");
  if (open >= 0) t = t.slice(0, open);
  return t.trim();
}

// Live variant: drop completed think blocks and hide any still-open trailing one
// so the transcript shows the answer forming, not the model's private reasoning.
function liveStripThink(text) {
  let t = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const open = t.lastIndexOf("<think>");
  if (open >= 0) t = t.slice(0, open);
  return t.replace(/^\s+/, "");
}

function isThinkOpen(text) {
  const opens = (text.match(/<think>/g) || []).length;
  const closes = (text.match(/<\/think>/g) || []).length;
  return opens > closes;
}

// ── API ──────────────────────────────────────────────────────────────────────

/// List models the local server exposes (OpenAI-compatible `GET /models`).
/// Resolving — even to an empty list — means the endpoint is reachable.
export async function listModels(settings) {
  const res = await fetch(`${base(settings)}/models`, { headers: authHeaders(settings) });
  if (!res.ok) throw new Error(`models: HTTP ${res.status}`);
  const data = await res.json();
  const rows = data?.data ?? data?.models ?? [];
  return rows.map((m) => m.id ?? m.name).filter(Boolean);
}

/// One-shot (non-streaming) chat completion from the local model. Used by the
/// task layer (wiki summaries, organise, grounded answers) where streaming
/// isn't needed. Returns the think-stripped answer text.
export async function completeChat(settings, messages, { maxTokens = 1024, temperature } = {}) {
  const res = await fetch(`${base(settings)}/chat/completions`, {
    method: "POST",
    headers: authHeaders(settings),
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: false,
      max_tokens: maxTokens,
      temperature: Number(temperature ?? settings.temperature ?? 0.2),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`local LLM: HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return stripThink(text);
}

/// Quick reachability probe of the local endpoint (2.5s timeout), mirroring the
/// reference providers' `available()` checks. Resolves true/false, never throws.
export async function probeLocal(settings) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch(`${base(settings)}/models`, {
      headers: authHeaders(settings),
      signal: ctl.signal,
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/// Stream a chat completion from the local model.
///
/// `messages` is the OpenAI-shaped array (`{ role, content }`), including any
/// system prompt. `onUpdate(visibleText, { thinking })` fires as tokens arrive
/// with the cumulative, think-stripped answer so the UI can re-render in place.
/// Returns the final cleaned answer. Honours `signal` so the user can stop.
export async function streamChat(settings, messages, { onUpdate, signal } = {}) {
  const res = await fetch(`${base(settings)}/chat/completions`, {
    method: "POST",
    headers: authHeaders(settings),
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: true,
      temperature: Number(settings.temperature ?? 0.4),
    }),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${detail ? ` — ${detail.slice(0, 300)}` : ""}`);
  }

  // Fallback for servers that don't stream a readable body.
  if (!res.body) {
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    onUpdate?.(liveStripThink(text), { thinking: false });
    return stripThink(text);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: one JSON payload per `data:` line, frames separated by blank lines.
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).replace(/\r$/, "").trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") {
        onUpdate?.(liveStripThink(raw), { thinking: false });
        return stripThink(raw);
      }
      try {
        const json = JSON.parse(payload);
        const choice = json?.choices?.[0];
        const delta = choice?.delta?.content ?? choice?.message?.content ?? "";
        if (delta) {
          raw += delta;
          onUpdate?.(liveStripThink(raw), { thinking: isThinkOpen(raw) });
        }
      } catch {
        /* keep-alive comment or a partial frame — wait for more bytes */
      }
    }
  }

  onUpdate?.(liveStripThink(raw), { thinking: false });
  return stripThink(raw);
}
