import { useCallback, useEffect, useMemo, useState } from "react";
import { retrieve } from "../lib/organise.js";
import {
  llmAvailable,
  llmProviderLabel,
  answerFromSources,
  answerWhenNoMatch,
} from "../lib/llm.js";
import { collectTopics } from "../lib/pages.js";
import { DEMO_ITEMS } from "../lib/demoData.js";
import { ASK_EXAMPLES, ASK_HISTORY, ASK_INSPIRATIONS, agoLabel } from "../lib/askDemo.js";

// Ask your Wiki (Retrieve stage): grounded RAG over the user's Pod.
//
// Two layers, both sovereign. First the local vector index retrieves the real
// observations that match — transparent provenance, every hit traceable to a
// resource in the Pod. Then, if the user has configured their own AI, it writes
// a natural-language answer that may draw ONLY on those retrieved notes and
// cites them by number. Retrieval grounds the answer; the model never reaches
// outside what the Pod already returned. With no AI configured, the extractive
// answer stands on its own — the feature degrades honestly, never breaks.
//
// On a sparse Pod the box would be a dead end, so — exactly like Explore — Ask
// falls back to a curated demo graph and leads with example questions and a
// question history mapped to the eudaimonic value streams (see askDemo.js), so
// the very first visit demonstrates the idea end to end.
function headline(item) {
  return item.title || item.body.trim().split("\n")[0].slice(0, 60) || "(observation)";
}

// Render a grounded answer, turning [n] citation markers into small superscript
// references that point back at the numbered sources listed below.
function GroundedAnswer({ text }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="grounded-answer">
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        return m ? (
          <sup key={i} className="cite-ref" title={`Source ${m[1]} below`}>
            [{m[1]}]
          </sup>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </p>
  );
}

// Truncate to a whole word near `n` characters, so the "(read more)" cut never
// lands mid-word.
function truncate(text, n) {
  if (text.length <= n) return text;
  const cut = text.slice(0, n);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : n).trimEnd()}…`;
}

// The inspiration loop: a self-running impression of the wiki thinking *for*
// you. It types out a question the graph could raise, pauses as if reading your
// notes, reveals a grounded-feeling answer with a Read more, then moves on — and
// loops. Decorative and clearly an example, but every question is live: click it
// and it runs for real against the active graph. Expanding an answer pauses the
// reel so you can actually read it.
const INSPIRE_TRUNCATE = 172;
function InspirationLoop({ onAsk }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState("typing"); // typing | thinking | answer
  const [typed, setTyped] = useState("");
  const [expanded, setExpanded] = useState(false);
  const current = ASK_INSPIRATIONS[i];

  const advance = useCallback(() => {
    setExpanded(false);
    setTyped("");
    setPhase("typing");
    setI((v) => (v + 1) % ASK_INSPIRATIONS.length);
  }, []);

  useEffect(() => {
    if (phase === "typing") {
      const q = ASK_INSPIRATIONS[i].question;
      let n = 0;
      const id = setInterval(() => {
        n += 1;
        setTyped(q.slice(0, n));
        if (n >= q.length) {
          clearInterval(id);
          setPhase("thinking");
        }
      }, 26);
      return () => clearInterval(id);
    }
    if (phase === "thinking") {
      const id = setTimeout(() => setPhase("answer"), 1300);
      return () => clearTimeout(id);
    }
    if (phase === "answer" && !expanded) {
      const id = setTimeout(advance, 6000);
      return () => clearTimeout(id);
    }
  }, [phase, i, expanded, advance]);

  const long = current.answer.length > INSPIRE_TRUNCATE;

  return (
    <div className="card ask-inspire">
      <div className="ask-inspire-head">
        <span className="ask-inspire-spark" aria-hidden="true">✨</span>
        <span className="ask-inspire-label">Your wiki is wondering…</span>
        <span className="ask-inspire-journey">
          <span aria-hidden="true">{current.icon}</span> {current.journey}
        </span>
      </div>

      <button
        type="button"
        className="ask-inspire-q"
        onClick={() => onAsk(current.question)}
        title="Ask this against your graph"
      >
        {typed}
        {phase === "typing" && <span className="ask-caret" aria-hidden="true" />}
      </button>

      {phase === "thinking" && (
        <div className="ask-inspire-thinking" aria-live="polite">
          <span className="ask-dot" />
          <span className="ask-dot" />
          <span className="ask-dot" />
          <span className="ask-inspire-thinking-label">reading your notes…</span>
        </div>
      )}

      {phase === "answer" && (
        <div className="ask-inspire-answer">
          <p>
            {expanded ? current.answer : truncate(current.answer, INSPIRE_TRUNCATE)}
            {long && (
              <button
                type="button"
                className="ask-readmore"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? " Show less" : " (read more)"}
              </button>
            )}
          </p>
          <button type="button" className="ask-inspire-ask" onClick={() => onAsk(current.question)}>
            Ask this for real →
          </button>
        </div>
      )}

      <div className="ask-inspire-foot">
        <div className="ask-inspire-pips" aria-hidden="true">
          {ASK_INSPIRATIONS.map((_, k) => (
            <span key={k} className={"ask-inspire-pip" + (k === i ? " active" : "")} />
          ))}
        </div>
        <button type="button" className="ask-inspire-next" onClick={advance}>
          Next ›
        </button>
      </div>
    </div>
  );
}

export default function AskPod({ items }) {
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState(null); // the query text the current result answers
  const [result, setResult] = useState(null);
  const [ai, setAi] = useState(null); // grounded natural-language answer text
  const [aiState, setAiState] = useState("idle"); // idle | thinking | error
  const [aiError, setAiError] = useState(null);

  // Example mode: default on when the user has nothing of their own yet, so the
  // example questions have a graph to retrieve from. Users with data can flip it
  // on to preview the vision, or off to ask their own Pod.
  const [demo, setDemo] = useState(items.length === 0);
  const data = demo ? DEMO_ITEMS : items;

  // Live question history: seeded with a plausible past (in demo mode) and
  // prepended to as the user asks, so the page reads as one you return to.
  const [history, setHistory] = useState(() => (items.length === 0 ? ASK_HISTORY : []));

  // Derived "ask about a topic in your graph" chips — real topics from whatever
  // graph is active, so the suggestions are genuinely about the data on hand.
  const topics = useMemo(() => collectTopics(data).slice(0, 8), [data]);

  async function runQuery(q) {
    const text = q.trim();
    if (!text) return;
    setQuery(text);
    setAsked(text);

    // 1) Local, transparent retrieval — provenance first.
    const r = retrieve(data, text);
    setResult(r);
    setAi(null);
    setAiError(null);

    // Record the ask in history (dedupe: pull any identical earlier ask forward).
    setHistory((h) => [
      { query: text, journey: null, sources: r.citations.length, at: new Date() },
      ...h.filter((e) => e.query !== text),
    ]);

    // 2) Grounded synthesis, only when the user's own AI is configured and there
    //    is something real to ground on. On a direct hit the model composes over
    //    the citations; on a miss it still answers — over the closest notes the
    //    Pod holds — admitting nothing matched exactly rather than dead-ending.
    const grounded = r.citations.length ? r.citations : r.fallback;
    if (llmAvailable() && grounded.length) {
      setAiState("thinking");
      try {
        const answer = r.citations.length
          ? await answerFromSources({ query: text, sources: r.citations })
          : await answerWhenNoMatch({ query: text, sources: r.fallback });
        setAi(answer);
        setAiState("idle");
      } catch (err) {
        setAiError(err.message);
        setAiState("error");
      }
    } else {
      setAiState("idle");
    }
  }

  function handleAsk(event) {
    event.preventDefault();
    runQuery(query);
  }

  // Dismiss the current answer and return to the shine, keeping the (now live)
  // history so questions already asked stay one click away.
  function clearAnswer() {
    setResult(null);
    setAsked(null);
    setAi(null);
    setAiState("idle");
  }

  // Toggling the example flips the graph under retrieval; clear the current
  // answer so a demo/real result can't linger against the wrong graph, and
  // reset history to match the graph now in play.
  function setDemoMode(on) {
    setDemo(on);
    clearAnswer();
    setHistory(on ? ASK_HISTORY : []);
  }

  const provider = llmProviderLabel();

  return (
    <div className="ask">
      {/* Example-graph banner, mirroring Explore so the two stages read as one. */}
      {demo ? (
        <div className="demo-banner">
          <span>
            ✨ <strong>Example graph.</strong> These questions retrieve from a
            sample Pod, so you can see grounded answers before you've captured much.
            {items.length > 0 && " Your own graph is hidden while this is on."}
          </span>
          {items.length > 0 && (
            <button className="demo-toggle" onClick={() => setDemoMode(false)}>
              Ask my graph
            </button>
          )}
        </div>
      ) : (
        <div className="demo-banner demo-banner-plain">
          <span>Every answer is grounded only in your own Pod.</span>
          <button className="demo-toggle" onClick={() => setDemoMode(true)}>
            ✨ Try an example
          </button>
        </div>
      )}

      <form onSubmit={handleAsk} className="ask-form">
        <input
          type="text"
          placeholder="Ask your Wiki… e.g. what have I written about my goals lately?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Ask</button>
      </form>

      {result && (
        <div className="answer card">
          {asked && (
            <div className="answer-question">
              <span className="answer-question-label">You asked</span>
              <span className="answer-question-text">{asked}</span>
            </div>
          )}

          {/* Grounded natural-language answer (only with the user's own AI) */}
          {aiState === "thinking" && (
            <p className="grounded-status">Your {provider} is reading your notes…</p>
          )}
          {ai && (
            <div className="grounded-block">
              <GroundedAnswer text={ai} />
              <p className="grounded-note">
                Written by your {provider}, grounded only in your own notes below —
                every number cites a real resource in your Pod.
              </p>
            </div>
          )}
          {aiState === "error" && (
            <p className="error-text">
              Couldn’t reach your {provider}: {aiError}. Showing the direct matches
              from your Pod instead.
            </p>
          )}

          {/* Extractive answer: the honest baseline, always shown. When the AI
              wrote a grounded answer above, this stays as the raw evidence. */}
          {(!ai || aiState === "error") && <pre>{result.answer}</pre>}

          {result.citations.length > 0 && (
            <div className="citation-list">
              <div className="citation-heading">Sources · grounded in your Pod</div>
              {result.citations.map((c, i) => (
                <div key={c.item.id} className="citation">
                  <span className="citation-num">[{i + 1}]</span>
                  <span className="citation-title">{headline(c.item)}</span>
                  <span className="citation-score" title="Similarity score">
                    {(c.score * 100).toFixed(0)}%
                  </span>
                  {c.matched.length > 0 && (
                    <span className="citation-matched">matched: {c.matched.join(", ")}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Nearest-neighbour fallback: shown when nothing cleared the relevance
              bar. Numbered so a grounded no-match answer's [n] refs resolve here,
              and clearly labelled as the closest — not exact — matches. */}
          {result.fallback && result.fallback.length > 0 && (
            <div className="citation-list">
              <div className="citation-heading">
                Closest in your Pod · nothing matched exactly
              </div>
              {result.fallback.map((c, i) => (
                <div key={c.item.id} className="citation">
                  <span className="citation-num">[{i + 1}]</span>
                  <span className="citation-title">{headline(c.item)}</span>
                  {c.score > 0 && (
                    <span className="citation-score" title="Similarity score">
                      {(c.score * 100).toFixed(0)}%
                    </span>
                  )}
                  {c.matched.length > 0 && (
                    <span className="citation-matched">matched: {c.matched.join(", ")}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.connected.length > 0 && (
            <div className="citation-list">
              <div className="citation-heading">Connected through the graph</div>
              {result.connected.map((c) => (
                <div key={c.item.id} className="citation">
                  <span className="citation-title">{headline(c.item)}</span>
                  <span className="citation-via">via {headline(c.via)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sovereignty nudge: natural-language answers are one config away, and
              turning them on means bringing your own key — the trust stays yours. */}
          {!llmAvailable() &&
            (result.citations.length > 0 || result.fallback.length > 0) && (
              <p className="grounded-hint">
                Want a written answer instead of a list? Connect your own AI in{" "}
                <strong>Govern</strong> — it will answer in plain language, grounded only
                in these notes, using your key.
              </p>
            )}
        </div>
      )}

      {/* ── The shine: only before the first ask, so the answer owns the space
          once you've asked. Example questions by value stream, derived topic
          chips, and a question history — every one clickable to run. ── */}
      {!result && (
        <>
          <div className="card ask-intro">
            <h2 className="section-heading">Ask your Wiki</h2>
            <p className="muted">
              A question, answered only from what you've captured — each answer
              cites the real observations behind it, and says{" "}
              <em>“I don't know from your data”</em> rather than guessing. Retrieval
              stays on your device; nothing leaves your Pod.
            </p>
          </div>

          <InspirationLoop onAsk={runQuery} />

          <div className="ask-examples">
            <div className="ask-section-heading">
              Start with a question
              <span className="ask-section-sub">by what it helps you live well</span>
            </div>
            <div className="ask-example-grid">
              {ASK_EXAMPLES.map((ex) => (
                <button
                  key={ex.query}
                  type="button"
                  className="ask-example"
                  onClick={() => runQuery(ex.query)}
                >
                  <span className="ask-example-top">
                    <span className="ask-example-icon" aria-hidden="true">
                      {ex.icon}
                    </span>
                    <span className="ask-example-journey">{ex.journey}</span>
                  </span>
                  <span className="ask-example-query">{ex.query}</span>
                  <span className="ask-example-probes">{ex.probes}</span>
                </button>
              ))}
            </div>
          </div>

          {topics.length > 0 && (
            <div className="ask-topics">
              <div className="ask-section-heading">
                Or ask about a topic in your graph
                <span className="ask-section-sub">
                  {demo ? "from the example graph" : "drawn from your own captures"}
                </span>
              </div>
              <div className="ask-chip-row">
                {topics.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    className="ask-chip"
                    onClick={() => runQuery(`What have I noted about ${t.name}?`)}
                  >
                    {t.name}
                    <span className="ask-chip-count">{t.items.length}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="ask-history">
              <div className="ask-section-heading">
                Recent questions
                <span className="ask-section-sub">click to ask again</span>
              </div>
              <div className="ask-history-list">
                {history.map((h, i) => (
                  <button
                    key={`${h.query}-${i}`}
                    type="button"
                    className="ask-history-row"
                    onClick={() => runQuery(h.query)}
                  >
                    <span className="ask-history-q">{h.query}</span>
                    <span className="ask-history-meta">
                      {h.journey && <span className="ask-history-journey">{h.journey}</span>}
                      <span className="ask-history-sources">
                        {h.sources} source{h.sources === 1 ? "" : "s"}
                      </span>
                      <span className="ask-history-ago">{agoLabel(h.at)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* After an answer, a quiet way back to the shine and a live history. */}
      {result && (
        <div className="ask-after">
          <button type="button" className="ask-again" onClick={clearAnswer}>
            ← Ask something else
          </button>
          {history.length > 1 && (
            <div className="ask-history ask-history-compact">
              <div className="ask-section-heading">Recent questions</div>
              <div className="ask-history-list">
                {history.slice(0, 5).map((h, i) => (
                  <button
                    key={`${h.query}-${i}`}
                    type="button"
                    className="ask-history-row"
                    onClick={() => runQuery(h.query)}
                  >
                    <span className="ask-history-q">{h.query}</span>
                    <span className="ask-history-meta">
                      <span className="ask-history-sources">
                        {h.sources} source{h.sources === 1 ? "" : "s"}
                      </span>
                      <span className="ask-history-ago">{agoLabel(h.at)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
