import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  loadConversations,
  saveConversations,
  newConversation,
  deriveTitle,
  listModels,
  streamChat,
} from "../lib/chat.js";
import { search, nearest } from "../lib/organise.js";
import { semanticSearch, embeddingsBackend, resetEmbeddings } from "../lib/embeddings.js";

// Ask your LLM — a Msty-Studio-style conversation over a *local* model, grounded
// in the user's own wiki (RAG). History lives on the left, the transcript on the
// right, and the model picker sits in the composer footer. The model runs on the
// user's own machine via an OpenAI-compatible endpoint (Msty Studio / Ollama /
// LM Studio), so this stays consistent with the app's sovereignty stance: no
// data leaves the device.
//
// Grounding: with "Ground in my wiki" on, every question first retrieves the
// most relevant notes from the Pod (semantic embeddings when the local server
// offers them, TF-IDF otherwise — see embeddings.js), injects them as numbered
// context, and instructs the model to answer ONLY from them — so "did I read
// Jurassic Park?" is answered from what the wiki actually holds ("your notes
// don't mention it; the closest is [2] …") rather than from the model's guess.
// The notes used are shown under the reply as citations.

const noteHeadline = (it) =>
  it.title || (it.body || "").trim().split("\n")[0].slice(0, 70) || "(observation)";

// Rank the wiki for a question: semantic first, keyword fallback, and — when
// nothing clears the bar — the nearest notes anyway, so the model can honestly
// say "not in your wiki; the closest you have is …".
async function retrieveNotes(items, query, topN = 6) {
  const sem = await semanticSearch(items, query, { topN });
  if (sem && sem.length) {
    return { ranked: sem, mode: `semantic · ${embeddingsBackend().model}` };
  }
  const hits = search(items, query, { topN });
  if (hits.length) return { ranked: hits, mode: "keyword (TF-IDF)" };
  return { ranked: nearest(items, query, { topN }), mode: "nearest notes" };
}

function groundingSystem(ranked) {
  const lines = ranked.map((h, i) => {
    const it = h.item;
    const head = noteHeadline(it);
    const detail = [it.body, it.interpretation]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
    const topics = [...(it.tags || []), ...(it.mentions || [])].slice(0, 5).join(", ");
    const when = it.createdAt instanceof Date ? ` (${it.createdAt.toLocaleDateString()})` : "";
    return `[${i + 1}] ${head}${when}${detail && detail !== head ? ` — ${detail}` : ""}${
      topics ? ` [topics: ${topics}]` : ""
    }`;
  });
  return (
    "You are the assistant for the user's private, sovereign knowledge wiki. Below are " +
    "the notes from their wiki most relevant to their latest message. When the question " +
    "is about their own life, notes, reading, or experiences, answer ONLY from these " +
    "notes: ground every claim in them and cite the note numbers inline like [1] or [2]. " +
    "If the notes do not contain the answer, say so plainly (e.g. “Your notes don't " +
    "mention reading that”) and point to the closest related note(s) by number instead " +
    "of guessing. Never invent notes, memories, dates or facts the notes don't hold.\n\n" +
    "Wiki notes:\n" +
    lines.join("\n")
  );
}

function friendlyError(err, settings) {
  const msg = String(err?.message || err);
  if (err?.name === "TypeError" || /Failed to fetch|NetworkError|load failed/i.test(msg)) {
    return (
      `Couldn't reach a local model at ${settings.baseUrl}. Make sure Msty Studio ` +
      `(or your local server) is running and the endpoint/port is correct. If it ` +
      `is running, it may be refusing browser requests (CORS) — allow this origin ` +
      `in the server's settings.`
    );
  }
  return msg;
}

export default function LocalAI({ items = [] }) {
  const [settings, setSettings] = useState(loadSettings);
  const [conversations, setConversations] = useState(loadConversations);
  const [activeId, setActiveId] = useState(() => loadConversations()[0]?.id ?? null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [stage, setStage] = useState(null); // "retrieving" while searching the wiki
  const [error, setError] = useState(null);
  const [models, setModels] = useState([]);
  const [connected, setConnected] = useState(null); // null=unknown, true/false
  const [showSettings, setShowSettings] = useState(false);
  // RAG: ground answers in the wiki. On by default the moment there is data.
  const [ground, setGround] = useState(true);
  const grounding = ground && items.length > 0;

  const abortRef = useRef(null);
  const transcriptRef = useRef(null);
  const inputRef = useRef(null);

  // Always keep at least one conversation, and a valid active selection.
  useEffect(() => {
    if (conversations.length === 0) {
      const c = newConversation();
      setConversations([c]);
      setActiveId(c.id);
    } else if (!activeId || !conversations.some((c) => c.id === activeId)) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  // Persist history on every change (on-device, sovereign).
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Probe the endpoint for its model list whenever the connection changes.
  useEffect(() => {
    let cancelled = false;
    listModels(settings)
      .then((ids) => {
        if (cancelled) return;
        setModels(ids);
        setConnected(true);
      })
      .catch(() => {
        if (cancelled) return;
        setModels([]);
        setConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, [settings.baseUrl, settings.apiKey]);

  const active = conversations.find((c) => c.id === activeId) || null;

  // Keep the transcript pinned to the newest message as it streams.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages, thinking]);

  // "/" focuses the composer, echoing Msty's "Press / to focus" affordance.
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function patchConvo(id, fn) {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }

  function handleNew() {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setError(null);
    inputRef.current?.focus();
  }

  function handleSelect(id) {
    if (busy) return; // don't switch mid-stream
    setActiveId(id);
    setError(null);
  }

  function handleDelete(id, e) {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }

  function persistSettings(next) {
    // A new endpoint or embedding model means the embeddings probe must re-run.
    if (next.baseUrl !== settings.baseUrl || next.embedModel !== settings.embedModel) {
      resetEmbeddings();
    }
    setSettings(next);
    saveSettings(next);
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy || !active) return;
    if (!settings.model.trim()) {
      setError("Choose or type a model name first (e.g. qwen3:4b).");
      return;
    }

    setError(null);
    setInput("");
    const convoId = active.id;
    const isFirst = active.messages.every((m) => m.role !== "user");

    // Show the turn INSTANTLY: the user's message plus an empty assistant
    // placeholder to stream into. Everything slow (retrieval, the model) comes
    // after, with the busy state already on — the send must never look dead.
    patchConvo(convoId, (c) => ({
      ...c,
      title: isFirst ? deriveTitle(text) : c.title,
      messages: [
        ...c.messages,
        { role: "user", content: text },
        { role: "assistant", content: "", sources: null },
      ],
      updatedAt: Date.now(),
    }));

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setThinking(false);

    // RAG: retrieve the wiki notes relevant to this question, visibly (the
    // transcript shows "searching your wiki…"). Retrieval is time-bounded — the
    // embeddings call aborts after a few seconds and falls back to the keyword
    // index — and any failure just means the model answers ungrounded.
    let groundingMsg = null;
    if (grounding) {
      setStage("retrieving");
      try {
        const { ranked, mode } = await retrieveNotes(items, text);
        if (ranked.length) {
          groundingMsg = groundingSystem(ranked);
          const sources = ranked.map((h, i) => ({
            n: i + 1,
            title: noteHeadline(h.item),
            score: h.score,
            mode,
          }));
          // Attach the citations to the placeholder the reply will stream into.
          patchConvo(convoId, (c) => {
            const messages = c.messages.slice();
            messages[messages.length - 1] = { ...messages[messages.length - 1], sources };
            return { ...c, messages };
          });
        }
      } catch {
        /* retrieval unavailable — answer ungrounded */
      }
      setStage(null);
    }

    const history = [...active.messages, { role: "user", content: text }].map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const systemText = [settings.system.trim(), groundingMsg].filter(Boolean).join("\n\n");
    const apiMessages = systemText
      ? [{ role: "system", content: systemText }, ...history]
      : history;

    const writeLast = (content) =>
      patchConvo(convoId, (c) => {
        const messages = c.messages.slice();
        // Preserve the sources the placeholder was created with.
        messages[messages.length - 1] = { ...messages[messages.length - 1], content };
        return { ...c, messages, updatedAt: Date.now() };
      });

    // Drop the empty placeholder if nothing readable ever arrived.
    const popEmptyPlaceholder = () =>
      patchConvo(convoId, (c) => {
        const messages = c.messages.slice();
        const last = messages[messages.length - 1];
        if (last?.role === "assistant" && !last.content) messages.pop();
        return { ...c, messages };
      });

    try {
      const final = await streamChat(settings, apiMessages, {
        signal: controller.signal,
        onUpdate: (visible, meta) => {
          setThinking(Boolean(meta?.thinking));
          writeLast(visible);
        },
      });
      if (final.trim()) {
        writeLast(final);
      } else {
        // The model finished without a readable answer (e.g. its whole reply
        // stayed inside a <think> block). Say so — never a silent empty bubble.
        popEmptyPlaceholder();
        setError(
          "The model returned an empty answer — it may have spent its whole reply " +
            "reasoning. Ask again, or try a non-thinking model.",
        );
      }
      setConnected(true);
    } catch (err) {
      if (err?.name !== "AbortError") {
        setError(friendlyError(err, settings));
        popEmptyPlaceholder();
        if (err?.name === "TypeError") setConnected(false);
      } else {
        // Stopped by the user before any tokens arrived: tidy up the empty bubble.
        popEmptyPlaceholder();
      }
    } finally {
      setBusy(false);
      setThinking(false);
      setStage(null);
      abortRef.current = null;
    }
  }

  function onInputKeyDown(e) {
    // Enter sends, Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const endpointHost = (() => {
    try {
      return new URL(settings.baseUrl).host;
    } catch {
      return settings.baseUrl;
    }
  })();

  return (
    <div className="localai">
      <div className="localai-inner">
        {/* History sidebar */}
        <aside className="chat-sidebar">
          <button type="button" className="chat-new" onClick={handleNew}>
            <span aria-hidden="true">＋</span> New Conversation
          </button>
          <div className="chat-history-label">Recents</div>
          <ul className="chat-history">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`chat-history-item ${c.id === activeId ? "active" : ""}`}
                  onClick={() => handleSelect(c.id)}
                  title={c.title}
                >
                  <span aria-hidden="true">💬</span>
                  <span className="title">{c.title}</span>
                  <span
                    className="remove"
                    role="button"
                    aria-label="Delete conversation"
                    onClick={(e) => handleDelete(c.id, e)}
                  >
                    ×
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Chat pane */}
        <section className="chat-main">
          <div className="chat-transcript" ref={transcriptRef}>
            {active && active.messages.length === 0 && (
              <div className="chat-empty">
                <p>Ask your LLM — grounded in your wiki.</p>
                <p className="muted">
                  {grounding
                    ? "Questions retrieve your own notes first, and the model answers only from them — try “did I read Jurassic Park?” It will say what your wiki actually holds."
                    : "Free chat with your local model. Turn on “Ground in my wiki” below to have it answer from your own notes."}
                </p>
                <p className="muted">
                  Press <kbd>/</kbd> to focus here and start typing. Nothing leaves your device.
                </p>
              </div>
            )}

            {active?.messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="bubble">
                  <span className="role">{m.role === "user" ? "You" : settings.model}</span>
                  {m.content || (busy && i === active.messages.length - 1 ? "…" : "")}
                  {m.role === "assistant" && m.content && m.sources?.length > 0 && (
                    <span className="chat-src-row">
                      <span className="chat-src-label">
                        grounded in your wiki · {m.sources[0].mode}
                      </span>
                      {m.sources.map((s) => (
                        <span
                          key={s.n}
                          className="chat-src"
                          title={s.score ? `similarity ${(s.score * 100).toFixed(0)}%` : undefined}
                        >
                          [{s.n}] {s.title}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {stage === "retrieving" && (
              <div className="chat-thinking">📚 searching your wiki…</div>
            )}
            {thinking && <div className="chat-thinking">thinking…</div>}
          </div>

          {error && <div className="chat-error">{error}</div>}

          {showSettings && (
            <div className="chat-settings">
              <label>
                Endpoint (OpenAI-compatible base URL)
                <input
                  type="text"
                  value={settings.baseUrl}
                  placeholder={DEFAULT_SETTINGS.baseUrl}
                  onChange={(e) => persistSettings({ ...settings, baseUrl: e.target.value })}
                />
              </label>
              <label>
                API key (any value for local servers; blank to omit)
                <input
                  type="text"
                  value={settings.apiKey}
                  placeholder="ollama"
                  onChange={(e) => persistSettings({ ...settings, apiKey: e.target.value })}
                />
              </label>
              <label>
                System prompt (optional)
                <input
                  type="text"
                  value={settings.system}
                  placeholder="You are a helpful assistant."
                  onChange={(e) => persistSettings({ ...settings, system: e.target.value })}
                />
              </label>
              <label>
                Embedding model (for wiki grounding; blank = chat model)
                <input
                  type="text"
                  value={settings.embedModel || ""}
                  placeholder="nomic-embed-text"
                  onChange={(e) => persistSettings({ ...settings, embedModel: e.target.value })}
                />
              </label>
              <label>
                Temperature
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) =>
                    persistSettings({ ...settings, temperature: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          )}

          <form className="chat-composer" onSubmit={handleSend}>
            <div className="chat-modelbar">
              <input
                className="model"
                list="ssw-models"
                value={settings.model}
                placeholder="Select a model (e.g. qwen3:4b)"
                onChange={(e) => persistSettings({ ...settings, model: e.target.value })}
              />
              <datalist id="ssw-models">
                {models.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
              <label
                className={`chat-ground${items.length === 0 ? " is-off" : ""}`}
                title={
                  items.length === 0
                    ? "Capture some observations first — there is nothing to ground in yet"
                    : "Retrieve your wiki notes for each question and answer only from them"
                }
              >
                <input
                  type="checkbox"
                  checked={grounding}
                  disabled={items.length === 0}
                  onChange={(e) => setGround(e.target.checked)}
                />
                📚 Ground in my wiki
              </label>
              <button
                type="button"
                className="chat-iconbtn"
                title="Connection settings"
                onClick={() => setShowSettings((s) => !s)}
              >
                ⚙
              </button>
              <span className={`chat-conn ${connected === false ? "off" : ""}`} title={settings.baseUrl}>
                <span className="dot" aria-hidden="true">
                  ●
                </span>{" "}
                {connected === false ? `offline · ${endpointHost}` : `local · ${endpointHost}`}
              </span>
            </div>

            <div className="chat-inputrow">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Press / to focus here and start typing"
                rows={1}
              />
              {busy ? (
                <button type="button" className="chat-send chat-stop" onClick={stop}>
                  Stop
                </button>
              ) : (
                <button type="submit" className="chat-send" disabled={!input.trim()}>
                  Send
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
