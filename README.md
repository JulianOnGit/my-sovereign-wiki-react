# 8 — React prototype (Self-Sovereign Wiki)

A **React + Vite** rapid-development prototype of the Self-Sovereign Wiki. It is
the JavaScript sibling of the Flutter app in
`6-self-sovereign-wiki-2`, built to iterate on the wiki UX quickly using the
[`@inrupt`](https://docs.inrupt.com/developer-tools/javascript/client-libraries/)
Solid client libraries.

Structure and CRUD flow follow the freeCodeCamp tutorial
[*Create a Solid To-Do App With React*](https://www.freecodecamp.org/news/create-a-solid-to-do-app-with-react/)
(`@inrupt/solid-client` + `@inrupt/solid-ui-react`, `SessionProvider`,
`getOrCreate…` dataset, `createThing`/`setThing`/`saveSolidDatasetAt`), but the
data model is the wiki's — **notes & bookmarks with tags** — not todos.

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
- Same vocabulary mapping as app 6's `WikiItem`: `dcterms:title`,
  `schema:text`, `schema:url`, `schema:keywords`, `schema:additionalType`
  (note/bookmark), `dcterms:created`, `prov:wasAttributedTo`.
- "Ask your Pod" is the same transparent, grounded keyword-overlap retrieval —
  no hosted LLM, every answer cites real Pod resources.
