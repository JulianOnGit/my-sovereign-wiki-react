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

  async function revokeOne(id) {
    setBusy(true);
    setStatus(null);
    try {
      await revokeAccess(session, store.indexUrl, id);
      setStatus({ kind: "ok", text: `Revoked access for ${shortWebId(id)}.` });
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

  const publicOpen = publicAccess && (publicAccess.read || publicAccess.write);
  // "Who can reach your wiki": you + the local AI, plus anyone external and the
  // public if it's open. Only meaningful once the audit has come back.
  const accessCount = grants === null ? null : 2 + others.length + (publicOpen ? 1 : 0);

  return (
    <div className="govern">
      {/* Hero — Govern is the payoff of the whole app: proof that this is yours. */}
      <div className="card govern-hero">
        <span className="govern-hero-badge">Your sovereignty</span>
        <h2 className="govern-hero-title">This is yours — and here’s the proof.</h2>
        <p className="muted">
          Everything you’ve captured lives in your Pod, under your own WebID, as
          standard Turtle you can pick up and carry anywhere. This page is the
          receipt: exactly who can reach your wiki, which AI you’ve chosen, and
          one-click ways to take it all with you. Nothing here locks you in.
        </p>

        <div className="stat-row govern-stats">
          <div className="stat">
            <span className="stat-n tone-accent">{items.length}</span>
            <span className="stat-label">observations in your Pod</span>
          </div>
          <div className="stat">
            <span className="stat-n tone-accent">{accessCount ?? "—"}</span>
            <span className="stat-label">people &amp; agents with access</span>
          </div>
          <div className="stat">
            <span className={`stat-n ${others.length ? "tone-warn" : "tone-good"}`}>
              {grants === null ? "—" : others.length}
            </span>
            <span className="stat-label">external parties</span>
          </div>
          <div className="stat">
            <span className="stat-n tone-good">Turtle</span>
            <span className="stat-label">open, portable format</span>
          </div>
        </div>

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
        </dl>
      </div>

      <AiProviderCard />

      <div className="card">
        <div className="govern-card-head">
          <h3 className="section-heading">Who can reach your wiki</h3>
          {accessCount !== null && (
            <span className={`access-count ${others.length || publicOpen ? "is-shared" : "is-private"}`}>
              {others.length || publicOpen ? `${accessCount} with access` : "private to you"}
            </span>
          )}
        </div>
        <p className="muted">
          Read straight from your Pod’s access controls — not a cache, the real
          thing. Revoke anyone the moment you change your mind.
        </p>
        {grants === null ? (
          <p className="muted">Auditing access from your Pod…</p>
        ) : (
          <div className="grant-list">
            <GrantRow tone="owner" icon="👤" who="You" sub="owner" modes="full control" />
            <GrantRow
              tone="ai"
              icon="🤖"
              who="Sovereign AI"
              sub="runs on this device via your session — no separate credential"
              modes="local only"
            />
            {publicOpen && (
              <GrantRow
                tone="public"
                icon="🌐"
                who="Everyone (public)"
                sub="anyone with the link can reach this"
                modes={accessLabel(publicAccess)}
              />
            )}
            {others.map(([id, access]) => (
              <GrantRow
                key={id}
                tone="external"
                icon="🔗"
                who={shortWebId(id)}
                title={id}
                modes={accessLabel(access)}
                onRevoke={() => revokeOne(id)}
                busy={busy}
              />
            ))}
            {others.length > 1 && (
              <button className="revoke revoke-all" onClick={revokeAll} disabled={busy}>
                {busy ? "Revoking…" : "Revoke all external access"}
              </button>
            )}
          </div>
        )}
        {status && (
          <p className={status.kind === "error" ? "error-text" : "ok-text"}>{status.text}</p>
        )}
      </div>

      <div className="card">
        <h3 className="section-heading">Take it with you</h3>
        <p className="muted">
          Nothing here locks you in. Your data is standard Turtle you can take to
          any Solid provider, the AI is local and swappable, and your identity is
          your own WebID.
        </p>
        <div className="portability-points">
          <span className="portability-point">📦 Standard Turtle — no proprietary schema</span>
          <span className="portability-point">🔁 Swap providers without losing a thing</span>
          <span className="portability-point">🆔 Your WebID, not our account</span>
        </div>
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

// One row in the access audit: an avatar, who they are and what they can do, and
// an inline revoke for anyone external. Tone colours the avatar so the owner,
// the local AI, the public, and outsiders are distinguishable at a glance.
function GrantRow({ tone, icon, who, sub, modes, title, onRevoke, busy }) {
  return (
    <div className={`grant grant-${tone}`}>
      <span className="grant-avatar" aria-hidden="true">
        {icon}
      </span>
      <div className="grant-body">
        <span className="grant-name" title={title}>
          {who}
        </span>
        {sub && <span className="grant-sub">{sub}</span>}
      </div>
      <span className="grant-badge">{modes}</span>
      {onRevoke && (
        <button className="revoke" onClick={onRevoke} disabled={busy}>
          Revoke
        </button>
      )}
    </div>
  );
}

// Sovereign AI is a spectrum of options, ranked by how much of the trust stays
// with you — from a model that never leaves your device, through your own key
// called directly, to sovereign-jurisdiction and decentralised hosts you rent
// rather than surrender your data to. The on-device engine and bring-your-own-key
// paths are live today; the hosted-sovereign options are the roadmap, and are
// labelled honestly as previews.
const SOVEREIGN_AI_OPTIONS = [
  {
    key: "local",
    icon: "🔒",
    name: "On-device local engine",
    tagline: "Runs in your browser, over your Pod. Nothing ever leaves the device.",
    where: "Your device",
    status: "active",
  },
  {
    key: "anthropic",
    icon: "✨",
    name: "Claude (Anthropic)",
    tagline: "Bring your own key; called straight from your browser, never via us.",
    where: "Your key · direct call",
    status: "key",
  },
  {
    key: "openai",
    icon: "✨",
    name: "OpenAI",
    tagline: "Bring your own key; called straight from your browser, never via us.",
    where: "Your key · direct call",
    status: "key",
  },
  {
    key: "trellis",
    icon: "🇦🇺",
    name: "Trellis Data",
    tagline: "Australian AI company — sovereign models held under Australian jurisdiction and law.",
    where: "Australia",
    status: "preview",
  },
  {
    key: "rented",
    icon: "🧩",
    name: "Rented open-source model",
    tagline: "Run open-weights models (Llama, Mistral, Qwen) on a cloud GPU you rent — swap hosts freely, no lock-in.",
    where: "A cloud host you choose",
    status: "preview",
  },
  {
    key: "evernode",
    icon: "🕸️",
    name: "Decentralised compute · Evernode",
    tagline: "Open-source models on decentralised hosts — no single operator, ANU-born on the XRP Ledger.",
    where: "Decentralised network",
    status: "preview",
  },
];

const AI_STATUS_LABEL = { active: "Active", key: "Connect your key", preview: "Preview" };

// Your sovereign AI: choose where the intelligence runs, then (for the two live
// paths) supply your own key. The app works fully on the local engine with no key
// — the rest only upgrade generated prose and analysis, and none of it changes
// where the data lives.
function AiProviderCard() {
  const initial = getLLMConfig();
  const [provider, setProvider] = useState(initial.provider);
  const [key, setKey] = useState(initial.key);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState(null);

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

  // Selecting an option: the on-device engine maps to "none", the key options set
  // the provider, and the hosted-sovereign previews explain themselves rather than
  // pretend to connect.
  function choose(opt) {
    setSaved(false);
    if (opt.status === "preview") {
      setNote(
        `${opt.name} is on the sovereign-AI roadmap — a hosted option where the model runs ` +
          `on ${opt.where.toLowerCase()} instead of a big-tech server, with your Pod still ` +
          `the one source of truth. Today, use the on-device engine or your own key.`,
      );
      return;
    }
    setNote(null);
    setProvider(opt.key === "local" ? "none" : opt.key);
  }

  const selectedKey = provider === "none" ? "local" : provider;

  const activeLabel =
    initial.provider === "anthropic"
      ? "Claude (Anthropic)"
      : initial.provider === "openai"
        ? "OpenAI"
        : "Local engine only";

  return (
    <div className="card">
      <div className="govern-card-head">
        <h3 className="section-heading">Your sovereign AI</h3>
        <span className={`ai-status ${initial.provider === "none" ? "is-local" : "is-connected"}`}>
          {initial.provider === "none" ? "🔒 " : "✨ "}
          {activeLabel}
        </span>
      </div>
      <p className="muted">
        Sovereignty isn't only about your data — it's about where the intelligence
        runs, too. The wiki works entirely on a local, transparent engine with no
        key. Beyond that you have a spectrum of sovereign options: your own key
        called directly, an Australian provider under Australian law, or
        open-source models you rent on cloud or decentralised hosts. In every case
        your Pod stays the one source of truth.
      </p>

      <div className="ai-options">
        {SOVEREIGN_AI_OPTIONS.map((opt) => {
          const on = selectedKey === opt.key;
          return (
            <button
              type="button"
              key={opt.key}
              className={`ai-option${on ? " active" : ""} ai-option-${opt.status}`}
              onClick={() => choose(opt)}
            >
              <span className="ai-option-top">
                <span className="ai-option-icon" aria-hidden="true">{opt.icon}</span>
                <span className="ai-option-name">{opt.name}</span>
                <span className={`ai-option-status is-${opt.status}`}>
                  {AI_STATUS_LABEL[opt.status]}
                </span>
              </span>
              <span className="ai-option-tagline">{opt.tagline}</span>
              <span className="ai-option-where">
                <span aria-hidden="true">📍</span> Runs on: {opt.where}
              </span>
            </button>
          );
        })}
      </div>

      {note && <p className="ai-option-note">{note}</p>}

      <div className="ai-form">
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
            {saved ? "Saved" : provider === "none" ? "Use local engine" : "Save key"}
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
