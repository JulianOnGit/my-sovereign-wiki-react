import { useState } from "react";
import { retrieve } from "../lib/organise.js";
import { llmAvailable, llmProviderLabel, answerFromSources } from "../lib/llm.js";

// Ask your Wiki (Retrieve stage): grounded RAG over the user's Pod.
//
// Two layers, both sovereign. First the local vector index retrieves the real
// observations that match — transparent provenance, every hit traceable to a
// resource in the Pod. Then, if the user has configured their own AI, it writes
// a natural-language answer that may draw ONLY on those retrieved notes and
// cites them by number. Retrieval grounds the answer; the model never reaches
// outside what the Pod already returned. With no AI configured, the extractive
// answer stands on its own — the feature degrades honestly, never breaks.
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

export default function AskPod({ items }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [ai, setAi] = useState(null); // grounded natural-language answer text
  const [aiState, setAiState] = useState("idle"); // idle | thinking | error
  const [aiError, setAiError] = useState(null);

  async function handleAsk(event) {
    event.preventDefault();
    // 1) Local, transparent retrieval — provenance first.
    const r = retrieve(items, query);
    setResult(r);
    setAi(null);
    setAiError(null);

    // 2) Grounded synthesis, only when the user's own AI is configured and there
    //    is something real to ground on.
    if (llmAvailable() && r.citations.length) {
      setAiState("thinking");
      try {
        const text = await answerFromSources({ query, sources: r.citations });
        setAi(text);
        setAiState("idle");
      } catch (err) {
        setAiError(err.message);
        setAiState("error");
      }
    } else {
      setAiState("idle");
    }
  }

  const provider = llmProviderLabel();

  return (
    <div className="ask">
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
          {!llmAvailable() && result.citations.length > 0 && (
            <p className="grounded-hint">
              Want a written answer instead of a list? Connect your own AI in{" "}
              <strong>Govern</strong> — it will answer in plain language, grounded only
              in these notes, using your key.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
