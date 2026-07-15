import { useMemo, useState } from "react";
import {
  analyseEcosystem,
  CAPABILITIES,
  STAGES,
  stageIndex,
  quadrantOf,
  QUADRANTS,
  matrixPosition,
} from "../lib/eudaimonia.js";

// Journey — the user's semantic ecosystem read as a picture of the good life:
// capabilities, developmental stages, a roadmap, and the projects that move the
// journey forward, prioritised on an effort × benefit matrix.

const capName = (key) => CAPABILITIES.find((c) => c.key === key)?.name ?? key;
const stageName = (key) => STAGES.find((s) => s.key === key)?.name ?? key;
const QUAD_ORDER = ["quick-wins", "major", "fill-ins", "reconsider"];

// Deterministic tiny jitter so projects sharing a cell don't fully overlap.
function jitter(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return ((h % 100) / 100 - 0.5) * 7; // ±3.5%
}

export default function Journey({ items }) {
  const model = useMemo(() => analyseEcosystem(items), [items]);
  const [hover, setHover] = useState(null);

  if (items.length === 0) {
    return (
      <p className="empty">
        Your journey builds itself from what you capture. Add a few observations —
        especially ones where something emerged — and a picture of your capabilities,
        stage, and next projects appears here.
      </p>
    );
  }

  const { capabilities, stages, focusStage, frontierStage, projects } = model;

  return (
    <div className="journey">
      {/* Snapshot */}
      <div className="card">
        <h2 className="section-heading">Where you are on the journey</h2>
        <p className="muted">
          Your recent focus is <strong>{focusStage.name}</strong>, and your captures
          reach as far as <strong>{frontierStage.name}</strong>. This is read from
          your own observations — a living model, not a test result.
        </p>
      </div>

      {/* Roadmap stepper */}
      <div className="card">
        <h3 className="section-heading">Roadmap</h3>
        <div className="roadmap">
          {stages.map((s, i) => {
            const state =
              s.key === frontierStage.key
                ? "frontier"
                : i <= stageIndex(frontierStage.key)
                  ? "reached"
                  : "ahead";
            return (
              <div key={s.key} className={`stage-step ${state}`} title={s.blurb}>
                <div className="stage-dot">{i + 1}</div>
                <div className="stage-name">{s.name}</div>
                <div className="stage-bar">
                  <span style={{ width: `${Math.round(s.share * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capabilities */}
      <div className="card">
        <h3 className="section-heading">Capabilities for a good life</h3>
        <div className="capability-grid">
          {capabilities.map((c) => (
            <div key={c.key} className="capability">
              <div className="capability-head">
                <span className="capability-name">{c.name}</span>
                <span className="capability-pct">{Math.round(c.strength * 100)}%</span>
              </div>
              <div className="capability-meter">
                <span style={{ width: `${Math.round(c.strength * 100)}%` }} />
              </div>
              <p className="capability-blurb">{c.blurb}</p>
              {c.activeAspects.length > 0 && (
                <div className="aspect-chips">
                  {c.activeAspects.map((a) => (
                    <span key={a} className="aspect-chip">
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Prioritisation matrix */}
      <div className="card">
        <h3 className="section-heading">Prioritisation matrix</h3>
        <p className="muted">
          Effort increases to the left, benefit upward — so the top-right corner is
          where the quick wins live.
        </p>
        <div className="matrix-wrap">
          <span className="axis-y">Benefit →</span>
          <div className="matrix" role="img" aria-label="Projects plotted by effort and benefit">
            <div className="quad q-major">
              <span>{QUADRANTS.major.name}</span>
            </div>
            <div className="quad q-quick">
              <span>{QUADRANTS["quick-wins"].name}</span>
            </div>
            <div className="quad q-reconsider">
              <span>{QUADRANTS.reconsider.name}</span>
            </div>
            <div className="quad q-fill">
              <span>{QUADRANTS["fill-ins"].name}</span>
            </div>

            {projects.map((p) => {
              const pos = matrixPosition(p);
              const left = Math.min(96, Math.max(4, pos.x * 100 + jitter(p.id)));
              const top = Math.min(96, Math.max(4, (1 - pos.y) * 100 + jitter(p.id + "y")));
              return (
                <button
                  key={p.id}
                  className={`dot dot-${QUADRANTS[quadrantOf(p)].tone}`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  onMouseEnter={() => setHover(p)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(p)}
                  onBlur={() => setHover(null)}
                  aria-label={`${p.title}: effort ${p.effort}, benefit ${p.benefit}`}
                />
              );
            })}

            {hover && (
              <div
                className="matrix-tip"
                style={{
                  left: `${Math.min(96, Math.max(4, matrixPosition(hover).x * 100 + jitter(hover.id)))}%`,
                  top: `${Math.min(96, Math.max(4, (1 - matrixPosition(hover).y) * 100 + jitter(hover.id + "y")))}%`,
                }}
              >
                <strong>{hover.title}</strong>
                <span>
                  {QUADRANTS[quadrantOf(hover)].name} · effort {hover.effort}/4 · benefit{" "}
                  {hover.benefit}/4
                </span>
              </div>
            )}
          </div>
          <span className="axis-x">← Effort</span>
        </div>
      </div>

      {/* Projects, grouped by quadrant */}
      <div className="card">
        <h3 className="section-heading">Projects</h3>
        <p className="muted">
          An open-ended set of moves toward the life you are building — drawn from
          what emerged in your captures, and from where the picture is thin.
        </p>
        {QUAD_ORDER.map((q) => {
          const list = projects.filter((p) => quadrantOf(p) === q);
          if (list.length === 0) return null;
          return (
            <div key={q} className="project-group">
              <div className={`project-group-head tone-${QUADRANTS[q].tone}`}>
                {QUADRANTS[q].name} <span className="muted">· {QUADRANTS[q].hint}</span>
              </div>
              {list.map((p) => (
                <div key={p.id} className="project">
                  <div className="project-title">{p.title}</div>
                  <div className="project-meta">
                    <span className="tag tag-lens">{capName(p.capability)}</span>
                    <span className="tag">{stageName(p.stage)}</span>
                    <span className="effort-benefit">
                      effort {p.effort}/4 · benefit {p.benefit}/4
                    </span>
                  </div>
                  <p className="project-rationale">{p.rationale}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
