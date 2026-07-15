import { useState } from "react";
import { retrieve } from "../lib/organise.js";

// Ask-your-Pod (Retrieve stage): grounded vector RAG over the local index.
// Deliberately transparent — no hosted LLM — so every answer is traceable to a
// real resource in the Pod, each citation shows its similarity score and the
// terms it matched, and graph-linked observations are surfaced as "connected".
function headline(item) {
  return item.title || item.body.trim().split("\n")[0].slice(0, 60) || "(observation)";
}

export default function AskPod({ items }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);

  function handleAsk(event) {
    event.preventDefault();
    setResult(retrieve(items, query));
  }

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
          <pre>{result.answer}</pre>

          {result.citations.length > 0 && (
            <div className="citation-list">
              <div className="citation-heading">Sources · grounded in your Pod</div>
              {result.citations.map((c) => (
                <div key={c.item.id} className="citation">
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
        </div>
      )}
    </div>
  );
}
