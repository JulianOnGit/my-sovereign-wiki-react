import { useMemo, useState } from "react";
import { organise } from "../lib/organise.js";

// Organise stage — runs the local, sovereign AI pass and writes its conclusions
// back into the Pod. Transparent by design: the copy is explicit that nothing
// leaves the device and everything it infers becomes auditable triples.
export default function Organise({ items, onOrganise }) {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const alreadyOrganised = items.filter(
    (i) => i.mentions.length || i.related.length,
  ).length;

  // Entity → frequency across the corpus, so the user can see what the agent
  // has surfaced (and what the topic pages will be built from).
  const topEntities = useMemo(() => {
    const counts = new Map();
    for (const item of items) {
      for (const entity of item.mentions) counts.set(entity, (counts.get(entity) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [items]);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const { plan, summary: result } = organise(items);
      await onOrganise(plan);
      setSummary(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="organise">
      <div className="card">
        <h2 className="section-heading">Organise · sovereign AI</h2>
        <p className="muted">
          A local, transparent pass links related observations and extracts the
          people, topics, and projects they mention. It runs on your device over
          your own Pod — nothing is sent to a third party — and writes its
          conclusions back as ordinary <code>schema:mentions</code> and{" "}
          <code>ssw:relatedTo</code> triples you can inspect, audit, or delete.
        </p>

        <button className="save" onClick={run} disabled={running || items.length === 0}>
          {running ? "Organising…" : "Organise my Pod"}
        </button>

        {items.length === 0 && (
          <p className="muted">Capture a few observations first — there is nothing to link yet.</p>
        )}
        {error && <p className="error-text">Couldn’t organise: {error}</p>}

        {summary ? (
          <div className="organise-summary">
            Linked <strong>{summary.links}</strong> connection
            {summary.links === 1 ? "" : "s"} and extracted{" "}
            <strong>{summary.distinctEntities}</strong> distinct entit
            {summary.distinctEntities === 1 ? "y" : "ies"} across{" "}
            <strong>{summary.items}</strong> observation
            {summary.items === 1 ? "" : "s"}. All written back to your Pod.
          </div>
        ) : (
          alreadyOrganised > 0 && (
            <p className="muted">
              {alreadyOrganised} of {items.length} observations already carry
              AI-derived links. Re-run any time to refresh.
            </p>
          )
        )}
      </div>

      {topEntities.length > 0 && (
        <div className="card">
          <h3 className="section-heading">Entities the agent has surfaced</h3>
          <div className="entity-cloud">
            {topEntities.map(([entity, count]) => (
              <span key={entity} className="entity-chip">
                {entity}
                <span className="entity-count">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
