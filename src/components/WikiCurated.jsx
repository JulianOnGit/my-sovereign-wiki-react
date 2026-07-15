import { useMemo, useState } from "react";
import { useRoute } from "../lib/router.js";
import { SEED_ITEMS } from "../lib/seed.js";
import {
  ARTICLES,
  CATEGORIES,
  categoryEmblem,
  findArticle,
  slugForTitle,
  resolveSources,
  articleUpdated,
} from "../lib/wikiArticles.js";
import WikiList from "./WikiList.jsx";

// Curated demonstration wiki — the reading experience shown before the user has
// captured anything. A home portal (featured article, category browse, article
// grid), full article pages with a sidebar infobox and the journey arc laid out
// explicitly, and a view of the underlying source observations. Everything reads
// as a well-kept encyclopedia so the Wiki tab is compelling on first open.

const fmtDate = (d) =>
  d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

// Render article prose supporting **bold**, *italic*, and [[Title]] /
// [[Title|label]] wikilinks that navigate to another article.
function renderInline(text, onOpen) {
  const nodes = [];
  let key = 0;

  const pushFormatted = (str) => {
    const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let l = 0;
    let mm;
    while ((mm = re.exec(str)) !== null) {
      if (mm.index > l) nodes.push(<span key={key++}>{str.slice(l, mm.index)}</span>);
      if (mm[2] !== undefined) nodes.push(<strong key={key++}>{mm[2]}</strong>);
      else nodes.push(<em key={key++}>{mm[3]}</em>);
      l = mm.index + mm[0].length;
    }
    if (l < str.length) nodes.push(<span key={key++}>{str.slice(l)}</span>);
  };

  const linkRe = /\[\[([^\]]+)\]\]/g;
  let last = 0;
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) pushFormatted(text.slice(last, m.index));
    const inner = m[1];
    const [target, label] = inner.includes("|") ? inner.split("|") : [inner, inner];
    const slug = slugForTitle(target.trim());
    if (slug) {
      const s = slug;
      nodes.push(
        <button key={key++} className="cwiki-link" onClick={() => onOpen(s)}>
          {label.trim()}
        </button>,
      );
    } else {
      pushFormatted(label.trim());
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) pushFormatted(text.slice(last));
  return nodes;
}

function Prose({ text, onOpen }) {
  return <p className="cwiki-p">{renderInline(text, onOpen)}</p>;
}

// A labelled row in the "journey arc" — the six components every user journey
// shares, rendered as the spine of each article.
function ArcRow({ icon, label, children }) {
  return (
    <div className="cwiki-arc-row">
      <div className="cwiki-arc-key">
        <span className="cwiki-arc-icon" aria-hidden="true">{icon}</span>
        {label}
      </div>
      <div className="cwiki-arc-val">{children}</div>
    </div>
  );
}

function ArticlePage({ article, onOpen, onHome, onCategory, onSources }) {
  const emblem = categoryEmblem(article.category);
  const updated = articleUpdated(article);
  const sources = resolveSources(article, SEED_ITEMS);
  const seeAlso = article.seeAlso.map(findArticle).filter(Boolean);

  return (
    <div className="wiki cwiki">
      <div className="cwiki-crumbs">
        <button className="crumb" onClick={onHome}>Wiki home</button>
        <span className="cwiki-crumb-sep">›</span>
        <button className="crumb" onClick={() => onCategory(article.category)}>
          {article.category}
        </button>
      </div>

      <article className="card cwiki-article">
        <header className="cwiki-head">
          <div className="cwiki-eyebrow">
            <span className="cwiki-emblem" aria-hidden="true">{emblem}</span>
            {article.category}
          </div>
          <h1 className="cwiki-title">{article.title}</h1>
          <p className="cwiki-lead">{renderInline(article.lead, onOpen)}</p>
        </header>

        <div className="cwiki-body">
          <div className="cwiki-main">
            {article.sections.map((s) => (
              <section key={s.heading} className="cwiki-section">
                <h2>{s.heading}</h2>
                <Prose text={s.body} onOpen={onOpen} />
              </section>
            ))}

            <section className="cwiki-arc">
              <h2>The observation, end to end</h2>
              <div className="cwiki-arc-grid">
                <ArcRow icon="👁️" label="Observation">
                  <Prose text={article.observation} onOpen={onOpen} />
                </ArcRow>
                <ArcRow icon="🧠" label="Analysis">
                  <Prose text={article.analysis} onOpen={onOpen} />
                </ArcRow>
                <ArcRow icon="🌱" label="What emerged">
                  <p className="cwiki-p">
                    <span className="cwiki-eff-type">{article.efflorescence.type}</span>
                    {" — "}
                    {renderInline(article.efflorescence.text, onOpen)}
                  </p>
                </ArcRow>
                <ArcRow icon="🔗" label="Attribution">
                  <Prose text={article.attribution} onOpen={onOpen} />
                </ArcRow>
                <ArcRow icon="🛡️" label="Safety">
                  <Prose text={article.safety} onOpen={onOpen} />
                </ArcRow>
                <ArcRow icon="🎯" label="Responsibility">
                  <Prose text={article.responsibility} onOpen={onOpen} />
                </ArcRow>
              </div>
            </section>

            {sources.length > 0 && (
              <section className="cwiki-section">
                <h2>Sources</h2>
                <p className="muted cwiki-sources-note">
                  Synthesised from {sources.length} observation
                  {sources.length === 1 ? "" : "s"} in your Pod.{" "}
                  <button className="cwiki-inline-link" onClick={onSources}>
                    Browse the source layer →
                  </button>
                </p>
                <div className="cwiki-sources">
                  {sources.map((s) => (
                    <div key={s.id} className="cwiki-source">
                      <span className="cwiki-source-title">{s.title}</span>
                      <span className="cwiki-source-date">{fmtDate(s.date)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="cwiki-infobox">
            <div className="cwiki-infobox-emblem" aria-hidden="true">{emblem}</div>
            <dl>
              <dt>Field of attention</dt>
              <dd>
                <button className="cwiki-chip-link" onClick={() => onCategory(article.category)}>
                  {article.category}
                </button>
              </dd>
              <dt>Reflective lens</dt>
              <dd>{article.lens}</dd>
              <dt>Last curated</dt>
              <dd>{fmtDate(updated)}</dd>
              <dt>Grounded in</dt>
              <dd>{sources.length} observation{sources.length === 1 ? "" : "s"}</dd>
            </dl>
            {seeAlso.length > 0 && (
              <div className="cwiki-seealso">
                <div className="cwiki-seealso-head">See also</div>
                {seeAlso.map((a) => (
                  <button key={a.slug} className="cwiki-seealso-link" onClick={() => onOpen(a.slug)}>
                    <span aria-hidden="true">{categoryEmblem(a.category)}</span> {a.title}
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      </article>
    </div>
  );
}

function ArticleCard({ article, onOpen }) {
  const emblem = categoryEmblem(article.category);
  return (
    <button className="cwiki-card" onClick={() => onOpen(article.slug)}>
      <div className="cwiki-card-emblem" aria-hidden="true">{emblem}</div>
      <div className="cwiki-card-body">
        <h3 className="cwiki-card-title">{article.title}</h3>
        <p className="cwiki-card-excerpt">{article.excerpt}</p>
        <div className="cwiki-card-foot">
          <span className="cwiki-card-cat">{article.category}</span>
          <span className="cwiki-card-date">{fmtDate(articleUpdated(article))}</span>
        </div>
      </div>
    </button>
  );
}

function Home({ onOpen }) {
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState(null);

  // A different featured article each time the Wiki tab is opened (Home remounts
  // per open), picked once per mount so it stays put while browsing/filtering.
  const featured = useMemo(
    () => ARTICLES[Math.floor(Math.random() * ARTICLES.length)] ?? ARTICLES[0],
    [],
  );

  // Categories that actually have articles, with counts, in the canonical order.
  const cats = useMemo(() => {
    const counts = new Map();
    for (const a of ARTICLES) counts.set(a.category, (counts.get(a.category) || 0) + 1);
    return CATEGORIES.filter((c) => counts.has(c.name)).map((c) => ({
      ...c,
      count: counts.get(c.name),
    }));
  }, []);

  const q = filter.trim().toLowerCase();
  const shown = ARTICLES.filter((a) => {
    if (category && a.category !== category) return false;
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="wiki cwiki">
      <div className="card cwiki-hero">
        <div className="cwiki-hero-eyebrow">Your Pod Wiki</div>
        <h2 className="cwiki-hero-title">A living encyclopedia of your attention</h2>
        <p className="cwiki-hero-sub">
          {ARTICLES.length} articles across {cats.length} fields of attention, each one
          woven from the moments you noticed and stored in your own Pod. Every page is a
          view over your graph — nothing here is a copy held by anyone else.
        </p>
        <input
          className="wiki-search"
          placeholder="Search the wiki…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {!q && !category && (
        <button className="card cwiki-featured" onClick={() => onOpen(featured.slug)}>
          <div className="cwiki-featured-emblem" aria-hidden="true">
            {categoryEmblem(featured.category)}
          </div>
          <div className="cwiki-featured-text">
            <div className="cwiki-featured-tag">Featured article · {featured.category}</div>
            <h3 className="cwiki-featured-title">{featured.title}</h3>
            <p className="cwiki-featured-excerpt">{featured.excerpt}</p>
            <span className="cwiki-featured-cta">Read the article →</span>
          </div>
        </button>
      )}

      <div className="cwiki-cats">
        <button
          className={"cwiki-cat-chip" + (category === null ? " is-active" : "")}
          onClick={() => setCategory(null)}
        >
          All <span className="cwiki-cat-count">{ARTICLES.length}</span>
        </button>
        {cats.map((c) => (
          <button
            key={c.name}
            className={"cwiki-cat-chip" + (category === c.name ? " is-active" : "")}
            onClick={() => setCategory(category === c.name ? null : c.name)}
          >
            <span aria-hidden="true">{c.emblem}</span> {c.name}
            <span className="cwiki-cat-count">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="cwiki-grid">
        {shown.length === 0 ? (
          <p className="muted">No articles match “{filter}”.</p>
        ) : (
          shown.map((a) => <ArticleCard key={a.slug} article={a} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

export default function WikiCurated({ banner = null }) {
  const { segments, navigate } = useRoute();
  const sub = segments[1];
  const slug = sub === "article" ? segments[2] : null;

  const open = (s) => {
    navigate("wiki", "article", s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goHome = () => navigate("wiki");
  const openCategory = () => navigate("wiki"); // home reads its own filter state
  const openSources = () => navigate("wiki", "nodes");

  // The optional example-mode banner (with its show/hide toggle) sits above
  // whichever curated view is showing, so the toggle is always reachable. The
  // wrapping .wiki column gives the banner the same spacing as the content.
  const withBanner = (el) =>
    banner ? (
      <div className="wiki">
        {banner}
        {el}
      </div>
    ) : (
      el
    );

  if (sub === "nodes") {
    return withBanner(
      <div className="wiki cwiki">
        <button className="crumb" onClick={goHome}>← Wiki home</button>
        <h2 className="page-title">The source layer</h2>
        <p className="muted cwiki-sources-note">
          The raw observations these articles are woven from — the same notes you capture,
          stored as linked data in your Pod.
        </p>
        <WikiList items={SEED_ITEMS} />
      </div>,
    );
  }

  if (slug) {
    const article = findArticle(slug);
    if (article) {
      return withBanner(
        <ArticlePage
          article={article}
          onOpen={open}
          onHome={goHome}
          onCategory={openCategory}
          onSources={openSources}
        />,
      );
    }
  }

  return withBanner(<Home onOpen={open} />);
}
