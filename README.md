# 8 — React prototype (Self-Sovereign Wiki)

A **React + Vite** rapid-development prototype of the Self-Sovereign Wiki. It is
the JavaScript sibling of the Flutter app in
`6-self-sovereign-wiki-2`, built to iterate on the wiki UX quickly using the
[`@inrupt`](https://docs.inrupt.com/developer-tools/javascript/client-libraries/)
Solid client libraries.

## The value stream (all seven stages)

Each tab is one stage of the sovereignty value stream, end to end:

| Stage | Tab | What it delivers |
| --- | --- | --- |
| **Capture** | Capture | Universal observation composer — one custody for journaling, health, projects, study (capture-first, progressive disclosure). |
| **Store** | (footer) | Inspectable Turtle (RDF) in your own Pod, with revision/provenance metadata and a raw-data link. |
| **Organise** | Organise | Sovereign, **local** AI pass — TF-IDF related-entry links + entity extraction, written back as `schema:mentions` / `ssw:relatedTo` triples. No hosted LLM, no data leaves the device. |
| **Retrieve** | Ask your Pod | Grounded vector RAG with cited provenance and graph expansion — every answer traces to a real Pod resource. |
| **Present** | Explore | Pages as live views over the graph: topic/person/date pages and a one-node "brain map". Nothing is duplicated. |
| **Share** | Share | Purpose-led, fine-grained access by WebID (ACP/WAC) — sharing without copying, revocable. |
| **Govern** | Govern | Audit every grant (including the local AI), revoke all, export, and stay portable across providers. |

The AI is deliberately a transparent local engine (`src/lib/organise.js`) so the
"AI is sovereign" promise is literal; a stronger model can be swapped in behind
the same interface without moving where trust sits.

Structure and CRUD flow follow the freeCodeCamp tutorial
[*Create a Solid To-Do App With React*](https://www.freecodecamp.org/news/create-a-solid-to-do-app-with-react/)
(`@inrupt/solid-client` + `@inrupt/solid-ui-react`, `SessionProvider`,
`getOrCreate…` dataset, `createThing`/`setThing`/`saveSolidDatasetAt`), but the
data model is the wiki's — **universal observations** — not todos.

## Capture model: capture first, enrich gradually

The composer follows the
[Universal Observation Capture UX profile](../../universal-observation-capture-ux-design-profile.md):
a single generous field — *"What did you notice?"* — that saves after one
sentence, private by default. Structure is available through optional, plain-
language disclosures, never demanded:

- **Level 1 — quick capture:** the observation, optional photo/file/link
  attachments, voice dictation (Web Speech API, Chrome), and a private-by-default
  save.
- **Level 2 — Add context:** title, when, where/setting, people/topics/projects,
  and how it was encountered (the provenance question).
- **Level 3 — Reflect:** what it might mean, what's uncertain, what emerged
  (efflorescence), and optional reflective *lenses* (Care, Risk, Learning,
  Stewardship, …).
- **Level 4 — Sharing & safety:** sensitivity marking and intended audience.

Saving confirms quietly ("Saved privately.") and stays put — no forced next
step. The Wiki tab renders a light "one-node view" of whatever enrichment the
user chose to add.

## Login configuration (reused from app 6)

The Solid-OIDC login flow uses the **same registered client** as
`6-self-sovereign-wiki-2` (see `src/constants.js`):

| Setting | Value |
| --- | --- |
| `clientId` (client profile doc) | `https://julianongit.github.io/self-sovereign-wiki/solid/client-profile.jsonld` |
| `clientName` | `MySovereignWiki` |
| Redirect URI | `http://localhost:4400/redirect.html` |
| Default issuer | `https://solidcommunity.au` (overridable in the UI) |
| Pod data folder | `/my_sovereign_wiki/` |

Because it reuses that static client profile, **the redirect URI must match a
`redirect_uris` entry in the hosted document**. That document already lists
`http://localhost:4400/redirect.html`, so the dev server is pinned to port
**4400** (`vite.config.js`, `strictPort`). `redirect.html` is a real second
entry point that mounts the same app, so `@inrupt`'s token exchange completes
while the browser is sitting on the registered redirect URI; `App.jsx` then
tidies the URL back to `/`.

## Run

```bash
npm install
npm run dev      # http://localhost:4400  (must be 4400)
```

Then log in with a Pod on `solidcommunity.au` (or type your own provider). Data
is stored as human-readable Turtle at `<pod>/my_sovereign_wiki/index.ttl`.

## How it differs from app 6

- **Unencrypted, interoperable Turtle.** Items are plain RDF Things in one
  `index.ttl` (inspectable in any Solid data browser), rather than app 6's
  per-item encrypted JSON resources. This is a deliberate rapid-dev trade-off:
  no security-key unlock step, at the cost of no client-side encryption.
- Standard-vocabulary core (`dcterms:title`, `schema:text`,
  `schema:associatedMedia`, `schema:keywords`, `schema:additionalType`,
  `dcterms:created`, `prov:wasAttributedTo`) plus a small app-local vocabulary
  (`…/self-sovereign-wiki/vocab#`) for the enrichment fields the composer
  prompts for: `encounterMode`, `context`, `when`, `interpretation`,
  `uncertainty`, `efflorescence`(`Type`), `lens`, `sensitivity`, `audience`.
  Everything stays inspectable Turtle in any Solid data browser.
- "Ask your Pod" is the same transparent, grounded keyword-overlap retrieval —
  no hosted LLM, every answer cites real Pod resources.
