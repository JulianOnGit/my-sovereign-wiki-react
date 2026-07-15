// Wiki screen: browse everything captured in the Pod. Read-only list plus a
// delete action per item.
export default function WikiList({ items, onDelete }) {
  if (items.length === 0) {
    return (
      <p className="empty">
        Nothing captured yet. Add a note or bookmark from the Capture tab — it is
        written straight to your Pod.
      </p>
    );
  }

  return (
    <ul className="wiki-list">
      {items.map((item) => (
        <li key={item.id} className="card">
          <div className="item-head">
            <span className={`badge badge-${item.type}`}>{item.type}</span>
            <h3>{item.title}</h3>
            <button
              className="delete"
              title="Delete from Pod"
              onClick={() => onDelete(item.id)}
            >
              ×
            </button>
          </div>
          {item.link && (
            <a href={item.link} target="_blank" rel="noreferrer" className="link">
              {item.link}
            </a>
          )}
          {item.body && <p className="body">{item.body}</p>}
          <div className="meta">
            {item.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
            <span className="date">{item.createdAt.toLocaleString()}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
