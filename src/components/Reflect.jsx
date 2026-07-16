import { useMemo, useState } from "react";
import {
  analyseEcosystem,
  CAPABILITIES,
  STAGES,
  stageIndex,
  quadrantOf,
  QUADRANTS,
} from "../lib/eudaimonia.js";
import { DEMO_ITEMS, DEMO_STORY } from "../lib/demoData.js";

// Reflect — a plain-language mirror of what you've been capturing. It reads
// back your own notes and draws out the patterns: what you've been focused on
// lately, which parts of life your notes touch, and a few concrete next steps
// worth your time. Nothing is graded, and nothing here leaves your Pod.

const capName = (key) => CAPABILITIES.find((c) => c.key === key)?.name ?? key;
const stageName = (key) => STAGES.find((s) => s.key === key)?.name ?? key;
const QUAD_ORDER = ["quick-wins", "major", "fill-ins", "reconsider"];

// Deterministic 0..1 hash of an id, so a project always lands in the same spot.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

// The four discrete effort/benefit levels plot at evenly-inset band centres
// (not 0/33/67/100), leaving room to scatter on either side without piling onto
// the frame. Both axes read the same way: level 1 → 84%, level 4 → 16%. For
// effort that means "right = less effort"; for benefit, "up = more worthwhile".
const BAND = [84, 61, 39, 16];

// Deterministic 2-D scatter inside a cell: an angle + radius per id spreads
// dots that share an effort/benefit around a disc, so nothing overlaps and no
// row or column of dots lines up. Radius is capped so a dot never crosses into
// a neighbouring quadrant.
function scatter(id) {
  const angle = hash(id) * Math.PI * 2;
  const radius = 3 + Math.sqrt(hash(id + "~r")) * 8; // 3..11%
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
}

const clampPct = (n) => Math.min(96, Math.max(4, n));

// Where a project's dot sits on the matrix, as { left, top } percentages.
function dotPosition(p) {
  const { dx, dy } = scatter(p.id);
  return {
    left: clampPct(BAND[p.effort - 1] + dx),
    top: clampPct(BAND[p.benefit - 1] + dy),
  };
}

export default function Reflect({ items }) {
  // Example mode: default on when there's nothing of the user's own to reflect,
  // so Reflect is never a dead end — it opens on a whole example life instead of
  // an empty page. Users with data can toggle it to preview the vision. Mirrors
  // Explore and Ask, and reads back the *same* person's notes those pages use.
  // Derived, not mount-time state: the Pod loads async, and a useState snapshot
  // would lock the example on even after the user's items arrive.
  const [demoChoice, setDemoChoice] = useState(null);
  const demo = demoChoice ?? items.length === 0;
  const setDemo = setDemoChoice;
  const data = demo ? DEMO_ITEMS : items;
  const model = useMemo(() => analyseEcosystem(data), [data]);
  const [hover, setHover] = useState(null);

  // Only reachable when a user with no notes turns the example off.
  if (data.length === 0) {
    return (
      <div className="journey">
        <div className="demo-banner demo-banner-plain">
          <span>
            Reflect grows out of what you capture. Jot down a few things you’ve
            noticed, thought about, or want to do — then come back to see the
            bigger picture and what might be worth doing next.
          </span>
          <button className="demo-toggle" onClick={() => setDemo(true)}>
            ✨ See an example
          </button>
        </div>
      </div>
    );
  }

  const { capabilities, stages, focusStage, frontierStage, projects } = model;

  return (
    <div className="journey">
      {/* Example banner + toggle (mirrors Explore / Ask). */}
      {demo ? (
        <div className="demo-banner">
          <span>
            ✨ <strong>Example life.</strong> These are one person’s captured
            notes, read back to show what Reflect can surface.
            {items.length > 0 && " Your own reflection is hidden while this is on."}
          </span>
          {items.length > 0 && (
            <button className="demo-toggle" onClick={() => setDemo(false)}>
              Show my reflection
            </button>
          )}
        </div>
      ) : (
        <div className="demo-banner demo-banner-plain">
          <span>Everything below is read from your own captured notes.</span>
          <button className="demo-toggle" onClick={() => setDemo(true)}>
            ✨ See an example
          </button>
        </div>
      )}

      {/* Who this example is, and what Reflect drew out for them. */}
      {demo && (
        <div className="card trails-intro">
          <h2 className="section-heading">Whose notes are these?</h2>
          <p className="muted">{DEMO_STORY.intro}</p>
          <div className="story-gains">
            {DEMO_STORY.gains.map((g) => (
              <div key={g.journeys[0]} className="story-gain">
                <div className="aspect-chips">
                  {g.journeys.map((j) => (
                    <span key={j} className="aspect-chip">
                      {j}
                    </span>
                  ))}
                </div>
                <p className="story-gain-text">{g.surfaced}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What this is / how to use it */}
      <div className="card">
        <h2 className="section-heading">Reflect</h2>
        <p className="muted">
          Reflect looks back over the notes you’ve captured and shows you the
          bigger picture: what you’ve been thinking about, which parts of life
          you’re paying attention to, and a few things worth doing next. Nothing
          here is graded, and none of it leaves your Pod — the more you capture,
          the more it can show you.
        </p>
      </div>

      {/* Snapshot */}
      <div className="card">
        <h3 className="section-heading">Where you are right now</h3>
        <p className="muted">
          Most of your recent notes are about <strong>{focusStage.name}</strong>.
          A few also reach into <strong>{frontierStage.name}</strong> — the
          newest ground you’re starting to explore.
        </p>
      </div>

      {/* Roadmap stepper */}
      <div className="card">
        <h3 className="section-heading">Your path</h3>
        <p className="muted">
          People tend to build a good life in steps, from getting settled all
          the way to really thriving. The highlighted step is the furthest your
          notes reach so far, and the bars show where most of your attention has
          been.
        </p>
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
        <h3 className="section-heading">Areas of your life</h3>
        <p className="muted">
          How much your notes touch each part of life. A short bar just means
          you haven’t written much about it yet — it’s a hint about where you
          might look next, not a score.
        </p>
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
        <h3 className="section-heading">Where to focus next</h3>
        <p className="muted">
          Each dot is something you could do next. Dots higher up are more
          worthwhile; dots further right take less effort. So the top-right
          corner — worthwhile and easy — is the best place to start. Hover over a
          dot to see what it is.
        </p>
        <div className="matrix-wrap">
          <span className="axis-y">More worthwhile →</span>
          <div className="matrix" role="img" aria-label="Possible next steps placed by effort and how much they'd help">
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
              const { left, top } = dotPosition(p);
              return (
                <button
                  key={p.id}
                  className={`dot dot-${QUADRANTS[quadrantOf(p)].tone}`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  onMouseEnter={() => setHover(p)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(p)}
                  onBlur={() => setHover(null)}
                  aria-label={`${p.title}: effort ${p.effort} of 4, how much it helps ${p.benefit} of 4`}
                />
              );
            })}

            {hover && (
              <div
                className="matrix-tip"
                style={{
                  left: `${dotPosition(hover).left}%`,
                  top: `${dotPosition(hover).top}%`,
                }}
              >
                <strong>{hover.title}</strong>
                <span>
                  {QUADRANTS[quadrantOf(hover)].name} · effort {hover.effort}/4 · helps{" "}
                  {hover.benefit}/4
                </span>
              </div>
            )}
          </div>
          <span className="axis-x">← Takes more effort</span>
        </div>
      </div>

      {/* Projects, grouped by quadrant */}
      <div className="card">
        <h3 className="section-heading">Next steps to consider</h3>
        <p className="muted">
          Real things pulled from your own notes — ideas, questions, and things
          you said you wanted to do, learn, or make. They’re grouped by how much
          they’d help for the effort involved, so start at the top.
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
                      effort {p.effort}/4 · helps {p.benefit}/4
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
