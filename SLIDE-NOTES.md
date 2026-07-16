# My Sovereign Wiki — Slide Notes

> Working notes for a presentation deck. Each section = one slide:
> a title, the on-slide bullets, and a speaker note underneath.
> Suggested length: ~15 slides, 10–15 minutes + live demo.

---

## Slide 1 · Title

**My Sovereign Wiki**
*Your knowledge. Your Pod. Your AI.*

- A personal knowledge wiki where **you** own everything
- Data in your own Solid Pod · AI on your own machine
- No backend, no account, no tracking

> Speaker note: One sentence pitch — "Every note you write lives in storage you
> control, and the AI that reads it runs on your own computer. Nothing about
> your life ever touches someone else's server."

---

## Slide 2 · The Problem

**Your second brain lives in someone else's building**

- Notes apps keep your thinking on *their* servers, under *their* terms
- AI features mean your private notes are read in *their* cloud
- Export is an afterthought; lock-in is the business model
- If the company dies or changes terms — your knowledge is hostage

> Speaker note: Notion/Evernote/Obsidian-sync all trade convenience for
> custody. The moment AI is added, the privacy cost doubles: the model reads
> everything.

---

## Slide 3 · The Idea

**Self-sovereignty, made literal**

- **Storage sovereignty** — data lives in a Solid Pod you own, as open
  linked-data (Turtle/RDF) any tool can read
- **Identity sovereignty** — you sign in with your WebID, not our account
- **AI sovereignty** — the model runs locally (Msty / Ollama / LM Studio);
  your notes never leave the device
- The app is just a lens — delete it and you lose nothing

> Speaker note: Solid is the W3C-backed protocol started by Tim Berners-Lee.
> A Pod is personal web storage with access control built in.

---

## Slide 4 · Architecture (one diagram slide)

**No backend. Two arrows.**

```
Browser (React SPA)
   ├──► Your Solid Pod        (notes as Turtle triples + attachments)
   └──► Your local LLM server (OpenAI-compatible: Msty / Ollama / LM Studio)
```

- 100% client-side React app — verify in DevTools: only these two hosts
- Pod I/O via Inrupt Solid libraries; auth via Solid-OIDC
- LLM + embeddings over one local endpoint (`/v1/chat/completions`, `/v1/embeddings`)
- Every AI conclusion written back to the Pod as **auditable triples**
  (`schema:mentions`, `ssw:relatedTo`)

> Speaker note: This is the trust argument in one picture. There is nothing
> else to trust — no third box.

---

## Slide 5 · The Journey (app tour map)

**Eight stages, one value stream**

Capture → Wiki → Organise → Explore → Ask your LLM → Reflect → Share → Govern

- **Capture** what you notice · **Organise** links it · **Explore** shows the graph
- **Ask** answers from it · **Govern** proves you own it
- Every tab works with zero AI — and upgrades itself when your model is running

> Speaker note: Use this as the demo roadmap slide; each following slide is
> one stop.

---

## Slide 6 · Capture

**Observations, not documents**

- Quick capture: title, body, tags, and optional depth — interpretation,
  uncertainty, context, what emerged ("efflorescence")
- Attach files & links — images, PDFs, docs — uploaded straight into your Pod
- Saved as ordinary triples; a footer link shows the raw Turtle at any time

> Speaker note: Capture never forces a next step — it confirms quietly and
> stays out of the way.

---

## Slide 7 · Wiki

**Pages are queries, not copies**

- Articles assemble **live** from your observations — nothing is duplicated
- Wikilinks between topics; sources listed under every article
- One click: your local AI writes the lead summary — *grounded only in your
  own notes, nothing invented*
- Your entries are always listed, even before any article can be derived

> Speaker note: Mention the honest-degradation principle: no AI → extractive
> views still work.

---

## Slide 8 · Organise — the sovereign AI pass

**A real AI librarian, running on your laptop**

- Your local LLM reads every note → extracts entities, draws related-links
- Semantic embeddings rank similarity; graceful ladder:
  **LLM → embeddings → TF-IDF heuristics** (always works, even offline)
- Twelve-stage visible run — you *watch* it think, then audit what it wrote
- Results land in the Pod as plain triples you can inspect or delete

> Speaker note: The ladder is the engineering story: every layer that's
> unavailable drops down one rung, never breaks. Engine used is reported
> honestly in the UI.

---

## Slide 9 · Explore — Content Connections graph

**The wiki as a living graph**

- Every **observation**, **topic**, and **file** is a node; edges = tags,
  AI links, attachments
- **Click any node → it animates to centre, its connections light up,
  everything else dims**
- Names always visible; drag, zoom, search, full-screen
- Files join the graph via filename-derived tags (junk-proofed: CDN noise
  like `71i53mFNiUL…QL80.jpg` yields nothing; `flood-map.pdf` → *flood, map*)
- Adaptive detail: dense graphs auto-hide single-use topics; toggle shows all

> Speaker note: This is the wow slide — go straight to live demo here if time
> is short. Modelled on a knowledge-graph reference implementation (nlp-graph).

---

## Slide 10 · Ask your LLM — grounded RAG chat

**"When did I read Jurassic Park?"**

- Each question first **retrieves your own notes** (semantic → keyword fallback)
- Notes injected as numbered context; the model must answer *only* from them
- Real answer from the live demo:
  > *"Your notes don't mention reading Jurassic Park. The only reading event
  > in your notes is finishing The Overstory on 7/6/2026 [1]."*
- Citations shown under every reply; toggle grounding off for free chat
- Streaming, stop button, reasoning-model support (`<think>` handled)

> Speaker note: The point isn't that it answers — it's that it **refuses to
> invent**. Grounded honesty is the feature.

---

## Slide 11 · Sovereign AI spectrum

**Choose where the intelligence runs**

1. 🔒 On-device heuristics — no model at all, still functional
2. 🖥️ **Local LLM server** — Msty / Ollama / LM Studio (default, auto-detected)
3. ✨ Your own API key — Claude / OpenAI, called direct from the browser
4. 🇦🇺 Roadmap: sovereign-jurisdiction & decentralised hosts

- Default is **auto**: key if you saved one, else local model, else heuristics
- In every case: your Pod stays the single source of truth

> Speaker note: "Sovereignty isn't one setting — it's a spectrum you slide
> along, and the floor is always 'works offline'."

---

## Slide 12 · Govern — proof, not promises

**"Don't trust — verify"**

- Live access audit read from the Pod's own ACLs; one-click revoke
- Export everything (JSON) · open the canonical Turtle · switch providers
- Open standards: Solid Protocol, Solid-OIDC, RDF/Turtle, WAC/ACP
- Verifiable guarantees, each paired with *how to check it yourself*
  (e.g. "open the network tab — only your Pod and your AI")

> Speaker note: End the tour here — Govern is the receipt for every claim the
> deck made.

---

## Slide 13 · Engineering highlights

**Small, honest, dependency-light**

- Hand-rolled **canvas force-graph engine** — no graph library, theme-aware,
  click-to-centre camera animation
- Embeddings client with **hard 8s timeout** + per-session cache + TF-IDF
  fallback — retrieval can never hang the UI
- Streaming SSE chat client; strips reasoning-model `<think>` blocks
  (including unterminated ones)
- Dark/light slide toggle: explicit choice > OS preference, no flash on load
- Everything degrades honestly: no server, no key, no data — the app still works

> Speaker note: Good place for "what I learned" if this is a course/hackathon
> presentation.

---

## Slide 14 · Live demo script (not a slide — presenter cheat-sheet)

1. **Sign in** with WebID → land on Capture
2. Capture a note ("Finished reading The Overstory…") with a photo attached
3. **Organise** → watch the 12-stage run → note the engine line
   ("local AI (qwen3:4b) · links via semantic/TF-IDF")
4. **Explore** → click the new note → connections illuminate → click its file,
   its topic, walk the graph
5. **Ask your LLM** → "when did I read jurassic park?" → grounded refusal +
   citation of The Overstory → then "what book did I finish?" → grounded answer
6. **Govern** → show access audit + open the raw Turtle in a new tab
7. Optional: flip the theme toggle; show DevTools network tab (two hosts only)

> Fallbacks: no local model running → everything still works on heuristics;
> empty Pod → every tab shows its curated example graph.

---

## Slide 15 · Limitations & roadmap (honest slide)

- File understanding is **metadata/filename-level** today — OCR and
  content-based PDF/image tagging are the next pass
- Embeddings need an embedding-capable local model (`nomic-embed-text`);
  otherwise keyword retrieval
- Reasoning models (qwen3) think ~20s on CPU — visible, but not instant
- Hosted sovereign-AI options (Australian jurisdiction, decentralised compute)
  are previews, labelled honestly
- Certifications (ISO 27001, SOC 2) tracked as *planned*, not claimed

> Speaker note: Naming limits yourself is the credibility move that matches
> the project's whole ethos.

---

## Slide 16 · Close

**This is yours — and you can check.**

- Your notes: in your Pod, as an open format, exportable in one click
- Your AI: on your machine, auditable, replaceable
- Your identity: your WebID, no account with us
- **Sovereignty you can verify, not just believe**

> Speaker note: Callback to slide 2 — "the second brain moved back into your
> own building." Q&A.

---

### Appendix · numbers & facts to have ready

- Stack: React 18 + Vite, Tailwind, @inrupt/solid-client (+ solid-ui-react)
- LLM endpoint: OpenAI-compatible `…/v1` (default `localhost:11964`, Msty);
  also Ollama `:11434/v1`, LM Studio `:1234/v1`
- Models used in dev: `qwen3:4b` (reasoning), `gemma3:4b` (fast)
- Data model: one Turtle `index.ttl` per wiki + uploaded attachments in the
  same Pod container; items typed as wiki-item with dcterms/schema/ssw predicates
- Graph model: item / topic / file nodes; edges = item→topic, item↔item
  (related), item→file; adaptive single-use-topic floor (nlp-graph style)
- RAG: top-6 notes, numbered citations, semantic (local embeddings, 8s cap)
  → TF-IDF with light stemming → nearest-notes honest fallback
