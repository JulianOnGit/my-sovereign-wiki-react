// Pod interaction layer for the Self-Sovereign Wiki React prototype.
//
// Thin wrapper over @inrupt/solid-client that reads and writes WikiItems as
// plain RDF Things in a single Turtle index resource in the user's Pod. The
// data is human-readable Turtle you can open in any Solid data browser, and
// the fields map onto the same vocabularies app 6 documents
// (dcterms:/schema:/prov:).

import {
  createSolidDataset,
  createThing,
  getSolidDataset,
  getSourceUrl,
  getStringNoLocale,
  getStringNoLocaleAll,
  getDatetime,
  getInteger,
  getThing,
  getThingAll,
  getUrl,
  getUrlAll,
  addStringNoLocale,
  addDatetime,
  addInteger,
  addUrl,
  setDatetime,
  setInteger,
  removeStringNoLocale,
  removeUrl,
  buildThing,
  setThing,
  removeThing,
  saveSolidDatasetAt,
  saveFileInContainer,
  universalAccess,
  asUrl,
} from "@inrupt/solid-client";

import { POD_APP_DIR } from "../constants.js";

// ── Vocabulary ───────────────────────────────────────────────────────────────
// Same predicate → field mapping documented in app 6's WikiItem model.
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const DCTERMS_TITLE = "http://purl.org/dc/terms/title";
const DCTERMS_CREATED = "http://purl.org/dc/terms/created";
const DCTERMS_MODIFIED = "http://purl.org/dc/terms/modified";
const SCHEMA_TEXT = "http://schema.org/text";
const SCHEMA_URL = "http://schema.org/url";
const SCHEMA_KEYWORDS = "http://schema.org/keywords";
const SCHEMA_ADDITIONAL_TYPE = "http://schema.org/additionalType";
const SCHEMA_ASSOCIATED_MEDIA = "http://schema.org/associatedMedia";
const SCHEMA_MENTIONS = "http://schema.org/mentions";
const PROV_ATTRIBUTED_TO = "http://www.w3.org/ns/prov#wasAttributedTo";

// App-local vocabulary for the enrichment fields the universal-observation
// composer prompts for (interpretation, uncertainty, efflorescence, encounter
// mode, reflective lenses, sensitivity, context). Namespaced under the app's own
// GitHub Pages origin so the terms are ownable and resolvable rather than opaque.
// These sit alongside the standard dcterms:/schema:/prov: predicates above so the
// data stays inspectable in any Solid data browser.
const SSW = "https://julianongit.github.io/self-sovereign-wiki/vocab#";
const SSW_ENCOUNTER = `${SSW}encounterMode`;
const SSW_CONTEXT = `${SSW}context`;
const SSW_WHEN = `${SSW}when`;
const SSW_INTERPRETATION = `${SSW}interpretation`;
const SSW_UNCERTAINTY = `${SSW}uncertainty`;
const SSW_EFFLORESCENCE = `${SSW}efflorescence`;
const SSW_EFFLORESCENCE_TYPE = `${SSW}efflorescenceType`;
const SSW_LENS = `${SSW}lens`;
const SSW_SENSITIVITY = `${SSW}sensitivity`;
const SSW_AUDIENCE = `${SSW}audience`;
const SSW_REVISION = `${SSW}revision`;
// Derived by the Organise (AI) pass and written back into the Pod.
const SSW_RELATED = `${SSW}relatedTo`;

/// rdf:type marking a Thing as one of our wiki items (used to filter the index).
const WIKI_ITEM_CLASS = "http://schema.org/CreativeWork";

/// Derive a plausible Pod root from a WebID by stripping a trailing
/// `profile/card` document — the default CSS/NSS layout is
/// `<podRoot>/profile/card#me`. Returns e.g. `https://host/alice/` for
/// `https://host/alice/profile/card#me`, and `https://host/` for a root Pod.
function podRootFromWebId(webId) {
  const url = new URL(webId);
  const segs = url.pathname.split("/").filter(Boolean);
  if (
    segs.length >= 2 &&
    segs[segs.length - 1].startsWith("card") &&
    segs[segs.length - 2] === "profile"
  ) {
    segs.splice(-2);
  }
  return segs.length > 0 ? `${url.origin}/${segs.join("/")}/` : `${url.origin}/`;
}

/// Resolve the user's Pod storage root from their WebID profile, then return the
/// wiki container URL and the index resource URL inside it.
///
/// Robustness matters here: on multi-tenant servers like solidcommunity.au the
/// Pod lives at `https://host/<user>/`, NOT at the server origin. Writing to the
/// origin returns 403 Forbidden. We therefore pick the MOST SPECIFIC candidate
/// root that is a prefix of the WebID — considering both the profile's declared
/// `pim:storage` triples and the WebID-derived root — rather than blindly
/// trusting the first storage triple (which can point at the bare server root).
async function resolveWikiUrls(session) {
  const webId = session.info.webId;
  const profile = await getSolidDataset(webId, { fetch: session.fetch });
  const me = getThing(profile, webId);
  const storages = me
    ? getUrlAll(me, "http://www.w3.org/ns/pim/space#storage")
    : [];

  const candidates = [...storages, podRootFromWebId(webId)]
    .map((s) => (s.endsWith("/") ? s : `${s}/`))
    .filter((s) => webId.startsWith(s)) // must actually contain our WebID
    .sort((a, b) => b.length - a.length); // most specific first

  const podRoot = candidates[0] ?? `${new URL(webId).origin}/`;
  const container = `${podRoot}${POD_APP_DIR}/`;
  return { container, indexUrl: `${container}index.ttl` };
}

/// Load the wiki index dataset, creating an empty one on first use (HTTP 404).
export async function getOrCreateWikiDataset(session) {
  const { indexUrl } = await resolveWikiUrls(session);
  // Surfaced during development so the resolved Pod location is easy to verify.
  console.info("[wiki] using index resource:", indexUrl);
  try {
    return await getSolidDataset(indexUrl, { fetch: session.fetch });
  } catch (error) {
    if (error?.statusCode === 404 || error?.response?.status === 404) {
      return await saveSolidDatasetAt(indexUrl, createSolidDataset(), {
        fetch: session.fetch,
      });
    }
    throw error;
  }
}

/// Convert one RDF Thing into a plain JS observation item for the UI. Every
/// enrichment field is optional — an observation is valid with only body text.
function thingToItem(thing) {
  const legacyLink = getUrl(thing, SCHEMA_URL) ?? getStringNoLocale(thing, SCHEMA_URL);
  // Media references: uploaded/linked attachments, plus any legacy single link.
  const media = getUrlAll(thing, SCHEMA_ASSOCIATED_MEDIA);
  if (legacyLink && !media.includes(legacyLink)) media.unshift(legacyLink);

  return {
    id: asUrl(thing),
    // Title is optional. Leave it empty when absent — the UI derives a headline
    // from the observation text rather than showing a placeholder "(untitled)".
    title: getStringNoLocale(thing, DCTERMS_TITLE) ?? "",
    body: getStringNoLocale(thing, SCHEMA_TEXT) ?? "",
    media,
    tags: getStringNoLocaleAll(thing, SCHEMA_KEYWORDS),
    type: getStringNoLocale(thing, SCHEMA_ADDITIONAL_TYPE) ?? "observation",
    // Enrichment (progressive disclosure) — any may be empty.
    encounterMode: getStringNoLocale(thing, SSW_ENCOUNTER) ?? "",
    context: getStringNoLocale(thing, SSW_CONTEXT) ?? "",
    when: getStringNoLocale(thing, SSW_WHEN) ?? "",
    interpretation: getStringNoLocale(thing, SSW_INTERPRETATION) ?? "",
    uncertainty: getStringNoLocale(thing, SSW_UNCERTAINTY) ?? "",
    efflorescence: getStringNoLocale(thing, SSW_EFFLORESCENCE) ?? "",
    efflorescenceType: getStringNoLocale(thing, SSW_EFFLORESCENCE_TYPE) ?? "",
    lenses: getStringNoLocaleAll(thing, SSW_LENS),
    sensitivity: getStringNoLocale(thing, SSW_SENSITIVITY) ?? "private",
    audience: getStringNoLocale(thing, SSW_AUDIENCE) ?? "",
    attributedTo: getStringNoLocale(thing, PROV_ATTRIBUTED_TO) ?? "user",
    createdAt: getDatetime(thing, DCTERMS_CREATED) ?? new Date(0),
    modifiedAt: getDatetime(thing, DCTERMS_MODIFIED) ?? null,
    revision: getInteger(thing, SSW_REVISION) ?? 1,
    // Derived by the Organise (AI) pass — stored as ordinary, auditable triples.
    mentions: getStringNoLocaleAll(thing, SCHEMA_MENTIONS),
    related: getUrlAll(thing, SSW_RELATED),
  };
}

/// All wiki items in the dataset, newest first.
export function readItems(dataset) {
  return getThingAll(dataset)
    .filter((t) => getUrl(t, RDF_TYPE) === WIKI_ITEM_CLASS)
    .map(thingToItem)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/// The container URL that holds the wiki index, derived from the loaded
/// dataset's source URL by stripping the `index.ttl` document name. Used as the
/// upload target for media attachments.
export function wikiContainerUrl(dataset) {
  return getSourceUrl(dataset).replace(/[^/]*$/, "");
}

/// Where this data physically lives — surfaced in the UI so the "one custody,
/// inspectable linked data" promise of the Store stage is tangible, not implied.
export function getStorageInfo(dataset) {
  const indexUrl = getSourceUrl(dataset);
  return {
    indexUrl,
    container: indexUrl.replace(/[^/]*$/, ""),
    provider: new URL(indexUrl).origin,
    format: "text/turtle (RDF)",
  };
}

/// Upload one picked file into the wiki container and return its Pod URL. Best
/// effort: callers should catch and keep saving the observation even if this
/// throws, so a flaky upload never costs the user their captured text.
export async function uploadAttachment(session, containerUrl, file) {
  const saved = await saveFileInContainer(containerUrl, file, {
    slug: file.name,
    contentType: file.type || "application/octet-stream",
    fetch: session.fetch,
  });
  return getSourceUrl(saved);
}

/// Append a new observation and persist the index. Returns the updated dataset.
/// Only the fields the user actually filled in are written — the whole point of
/// the capture-first model is that an observation can be a single sentence.
export async function addItem(session, dataset, fields) {
  const {
    title,
    body,
    tags = [],
    media = [],
    type = "observation",
    encounterMode,
    context,
    when,
    interpretation,
    uncertainty,
    efflorescence,
    efflorescenceType,
    lenses = [],
    sensitivity,
    audience,
  } = fields;
  const indexUrl = getSourceUrl(dataset);
  const now = new Date();

  let builder = buildThing(createThing({ name: `item-${Date.now()}` }))
    .addUrl(RDF_TYPE, WIKI_ITEM_CLASS)
    .addStringNoLocale(SCHEMA_TEXT, body ?? "")
    .addStringNoLocale(SCHEMA_ADDITIONAL_TYPE, type)
    .addDatetime(DCTERMS_CREATED, now)
    .addDatetime(DCTERMS_MODIFIED, now)
    .addInteger(SSW_REVISION, 1)
    .addStringNoLocale(PROV_ATTRIBUTED_TO, "user");

  // Optional single-value string fields — written only when non-empty.
  const optionalStrings = [
    [DCTERMS_TITLE, title],
    [SSW_ENCOUNTER, encounterMode],
    [SSW_CONTEXT, context],
    [SSW_WHEN, when],
    [SSW_INTERPRETATION, interpretation],
    [SSW_UNCERTAINTY, uncertainty],
    [SSW_EFFLORESCENCE, efflorescence],
    [SSW_EFFLORESCENCE_TYPE, efflorescenceType],
    [SSW_AUDIENCE, audience],
    // Sensitivity always records the chosen state (defaults to "private").
    [SSW_SENSITIVITY, sensitivity || "private"],
  ];
  for (const [predicate, value] of optionalStrings) {
    if (value && String(value).trim()) {
      builder = builder.addStringNoLocale(predicate, String(value).trim());
    }
  }

  // Media references (uploaded file URLs and pasted links) as real URLs where
  // they parse, else kept as strings so nothing entered is silently dropped.
  for (const ref of media) {
    if (!ref || !String(ref).trim()) continue;
    const value = String(ref).trim();
    try {
      builder = builder.addUrl(SCHEMA_ASSOCIATED_MEDIA, new URL(value).href);
    } catch {
      builder = builder.addStringNoLocale(SCHEMA_ASSOCIATED_MEDIA, value);
    }
  }

  for (const tag of tags) {
    if (tag && tag.trim()) builder = builder.addStringNoLocale(SCHEMA_KEYWORDS, tag.trim());
  }
  for (const lens of lenses) {
    if (lens && lens.trim()) builder = builder.addStringNoLocale(SSW_LENS, lens.trim());
  }

  const updated = setThing(dataset, builder.build());
  return await saveSolidDatasetAt(indexUrl, updated, { fetch: session.fetch });
}

/// Remove the item with the given Thing URL and persist. Returns the new dataset.
export async function deleteItem(session, dataset, itemId) {
  const indexUrl = getSourceUrl(dataset);
  const thing = getThing(dataset, itemId);
  if (!thing) return dataset;
  const updated = removeThing(dataset, thing);
  return await saveSolidDatasetAt(indexUrl, updated, { fetch: session.fetch });
}

/// Write the Organise (AI) pass results back into the Pod as ordinary triples.
/// `plan` is a Map of itemId → { mentions: string[], related: string[] }. Existing
/// derived triples are cleared first so the pass is idempotent, and each touched
/// item's revision is bumped and dcterms:modified refreshed — the derivation is
/// itself provenance-tracked. Returns the updated dataset.
export async function applyOrganise(session, dataset, plan) {
  const indexUrl = getSourceUrl(dataset);
  let ds = dataset;

  for (const [itemId, { mentions, related }] of plan) {
    let thing = getThing(ds, itemId);
    if (!thing) continue;

    // Clear previous derivations for a clean, idempotent rewrite.
    for (const v of getStringNoLocaleAll(thing, SCHEMA_MENTIONS)) {
      thing = removeStringNoLocale(thing, SCHEMA_MENTIONS, v);
    }
    for (const v of getUrlAll(thing, SSW_RELATED)) {
      thing = removeUrl(thing, SSW_RELATED, v);
    }

    for (const m of mentions) if (m && m.trim()) thing = addStringNoLocale(thing, SCHEMA_MENTIONS, m.trim());
    for (const r of related) if (r) thing = addUrl(thing, SSW_RELATED, r);

    thing = setInteger(thing, SSW_REVISION, (getInteger(thing, SSW_REVISION) ?? 1) + 1);
    thing = setDatetime(thing, DCTERMS_MODIFIED, new Date());
    ds = setThing(ds, thing);
  }

  return await saveSolidDatasetAt(indexUrl, ds, { fetch: session.fetch });
}

// ── Share & Govern: fine-grained access (ACP/WAC via universal access) ─────────
// These operate on real Solid access controls. They are intentionally thin and
// throw on failure so the UI can report the *actual* server response — sharing
// only means something if the grant genuinely landed on the Pod.

/// Access purposes, expressed in plain words, mapped to concrete access modes.
export const ACCESS_PURPOSES = {
  view: { label: "View", modes: { read: true } },
  comment: { label: "View & comment", modes: { read: true, append: true } },
  edit: { label: "View & edit", modes: { read: true, append: true, write: true } },
};

/// Grant an agent (by WebID) access to a resource for a chosen purpose.
export async function grantAccess(session, resourceUrl, webId, purpose) {
  const spec = ACCESS_PURPOSES[purpose] ?? ACCESS_PURPOSES.view;
  return universalAccess.setAgentAccess(resourceUrl, webId, spec.modes, {
    fetch: session.fetch,
  });
}

/// Every agent's access to a resource: `{ [webId]: { read, append, write, … } }`.
/// Returns `{}` when the server reports no per-agent grants.
export async function listAgentAccess(session, resourceUrl) {
  return (await universalAccess.getAgentAccessAll(resourceUrl, { fetch: session.fetch })) ?? {};
}

/// Public (everyone) access to a resource, or null if unavailable.
export async function getPublicAccess(session, resourceUrl) {
  return universalAccess.getPublicAccess(resourceUrl, { fetch: session.fetch });
}

/// Revoke all of an agent's access to a resource.
export async function revokeAccess(session, resourceUrl, webId) {
  return universalAccess.setAgentAccess(
    resourceUrl,
    webId,
    { read: false, append: false, write: false, controlRead: false, controlWrite: false },
    { fetch: session.fetch },
  );
}
