// SolidStatus — honest, live feedback on the reality of the Solid connection.
//
// This app does not own the data; it talks to the user's Pod over the network.
// So the UI should never pretend: it reflects the *actual* connection state —
// connecting, connected (to a named provider), or a real error — rather than a
// decorative "logged in" badge. Factuality is the point.

function providerHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

// Derive one of four states from the raw connection facts.
function derive({ sessionRequestInProgress, loggedIn, dataset, error, webId }) {
  if (error) return { key: "error", dot: "bg-red-500", label: "Pod connection problem", detail: error };
  if (sessionRequestInProgress) {
    return { key: "connecting", dot: "bg-amber-500 animate-pulse", label: "Connecting to your Pod…", detail: null };
  }
  if (!loggedIn) return { key: "offline", dot: "bg-zinc-400", label: "Not connected", detail: null };
  if (!dataset) {
    return { key: "opening", dot: "bg-amber-500 animate-pulse", label: "Opening your Pod…", detail: providerHost(webId) };
  }
  return { key: "connected", dot: "bg-emerald-500", label: "Connected to your Pod", detail: providerHost(webId) };
}

export default function SolidStatus(props) {
  const s = derive(props);
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs"
      title={s.detail ? `${s.label} · ${s.detail}` : s.label}
    >
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
      <span className="font-medium text-[var(--text)]">{s.label}</span>
      {s.detail && (
        <span className="hidden max-w-[38vw] truncate text-[var(--muted)] sm:inline">
          · {s.detail}
        </span>
      )}
    </div>
  );
}
