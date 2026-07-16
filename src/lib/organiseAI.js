// Organise, upgraded: the same pass as organise.js but driven by the user's own
// AI when one is available (see llm.js — local Msty/Ollama by default), with
// semantic embeddings for the related-links half (embeddings.js).
//
// Ladder, mirroring the reference providers module:
//   entities   LLM extraction  →  rule-based extractEntities()
//   related    LLM suggestions ∪ embedding cosine  →  TF-IDF cosine
//
// Everything degrades honestly: with no model running this returns exactly what
// the heuristic organise() returns, and the caller can show which engine ran.

import { organise, relatedLinks, extractEntities } from "./organise.js";
import { semanticRelatedLinks, embeddingsBackend } from "./embeddings.js";
import { runLLM, llmAvailable, llmProviderLabel } from "./llm.js";

const headline = (it) =>
  it.title || (it.body || "").trim().split("\n")[0].slice(0, 80) || "(observation)";

// ── LLM extraction ───────────────────────────────────────────────────────────

const EXTRACT_SYSTEM =
  "You are the organiser for a person's private knowledge wiki. You extract, from " +
  "their own notes, the entities each note mentions and which other notes it is " +
  "genuinely related to. Reply with ONLY a valid JSON array — no prose, no markdown " +
  "fences, no explanations.";

function extractionPrompt(items, batch) {
  const lines = ["Catalog of all notes:"];
  items.forEach((it, n) => {
    const tags = (it.tags || []).slice(0, 4).join(", ");
    lines.push(`[${n}] ${headline(it)}${tags ? ` (tags: ${tags})` : ""}`);
  });
  lines.push(
    "",
    `Analyse notes ${batch[0]}–${batch[batch.length - 1]} in detail below. For each one:`,
    '- "entities": the distinct people, places, organisations and concrete topics it mentions',
    "  (prefer proper nouns; 1–6 short strings; nothing invented).",
    '- "related": the indices of up to 4 OTHER catalog notes genuinely about the same thing',
    "  (an empty array when none are).",
    "",
    "Details:",
  );
  for (const n of batch) {
    const it = items[n];
    const body = [it.body, it.interpretation].filter(Boolean).join(" ").replace(/\s+/g, " ");
    lines.push(`[${n}] ${headline(it)}`, body.slice(0, 380), "");
  }
  lines.push(
    'Return ONLY JSON in the form: [{"i": <index>, "entities": ["…"], "related": [<indices>]}, …]',
    `with exactly one object for each of the indices ${batch.join(", ")}.`,
  );
  return lines.join("\n");
}

// Pull the first JSON array out of a model reply that may have prose around it.
function parseJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("no JSON array in reply");
  const arr = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error("reply is not an array");
  return arr;
}

const BATCH = 14;

// Ask the model to organise the corpus, batch by batch. Returns
// Map<id, {mentions, related}> covering the items it succeeded on.
async function llmExtract(items) {
  const out = new Map();
  const indices = items.map((_, n) => n);
  for (let at = 0; at < indices.length; at += BATCH) {
    const batch = indices.slice(at, at + BATCH);
    const reply = await runLLM({
      system: EXTRACT_SYSTEM,
      prompt: extractionPrompt(items, batch),
      maxTokens: Math.min(320 * batch.length, 3600),
    });
    for (const row of parseJsonArray(reply)) {
      const n = Number(row?.i);
      if (!Number.isInteger(n) || n < 0 || n >= items.length) continue;
      const entities = Array.isArray(row.entities)
        ? [...new Set(row.entities.map((e) => String(e).trim()).filter((e) => e && e.length <= 60))].slice(0, 8)
        : [];
      const related = Array.isArray(row.related)
        ? [...new Set(row.related.map(Number).filter((r) => Number.isInteger(r) && r >= 0 && r < items.length && r !== n))]
            .slice(0, 4)
            .map((r) => items[r].id)
        : [];
      out.set(items[n].id, { mentions: entities, related });
    }
  }
  return out;
}

// ── The combined pass ────────────────────────────────────────────────────────

/// Run the smartest organise pass currently possible. Never throws: any layer
/// that fails simply drops down the ladder. Returns
///   { plan, summary, engine: { llm, embeddings } }
/// with `plan`/`summary` in exactly the shape organise() produces, and `engine`
/// naming what actually ran so the UI can be honest about it.
export async function organiseSmart(items) {
  const engine = { llm: null, embeddings: "TF-IDF (offline)" };

  // Related links: semantic embeddings when the local server offers them.
  let related = null;
  try {
    related = await semanticRelatedLinks(items);
    if (related) {
      const b = embeddingsBackend();
      engine.embeddings = `semantic (${b.model})`;
    }
  } catch {
    related = null;
  }
  if (!related) related = relatedLinks(items);

  // Entities (and extra related suggestions): the user's AI when available.
  let llmPlan = null;
  if (llmAvailable()) {
    try {
      llmPlan = await llmExtract(items);
      if (llmPlan.size) engine.llm = llmProviderLabel();
    } catch {
      llmPlan = null; // model missing / bad JSON / endpoint gone — heuristics take over
    }
  }

  const plan = new Map();
  let entityCount = 0;
  let linkCount = 0;
  const distinctEntities = new Set();

  for (const item of items) {
    const ai = llmPlan?.get(item.id);
    // Entities: AI extraction plus the user's own declared tags; heuristic when
    // the AI didn't cover this item.
    const mentions = ai
      ? [...new Set([...(item.tags || []).filter(Boolean), ...ai.mentions])]
      : extractEntities(item);
    // Related: union of AI suggestions and the vector index's top matches.
    const vector = (related.get(item.id) || []).map((r) => r.id);
    const links = [...new Set([...(ai?.related || []), ...vector])].slice(0, 5);

    entityCount += mentions.length;
    linkCount += links.length;
    mentions.forEach((m) => distinctEntities.add(m));
    plan.set(item.id, { mentions, related: links });
  }

  return {
    plan,
    summary: {
      items: items.length,
      entities: entityCount,
      distinctEntities: distinctEntities.size,
      links: linkCount,
    },
    engine,
  };
}

/// Synchronous, guaranteed fallback — re-exported so callers can show the same
/// shape instantly when they don't want to await the smart pass.
export function organiseFallback(items) {
  const { plan, summary } = organise(items);
  return { plan, summary, engine: { llm: null, embeddings: "TF-IDF (offline)" } };
}
