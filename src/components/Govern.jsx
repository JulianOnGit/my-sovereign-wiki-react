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

      <ProofVantage store={store} />

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

      <ProviderOptions store={store} onSwitch={() => session.logout()} />
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

// Where the app's source lives — the single most powerful proof, because it lets
// anyone read exactly what the code does with your data. Kept as a constant so
// it's trivial to repoint.
const SOURCE_URL = "https://github.com/JulianOnGit/self-sovereign-wiki";

// The open standards this app is built on, and which anyone can check it against.
// These are genuine, published specifications — conformance is verifiable, not a
// badge we award ourselves.
const STANDARDS = [
  { name: "Solid Protocol", body: "W3C Solid CG", note: "Data in a standards-based Pod you control" },
  { name: "Solid-OIDC", body: "W3C Solid CG", note: "Auth by your WebID — no app-owned account" },
  { name: "Linked Data · Turtle (RDF)", body: "W3C", note: "Your data as open, portable triples" },
  { name: "WAC & ACP", body: "W3C Solid CG", note: "Access enforced by your Pod, per resource" },
];

// Formal privacy/security certifications. A prototype has not yet been through
// third-party certification, so each carries an honest status rather than a
// fabricated seal — this is the vantage from which real certification is tracked.
const CERTIFICATIONS = [
  {
    name: "Australian Privacy Principles (APPs)",
    scope: "Privacy Act 1988 alignment",
    status: "self-attested",
  },
  {
    name: "ISO/IEC 27001",
    scope: "Information security management",
    status: "planned",
  },
  {
    name: "SOC 2 Type II",
    scope: "Security, availability & confidentiality",
    status: "planned",
  },
  {
    name: "GDPR — data portability & erasure",
    scope: "Arts. 17 & 20 by design",
    status: "self-attested",
  },
];

// Independent audits. Same honesty: what has been reviewed, by whom, and what is
// scheduled — nothing presented as complete that isn't.
const AUDITS = [
  {
    name: "Data-flow & privacy review",
    auditor: "Internal · reproducible",
    date: "Verifiable now",
    status: "open",
    detail: "Every network call is to your Pod or your chosen AI — confirm it in DevTools.",
  },
  {
    name: "Access-control (WAC/ACP) audit",
    auditor: "Independent security reviewer",
    date: "Scheduled",
    status: "scheduled",
    detail: "Third-party review of how grants are written and enforced on your Pod.",
  },
  {
    name: "Dependency & supply-chain scan",
    auditor: "Automated · on every build",
    date: "Continuous",
    status: "open",
    detail: "Open-source dependencies, lockfile pinned — inspect package-lock.json.",
  },
];

// Verifiable guarantees: promises paired with a way you can check each one
// yourself, right now. This is the heart of the proof vantage — not 'trust us',
// but 'here's how to see for yourself'.
const GUARANTEES = [
  {
    claim: "Your notes live only in your Pod — never on a server of ours.",
    verify: "Open the canonical Turtle below: that URL is your Pod's host, not ours.",
  },
  {
    claim: "The app has no backend of its own.",
    verify: "Open your browser's network tab — calls go to your Pod and, if you connect one, your chosen AI. Nowhere else.",
  },
  {
    claim: "The AI can run entirely on your device.",
    verify: "Disconnect any key: Organise, Explore, Reflect and Ask still work, offline.",
  },
  {
    claim: "No tracking, no telemetry, no analytics.",
    verify: "Search the open source for trackers — there are none to find.",
  },
  {
    claim: "Your data is portable, standard Turtle.",
    verify: "Export it, or open the raw Turtle, and load it into any other Solid app.",
  },
  {
    claim: "Access is enforced by your Pod, not by us.",
    verify: "Revoke a grant here, then try the resource as that agent — the Pod itself denies it.",
  },
];

const CERT_LABEL = { certified: "Certified", "self-attested": "Self-attested", planned: "Planned" };
const AUDIT_LABEL = { open: "Verifiable now", scheduled: "Scheduled", published: "Published" };

// The proof vantage — the receipt behind "this is yours". Four pillars, ordered
// by how directly you can check them: read the source, see the standards it's
// built on, the certification/audit trail, and a list of guarantees each paired
// with a way to verify it yourself.
function ProofVantage({ store }) {
  return (
    <div className="card proof-vantage">
      <div className="govern-card-head">
        <h3 className="section-heading">Proof vantage</h3>
        <span className="proof-tag">don’t trust — verify</span>
      </div>
      <p className="muted">
        Sovereignty you can check, not just claim. From here you can read the app’s
        source, see the open standards it’s built on, follow its certification and
        audit trail, and test each guarantee for yourself.
      </p>

      {/* 1 · Source */}
      <section className="proof-pillar">
        <div className="proof-pillar-head">
          <span className="proof-pillar-icon" aria-hidden="true">📖</span>
          <h4 className="proof-pillar-title">Read every line</h4>
          <span className="proof-pillar-sub">the whole app is open source</span>
        </div>
        <p className="proof-pillar-lead">
          Nothing is hidden. The code that reads, writes, and shares your Pod is
          right here to review — including the data-access and access-control
          layers where it matters most.
        </p>
        <div className="proof-links">
          <a className="save proof-source-btn" href={SOURCE_URL} target="_blank" rel="noreferrer">
            Browse the source →
          </a>
          <a className="ghost-button" href={`${SOURCE_URL}/tree/main/src/lib`} target="_blank" rel="noreferrer">
            Data-access &amp; access-control code
          </a>
        </div>
      </section>

      {/* 2 · Standards */}
      <section className="proof-pillar">
        <div className="proof-pillar-head">
          <span className="proof-pillar-icon" aria-hidden="true">📐</span>
          <h4 className="proof-pillar-title">Built on open standards</h4>
          <span className="proof-pillar-sub">conformance anyone can check</span>
        </div>
        <div className="proof-standards">
          {STANDARDS.map((s) => (
            <div key={s.name} className="proof-standard">
              <span className="proof-standard-name">{s.name}</span>
              <span className="proof-standard-body">{s.body}</span>
              <span className="proof-standard-note">{s.note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3 · Certifications & audits */}
      <section className="proof-pillar">
        <div className="proof-pillar-head">
          <span className="proof-pillar-icon" aria-hidden="true">🛡️</span>
          <h4 className="proof-pillar-title">Certifications &amp; audits</h4>
          <span className="proof-pillar-sub">tracked honestly — status and all</span>
        </div>
        <div className="proof-two-col">
          <div>
            <div className="proof-subhead">Privacy &amp; security certifications</div>
            <ul className="proof-list">
              {CERTIFICATIONS.map((c) => (
                <li key={c.name} className="proof-item">
                  <div className="proof-item-main">
                    <span className="proof-item-name">{c.name}</span>
                    <span className="proof-item-scope">{c.scope}</span>
                  </div>
                  <span className={`proof-status is-${c.status}`}>{CERT_LABEL[c.status] ?? c.status}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="proof-subhead">Certified audits</div>
            <ul className="proof-list">
              {AUDITS.map((a) => (
                <li key={a.name} className="proof-item proof-item-audit">
                  <div className="proof-item-main">
                    <span className="proof-item-name">{a.name}</span>
                    <span className="proof-item-scope">
                      {a.auditor} · {a.date}
                    </span>
                    <span className="proof-item-detail">{a.detail}</span>
                  </div>
                  <span className={`proof-status is-${a.status}`}>{AUDIT_LABEL[a.status] ?? a.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4 · Verifiable guarantees */}
      <section className="proof-pillar">
        <div className="proof-pillar-head">
          <span className="proof-pillar-icon" aria-hidden="true">✅</span>
          <h4 className="proof-pillar-title">Verifiable guarantees</h4>
          <span className="proof-pillar-sub">each one you can test yourself</span>
        </div>
        <div className="proof-guarantees">
          {GUARANTEES.map((g) => (
            <div key={g.claim} className="proof-guarantee">
              <span className="proof-guarantee-check" aria-hidden="true">✓</span>
              <div>
                <p className="proof-guarantee-claim">{g.claim}</p>
                <p className="proof-guarantee-verify">
                  <span className="proof-guarantee-verify-label">Verify</span> {g.verify}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="proof-guarantee-actions">
          <a className="ghost-button" href={store.indexUrl} target="_blank" rel="noreferrer">
            Open canonical Turtle
          </a>
        </div>
      </section>
    </div>
  );
}

// Pod providers you could move to. Your data is standard Turtle, so switching is
// a copy, not a migration — which means the choice can be about values, not
// lock-in: cost, the energy behind the servers, whose laws govern the data, and
// how the people who run it are treated. Ratings are indicative, to make the
// trade-offs legible rather than to score anyone precisely.
const POD_PROVIDERS = [
  {
    id: "solidcommunity-au",
    name: "pods.solidcommunity.au",
    flag: "🇦🇺",
    tagline: "The Australian Solid community server — where your wiki lives now.",
    current: true,
    cost: "Free · community-run",
    environment: "AU data centres, renewable-backed",
    sovereignty: "Australian jurisdiction 🇦🇺",
    workers: "Community & academic, under AU law",
  },
  {
    id: "self-host",
    name: "Self-hosted (Community Solid Server)",
    flag: "🔧",
    tagline: "Run the open-source server yourself — the most sovereign option of all.",
    cost: "Your hardware or VPS",
    environment: "Your choice of power — go green",
    sovereignty: "Absolute — you own the metal",
    workers: "You (and anyone you invite)",
  },
  {
    id: "datapod-eu",
    name: "datapod · redpencil.io",
    flag: "🇪🇺",
    tagline: "A European worker co-operative running green Solid hosting.",
    cost: "Free / pay-what-you-can",
    environment: "Green EU hosting",
    sovereignty: "EU jurisdiction, GDPR",
    workers: "Worker-owned co-operative",
  },
  {
    id: "inrupt",
    name: "Inrupt PodSpaces",
    flag: "🏢",
    tagline: "Managed, commercial Pod hosting from the company behind Solid.",
    cost: "Free tier · paid plans",
    environment: "Hyperscale cloud (multi-region)",
    sovereignty: "US company, region-selectable",
    workers: "US corporate employment",
  },
  {
    id: "solidcommunity-net",
    name: "solidcommunity.net",
    flag: "🌐",
    tagline: "The original global community server — free and volunteer-run.",
    cost: "Free · donations",
    environment: "Volunteer infrastructure",
    sovereignty: "Community, UK/global",
    workers: "Volunteer maintainers",
  },
];

const POD_ATTRS = [
  { key: "cost", icon: "💰", label: "Cost" },
  { key: "environment", icon: "🌱", label: "Environment" },
  { key: "sovereignty", icon: "🏛️", label: "National sovereignty" },
  { key: "workers", icon: "🤝", label: "Workers’ rights" },
];

// One-click places to stand up your own Solid server. Evernode leads for its
// philosophical fit — decentralised, no single operator, ANU-born — followed by
// Australia's sovereign secure clouds and an AI-model host, then a plain Docker
// path anyone can run. Links go to the real providers; the "deploy" itself is a
// prototype preview.
const CLOUD_HOSTS = [
  {
    id: "evernode",
    icon: "🕸️",
    name: "Evernode",
    region: "Decentralised network",
    tagline:
      "Host your Solid server on decentralised compute — no single operator can pull the plug. Born at the ANU, built on the XRP Ledger.",
    url: "https://evernode.org",
    highlight: true,
  },
  {
    id: "aucloud",
    icon: "🇦🇺",
    name: "AUCloud",
    region: "Australia · sovereign",
    tagline: "Certified Australian sovereign cloud, built for government-grade workloads.",
    url: "https://aucloud.com.au",
  },
  {
    id: "vault",
    icon: "🔐",
    name: "Vault Cloud",
    region: "Australia · secure",
    tagline: "Australia's highest-certified sovereign cloud, up to PROTECTED classification.",
    url: "https://vaultcloud.com.au",
  },
  {
    id: "trellis",
    icon: "🧠",
    name: "Trellis Data",
    region: "Australia · AI",
    tagline: "Australian AI — host sovereign models right alongside your Pod.",
    url: "https://www.trellisdata.com",
  },
  {
    id: "docker",
    icon: "🐳",
    name: "One-click Docker",
    region: "Anywhere you like",
    tagline: "Run the open-source Community Solid Server in a container on any host — total control.",
    url: "https://github.com/CommunitySolidServer/CommunitySolidServer",
  },
];

// Move providers, or host it yourself — the practical face of "nothing locks you
// in". A values-first comparison grid of Pod providers, and one-click ways to
// stand up your own Solid server on sovereign or decentralised infrastructure.
function ProviderOptions({ store, onSwitch }) {
  const [note, setNote] = useState(null);

  return (
    <div className="card provider-options">
      <h3 className="section-heading">Move providers, or host it yourself</h3>
      <p className="muted">
        Your wiki is standard Turtle, so moving it is a copy — not a migration. That
        frees the choice of provider to be about your values: what it costs, the
        energy behind the servers, whose laws govern your data, and how the people
        who run it are treated.
      </p>

      {/* Pod provider comparison */}
      <div className="provider-grid">
        {POD_PROVIDERS.map((prov) => (
          <div key={prov.id} className={`provider-card${prov.current ? " is-current" : ""}`}>
            <div className="provider-card-head">
              <span className="provider-flag" aria-hidden="true">{prov.flag}</span>
              <span className="provider-name">{prov.name}</span>
              {prov.current && <span className="provider-current-pill">You’re here</span>}
            </div>
            <p className="provider-tagline">{prov.tagline}</p>
            <dl className="provider-attrs">
              {POD_ATTRS.map((attr) => (
                <div key={attr.key} className="provider-attr">
                  <dt>
                    <span aria-hidden="true">{attr.icon}</span> {attr.label}
                  </dt>
                  <dd>{prov[attr.key]}</dd>
                </div>
              ))}
            </dl>
            {prov.current ? (
              <button className="ghost-button provider-btn" disabled>
                Current provider
              </button>
            ) : (
              <button
                className="save provider-btn"
                onClick={() => {
                  setNote(
                    `To move to ${prov.name}: create a Pod there, then sign in and import your ` +
                      `Turtle export — everything comes across because it's an open format. ` +
                      `Sign out here when you're ready to switch.`,
                  );
                }}
              >
                Move here →
              </button>
            )}
          </div>
        ))}
      </div>

      {note && (
        <div className="provider-note">
          <p>{note}</p>
          <button className="ghost-button" onClick={onSwitch}>
            Sign out to switch
          </button>
        </div>
      )}

      {/* One-click self-host */}
      <div className="provider-selfhost">
        <div className="proof-pillar-head">
          <span className="proof-pillar-icon" aria-hidden="true">🚀</span>
          <h4 className="proof-pillar-title">Or host your own Solid server — one click</h4>
          <span className="proof-pillar-sub">sovereign & decentralised infrastructure</span>
        </div>
        <p className="muted">
          Prefer to own the whole stack? Stand up your Pod’s Solid server on
          infrastructure that matches your principles — decentralised, or Australian
          and sovereign.
        </p>
        <div className="cloud-grid">
          {CLOUD_HOSTS.map((host) => (
            <div key={host.id} className={`cloud-card${host.highlight ? " is-highlight" : ""}`}>
              <div className="cloud-card-head">
                <span className="cloud-icon" aria-hidden="true">{host.icon}</span>
                <span className="cloud-name">{host.name}</span>
                <span className="cloud-region">{host.region}</span>
              </div>
              <p className="cloud-tagline">{host.tagline}</p>
              <div className="cloud-actions">
                <button
                  className="save cloud-deploy"
                  onClick={() =>
                    setNote(
                      `One-click deploy to ${host.name} is a prototype preview. Follow "Learn more" ` +
                        `to set it up today, then point your WebID at your new server.`,
                    )
                  }
                >
                  One-click deploy
                </button>
                <a className="ghost-button" href={host.url} target="_blank" rel="noreferrer">
                  Learn more →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
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
