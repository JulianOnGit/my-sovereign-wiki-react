import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getStorageInfo,
  grantAccess,
  listAgentAccess,
  getPublicAccess,
  revokeAccess,
  ACCESS_PURPOSES,
} from "../lib/pod.js";
import { collectTopics } from "../lib/pages.js";
import {
  SUBJECT_KINDS,
  ACCESS_LEVELS,
  FACETS,
  FACET_KEYS,
  JOURNEYS,
  JOURNEY_BY_KEY,
  SCOPE_KINDS,
  DEMO_GRANTS,
  daysFromNow,
  formatDate,
  grantStatus,
  grantSentence,
  scopeIcon,
  scopeLabel,
} from "../lib/shareDemo.js";
import { buildGoodLifeArchitecture, SUPPORT_GRANTS } from "../lib/goodLife.js";
import { buildAuditFeed, AUDIT_EVENT_TYPES, timeAgo } from "../lib/accessLog.js";

// Share stage — purpose-led, fine-grained consent.
//
// Two layers, on purpose:
//   1. The fine-grained consent UX (Subject · Resource · Facets · Access): the
//      way sharing *should* feel — share your Care stream's observations, not
//      its private doubts; publish the bloom of your Creativity, nothing else.
//      These grants are the prototype's built-in demo, clearly labelled.
//   2. The honest ACL layer the Pod enforces today (resource-level WAC/ACP on
//      the one true index resource). Every call there hits real Solid access
//      controls and reports the true server response — a grant only counts if it
//      landed. This is what the fine-grained layer above compiles down to.

function shortWebId(webId) {
  try {
    const u = new URL(webId);
    return `${u.host}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return webId;
  }
}

// Turn an access-modes object (from the Pod) into plain language.
function modesSummary(access) {
  if (!access) return "no access";
  if (access.controlRead || access.controlWrite) return "full control";
  const parts = [];
  if (access.read) parts.push("view");
  if (access.append) parts.push("comment");
  if (access.write) parts.push("edit");
  return parts.length ? parts.join(" · ") : "no access";
}

const STATUS_LABEL = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
  pending: "Pending",
};
const STATUS_ORDER = { expiring: 0, pending: 1, active: 2, expired: 3 };

export default function Share({ session, dataset, items = [] }) {
  const store = getStorageInfo(dataset);
  const resourceUrl = store.indexUrl;

  // ── Layer 1: fine-grained shares (built-in demo + anything the user grants) ──
  const [shares, setShares] = useState(DEMO_GRANTS);

  // Composer state — the four dimensions of a grant.
  const [subjectKind, setSubjectKind] = useState("person");
  const [subjectName, setSubjectName] = useState("");
  const [subjectWebId, setSubjectWebId] = useState("");
  const [scopeKind, setScopeKind] = useState("journey");
  const [journeyKey, setJourneyKey] = useState("care");
  const [topicName, setTopicName] = useState("");
  const [observationId, setObservationId] = useState("");
  const [facets, setFacets] = useState(FACET_KEYS);
  const [access, setAccess] = useState("view");
  const [purpose, setPurpose] = useState("");
  const [expiresIn, setExpiresIn] = useState("0"); // days; "0" = no expiry

  // Real topics/observations from the active graph feed the resource picker.
  const topics = useMemo(() => collectTopics(items).slice(0, 40), [items]);
  const observations = useMemo(
    () =>
      items
        .filter((i) => (i.title || i.body || "").trim())
        .map((i) => ({ id: i.id, title: (i.title || i.body).trim().split("\n")[0].slice(0, 70) })),
    [items],
  );

  // Default the pickers to something real once the graph loads.
  useEffect(() => {
    if (!topicName && topics[0]) setTopicName(topics[0].name);
  }, [topics, topicName]);
  useEffect(() => {
    if (!observationId && observations[0]) setObservationId(observations[0].id);
  }, [observations, observationId]);

  const meta = SUBJECT_KINDS[subjectKind];

  // Assemble the live grant object from the composer, for both the preview and
  // the actual grant.
  const draft = useMemo(() => {
    let scope;
    if (scopeKind === "journey") scope = { kind: "journey", key: journeyKey };
    else if (scopeKind === "topic") scope = { kind: "topic", name: topicName };
    else if (scopeKind === "observation") {
      const obs = observations.find((o) => o.id === observationId);
      scope = { kind: "observation", id: observationId, title: obs?.title ?? "" };
    } else scope = { kind: "wiki" };

    return {
      subject: {
        kind: subjectKind,
        name: meta.needsName ? subjectName.trim() : SUBJECT_KINDS[subjectKind].label,
        webId: meta.needsWebId ? subjectWebId.trim() || null : null,
      },
      scope,
      facets,
      access,
      purpose: purpose.trim(),
      expiresAt: expiresIn !== "0" ? daysFromNow(Number(expiresIn)) : null,
      pending: false,
    };
  }, [
    subjectKind, subjectName, subjectWebId, scopeKind, journeyKey, topicName,
    observationId, observations, facets, access, purpose, expiresIn, meta,
  ]);

  const canGrant =
    facets.length > 0 &&
    (!meta.needsName || subjectName.trim()) &&
    (scopeKind !== "topic" || topicName) &&
    (scopeKind !== "observation" || observationId);

  function toggleFacet(key) {
    setFacets((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }

  const [notice, setNotice] = useState(null);

  function handleGrant(event) {
    event.preventDefault();
    if (!canGrant) return;
    const grant = { id: `share-${Date.now()}`, origin: "user", createdAt: new Date(), ...draft };
    setShares((prev) => [grant, ...prev]);
    setNotice({ kind: "ok", text: grantSentence(grant) });
    // Keep the shape of the grant, but clear the identity so the next one starts fresh.
    setSubjectName("");
    setSubjectWebId("");
    setPurpose("");
  }

  function handleRevokeShare(grant) {
    setShares((prev) => prev.filter((g) => g.id !== grant.id));
    setNotice({
      kind: "ok",
      text: `Revoked ${grant.subject.kind === "public" ? "public access" : grant.subject.name}${
        grant.scope.kind === "wiki" ? "" : ` to ${scopeLabel(grant.scope)}`
      }.`,
    });
  }

  // Panic control — cut every external grant at once, keeping the local, on-device
  // AI (it's you, running in your own session, not an outside party).
  function handleRevokeAllExternal() {
    setShares((prev) => {
      const kept = prev.filter((g) => g.subject.kind === "agent");
      const removed = prev.length - kept.length;
      setNotice(
        removed
          ? { kind: "ok", text: `Revoked ${removed} external grant${removed === 1 ? "" : "s"}. Your wiki is private again.` }
          : { kind: "ok", text: "No external grants to revoke." },
      );
      return kept;
    });
  }

  const orderedShares = useMemo(
    () =>
      [...shares].sort((a, b) => {
        const s = STATUS_ORDER[grantStatus(a)] - STATUS_ORDER[grantStatus(b)];
        if (s !== 0) return s;
        return (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0);
      }),
    [shares],
  );

  return (
    <div className="share">
      <div className="card share-intro">
        <h2 className="section-heading">Share your wiki, precisely</h2>
        <p className="muted">
          Consent is a sentence, not a switch. Choose <strong>who</strong>, exactly{" "}
          <strong>what</strong> of your knowledge, <strong>which slice</strong> of each note,
          and <strong>what they can do</strong> — for a purpose, and only as long as it serves
          it. Nothing is copied: they read the one true resource in your Pod, and you can revoke
          any grant at any time.
        </p>
      </div>

      <GoodLifeMap
        spanning={shares.filter((g) => g.scope?.kind === "wiki")}
        onRevokeSpanning={handleRevokeShare}
      />

      <GrantComposer
        subjectKind={subjectKind} setSubjectKind={setSubjectKind}
        subjectName={subjectName} setSubjectName={setSubjectName}
        subjectWebId={subjectWebId} setSubjectWebId={setSubjectWebId}
        scopeKind={scopeKind} setScopeKind={setScopeKind}
        journeyKey={journeyKey} setJourneyKey={setJourneyKey}
        topicName={topicName} setTopicName={setTopicName}
        observationId={observationId} setObservationId={setObservationId}
        topics={topics} observations={observations}
        facets={facets} toggleFacet={toggleFacet}
        access={access} setAccess={setAccess}
        purpose={purpose} setPurpose={setPurpose}
        expiresIn={expiresIn} setExpiresIn={setExpiresIn}
        draft={draft} canGrant={canGrant}
        onGrant={handleGrant}
      />

      {notice && (
        <p className={notice.kind === "error" ? "error-text" : "ok-text"}>{notice.text}</p>
      )}

      <div className="card">
        <div className="share-list-head">
          <h3 className="section-heading">Who you're sharing with</h3>
          <span className="share-count-pill">{shares.length}</span>
        </div>
        <p className="muted">
          Every grant below is a standing agreement about a specific slice of your wiki. This is
          the fine-grained consent layer — the demo shows it lived-in across your value streams.
        </p>
        <div className="share-list">
          {orderedShares.map((grant) => (
            <ShareCard key={grant.id} grant={grant} onRevoke={() => handleRevokeShare(grant)} />
          ))}
          {orderedShares.length === 0 && <p className="muted">Not shared with anyone yet.</p>}
        </div>
      </div>

      <AccessAudit
        shares={shares}
        onRevoke={handleRevokeShare}
        onRevokeAllExternal={handleRevokeAllExternal}
      />

      <EnforcedLayer session={session} resourceUrl={resourceUrl} store={store} />
    </div>
  );
}

// ── The composer ──────────────────────────────────────────────────────────────
function GrantComposer(p) {
  const meta = SUBJECT_KINDS[p.subjectKind];
  return (
    <form className="card grant-builder" onSubmit={p.onGrant}>
      <h3 className="section-heading">Grant new access</h3>

      {/* WHO */}
      <div className="builder-field">
        <span className="builder-label">Who — the subject</span>
        <div className="segmented">
          {Object.entries(SUBJECT_KINDS).map(([key, { label, icon }]) => (
            <button
              type="button"
              key={key}
              className={"seg" + (p.subjectKind === key ? " active" : "")}
              onClick={() => p.setSubjectKind(key)}
            >
              <span aria-hidden="true">{icon}</span> {label}
            </button>
          ))}
        </div>
        {meta.needsName && (
          <div className="builder-inputs">
            <input
              type="text"
              placeholder={p.subjectKind === "group" ? "Group name, e.g. Repair Café collective" : "Name, e.g. Nora"}
              value={p.subjectName}
              onChange={(e) => p.setSubjectName(e.target.value)}
            />
            {meta.needsWebId && (
              <input
                type="url"
                placeholder="Their WebID (optional) — https://nora.solidcommunity.au/profile/card#me"
                value={p.subjectWebId}
                onChange={(e) => p.setSubjectWebId(e.target.value)}
              />
            )}
          </div>
        )}
      </div>

      {/* WHAT — resource / object */}
      <div className="builder-field">
        <span className="builder-label">What — the resource</span>
        <div className="builder-inputs">
          <select value={p.scopeKind} onChange={(e) => p.setScopeKind(e.target.value)}>
            {Object.entries(SCOPE_KINDS).map(([key, { label, icon }]) => (
              <option key={key} value={key}>
                {icon}  {label}
              </option>
            ))}
          </select>
          {p.scopeKind === "journey" && (
            <select value={p.journeyKey} onChange={(e) => p.setJourneyKey(e.target.value)}>
              {JOURNEYS.map((j) => (
                <option key={j.key} value={j.key}>
                  {j.icon}  {j.name}
                </option>
              ))}
            </select>
          )}
          {p.scopeKind === "topic" && (
            <select value={p.topicName} onChange={(e) => p.setTopicName(e.target.value)}>
              {p.topics.length === 0 && <option value="">No topics yet</option>}
              {p.topics.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.items.length})
                </option>
              ))}
            </select>
          )}
          {p.scopeKind === "observation" && (
            <select value={p.observationId} onChange={(e) => p.setObservationId(e.target.value)}>
              {p.observations.length === 0 && <option value="">No observations yet</option>}
              {p.observations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* WHICH — facets */}
      <div className="builder-field">
        <span className="builder-label">
          Which slices — the facets{" "}
          <span className="builder-hint">every note follows the same arc; share only the parts you mean to</span>
        </span>
        <div className="facet-grid">
          {FACET_KEYS.map((key) => {
            const on = p.facets.includes(key);
            return (
              <button
                type="button"
                key={key}
                className={"facet-chip" + (on ? " active" : "")}
                onClick={() => p.toggleFacet(key)}
                title={FACETS[key].blurb}
              >
                <span aria-hidden="true">{FACETS[key].icon}</span>
                <span className="facet-chip-label">{FACETS[key].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* HOW — access */}
      <div className="builder-field">
        <span className="builder-label">What they can do — the access</span>
        <div className="access-options">
          {Object.entries(ACCESS_LEVELS).map(([key, { label, icon, blurb }]) => (
            <button
              type="button"
              key={key}
              className={"access-chip" + (p.access === key ? " active" : "")}
              onClick={() => p.setAccess(key)}
            >
              <span className="access-chip-top">
                <span aria-hidden="true">{icon}</span> {label}
              </span>
              <span className="access-chip-blurb">{blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Purpose + expiry */}
      <div className="builder-field">
        <span className="builder-label">Purpose & duration</span>
        <div className="builder-inputs">
          <input
            type="text"
            placeholder="Why are you sharing this? (optional, e.g. planning the memorial planting)"
            value={p.purpose}
            onChange={(e) => p.setPurpose(e.target.value)}
          />
          <select value={p.expiresIn} onChange={(e) => p.setExpiresIn(e.target.value)}>
            <option value="0">No end date</option>
            <option value="7">Expires in 7 days</option>
            <option value="30">Expires in 30 days</option>
            <option value="90">Expires in 90 days</option>
          </select>
        </div>
      </div>

      {/* Live plain-language preview */}
      <div className="grant-preview">
        <span className="grant-preview-label">This grant reads:</span>
        <p className="grant-preview-text">{grantSentence(p.draft)}</p>
      </div>

      <button type="submit" className="save" disabled={!p.canGrant}>
        Grant access
      </button>
    </form>
  );
}

// ── One share, rendered richly ────────────────────────────────────────────────
function ShareCard({ grant, onRevoke }) {
  const status = grantStatus(grant);
  const subjectMeta = SUBJECT_KINDS[grant.subject.kind];
  const access = ACCESS_LEVELS[grant.access];
  const allFacets = grant.facets.length >= FACET_KEYS.length;

  return (
    <div className={"share-card status-" + status}>
      <div className="share-card-head">
        <span className="subject-avatar" aria-hidden="true">{subjectMeta.icon}</span>
        <div className="subject-id">
          <span className="subject-name">
            {grant.subject.kind === "public" ? "Everyone (public)" : grant.subject.name}
          </span>
          {grant.subject.webId && (
            <span className="subject-web" title={grant.subject.webId}>
              {shortWebId(grant.subject.webId)}
            </span>
          )}
        </div>
        <div className="share-badges">
          {grant.subject.kind === "agent" && <span className="pill pill-agent">local AI</span>}
          {status !== "active" && (
            <span className={"pill pill-" + status}>{STATUS_LABEL[status]}</span>
          )}
          {grant.sensitive && <span className="pill pill-sensitive">🔒 sensitive</span>}
        </div>
      </div>

      <p className="share-sentence">{grantSentence(grant)}</p>

      <div className="share-attrs">
        <span className="scope-chip" title={"Resource · " + SCOPE_KINDS[grant.scope.kind]?.label}>
          <span aria-hidden="true">{scopeIcon(grant.scope)}</span> {scopeLabel(grant.scope)}
        </span>
        <span className="access-pill" title={access.blurb}>
          {access.icon} {access.label}
        </span>
      </div>

      <div className="share-facet-row" title={allFacets ? "All facets shared" : "Only these facets are shared"}>
        {FACET_KEYS.map((key) => {
          const on = grant.facets.includes(key);
          return (
            <span key={key} className={"facet-tag" + (on ? " on" : " off")} title={FACETS[key].label}>
              {FACETS[key].icon}
            </span>
          );
        })}
        <span className="facet-tag-label">{allFacets ? "all facets" : `${grant.facets.length}/6 facets`}</span>
      </div>

      {grant.purpose && (
        <p className="share-purpose">
          <span className="share-purpose-label">Purpose</span> {grant.purpose}
        </p>
      )}

      <div className="share-foot">
        <span className="share-when">
          {grant.origin === "demo" ? "Example grant" : "Granted just now"}
          {grant.expiresAt ? ` · until ${formatDate(grant.expiresAt)}` : ""}
        </span>
        <button className="revoke" onClick={onRevoke}>
          {grant.pending ? "Cancel invite" : "Revoke"}
        </button>
      </div>
    </div>
  );
}

// ── The architectural map: dimensions → areas → capabilities → supports ───────
// A structural view of your life's capabilities and the real-world supports that
// enable each one by holding access to the relevant slice of your wiki — your
// physiotherapist reading your exercise log, a housing service steadying your
// home. Dimensions are named as in Reflect's "Areas of your life"; capabilities
// follow a fuller good-life architecture. Every support is revocable in place.
function GoodLifeMap({ spanning = [], onRevokeSpanning }) {
  // The support grants are the map's own controllable state, so revoking one is
  // reflected immediately.
  const [supports, setSupports] = useState(SUPPORT_GRANTS);
  const { domains } = useMemo(
    () => buildGoodLifeArchitecture(supports, spanning),
    [supports, spanning],
  );
  const revokeSupport = (id) => setSupports((prev) => prev.filter((g) => g.id !== id));

  return (
    <div className="card goodlife">
      <div className="share-list-head">
        <h3 className="section-heading">Your data sharing organised by purpose</h3>
        <span className="share-count-pill">{supports.length} supports</span>
      </div>
      <p className="muted">
        The five areas of your life, each broken into the capabilities it's built
        from — and the people, services, and institutions that <em>enable</em> each
        capability by holding access to the relevant slice of your wiki. A capability
        with no grant stays entirely private. Revoke any support in place.
      </p>

      {spanning.length > 0 && (
        <div className="goodlife-spanning">
          <div className="goodlife-spanning-head">
            <span aria-hidden="true">♾️</span> Reaching across every capability
          </div>
          <div className="goodlife-grants">
            {spanning.map((g) => (
              <GrantMini key={g.id} grant={g} onRevoke={onRevokeSpanning} />
            ))}
          </div>
        </div>
      )}

      <div className="goodlife-domains">
        {domains.map((d) => (
          <div key={d.key} className={`goodlife-domain tone-gl-${d.tone}`}>
            <div className="goodlife-domain-head">
              <span className="goodlife-domain-icon" aria-hidden="true">{d.icon}</span>
              <div className="goodlife-domain-id">
                <span className="goodlife-domain-name">{d.name}</span>
                <span className="goodlife-domain-blurb">{d.blurb}</span>
              </div>
              <span className="goodlife-domain-count">
                {d.grantCount} support{d.grantCount === 1 ? "" : "s"}
              </span>
            </div>

            {d.groups.map((grp) => {
              const supported = grp.capabilities.filter((c) => c.grants.length);
              const priv = grp.capabilities.filter((c) => !c.grants.length);
              return (
                <div key={grp.key} className="goodlife-group">
                  {grp.name && <div className="goodlife-group-name">{grp.name}</div>}
                  {supported.length > 0 && (
                    <div className="goodlife-cap-grid">
                      {supported.map((c) => (
                        <div key={c.key} className="goodlife-cap">
                          <div className="goodlife-cap-name">
                            <span className="goodlife-cap-dot" aria-hidden="true" />
                            {c.name}
                          </div>
                          {c.grants.map((g) => (
                            <SupportRow key={g.id} grant={g} onRevoke={() => revokeSupport(g.id)} />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {priv.length > 0 && (
                    <div className="goodlife-private">
                      <span className="goodlife-private-label">🔒 Private</span>
                      {priv.map((c) => (
                        <span
                          key={c.key}
                          className="goodlife-private-chip"
                          title="No access grants — this capability stays entirely private"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// One support that enables a capability: who they are and their role, the access
// they hold, why, and an inline revoke.
function SupportRow({ grant, onRevoke }) {
  const access = ACCESS_LEVELS[grant.access];
  return (
    <div className="goodlife-support">
      <span className="goodlife-support-icon" aria-hidden="true">{grant.icon}</span>
      <div className="goodlife-support-body">
        <span className="goodlife-support-who">
          {grant.holder} <span className="goodlife-support-role">· {grant.role}</span>
        </span>
        {grant.purpose && <span className="goodlife-support-purpose">{grant.purpose}</span>}
      </div>
      <span className="goodlife-support-access" title={access?.blurb}>
        {access?.icon} {access?.label}
      </span>
      <button className="revoke" onClick={onRevoke}>
        Revoke
      </button>
    </div>
  );
}

// One whole-wiki grant (e.g. the local AI) shown in the spanning band: who, the
// slice they reach, what they can do, and an inline revoke.
function GrantMini({ grant, onRevoke }) {
  const subjectMeta = SUBJECT_KINDS[grant.subject.kind];
  const access = ACCESS_LEVELS[grant.access];
  const status = grantStatus(grant);
  const who = grant.subject.kind === "public" ? "Everyone" : grant.subject.name;
  return (
    <div className={"goodlife-grant status-" + status}>
      <span className="goodlife-grant-avatar" aria-hidden="true">{subjectMeta.icon}</span>
      <div className="goodlife-grant-body">
        <span className="goodlife-grant-who">{who}</span>
        <span className="goodlife-grant-scope">
          <span aria-hidden="true">{scopeIcon(grant.scope)}</span> {scopeLabel(grant.scope)}
        </span>
      </div>
      <span className="goodlife-grant-access" title={access?.blurb}>
        {access?.icon} {access?.label}
      </span>
      {grant.pending && <span className="pill pill-pending">Pending</span>}
      {onRevoke && (
        <button className="revoke" onClick={() => onRevoke(grant)}>
          Revoke
        </button>
      )}
    </div>
  );
}

// ── Access history & audit ────────────────────────────────────────────────────
// The permission audit trail: a chronological feed of grants made and — the part
// that matters for an audit — times someone actually reached your data, with
// controls to filter, export the log, revoke the grant behind any access, and cut
// all external sharing at once.
const AUDIT_FILTERS = [
  { key: "all", label: "All activity", match: () => true },
  { key: "accessed", label: "Actual accesses", match: (t) => ["accessed", "commented", "edited"].includes(t) },
  { key: "granted", label: "Grants & invites", match: (t) => ["granted", "invited"].includes(t) },
  { key: "revoked", label: "Revokes & expiries", match: (t) => ["revoked", "expiring"].includes(t) },
];

function AccessAudit({ shares, onRevoke, onRevokeAllExternal }) {
  const [filter, setFilter] = useState("all");
  const feed = useMemo(() => buildAuditFeed(shares), [shares]);
  const shareById = useMemo(() => new Map(shares.map((g) => [g.id, g])), [shares]);

  const active = AUDIT_FILTERS.find((f) => f.key === filter) ?? AUDIT_FILTERS[0];
  const shown = feed.filter((e) => active.match(e.type));
  const accessCount = feed.filter((e) => ["accessed", "commented", "edited"].includes(e.type)).length;

  function exportLog() {
    const rows = feed.map((e) => ({
      at: e.at instanceof Date ? e.at.toISOString() : null,
      event: AUDIT_EVENT_TYPES[e.type]?.label ?? e.type,
      who: e.who,
      what: e.what,
      detail: e.detail,
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-sovereign-wiki-access-audit.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card access-audit">
      <div className="share-list-head">
        <h3 className="section-heading">Access history &amp; audit</h3>
        <span className="share-count-pill">{accessCount} accesses</span>
      </div>
      <p className="muted">
        Every grant you make, and every time someone — or the local AI — actually
        reaches a slice of your wiki. This is your permission audit trail: filter it,
        export it, revoke the grant behind any access, or cut all external sharing at
        once.
      </p>

      {/* Controls */}
      <div className="audit-controls">
        <div className="audit-filters">
          {AUDIT_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={"audit-filter" + (filter === f.key ? " active" : "")}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="audit-actions">
          <button type="button" className="ghost-button" onClick={exportLog}>
            Export audit log
          </button>
          <button type="button" className="revoke revoke-all" onClick={onRevokeAllExternal}>
            Revoke all external
          </button>
        </div>
      </div>

      {/* Timeline */}
      <ol className="audit-feed">
        {shown.map((e) => {
          const meta = AUDIT_EVENT_TYPES[e.type] ?? { icon: "•", label: e.type, tone: "muted" };
          const grant = e.grantId ? shareById.get(e.grantId) : null;
          return (
            <li key={e.id} className="audit-event">
              <span className={`audit-dot tone-${meta.tone}`} aria-hidden="true">
                {meta.icon}
              </span>
              <div className="audit-event-body">
                <div className="audit-event-top">
                  <span className="audit-event-label">{meta.label}</span>
                  <span className="audit-event-time">{timeAgo(e.at)}</span>
                </div>
                <p className="audit-event-line">
                  <strong>{e.who}</strong>
                  {e.what ? <> · <span className="audit-event-what">{e.what}</span></> : null}
                </p>
                {e.detail && <p className="audit-event-detail">{e.detail}</p>}
              </div>
              {grant && (
                <button className="revoke audit-event-revoke" onClick={() => onRevoke(grant)}>
                  Revoke
                </button>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="muted">No activity of this kind yet.</li>}
      </ol>
    </div>
  );
}

// ── Layer 2: what the Pod actually enforces today ─────────────────────────────
// Honest, resource-level access on the one true index resource. Real Solid calls,
// real server responses — the fine-grained layer above compiles down to this.
function EnforcedLayer({ session, resourceUrl, store }) {
  const [webId, setWebId] = useState("");
  const [purpose, setPurpose] = useState("view");
  const [grants, setGrants] = useState(null);
  const [publicAccess, setPublicAccess] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

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
        text: `${shortWebId(id)} can now ${ACCESS_PURPOSES[purpose].label.toLowerCase()} the wiki resource.`,
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
    <div className="card enforced-layer">
      <button
        type="button"
        className="enforced-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="chevron">{open ? "▾" : "▸"}</span>
        <span className="section-heading enforced-title">Enforced now on your Pod</span>
        <span className="enforced-sub">
          {grants === null
            ? "reading…"
            : `${others.length} live grant${others.length === 1 ? "" : "s"} · resource-level`}
        </span>
      </button>

      {open && (
        <div className="enforced-body">
          <p className="muted">
            Solid enforces access per resource. The fine-grained grants above are the consent UX;
            underneath, this is the real access-control list on your wiki resource. Every action
            here hits your Pod and reports exactly what the server did.
          </p>

          <form className="share-form" onSubmit={handleGrant}>
            <input
              type="url"
              placeholder="WebID, e.g. https://alice.solidcommunity.au/profile/card#me"
              value={webId}
              onChange={(e) => setWebId(e.target.value)}
            />
            <div className="share-controls">
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                {Object.entries(ACCESS_PURPOSES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <button type="submit" className="save" disabled={busy || !webId.trim()}>
                {busy ? "Applying…" : "Grant on Pod"}
              </button>
            </div>
          </form>

          {status && (
            <p className={status.kind === "error" ? "error-text" : "ok-text"}>{status.text}</p>
          )}

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
                <p className="muted">No per-agent grants live on the resource yet.</p>
              ) : (
                others.map(([id, access]) => (
                  <div key={id} className="grant-row">
                    <span className="grant-who" title={id}>
                      {shortWebId(id)}
                    </span>
                    <span className="grant-modes">{modesSummary(access)}</span>
                    <button className="revoke" onClick={() => handleRevoke(id)} disabled={busy}>
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </>
          )}
          <p className="muted resource-note">
            Applies to <code>{store.indexUrl}</code>
          </p>
        </div>
      )}
    </div>
  );
}
