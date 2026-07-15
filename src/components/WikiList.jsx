import { useState } from "react";

// Wiki screen: browse everything captured in the Pod. A read-only, light
// "one-node view" — the observation plus whatever enrichment the user chose to
// add. Nothing is shown that wasn't captured, so a one-sentence note stays a
// one-sentence note.
//
// The AI-derived "related" links (from Organise) are made explorable here:
// each observation can reveal the notes the sovereign engine connected it to,
// and jumping to one scrolls it into view and highlights it — so the graph is
// something you can actually walk, not just a count you have to trust.

// Human labels for how an observation was encountered (attribution/provenance).
const ENCOUNTER_LABELS = {
  saw: "saw or heard directly",
  told: "someone told me",
  remembered: "remembered",
  measured: "measured",
  inferred: "inferred",
  generated: "system-generated",
  modelling: "modelled possibility",
};

function isImage(url) {
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?|#|$)/i.test(url);
}

function headline(item) {
  if (item.title && item.title !== "(untitled)") return item.title;
  const firstLine = (item.body || "").trim().split("\n")[0];
  return firstLine ? firstLine.slice(0, 70) : "(observation)";
}

export default function WikiList({ items, onDelete }) {
  // Which observation cards have their related-list expanded, and which card is
  // briefly highlighted after a jump.
  const [expanded, setExpanded] = useState(() => new Set());
  const [highlight, setHighlight] = useState(null);

  if (items.length === 0) {
    return (
      <p className="empty">
        Nothing captured yet. Note something you noticed from the Capture tab — it
        is written straight to your Pod.
      </p>
    );
  }

  const byId = new Map(items.map((it) => [it.id, it]));

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Jump to a related observation: scroll its card into view and flash it, so
  // the connection the AI drew is immediately legible.
  const jumpTo = (id) => {
    const el = document.getElementById(`obs-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(id);
    window.setTimeout(() => setHighlight((h) => (h === id ? null : h)), 1800);
  };

  return (
    <ul className="wiki-list">
      {items.map((item) => {
        const heading = item.title && item.title !== "(untitled)" ? item.title : null;
        // Resolve the AI-linked ids to the actual observations still present.
        const related = (item.related || [])
          .map((id) => byId.get(id))
          .filter(Boolean);
        const isOpen = expanded.has(item.id);
        return (
          <li
            key={item.id}
            id={`obs-${item.id}`}
            className={
              "card observation-card" + (highlight === item.id ? " is-highlighted" : "")
            }
          >
            <div className="item-head">
              {item.sensitivity === "sensitive" ? (
                <span className="badge badge-sensitive" title="Marked sensitive">
                  ⚠ sensitive
                </span>
              ) : (
                <span className="badge badge-observation">observation</span>
              )}
              {heading ? <h3>{heading}</h3> : <span className="head-spacer" />}
              <button
                className="delete"
                title="Delete from Pod"
                onClick={() => onDelete(item.id)}
              >
                ×
              </button>
            </div>

            {item.body && (
              <p className={heading ? "body" : "body body-lead"}>{item.body}</p>
            )}

            {item.media.length > 0 && (
              <div className="media">
                {item.media.map((url) =>
                  isImage(url) ? (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" className="media-thumb" />
                    </a>
                  ) : (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="link"
                    >
                      🔗 {url}
                    </a>
                  ),
                )}
              </div>
            )}

            {item.interpretation && (
              <p className="enrich">
                <span className="enrich-label">What it might mean</span>
                {item.interpretation}
              </p>
            )}
            {item.uncertainty && (
              <p className="enrich">
                <span className="enrich-label">Still uncertain</span>
                {item.uncertainty}
              </p>
            )}
            {(item.efflorescenceType || item.efflorescence) && (
              <p className="enrich enrich-efflorescence">
                <span className="enrich-label">Emerged</span>
                {[item.efflorescenceType, item.efflorescence].filter(Boolean).join(" — ")}
              </p>
            )}

            {item.mentions.length > 0 && (
              <div className="mentions">
                {item.mentions.map((m) => (
                  <span key={m} className="mention" title="AI-extracted entity">
                    {m}
                  </span>
                ))}
              </div>
            )}

            <div className="meta">
              {item.lenses.map((lens) => (
                <span key={lens} className="tag tag-lens">
                  {lens}
                </span>
              ))}
              {item.tags.map((tag) => (
                <span key={tag} className="tag">
                  #{tag}
                </span>
              ))}
              {related.length > 0 && (
                <button
                  className={"related-toggle" + (isOpen ? " is-open" : "")}
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                  title="Observations the AI linked to this one"
                >
                  🔗 {related.length} related{" "}
                  <span className="related-caret">{isOpen ? "▲" : "▼"}</span>
                </button>
              )}
              {item.encounterMode && ENCOUNTER_LABELS[item.encounterMode] && (
                <span className="provenance">{ENCOUNTER_LABELS[item.encounterMode]}</span>
              )}
              <span className="date">
                {item.when ? `${item.when} · ` : ""}
                {item.createdAt.toLocaleString()}
              </span>
            </div>

            {related.length > 0 && isOpen && (
              <div className="related-panel">
                <div className="related-panel-head">
                  Linked by the AI · click to jump to the observation
                </div>
                {related.map((r) => {
                  const snippet = (r.body || r.interpretation || "").trim().slice(0, 90);
                  const rHead = headline(r);
                  return (
                    <button
                      key={r.id}
                      className="related-item"
                      onClick={() => jumpTo(r.id)}
                    >
                      <span className="related-item-title">{rHead}</span>
                      {snippet && snippet !== rHead && (
                        <span className="related-item-snippet">{snippet}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
