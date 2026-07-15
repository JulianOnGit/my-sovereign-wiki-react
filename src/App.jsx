import { useCallback, useEffect, useState } from "react";
import { useSession } from "@inrupt/solid-ui-react";
import LoginForm from "./components/LoginForm.jsx";
import BrandMark from "./components/BrandMark.jsx";
import SolidStatus from "./components/SolidStatus.jsx";
import Capture from "./components/Capture.jsx";
import Wiki from "./components/Wiki.jsx";
import AskPod from "./components/AskPod.jsx";
import Organise from "./components/Organise.jsx";
import Present from "./components/Present.jsx";
import Journey from "./components/Journey.jsx";
import Share from "./components/Share.jsx";
import Govern from "./components/Govern.jsx";
import {
  getOrCreateWikiDataset,
  readItems,
  addItem,
  deleteItem,
  applyOrganise,
  wikiContainerUrl,
  uploadAttachment,
  getStorageInfo,
} from "./lib/pod.js";

const TABS = ["Capture", "Wiki", "Organise", "Explore", "Ask your Pod", "Journey", "Share", "Govern"];

export default function App() {
  const { session, sessionRequestInProgress } = useSession();
  const loggedIn = session.info.isLoggedIn;

  const [dataset, setDataset] = useState(null);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("Capture");
  const [status, setStatus] = useState(null);
  // Real Pod-connection error (drives the honest SolidStatus indicator), kept
  // separate from transient notices in `status`.
  const [error, setError] = useState(null);

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
        setError(null);
        const ds = await getOrCreateWikiDataset(session);
        if (cancelled) return;
        setDataset(ds);
        setItems(readItems(ds));
      } catch (e) {
        if (!cancelled) setError(e.message);
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

  const handleOrganise = useCallback(
    async (plan) => {
      const ds = await applyOrganise(session, dataset, plan);
      setDataset(ds);
      setItems(readItems(ds));
    },
    [session, dataset],
  );

  if (!loggedIn && !sessionRequestInProgress) {
    return <LoginForm />;
  }

  const connection = {
    sessionRequestInProgress,
    loggedIn,
    dataset,
    error,
    webId: session.info.webId,
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2.5">
          <BrandMark size={34} />
          <div className="leading-tight">
            <div className="font-semibold text-[var(--text)]">My Sovereign Wiki</div>
            <div className="text-xs text-[var(--muted)]">on your Solid Pod</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SolidStatus {...connection} />
          <button
            className="ghost-button !px-3 !py-1.5 text-sm"
            onClick={() => session.logout()}
          >
            Sign out
          </button>
        </div>
      </header>

      {sessionRequestInProgress && !dataset ? (
        <div className="center">Connecting to your Pod…</div>
      ) : (
        <>
          <nav className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition " +
                  (tab === t
                    ? "bg-[var(--accent)] font-semibold text-white"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)]")
                }
              >
                {t}
              </button>
            ))}
          </nav>

          {error && (
            <div className="status" role="alert">
              Could not reach your Pod: {error}
            </div>
          )}
          {status && <div className="status">{status}</div>}

          <main>
            {tab === "Capture" && (
              <Capture onAdd={handleAdd} onViewWiki={() => setTab("Wiki")} />
            )}
            {tab === "Wiki" && <Wiki items={items} onDelete={handleDelete} />}
            {tab === "Organise" && <Organise items={items} onOrganise={handleOrganise} />}
            {tab === "Explore" && <Present items={items} />}
            {tab === "Ask your Pod" && <AskPod items={items} />}
            {tab === "Journey" && <Journey items={items} />}
            {tab === "Share" && dataset && <Share session={session} dataset={dataset} />}
            {tab === "Govern" && dataset && (
              <Govern session={session} dataset={dataset} items={items} />
            )}
          </main>

          {dataset && <StoreFooter dataset={dataset} count={items.length} />}
        </>
      )}
    </div>
  );
}

// Store stage made tangible: a persistent line showing that everything lives in
// one custody as inspectable linked data, with a direct link to the raw Turtle.
function StoreFooter({ dataset, count }) {
  const store = getStorageInfo(dataset);
  return (
    <footer className="mt-8 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      <span>
        {count} item{count === 1 ? "" : "s"} stored as {store.format} in your Pod at{" "}
        <span className="text-[var(--text)]">{store.provider}</span>
      </span>
      <a
        href={store.indexUrl}
        target="_blank"
        rel="noreferrer"
        className="ml-auto font-medium text-[var(--accent)] no-underline"
      >
        Inspect raw data →
      </a>
    </footer>
  );
}
