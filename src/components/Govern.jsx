import { useCallback, useEffect, useState } from "react";
import {
  getStorageInfo,
  listAgentAccess,
  getPublicAccess,
  revokeAccess,
} from "../lib/pod.js";
import { getLLMConfig, setLLMConfig, clearLLMConfig } from "../lib/llm.js";

// Govern stage — enduring sovereignty: audit every access grant (including the
// AI), revoke, and stay portable. The design point is that nothing here locks
// the user in: the data is standard Turtle, the AI is local, and the provider is
// replaceable.

function shortWebId(webId) {
  try {
    const u = new URL(webId);
    return `${u.host}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return webId;
  }
}

function accessLabel(access) {
  if (!access) return "none";
  if (access.controlRead || access.controlWrite) return "full control";
  const parts = [];
  if (access.read) parts.push("view");
  if (access.append) parts.push("comment");
  if (access.write) parts.push("edit");
  return parts.join(" · ") || "none";
}

export default function Govern({ session, dataset, items }) {
  const store = getStorageInfo(dataset);
  const webId = session.info.webId;

  const [grants, setGrants] = useState(null);
  const [publicAccess, setPublicAccess] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [agents, pub] = await Promise.all([
        listAgentAccess(session, store.indexUrl),
        getPublicAccess(session, store.indexUrl).catch(() => null),
      ]);
      setGrants(agents);
      setPublicAccess(pub);
    } catch (e) {
      setGrants({});
      setStatus({ kind: "error", text: `Couldn’t audit access: ${e.message}` });
    }
  }, [session, store.indexUrl]);

  useEffect(() => {
    load();
  }, [load]);

  const others = grants ? Object.entries(grants).filter(([id]) => id !== webId) : [];

  async function revokeAll() {
    setBusy(true);
    setStatus(null);
    try {
      for (const [id] of others) await revokeAccess(session, store.indexUrl, id);
      setStatus({ kind: "ok", text: "Revoked all external access. Your wiki is private again." });
      await load();
    } catch (e) {
      setStatus({ kind: "error", text: `Revoke failed: ${e.message}` });
    } finally {
      setBusy(false);
    }
  }

  // Client-side export — portability made real. The raw Turtle in the Pod is the
  // canonical portable form (linked below); this is a convenience snapshot.
  function exportData() {
    const snapshot = items.map((i) => ({
      id: i.id,
      title: i.title,
      observation: i.body,
      when: i.when,
      context: i.context,
      encounterMode: i.encounterMode,
      interpretation: i.interpretation,
      uncertainty: i.uncertainty,
      efflorescence: [i.efflorescenceType, i.efflorescence].filter(Boolean).join(" — "),
      lenses: i.lenses,
      tags: i.tags,
      mentions: i.mentions,
      related: i.related,
      media: i.media,
      sensitivity: i.sensitivity,
      created: i.createdAt?.toISOString?.() ?? null,
      modified: i.modifiedAt?.toISOString?.() ?? null,
      revision: i.revision,
    }));
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-sovereign-wiki-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="govern">
      <div className="card">
        <h2 className="section-heading">Sovereignty</h2>
        <dl className="govern-facts">
          <div>
            <dt>Identity (WebID)</dt>
            <dd title={webId}>{shortWebId(webId)}</dd>
          </div>
          <div>
            <dt>Pod provider</dt>
            <dd>{store.provider}</dd>
          </div>
          <div>
            <dt>Storage</dt>
            <dd>
              <a href={store.indexUrl} target="_blank" rel="noreferrer">
                {store.format}
              </a>
            </dd>
          </div>
          <div>
            <dt>Observations</dt>
            <dd>{items.length}</dd>
          </div>
        </dl>
      </div>

      <AiProviderCard />

      <div className="card">
        <h3 className="section-heading">Access audit</h3>
        {grants === null ? (
          <p className="muted">Auditing access from your Pod…</p>
        ) : (
          <>
            <div className="grant-row grant-self">
              <span className="grant-who">You (owner)</span>
              <span className="grant-modes">full control</span>
            </div>
            <div className="grant-row">
              <span className="grant-who">🤖 Sovereign AI (local)</span>
              <span className="grant-modes">
                runs on this device via your session — no separate credential
              </span>
            </div>
            {publicAccess && (publicAccess.read || publicAccess.write) && (
              <div className="grant-row">
                <span className="grant-who">🌐 Everyone (public)</span>
                <span className="grant-modes">{accessLabel(publicAccess)}</span>
              </div>
            )}
            {others.map(([id, access]) => (
              <div key={id} className="grant-row">
                <span className="grant-who" title={id}>
                  {shortWebId(id)}
                </span>
                <span className="grant-modes">{accessLabel(access)}</span>
              </div>
            ))}
            {others.length > 0 && (
              <button className="revoke revoke-all" onClick={revokeAll} disabled={busy}>
                {busy ? "Revoking…" : "Revoke all external access"}
              </button>
            )}
          </>
        )}
        {status && (
          <p className={status.kind === "error" ? "error-text" : "ok-text"}>{status.text}</p>
        )}
      </div>

      <div className="card">
        <h3 className="section-heading">Portability</h3>
        <p className="muted">
          Nothing here locks you in. Your data is standard Turtle you can take to
          any Solid provider, the AI is local and swappable, and your identity is
          your own WebID.
        </p>
        <div className="govern-actions">
          <button className="save" onClick={exportData} disabled={items.length === 0}>
            Export all observations (JSON)
          </button>
          <a className="ghost-button" href={store.indexUrl} target="_blank" rel="noreferrer">
            Open canonical Turtle
          </a>
          <button className="ghost-button" onClick={() => session.logout()}>
            Log out / switch provider
          </button>
        </div>
      </div>
    </div>
  );
}

// Your sovereign AI: choose a provider and supply your own key (stored only in
// this browser, called directly from it). The app works fully without one — this
// only upgrades generated prose and analysis.
function AiProviderCard() {
  const initial = getLLMConfig();
  const [provider, setProvider] = useState(initial.provider);
  const [key, setKey] = useState(initial.key);
  const [saved, setSaved] = useState(false);

  function save() {
    setLLMConfig({ provider, key: key.trim() });
    setSaved(true);
  }
  function disconnect() {
    clearLLMConfig();
    setProvider("none");
    setKey("");
    setSaved(false);
  }

  return (
    <div className="card">
      <h3 className="section-heading">Your AI provider</h3>
      <p className="muted">
        The wiki and journey work entirely on a local, transparent engine — no key
        needed. Optionally connect your own Claude or OpenAI key to have an AI
        write richer summaries. Your key stays in this browser and is called
        directly; it is never sent to any server of ours.
      </p>
      <div className="ai-form">
        <select value={provider} onChange={(e) => { setProvider(e.target.value); setSaved(false); }}>
          <option value="none">None — local engine only</option>
          <option value="anthropic">Claude (Anthropic)</option>
          <option value="openai">OpenAI</option>
        </select>
        {provider !== "none" && (
          <input
            type="password"
            placeholder={provider === "anthropic" ? "sk-ant-…" : "sk-…"}
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false); }}
            autoComplete="off"
          />
        )}
        <div className="ai-actions">
          <button className="save" onClick={save} disabled={provider !== "none" && !key.trim()}>
            {saved ? "Saved" : "Save"}
          </button>
          {initial.provider !== "none" && (
            <button className="ghost-button" onClick={disconnect}>
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
