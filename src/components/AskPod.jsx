import { useState } from "react";
import { askPod } from "../lib/pod.js";

// Ask-your-Pod screen: grounded retrieval over the loaded items. Deliberately
// transparent keyword overlap (no hosted LLM) so every answer is traceable to a
// real resource in the Pod — "provenance, not vibes".
export default function AskPod({ items }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);

  function handleAsk(event) {
    event.preventDefault();
    setResult(askPod(items, query));
  }

  return (
    <div className="ask">
      <form onSubmit={handleAsk} className="ask-form">
        <input
          type="text"
          placeholder="Ask your Pod… e.g. what did I save about solid?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Ask</button>
      </form>

      {result && (
        <div className="answer card">
          <pre>{result.answer}</pre>
          {result.citations.length > 0 && (
            <div className="citations">
              {result.citations.map((c) => (
                <span key={c.id} className="tag">
                  {c.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
