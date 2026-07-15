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
    async (fields) => {
      const ds = await addItem(session, dataset, fields);
      setDataset(ds);
      setItems(readItems(ds));
      setTab("Wiki");
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
        {tab === "Capture" && <Capture onAdd={handleAdd} />}
        {tab === "Wiki" && <WikiList items={items} onDelete={handleDelete} />}
        {tab === "Ask your Pod" && <AskPod items={items} />}
      </main>
    </div>
  );
}
