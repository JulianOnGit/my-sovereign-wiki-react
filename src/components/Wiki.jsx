import { useMemo, useState } from "react";
import { buildWikiIndex, buildArticle } from "../lib/wiki.js";
import WikiList from "./WikiList.jsx";

// Wiki surface — the reading experience. A home that indexes generated articles,
// article pages assembled live from the observations, wikilinks between them,
// and the raw captured nodes folded in as the "source" layer.

const headline = (item) =>
  item.title || (item.body || "").trim().split("\n")[0].slice(0, 80) || "(observation)";

// Render text with inline wikilinks to any other article by name.
function Wikilinks({ text, targets, current, onOpen }) {
  if (!text) return null;
  const names = targets
    .filter((n) => n && n.length >= 3 && n.toLowerCase() !== current.toLowerCase())
    .sort((a, b) => b.length - a.length);
  if (names.length === 0) return text;

  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const matched = m[0];
    const canon = names.find((n) => n.toLowerCase() === matched.toLowerCase()) || matched;
    out.push(
      <button key={`${m.index}-${canon}`} className="wikilink" onClick={() => onOpen(canon)}>
        {matched}
      </button>,
    );
    last = m.index + matched.length;
    if (re.lastIndex === m.index) re.lastIndex += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

function Article({ article, onOpen, onHome }) {
  const link = (text) => (
    <Wikilinks text={text} targets={article.linkTargets} current={article.title} onOpen={onOpen} />
  );

  return (
    <div className="wiki">
      <button className="crumb" onClick={onHome}>
        ← Wiki home
      </button>
      <article className="card wiki-article">
        <h1 className="wiki-title">{article.title}</h1>

        <p className="wiki-lead">{link(article.llm || article.lead)}</p>
        {article.llm && <p className="wiki-generated">Summary written by your AI · grounded in the sources below</p>}

        {article.interpretations.length > 0 && (
          <section className="wiki-section">
            <h2>Interpretation</h2>
            <ul>
              {article.interpretations.map((t, i) => (
                <li key={i}>{link(t)}</li>
              ))}
            </ul>
          </section>
        )}

        {article.questions.length > 0 && (
          <section className="wiki-section">
            <h2>Open questions</h2>
            <ul>
              {article.questions.map((t, i) => (
                <li key={i}>{link(t)}</li>
              ))}
            </ul>
          </section>
        )}

        {article.emerged.length > 0 && (
          <section className="wiki-section">
            <h2>What emerged</h2>
            <ul>
              {article.emerged.map((t, i) => (
                <li key={i}>{link(t)}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="wiki-section">
          <h2>Observations ({article.sources.length})</h2>
          <div className="obs-rows">
            {article.sources.map((o) => (
              <div key={o.id} className="wiki-source">
                <span className="wiki-source-title">{headline(o)}</span>
                <span className="obs-row-date">{o.createdAt.toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>

        {article.related.length > 0 && (
          <section className="wiki-section">
            <h2>Connections</h2>
            <div className="node-topics">
              {article.related.map((r) => (
                <button key={r.name} className="tag tag-lens" onClick={() => onOpen(r.name)}>
                  {r.name} <span className="muted">· {r.count}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}

export default function Wiki({ items, onDelete }) {
  const [view, setView] = useState({ kind: "home" });
  const [filter, setFilter] = useState("");
  const index = useMemo(() => buildWikiIndex(items), [items]);

  const open = (name) => setView({ kind: "article", name });

  if (items.length === 0) {
    return (
      <p className="empty">
        Your wiki writes itself from what you capture. Add a few observations and
        run Organise — articles assemble themselves from the topics and people that
        appear.
      </p>
    );
  }

  if (view.kind === "article") {
    return (
      <Article
        article={buildArticle(items, view.name)}
        onOpen={open}
        onHome={() => setView({ kind: "home" })}
      />
    );
  }

  if (view.kind === "nodes") {
    return (
      <div className="wiki">
        <button className="crumb" onClick={() => setView({ kind: "home" })}>
          ← Wiki home
        </button>
        <h2 className="page-title">All observations</h2>
        <WikiList items={items} onDelete={onDelete} />
      </div>
    );
  }

  const q = filter.trim().toLowerCase();
  const shown = q ? index.filter((a) => a.name.toLowerCase().includes(q)) : index;
  const featured = index.slice(0, 8);

  return (
    <div className="wiki">
      <div className="card wiki-hero">
        <h2 className="page-title">Your wiki</h2>
        <p className="muted">
          {index.length} article{index.length === 1 ? "" : "s"}, generated live from{" "}
          {items.length} observation{items.length === 1 ? "" : "s"}. Every page is a
          view over your graph — nothing here is a stored copy.
        </p>
        <input
          className="wiki-search"
          placeholder="Search articles…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className="ghost-button" onClick={() => setView({ kind: "nodes" })}>
          Browse all observations →
        </button>
      </div>

      {!q && featured.length > 0 && (
        <div className="card">
          <h3 className="section-heading">Most connected</h3>
          <div className="topic-grid">
            {featured.map((a) => (
              <button key={a.name} className="topic-tile" onClick={() => open(a.name)}>
                <span className="topic-name">{a.name}</span>
                <span className="topic-count">{a.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="section-heading">{q ? "Results" : "All articles"}</h3>
        {shown.length === 0 ? (
          <p className="muted">No articles match “{filter}”.</p>
        ) : (
          <div className="article-index">
            {shown.map((a) => (
              <button key={a.name} className="article-row" onClick={() => open(a.name)}>
                <span className="article-name">{a.name}</span>
                <span className="muted">
                  {a.count} obs{a.updated ? ` · ${a.updated.toLocaleDateString()}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
