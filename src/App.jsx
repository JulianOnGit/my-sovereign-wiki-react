import { useCallback, useEffect, useState } from "react";
import { useSession } from "@inrupt/solid-ui-react";
import LoginForm from "./components/LoginForm.jsx";
import Capture from "./components/Capture.jsx";
import WikiList from "./components/WikiList.jsx";
import AskPod from "./components/AskPod.jsx";
import {
  getOrCreateWikiDataset,
  readItems,
  addItem,
  deleteItem,
  wikiContainerUrl,
  uploadAttachment,
  getStorageInfo,
} from "./lib/pod.js";

const TABS = ["Capture", "Wiki", "Ask your Pod"];

export default function App() {
  const { session, sessionRequestInProgress } = useSession();
  const loggedIn = session.info.isLoggedIn;

  const [dataset, setDataset] = useState(null);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("Capture");
  const [status, setStatus] = useState(null);

  // After Solid-OIDC returns us to /redirect.html and login completes, tidy the
  // browser URL back to / without a reload (the token exchange already used the
  // registered redirect URI, so it is safe to rewrite now).
  useEffect(() => {
    if (loggedIn && window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
  }, [loggedIn]);

  // Load (or create) the wiki dataset once logged in.
  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        setStatus("Opening your Pod…");
        const ds = await getOrCreateWikiDataset(session);
        if (cancelled) return;
        setDataset(ds);
        setItems(readItems(ds));
        setStatus(null);
      } catch (error) {
        if (!cancelled) setStatus(`Could not open your Pod: ${error.message}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, session]);

  const handleAdd = useCallback(
    async ({ links = [], files = [], ...fields }) => {
      if (!dataset) {
        setStatus("Still opening your Pod — try again in a moment.");
        throw new Error("dataset not ready");
      }
      // Upload picked files best-effort: a failed attachment must never cost the
      // user their captured text, so we collect the failures and save anyway.
      const container = wikiContainerUrl(dataset);
      const media = [...links];
      const failed = [];
      for (const file of files) {
        try {
          media.push(await uploadAttachment(session, container, file));
        } catch {
          failed.push(file.name);
        }
      }

      const ds = await addItem(session, dataset, { ...fields, media });
      setDataset(ds);
      setItems(readItems(ds));
      setStatus(
        failed.length
          ? `Saved. Couldn’t attach: ${failed.join(", ")}. Your observation is safe.`
          : null,
      );
      // Deliberately do NOT switch tabs: capture confirms quietly in place and
      // lets the user decide whether to move on, rather than forcing a next step.
    },
    [session, dataset],
  );

  const handleDelete = useCallback(
    async (id) => {
      const ds = await deleteItem(session, dataset, id);
      setDataset(ds);
      setItems(readItems(ds));
    },
    [session, dataset],
  );

  if (sessionRequestInProgress) {
    return <div className="center">Connecting to your Pod…</div>;
  }

  if (!loggedIn) {
    return <LoginForm />;
  }

  return (
    <div className="app">
      <header>
        <div>
          <strong>Self-Sovereign Wiki</strong>
          <span className="webid" title={session.info.webId}>
            {session.info.webId}
          </span>
        </div>
        <button className="logout" onClick={() => session.logout()}>
          Log out
        </button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {status && <div className="status">{status}</div>}

      <main>
        {tab === "Capture" && (
          <Capture onAdd={handleAdd} onViewWiki={() => setTab("Wiki")} />
        )}
        {tab === "Wiki" && <WikiList items={items} onDelete={handleDelete} />}
        {tab === "Ask your Pod" && <AskPod items={items} />}
      </main>

      {dataset && <StoreFooter dataset={dataset} count={items.length} />}
    </div>
  );
}

// Store stage made tangible: a persistent line showing that everything lives in
// one custody as inspectable linked data, with a direct link to the raw Turtle.
function StoreFooter({ dataset, count }) {
  const store = getStorageInfo(dataset);
  return (
    <footer className="store-footer">
      <span className="store-dot" aria-hidden="true">
        ●
      </span>
      <span>
        {count} item{count === 1 ? "" : "s"} stored as {store.format} in your Pod at{" "}
        <span className="store-provider">{store.provider}</span>
      </span>
      <a href={store.indexUrl} target="_blank" rel="noreferrer" className="store-link">
        Inspect raw data
      </a>
    </footer>
  );
}
