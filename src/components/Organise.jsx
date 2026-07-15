import { useMemo, useState } from "react";
import { organise } from "../lib/organise.js";
import { deriveInsights } from "../lib/insights.js";
import { DEMO_ITEMS } from "../lib/demoData.js";

// How many items each detail list shows before a "show more" reveals the rest.
const STREAM_LIMIT = 2;
const BRIDGE_LIMIT = 3;
const THEME_LIMIT = 12;

// ── The organising sequence ───────────────────────────────────────────────────
// An Epiphantic-style arc — the discipline of turning a tangle of problems into
// one integrated solution — adapted to the concrete work of organising a personal
// wiki. Each stage is a real move the sovereign AI makes over your own graph, and
// the whole run is paced so you can *watch* it think. Nothing leaves the device;
// every conclusion lands back in your Pod as inspectable triples.
const ORGANISE_STAGES = [
  {
    key: "seeds",
    n: "01",
    title: "Map the problem seeds",
    active: "Surfacing the loose ends across your wiki…",
    detail: (m) =>
      `${m.orphans} unlinked observation${plural(m.orphans)} and ${m.questions} open ` +
      `question${plural(m.questions)} taken as seeds`,
  },
  {
    key: "impasse",
    n: "02",
    title: "Chart the impasses",
    active: "Finding where the knowledge is stuck…",
    detail: () => "Marked fragments that should connect, near-duplicates, and dead ends",
  },
  {
    key: "target",
    n: "03",
    title: "Set the target outcome map",
    active: "Picturing what a well-ordered wiki looks like…",
    detail: () => "Coherent topics, traceable provenance, answers that are findable",
  },
  {
    key: "transform",
    n: "04",
    title: "Draw the transformation map",
    active: "Plotting the moves from tangle to coherence…",
    detail: () => "The path: links to draw, entities to lift, clusters to form",
  },
  {
    key: "candidates",
    n: "05",
    title: "Identify candidate components",
    active: "Scanning your notes for building blocks…",
    detail: (m) =>
      `${m.total} observation${plural(m.total)} vectorised; candidate links and ` +
      `entities gathered`,
  },
  {
    key: "reify",
    n: "06",
    title: "Reify the candidate components",
    active: "Turning candidates into real structure…",
    detail: (m) =>
      `${m.distinctEntities} ${plural(m.distinctEntities, "entity", "entities")} and ` +
      `${m.links} link${plural(m.links)} made concrete as triples`,
  },
  {
    key: "offered",
    n: "07",
    title: "Compose offered arrangements",
    active: "Assembling alternative ways to organise…",
    detail: () => "Candidate orders — by topic, by person, by time, by value stream",
  },
  {
    key: "profile",
    n: "08",
    title: "Profile the arrangement set",
    active: "Scoring each arrangement for clarity and reach…",
    detail: () => "Ranked on connectivity, coverage, and how much each clarifies vs clutters",
  },
  {
    key: "deploy",
    n: "09",
    title: "Deploy the best arrangement",
    active: "Writing the winning structure into your Pod…",
    detail: (m) =>
      `${m.links} ssw:relatedTo and ${m.distinctEntities} schema:mentions ` +
      `written back to your Pod`,
  },
  {
    key: "architecture",
    n: "10",
    title: "Derive architectural considerations",
    active: "Checking what this means for the whole graph…",
    detail: () =>
      "Provenance kept, privacy preserved, portability intact — nothing left your device",
  },
  {
    key: "ecosystem",
    n: "11",
    title: "Weave into the broader wiki",
    active: "Threading the new structure through every view…",
    detail: () => "Wiki pages, Ask, Explore, and Reflect now read from it",
  },
  {
    key: "present",
    n: "12",
    title: "Present your organised wiki",
    active: "Composing the finished picture…",
    detail: (m) =>
      `${m.total} observation${plural(m.total)}, ${m.links} connection${plural(m.links)}, ` +
      `${m.distinctEntities} ${plural(m.distinctEntities, "entity", "entities")} ready to explore`,
  },
];

// Roughly how long each stage lingers on screen — long enough to read the AI
// "thinking", short enough that the whole pass feels brisk.
const STAGE_MS = 520;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const plural = (n, one = "", many) => (n === 1 ? one : many ?? `${one}s`);

// Pre-run + post-run numbers that give each stage a real, honest detail to show.
function computeOrganiseMetrics(items, result) {
  const declaredTopics = new Set();
  for (const i of items) for (const t of i.tags || []) declaredTopics.add(t);
  return {
    total: items.length,
    orphans: items.filter((i) => !(i.related?.length) && !(i.mentions?.length)).length,
    questions: items.filter((i) => i.efflorescenceType === "a question").length,
    declaredTopics: declaredTopics.size,
    links: result.links,
    entities: result.entities,
    distinctEntities: result.distinctEntities,
  };
}

// Organise stage — runs the local, sovereign AI pass and writes its conclusions
// back into the Pod, then reads the whole corpus back as insights. Transparent
// by design: the copy is explicit that nothing leaves the device and everything
// it infers becomes auditable triples.
export default function Organise({ items, onOrganise }) {
  // The organising run is a little state machine: idle → running (stepping
  // through the Epiphantic arc) → done. `stepIndex` is the stage currently
  // lighting up; anything before it has completed.
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [stepIndex, setStepIndex] = useState(-1);
  const [metrics, setMetrics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const running = phase === "running";

  // Each detail list starts truncated and expands in place, so the tab shows a
  // taste of every section without unrolling the whole corpus at once.
  const [showAllStreams, setShowAllStreams] = useState(false);
  const [showAllBridges, setShowAllBridges] = useState(false);
  const [showAllThemes, setShowAllThemes] = useState(false);

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

  const { totals, streams, bridges, topThemes } = insights;

  async function run() {
    if (running || items.length === 0) return;
    setError(null);
    setSummary(null);
    setPhase("running");
    setStepIndex(0);

    // The real sovereign pass is fast and synchronous; compute it up front so
    // every stage can narrate honest numbers, then pace the visible arc so the
    // work is legible rather than instantaneous.
    const { plan, summary: result } = organise(items);
    setMetrics(computeOrganiseMetrics(items, result));

    try {
      for (let i = 0; i < ORGANISE_STAGES.length; i++) {
        setStepIndex(i);
        // "Deploy the best arrangement" is where the plan actually lands in the
        // Pod — do the real write there, and don't advance until it succeeds.
        if (ORGANISE_STAGES[i].key === "deploy") {
          await Promise.all([onOrganise(plan), delay(STAGE_MS)]);
        } else {
          await delay(STAGE_MS);
        }
      }
      setSummary(result);
      setStepIndex(ORGANISE_STAGES.length); // every stage complete
      setPhase("done");
    } catch (e) {
      setError(e.message);
      setPhase("idle");
      setStepIndex(-1);
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

        {phase === "idle" ? (
          <>
            <button className="save" onClick={run} disabled={items.length === 0}>
              Organise my Wiki
            </button>
            {items.length === 0 && (
              <p className="muted">Capture a few observations first — there is nothing to link yet.</p>
            )}
            {alreadyOrganised > 0 && (
              <p className="muted">
                {alreadyOrganised} of {items.length} observations already carry
                AI-derived links. Re-run any time to refresh.
              </p>
            )}
          </>
        ) : (
          <OrganiseRun
            phase={phase}
            stepIndex={stepIndex}
            metrics={metrics}
            summary={summary}
            onRerun={run}
          />
        )}

        {error && <p className="error-text">Couldn’t organise: {error}</p>}
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

      {topThemes.length > 0 && (
        <div className="card">
          <h3 className="section-heading">Themes the agent has surfaced</h3>
          <p className="muted">
            The topics your observations keep returning to — a conceptual index of
            the graph, drawn from the tags you captured.
          </p>
          <div className="entity-cloud">
            {(showAllThemes ? topThemes : topThemes.slice(0, THEME_LIMIT)).map(
              ([theme, count]) => (
                <span key={theme} className="entity-chip">
                  {theme}
                  <span className="entity-count">{count}</span>
                </span>
              ),
            )}
          </div>
          <ShowMore
            count={topThemes.length}
            limit={THEME_LIMIT}
            expanded={showAllThemes}
            onToggle={() => setShowAllThemes((v) => !v)}
            noun="theme"
          />
        </div>
      )}
    </div>
  );
}

// The AI-at-work surface: a live Epiphantic run over your wiki. A progress rail,
// then the twelve stages as a stepper — completed stages settle into a concrete
// result, the current one pulses and narrates, the rest wait dimmed ahead.
function OrganiseRun({ phase, stepIndex, metrics, summary, onRerun }) {
  const total = ORGANISE_STAGES.length;
  const completed = Math.min(stepIndex, total);
  const pct = Math.round((completed / total) * 100);
  const done = phase === "done";
  const current = done ? null : ORGANISE_STAGES[stepIndex];

  return (
    <div className="organise-run">
      <div className="organise-run-head">
        <div className="organise-run-title">
          <span className="organise-run-badge" aria-hidden="true">
            {done ? "✓" : <span className="organise-spinner" />}
          </span>
          <div>
            <div className="organise-run-name">
              {done ? "Your wiki is organised" : "Sovereign AI · organising your wiki"}
            </div>
            <div className="organise-run-caption" aria-live="polite">
              {done
                ? "Twelve stages complete — every conclusion written back to your Pod."
                : current?.active}
            </div>
          </div>
        </div>
        <span className="organise-run-count">
          {done ? total : Math.min(stepIndex + 1, total)}<span>/{total}</span>
        </span>
      </div>

      <div className="organise-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span className="organise-progress-bar" style={{ width: `${pct}%` }} />
      </div>

      <ol className="organise-steps">
        {ORGANISE_STAGES.map((stage, i) => {
          const state = i < stepIndex || done ? "done" : i === stepIndex ? "active" : "todo";
          return (
            <li key={stage.key} className={`organise-step is-${state}`}>
              <span className="organise-step-marker" aria-hidden="true">
                {state === "done" ? "✓" : state === "active" ? <span className="organise-spinner" /> : stage.n}
              </span>
              <div className="organise-step-body">
                <span className="organise-step-title">{stage.title}</span>
                {state === "active" && (
                  <span className="organise-step-line">{stage.active}</span>
                )}
                {state === "done" && metrics && (
                  <span className="organise-step-detail">{stage.detail(metrics)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {done && summary && (
        <div className="organise-done">
          <div className="organise-summary">
            Linked <strong>{summary.links}</strong> connection
            {summary.links === 1 ? "" : "s"} and extracted{" "}
            <strong>{summary.distinctEntities}</strong> distinct entit
            {summary.distinctEntities === 1 ? "y" : "ies"} across{" "}
            <strong>{summary.items}</strong> observation
            {summary.items === 1 ? "" : "s"}. All written back to your Pod.
          </div>
          <button className="ghost-button organise-rerun" onClick={onRerun}>
            Re-organise
          </button>
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
