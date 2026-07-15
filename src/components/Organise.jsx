import { useMemo, useState } from "react";
import { organise } from "../lib/organise.js";
import { deriveInsights } from "../lib/insights.js";
import { DEMO_ITEMS } from "../lib/demoData.js";

// How many items each detail list shows before a "show more" reveals the rest.
const STREAM_LIMIT = 2;
const BRIDGE_LIMIT = 3;
const ENTITY_LIMIT = 12;

// Organise stage — runs the local, sovereign AI pass and writes its conclusions
// back into the Pod, then reads the whole corpus back as insights. Transparent
// by design: the copy is explicit that nothing leaves the device and everything
// it infers becomes auditable triples.
export default function Organise({ items, onOrganise }) {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  // Each detail list starts truncated and expands in place, so the tab shows a
  // taste of every section without unrolling the whole corpus at once.
  const [showAllStreams, setShowAllStreams] = useState(false);
  const [showAllBridges, setShowAllBridges] = useState(false);
  const [showAllEntities, setShowAllEntities] = useState(false);

  const alreadyOrganised = items.filter(
    (i) => i.mentions.length || i.related.length,
  ).length;

  // Insights over the user's own corpus. Until they've captured lensed
  // observations there's nothing to read, so we fall back to the curated demo
  // graph — clearly labelled — so the tab shows what it can do out of the box.
  const { insights, isExample } = useMemo(() => {
    const real = deriveInsights(items);
    if (real.streams.length > 0) return { insights: real, isExample: false };
    return { insights: deriveInsights(DEMO_ITEMS), isExample: true };
  }, [items]);

  const { totals, streams, bridges, topEntities } = insights;

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

      {/* ── Insights read-out ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="insights-head">
          <h3 className="section-heading">Overview of your Sovereign Wiki</h3>
          {isExample && (
            <span className="example-badge" title="Shown from a built-in example graph until you've captured your own">
              example data
            </span>
          )}
        </div>
        <p className="muted">
          {isExample
            ? "A worked example: the sovereign AI reading a small graph of observations. Capture and organise your own and this becomes your picture."
            : "The sovereign AI reading back your own graph — grouped by the patterns you've been paying attention to."}
        </p>

        <div className="stat-row">
          <Stat n={totals.observations} label="observations" />
          <Stat n={totals.connections} label="connections drawn" />
          <Stat n={totals.entities} label="entities surfaced" />
          <Stat n={totals.streams} label="patterns" />
          <Stat n={totals.efflorescences} label="efflorescences" />
          <Stat n={totals.sensitive} label="flagged sensitive" tone={totals.sensitive ? "warn" : "muted"} />
        </div>
      </div>

      {/* Per value-stream story: observation → analysis → efflorescence →
          attribution → safety/responsibility, exactly as the user journeys run. */}
      {streams.length > 0 && (
        <div className="card">
          <h3 className="section-heading">Patterns your sovereign AI noticed for you</h3>
          <p className="muted">
            Each is a way of paying attention — a lens you looked through. For
            every one, the agent traces the same arc your reflections do.
          </p>
          <div className="stream-grid">
            {(showAllStreams ? streams : streams.slice(0, STREAM_LIMIT)).map((s) => (
              <StreamCard key={s.lens} s={s} />
            ))}
          </div>
          <ShowMore
            count={streams.length}
            limit={STREAM_LIMIT}
            expanded={showAllStreams}
            onToggle={() => setShowAllStreams((v) => !v)}
            noun="pattern"
          />
        </div>
      )}

      {/* Cross-stream connections — where curiosity crossed from one journey
          into another. The most valuable links in the graph. */}
      {bridges.length > 0 && (
        <div className="card">
          <h3 className="section-heading">Connections across patterns</h3>
          <p className="muted">
            Where the agent linked an observation in one stream to one in another
            — the crossings where a spark in one part of life feeds another.
          </p>
          <div className="bridge-list">
            {(showAllBridges ? bridges : bridges.slice(0, BRIDGE_LIMIT)).map((b, i) => (
              <div key={i} className="bridge">
                <span className="bridge-stream">
                  <span aria-hidden="true">{b.fromIcon}</span> {b.from}
                </span>
                <span className="bridge-arrow" aria-hidden="true">→</span>
                <span className="bridge-stream">
                  <span aria-hidden="true">{b.toIcon}</span> {b.to}
                </span>
                <span className="bridge-detail">
                  “{b.a}” links to “{b.b}”
                </span>
              </div>
            ))}
          </div>
          <ShowMore
            count={bridges.length}
            limit={BRIDGE_LIMIT}
            expanded={showAllBridges}
            onToggle={() => setShowAllBridges((v) => !v)}
            noun="connection"
          />
        </div>
      )}

      {topEntities.length > 0 && (
        <div className="card">
          <h3 className="section-heading">Entities the agent has surfaced</h3>
          <div className="entity-cloud">
            {(showAllEntities ? topEntities : topEntities.slice(0, ENTITY_LIMIT)).map(
              ([entity, count]) => (
                <span key={entity} className="entity-chip">
                  {entity}
                  <span className="entity-count">{count}</span>
                </span>
              ),
            )}
          </div>
          <ShowMore
            count={topEntities.length}
            limit={ENTITY_LIMIT}
            expanded={showAllEntities}
            onToggle={() => setShowAllEntities((v) => !v)}
            noun="entity"
            pluralNoun="entities"
          />
        </div>
      )}
    </div>
  );
}

// Toggle shown under a truncated list: reveals the remaining items in place, or
// collapses back. Renders nothing when the list is already short enough.
function ShowMore({ count, limit, expanded, onToggle, noun, pluralNoun }) {
  if (count <= limit) return null;
  const hidden = count - limit;
  const plural = pluralNoun || `${noun}s`;
  return (
    <button
      className="ghost-button show-more"
      onClick={onToggle}
      aria-expanded={expanded}
    >
      {expanded ? "Show less" : `Show ${hidden} more ${hidden === 1 ? noun : plural}`}
    </button>
  );
}

function Stat({ n, label, tone = "accent" }) {
  return (
    <div className="stat">
      <span className={`stat-n tone-${tone}`}>{n}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// A single value stream, told as the six-part story the user journeys share.
function StreamCard({ s }) {
  const topEff = s.efflorescences.slice(0, 2);
  return (
    <div className="stream-card">
      <div className="stream-head">
        <span className="stream-icon" aria-hidden="true">{s.icon}</span>
        <span className="stream-journey">{s.journey}</span>
        <span className="stream-count">{s.count}</span>
      </div>
      <div className="stream-meter">
        <span style={{ width: `${Math.round(s.strength * 100)}%` }} />
      </div>

      <dl className="stream-arc">
        <div className="arc-row">
          <dt>Observation</dt>
          <dd>
            {s.count} {s.observationLabel}{s.count === 1 ? "" : "s"}
          </dd>
        </div>
        <div className="arc-row">
          <dt>Analysis</dt>
          <dd>
            {s.efflorescenceCount > 0
              ? `${s.analysisLabel} drew out ${s.efflorescenceCount} ${s.efflorescenceLabel}`
              : `${s.analysisLabel} under way — no ${s.efflorescenceLabel} yet`}
          </dd>
        </div>
        {topEff.length > 0 && (
          <div className="arc-row">
            <dt>Efflorescence</dt>
            <dd>
              <ul className="eff-list">
                {topEff.map((e, i) => (
                  <li key={i}>
                    <span className="eff-type">{e.type}</span> {e.text}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {s.attribution && (
          <div className="arc-row">
            <dt>Attribution</dt>
            <dd>mostly {s.attribution}</dd>
          </div>
        )}
        <div className="arc-row">
          <dt>Safety &amp; responsibility</dt>
          <dd>
            {s.sensitive > 0
              ? `${s.sensitive} flagged sensitive — kept private, handled with care`
              : "all private in your Pod; nothing shared without your consent"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
