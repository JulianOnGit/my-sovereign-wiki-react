import { useMemo, useState } from "react";
import { buildWikiIndex, buildArticle } from "../lib/wiki.js";
import { llmAvailable, llmProviderLabel, generateArticleSummary } from "../lib/llm.js";
import { useRoute } from "../lib/router.js";
import WikiCurated from "./WikiCurated.jsx";
import WikiList from "./WikiList.jsx";

// Wiki surface — the reading experience. A home that indexes generated articles,
// article pages assembled live from the observations, wikilinks between them,
// and the raw captured nodes folded in as the "source" layer.
//
// Before the user has captured anything of their own, the tab shows a curated
// demonstration wiki (see WikiCurated) — a well-kept encyclopedia of articles so
// the reading experience is compelling on first open. The instant a real
// observation exists, this live, derived-from-your-graph view takes over.

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

function Article({ article, onOpen, onHome, onGenerate, generating, genError }) {
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
        {article.llm ? (
          <p className="wiki-generated">
            Summary written by your {llmProviderLabel()} · grounded in the sources below
          </p>
        ) : (
          llmAvailable() && (
            <button className="ai-summary-btn" onClick={() => onGenerate(article)} disabled={generating}>
              {generating ? "Writing…" : `✨ Write summary with your ${llmProviderLabel()}`}
            </button>
          )
        )}
        {genError && <p className="error-text">Couldn’t generate: {genError}</p>}

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
  const { segments, navigate } = useRoute();
  const [filter, setFilter] = useState("");
  const [summaries, setSummaries] = useState({}); // topic name → AI summary
  const [generating, setGenerating] = useState(null); // topic name being generated
  const [errors, setErrors] = useState({});
  // Example mode: the curated demonstration encyclopedia. `null` means "follow
  // the data": demo while the Pod is empty, the user's own wiki the moment items
  // exist. This must be derived (not initial state) because the Pod loads async —
  // on a direct #/wiki load the component mounts with items=[] and the user's
  // entries arrive a beat later; a useState(items.length === 0) would lock the
  // example on and hide them. An explicit toggle overrides either way.
  const [demoChoice, setDemoChoice] = useState(null);
  const demo = demoChoice ?? items.length === 0;
  const setDemo = setDemoChoice;

  const index = useMemo(() => buildWikiIndex(items), [items]);

  // View derived from the hash: #/wiki (home), #/wiki/nodes, #/wiki/article/<name>.
  const sub = segments[1];
  const articleName = sub === "article" ? segments[2] : null;

  const open = (name) => navigate("wiki", "article", name);
  const goHome = () => navigate("wiki");

  // Toggling the example resets the route so a demo article slug can't linger in
  // the hash when we switch back to the real (derived) wiki, and vice versa.
  const setDemoMode = (on) => {
    setDemo(on);
    navigate("wiki");
  };

  // Banner shown while the curated example is on: offers to return to the user's
  // own wiki when they have one.
  const exampleBanner = (
    <div className="demo-banner">
      <span>
        ✨ <strong>Example wiki.</strong> A curated encyclopedia of one person’s
        captures, shown to demonstrate how your own wiki reads once it’s alive.
        {items.length > 0 && " Your own wiki is hidden while this is on."}
      </span>
      {items.length > 0 && (
        <button className="demo-toggle" onClick={() => setDemoMode(false)}>
          Show my wiki
        </button>
      )}
    </div>
  );

  // Banner shown on the real wiki: offers to preview the curated example.
  const seeExampleBanner = (
    <div className="demo-banner demo-banner-plain">
      <span>Everything here is generated live from your own captured notes.</span>
      <button className="demo-toggle" onClick={() => setDemoMode(true)}>
        ✨ See an example
      </button>
    </div>
  );

  async function handleGenerate(article) {
    const name = article.title;
    setGenerating(name);
    setErrors((e) => ({ ...e, [name]: null }));
    try {
      const text = await generateArticleSummary(article);
      setSummaries((s) => ({ ...s, [name]: text }));
    } catch (err) {
      setErrors((e) => ({ ...e, [name]: err.message }));
    } finally {
      setGenerating(null);
    }
  }

  if (demo) {
    return <WikiCurated banner={exampleBanner} />;
  }

  // Real wiki, but the user has turned the example off with nothing captured yet.
  if (items.length === 0) {
    return (
      <div className="wiki">
        {seeExampleBanner}
        <p className="empty">
          Your wiki writes itself from what you capture. Add a few observations and
          run Organise — articles assemble themselves from the topics and people
          that appear.
        </p>
      </div>
    );
  }

  if (articleName) {
    const article = buildArticle(items, articleName);
    article.llm = summaries[articleName] || null;
    return (
      <>
        {seeExampleBanner}
        <Article
          article={article}
          onOpen={open}
          onHome={goHome}
          onGenerate={handleGenerate}
          generating={generating === articleName}
          genError={errors[articleName]}
        />
      </>
    );
  }

  if (sub === "nodes") {
    return (
      <div className="wiki">
        {seeExampleBanner}
        <button className="crumb" onClick={goHome}>
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
      {seeExampleBanner}
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
        <button className="ghost-button" onClick={() => navigate("wiki", "nodes")}>
          Browse all observations →
        </button>
      </div>

      {/* The user's own entries, always listed on the home page — the wiki must
          show what you kept even before Organise has derived any articles. */}
      {!q && (
        <div className="card">
          <h3 className="section-heading">Your observations</h3>
          {index.length === 0 && (
            <p className="muted">
              No articles could be derived yet — articles grow from the tags,
              people and links in your notes. Run <strong>Organise</strong> to
              extract them. Everything you’ve kept is here:
            </p>
          )}
          <div className="obs-rows">
            {items.slice(0, 8).map((it) => (
              <button
                key={it.id}
                type="button"
                className="obs-row"
                onClick={() => navigate("explore", "node", it.id)}
                title="Open in Explore"
              >
                <span className="obs-row-title">{headline(it)}</span>
                <span className="obs-row-date">{it.createdAt.toLocaleDateString()}</span>
              </button>
            ))}
          </div>
          {items.length > 8 && (
            <button className="ghost-button" onClick={() => navigate("wiki", "nodes")}>
              All {items.length} observations →
            </button>
          )}
        </div>
      )}

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
