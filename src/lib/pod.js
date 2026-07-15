// Pod interaction layer for the Self-Sovereign Wiki React prototype.
//
// Thin wrapper over @inrupt/solid-client that reads and writes WikiItems as
// plain RDF Things in a single Turtle index resource in the user's Pod. This is
// the rapid-dev, fully interoperable analogue of app 6's encrypted-JSON store:
// the data is human-readable Turtle you can open in any Solid data browser, and
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
  getThing,
  getThingAll,
  getUrl,
  getUrlAll,
  addStringNoLocale,
  addDatetime,
  addUrl,
  buildThing,
  setThing,
  removeThing,
  saveSolidDatasetAt,
  asUrl,
} from "@inrupt/solid-client";

import { POD_APP_DIR } from "../constants.js";

// ── Vocabulary ───────────────────────────────────────────────────────────────
// Same predicate → field mapping documented in app 6's WikiItem model.
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const DCTERMS_TITLE = "http://purl.org/dc/terms/title";
const DCTERMS_CREATED = "http://purl.org/dc/terms/created";
const SCHEMA_TEXT = "http://schema.org/text";
const SCHEMA_URL = "http://schema.org/url";
const SCHEMA_KEYWORDS = "http://schema.org/keywords";
const SCHEMA_ADDITIONAL_TYPE = "http://schema.org/additionalType";
const PROV_ATTRIBUTED_TO = "http://www.w3.org/ns/prov#wasAttributedTo";

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

/// Convert one RDF Thing into a plain JS wiki item for the UI.
function thingToItem(thing) {
  return {
    id: asUrl(thing),
    title: getStringNoLocale(thing, DCTERMS_TITLE) ?? "(untitled)",
    body: getStringNoLocale(thing, SCHEMA_TEXT) ?? "",
    link: getUrl(thing, SCHEMA_URL) ?? getStringNoLocale(thing, SCHEMA_URL),
    tags: getStringNoLocaleAll(thing, SCHEMA_KEYWORDS),
    type: getStringNoLocale(thing, SCHEMA_ADDITIONAL_TYPE) ?? "note",
    attributedTo: getStringNoLocale(thing, PROV_ATTRIBUTED_TO) ?? "user",
    createdAt: getDatetime(thing, DCTERMS_CREATED) ?? new Date(0),
  };
}

/// All wiki items in the dataset, newest first.
export function readItems(dataset) {
  return getThingAll(dataset)
    .filter((t) => getUrl(t, RDF_TYPE) === WIKI_ITEM_CLASS)
    .map(thingToItem)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/// Append a new wiki item and persist the index. Returns the updated dataset.
export async function addItem(session, dataset, { title, body, link, tags, type }) {
  const indexUrl = getSourceUrl(dataset);

  let builder = buildThing(createThing({ name: `item-${Date.now()}` }))
    .addUrl(RDF_TYPE, WIKI_ITEM_CLASS)
    .addStringNoLocale(DCTERMS_TITLE, title.trim() || "(untitled)")
    .addStringNoLocale(SCHEMA_TEXT, body ?? "")
    .addStringNoLocale(SCHEMA_ADDITIONAL_TYPE, type)
    .addDatetime(DCTERMS_CREATED, new Date())
    .addStringNoLocale(PROV_ATTRIBUTED_TO, "user");

  if (link && link.trim()) {
    // Store as a real URL object when it parses, else keep the raw string.
    try {
      builder = builder.addUrl(SCHEMA_URL, new URL(link.trim()).href);
    } catch {
      builder = builder.addStringNoLocale(SCHEMA_URL, link.trim());
    }
  }
  for (const tag of tags ?? []) {
    if (tag.trim()) builder = builder.addStringNoLocale(SCHEMA_KEYWORDS, tag.trim());
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

/// Transparent keyword-overlap retrieval over the loaded items — the same
/// "grounded answers only, no hallucination" approach as app 6's askPod. Returns
/// `{ answer, citations }` where every citation is a real item in the Pod.
export function askPod(items, query) {
  const tokens = new Set(
    query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  );

  if (tokens.size === 0) {
    return {
      answer: "Type a question or a few keywords to search your knowledge graph.",
      citations: [],
    };
  }

  const scored = items
    .map((item) => {
      const text = [item.title, item.body, item.link ?? "", item.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      let score = 0;
      for (const token of tokens) if (text.includes(token)) score += 1;
      return { item, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.item);

  if (scored.length === 0) {
    return {
      answer:
        "Nothing in your Pod matches that yet. Your knowledge graph only " +
        "contains what you have captured — so the honest answer is \"I don't " +
        "know from your data\" rather than a guess.",
      citations: [],
    };
  }

  const lines = scored.map((item) => {
    const snippet = (item.body.trim() || item.link || "").slice(0, 157);
    return `• ${item.title}${snippet ? ` — ${snippet}` : ""}`;
  });

  return {
    answer:
      `Based on ${scored.length} item${scored.length === 1 ? "" : "s"} in your Pod:\n\n` +
      lines.join("\n") +
      "\n\nEvery line above is grounded in a resource in your own Pod.",
    citations: scored,
  };
}
