import { useMemo, useState } from "react";
import { collectTopics, collectDates, nodeView } from "../lib/pages.js";

// Present/Compose stage — navigable, human pages generated live from the graph.
// A single component with an internal breadcrumb: the index (topics + dates),
// a topic/person/date page, and the one-node "brain map" focus view.

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

export default function Present({ items }) {
  // view: { kind: "index" } | { kind: "topic", name } | { kind: "date", date }
  //       | { kind: "node", id }
  const [view, setView] = useState({ kind: "index" });

  const topics = useMemo(() => collectTopics(items), [items]);
  const dates = useMemo(() => collectDates(items), [items]);

  const openNode = (id) => setView({ kind: "node", id });
  const openTopic = (name) => setView({ kind: "topic", name });

  if (items.length === 0) {
    return (
      <p className="empty">
        No pages yet. Capture observations and run Organise — pages assemble
        themselves from the connections in your graph.
      </p>
    );
  }

  // ── Index ──────────────────────────────────────────────────────────────────
  if (view.kind === "index") {
    return (
      <div className="present">
        <div className="card">
          <h2 className="section-heading">Topic & people pages</h2>
          <p className="muted">Every page is a live view over your graph — nothing is duplicated.</p>
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
                onClick={() => setView({ kind: "date", date: d.date })}
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
  if (view.kind === "topic") {
    const bucket = topics.find((t) => t.name === view.name);
    return (
      <div className="present">
        <button className="crumb" onClick={() => setView({ kind: "index" })}>
          ← All pages
        </button>
        <div className="card">
          <h2 className="page-title">{view.name}</h2>
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
  if (view.kind === "date") {
    const bucket = dates.find((d) => d.date === view.date);
    return (
      <div className="present">
        <button className="crumb" onClick={() => setView({ kind: "index" })}>
          ← All pages
        </button>
        <div className="card">
          <h2 className="page-title">{view.date}</h2>
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
  const node = nodeView(items, view.id);
  if (!node) {
    return (
      <div className="present">
        <button className="crumb" onClick={() => setView({ kind: "index" })}>
          ← All pages
        </button>
        <p className="empty">That observation is no longer in your Pod.</p>
      </div>
    );
  }

  return (
    <div className="present">
      <button className="crumb" onClick={() => setView({ kind: "index" })}>
        ← All pages
      </button>

      <div className="card node-focus">
        <span className="badge badge-observation">focus</span>
        <h2 className="page-title">{headline(node.focus)}</h2>
        {node.focus.body && <p className="body">{node.focus.body}</p>}
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
