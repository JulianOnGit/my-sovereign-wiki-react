import { useMemo, useState } from "react";
import { collectTopics, collectDates, nodeView } from "../lib/pages.js";
import { DEMO_ITEMS, DEMO_BY_ID, DEMO_TRAILS } from "../lib/demoData.js";
import { useRoute } from "../lib/router.js";

// Present/Compose stage — navigable, human pages generated live from the graph.
// A single component with an internal breadcrumb: the index (curiosity trails +
// topics + dates), a topic/person/date page, and the one-node "brain map" view.
//
// Explore leads with Curiosity trails: purpose-driven sequences of navigational
// hops that carry an initial spark of curiosity, across value streams, to a
// previously untapped spark of inspiration. When the Pod is sparse it runs on a
// self-contained example graph so the idea is legible from the first visit; a
// user with their own data can flip the example on or off at will.

function headline(item) {
  return item.title || item.body.trim().split("\n")[0].slice(0, 72) || "(observation)";
}

function ObservationRow({ item, onOpen }) {
  return (
    <button type="button" className="obs-row" onClick={() => onOpen(item.id)}>
      <span className="obs-row-title">{headline(item)}</span>
      <span className="obs-row-date">{item.createdAt.toLocaleDateString()}</span>
    </button>
  );
}

// One curiosity trail: the arc it travels, then each hop as a clickable node.
function Trail({ trail, onOpen }) {
  const steps = trail.steps
    .map((s) => ({ ...s, item: DEMO_BY_ID.get(s.id) }))
    .filter((s) => s.item);
  return (
    <div className="card trail-card">
      <div className="trail-arc">
        <span className="trail-lens">{trail.from}</span>
        <span className="trail-arrow" aria-hidden="true">
          ⟶
        </span>
        <span className="trail-lens trail-lens-to">{trail.to}</span>
      </div>
      <h3 className="trail-title">{trail.title}</h3>
      <p className="muted trail-hook">{trail.hook}</p>

      <ol className="trail-steps">
        {steps.map((step, i) => {
          const last = i === steps.length - 1;
          return (
            <li
              key={step.id}
              className={
                "trail-step" +
                (i === 0 ? " is-spark" : "") +
                (last ? " is-inspiration" : "") +
                (step.turn ? " is-turn" : "")
              }
            >
              {step.connector && (
                <div className="trail-connector">
                  <span className="trail-connector-line" aria-hidden="true" />
                  <span className="trail-connector-label">↳ {step.connector}</span>
                </div>
              )}
              <button
                type="button"
                className="trail-node"
                onClick={() => onOpen(step.item.id)}
              >
                <span className="trail-role">{step.role}</span>
                <span className="trail-headline">{headline(step.item)}</span>
                <span className="trail-snippet">{step.item.body.slice(0, 120)}…</span>
                <span className="trail-lenses">
                  {step.item.lenses.slice(0, 3).map((l) => (
                    <span key={l} className="tag tag-lens">
                      {l}
                    </span>
                  ))}
                </span>
                {last && step.item.efflorescence && (
                  <span className="trail-effloresced">
                    ✨ {step.item.efflorescenceType}: {step.item.efflorescence}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function Present({ items }) {
  const { segments, navigate } = useRoute();
  // View derived from the hash: #/explore, #/explore/topic/<name>,
  // #/explore/date/<date>, #/explore/node/<id>.
  const kind = ["topic", "date", "node"].includes(segments[1]) ? segments[1] : "index";
  const value = segments[2];

  // Example mode: default on when the user has no data of their own, so Explore
  // is never a dead end. Users with data can toggle it to preview the vision.
  const [demo, setDemo] = useState(items.length === 0);
  const data = demo ? DEMO_ITEMS : items;

  const topics = useMemo(() => collectTopics(data), [data]);
  const dates = useMemo(() => collectDates(data), [data]);

  const openNode = (id) => navigate("explore", "node", id);
  const openTopic = (name) => navigate("explore", "topic", name);
  const goIndex = () => navigate("explore");

  // Toggling the example resets the route so a demo/real node id can't linger in
  // the hash and resolve against the wrong graph.
  const setDemoMode = (on) => {
    setDemo(on);
    goIndex();
  };

  // ── Index ──────────────────────────────────────────────────────────────────
  if (kind === "index") {
    return (
      <div className="present">
        {demo ? (
          <div className="demo-banner">
            <span>
              ✨ <strong>Example graph.</strong> Sample observations, shown to
              demonstrate how Explore connects your data.
              {items.length > 0 && " Your own graph is hidden while this is on."}
            </span>
            {items.length > 0 && (
              <button className="demo-toggle" onClick={() => setDemoMode(false)}>
                Show my graph
              </button>
            )}
          </div>
        ) : (
          <div className="demo-banner demo-banner-plain">
            <span>Every page below is a live view over your own graph.</span>
            <button className="demo-toggle" onClick={() => setDemoMode(true)}>
              ✨ See an example
            </button>
          </div>
        )}

        {demo && (
          <div className="card trails-intro">
            <h2 className="section-heading">Curiosity trails</h2>
            <p className="muted">
              A trail is a path through connected observations — starting from an
              idle spark of curiosity, following one link to the next, and arriving
              somewhere you didn't set out for. Each one crosses from one part of
              life into another. Click any step to walk the graph yourself.
            </p>
          </div>
        )}

        {demo && DEMO_TRAILS.map((trail) => (
          <Trail key={trail.id} trail={trail} onOpen={openNode} />
        ))}

        <div className="card">
          <h2 className="section-heading">Topic &amp; people pages</h2>
          <p className="muted">
            Every page is a live view over the graph — nothing is duplicated.
          </p>
          <div className="topic-grid">
            {topics.map((t) => (
              <button
                key={t.name}
                type="button"
                className="topic-tile"
                onClick={() => openTopic(t.name)}
              >
                <span className="topic-name">{t.name}</span>
                <span className="topic-count">{t.items.length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="section-heading">Dates</h2>
          <div className="date-list">
            {dates.map((d) => (
              <button
                key={d.date}
                type="button"
                className="date-row"
                onClick={() => navigate("explore", "date", d.date)}
              >
                <span>{d.date}</span>
                <span className="topic-count">{d.items.length}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Topic / person page ──────────────────────────────────────────────────────
  if (kind === "topic") {
    const bucket = topics.find((t) => t.name === value);
    return (
      <div className="present">
        <button className="crumb" onClick={goIndex}>
          ← All pages
        </button>
        <div className="card">
          <h2 className="page-title">{value}</h2>
          <p className="muted">
            {bucket?.items.length ?? 0} observation
            {(bucket?.items.length ?? 0) === 1 ? "" : "s"}, most recent first.
          </p>
          <div className="obs-rows">
            {bucket?.items.map((item) => (
              <ObservationRow key={item.id} item={item} onOpen={openNode} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Date page ────────────────────────────────────────────────────────────────
  if (kind === "date") {
    const bucket = dates.find((d) => d.date === value);
    return (
      <div className="present">
        <button className="crumb" onClick={goIndex}>
          ← All pages
        </button>
        <div className="card">
          <h2 className="page-title">{value}</h2>
          <p className="muted">Everything that happened on this day.</p>
          <div className="obs-rows">
            {bucket?.items.map((item) => (
              <ObservationRow key={item.id} item={item} onOpen={openNode} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── One-node brain map ───────────────────────────────────────────────────────
  const node = nodeView(data, value);
  if (!node) {
    return (
      <div className="present">
        <button className="crumb" onClick={goIndex}>
          ← All pages
        </button>
        <p className="empty">That observation is no longer in your Pod.</p>
      </div>
    );
  }

  return (
    <div className="present">
      <button className="crumb" onClick={goIndex}>
        ← All pages
      </button>

      <div className="card node-focus">
        <span className="badge badge-observation">focus</span>
        <h2 className="page-title">{headline(node.focus)}</h2>
        {node.focus.body && <p className="body">{node.focus.body}</p>}
        {(node.focus.efflorescenceType || node.focus.efflorescence) && (
          <p className="enrich enrich-efflorescence">
            <span className="enrich-label">Emerged</span>
            {[node.focus.efflorescenceType, node.focus.efflorescence]
              .filter(Boolean)
              .join(" — ")}
          </p>
        )}
        {node.topics.length > 0 && (
          <div className="node-topics">
            {node.topics.map((t) => (
              <button key={t} type="button" className="tag tag-lens" onClick={() => openTopic(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="node-connections">
        <div className="card">
          <h3 className="section-heading">Related · AI-linked</h3>
          {node.related.length === 0 ? (
            <p className="muted">No related observations yet — run Organise to link this up.</p>
          ) : (
            <div className="obs-rows">
              {node.related.map((item) => (
                <ObservationRow key={item.id} item={item} onOpen={openNode} />
              ))}
            </div>
          )}
        </div>

        {node.backlinks.length > 0 && (
          <div className="card">
            <h3 className="section-heading">Linked from</h3>
            <div className="obs-rows">
              {node.backlinks.map((item) => (
                <ObservationRow key={item.id} item={item} onOpen={openNode} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
