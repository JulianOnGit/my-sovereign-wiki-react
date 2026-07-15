// Wiki screen: browse everything captured in the Pod. A read-only, light
// "one-node view" — the observation plus whatever enrichment the user chose to
// add. Nothing is shown that wasn't captured, so a one-sentence note stays a
// one-sentence note.

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

export default function WikiList({ items, onDelete }) {
  if (items.length === 0) {
    return (
      <p className="empty">
        Nothing captured yet. Note something you noticed from the Capture tab — it
        is written straight to your Pod.
      </p>
    );
  }

  return (
    <ul className="wiki-list">
      {items.map((item) => {
        const heading = item.title && item.title !== "(untitled)" ? item.title : null;
        return (
          <li key={item.id} className="card observation-card">
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
              {item.related.length > 0 && (
                <span className="related-count" title="AI-linked related observations">
                  🔗 {item.related.length} related
                </span>
              )}
              {item.encounterMode && ENCOUNTER_LABELS[item.encounterMode] && (
                <span className="provenance">{ENCOUNTER_LABELS[item.encounterMode]}</span>
              )}
              <span className="date">
                {item.when ? `${item.when} · ` : ""}
                {item.createdAt.toLocaleString()}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
