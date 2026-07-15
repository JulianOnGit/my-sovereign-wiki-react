import { useCallback, useEffect, useState } from "react";
import {
  getStorageInfo,
  grantAccess,
  listAgentAccess,
  getPublicAccess,
  revokeAccess,
  ACCESS_PURPOSES,
} from "../lib/pod.js";

// Share stage — purpose-led, fine-grained consent by WebID (ACP/WAC).
//
// Sharing without copying: access is granted on the actual Pod resource, so
// there is one source of truth. Every call hits real Solid access controls and
// reports the true server response — a grant only "counts" if it landed.

// Turn an access-modes object into plain language.
function modesSummary(access) {
  if (!access) return "no access";
  if (access.controlRead || access.controlWrite) return "full control";
  const parts = [];
  if (access.read) parts.push("view");
  if (access.append) parts.push("comment");
  if (access.write) parts.push("edit");
  return parts.length ? parts.join(" · ") : "no access";
}

function shortWebId(webId) {
  try {
    const u = new URL(webId);
    return `${u.host}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return webId;
  }
}

export default function Share({ session, dataset }) {
  const store = getStorageInfo(dataset);
  const resourceUrl = store.indexUrl;

  const [webId, setWebId] = useState("");
  const [purpose, setPurpose] = useState("view");
  const [grants, setGrants] = useState(null); // null = loading
  const [publicAccess, setPublicAccess] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [agents, pub] = await Promise.all([
        listAgentAccess(session, resourceUrl),
        getPublicAccess(session, resourceUrl).catch(() => null),
      ]);
      setGrants(agents);
      setPublicAccess(pub);
    } catch (e) {
      setGrants({});
      setStatus({ kind: "error", text: `Couldn’t read access from your Pod: ${e.message}` });
    }
  }, [session, resourceUrl]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGrant(event) {
    event.preventDefault();
    const id = webId.trim();
    if (!id) return;
    setBusy(true);
    setStatus(null);
    try {
      await grantAccess(session, resourceUrl, id, purpose);
      setStatus({
        kind: "ok",
        text: `${shortWebId(id)} can now ${ACCESS_PURPOSES[purpose].label.toLowerCase()} your wiki.`,
      });
      setWebId("");
      await load();
    } catch (e) {
      setStatus({ kind: "error", text: `Grant did not land on your Pod: ${e.message}` });
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id) {
    setBusy(true);
    setStatus(null);
    try {
      await revokeAccess(session, resourceUrl, id);
      setStatus({ kind: "ok", text: `Revoked access for ${shortWebId(id)}.` });
      await load();
    } catch (e) {
      setStatus({ kind: "error", text: `Revoke failed: ${e.message}` });
    } finally {
      setBusy(false);
    }
  }

  const grantEntries = grants ? Object.entries(grants) : [];
  const others = grantEntries.filter(([id]) => id !== session.info.webId);

  return (
    <div className="share">
      <div className="card">
        <h2 className="section-heading">Share your wiki</h2>
        <p className="muted">
          Grant someone access to your knowledge — by their WebID, for a specific
          purpose. Nothing is copied: they read the one true resource in your Pod,
          and you can revoke at any time.
        </p>

        <form className="share-form" onSubmit={handleGrant}>
          <input
            type="url"
            placeholder="Their WebID, e.g. https://alice.solidcommunity.au/profile/card#me"
            value={webId}
            onChange={(e) => setWebId(e.target.value)}
          />
          <div className="share-controls">
            <label className="mini-label" htmlFor="purpose">
              Who is this for, and what should they be able to do?
            </label>
            <select id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {Object.entries(ACCESS_PURPOSES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <button type="submit" className="save" disabled={busy || !webId.trim()}>
              {busy ? "Applying…" : "Grant access"}
            </button>
          </div>
        </form>

        {status && (
          <p className={status.kind === "error" ? "error-text" : "ok-text"}>{status.text}</p>
        )}
        <p className="muted resource-note">
          Applies to <code>{store.indexUrl}</code>
        </p>
      </div>

      <div className="card">
        <h3 className="section-heading">Who has access</h3>
        {grants === null ? (
          <p className="muted">Reading access controls from your Pod…</p>
        ) : (
          <>
            <div className="grant-row grant-self">
              <span className="grant-who">You (owner)</span>
              <span className="grant-modes">full control</span>
            </div>
            {publicAccess && (publicAccess.read || publicAccess.append || publicAccess.write) && (
              <div className="grant-row">
                <span className="grant-who">🌐 Everyone (public)</span>
                <span className="grant-modes">{modesSummary(publicAccess)}</span>
              </div>
            )}
            {others.length === 0 ? (
              <p className="muted">Not shared with anyone yet.</p>
            ) : (
              others.map(([id, access]) => (
                <div key={id} className="grant-row">
                  <span className="grant-who" title={id}>
                    {shortWebId(id)}
                  </span>
                  <span className="grant-modes">{modesSummary(access)}</span>
                  <button
                    className="revoke"
                    onClick={() => handleRevoke(id)}
                    disabled={busy}
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
