import { useEffect, useRef, useState } from "react";

// Universal observation capture — the app's centre of gravity.
//
// Design principle (see universal-observation-capture-ux-design-profile.md):
// "capture first; enrich gradually". The always-visible surface is a single
// generous field — "What did you notice?" — plus lightweight ways to attach
// media and a private-by-default save. Everything else (context, reflection,
// sharing & safety) lives behind optional disclosures that prompt in ordinary
// language and never imply the entry is incomplete.

// How the observation was encountered — the provenance/attribution question,
// asked in plain words rather than ontology terms.
const ENCOUNTER_MODES = [
  ["", "How did you come across this?"],
  ["saw", "I saw or heard it directly"],
  ["told", "Someone told me"],
  ["remembered", "I remembered it"],
  ["measured", "I measured it"],
  ["inferred", "I inferred it"],
  ["generated", "A system generated it"],
  ["modelling", "I'm modelling a possibility"],
];

// The range of "did anything emerge from this?" — deliberately broad, and
// "nothing yet" is a normal, valid answer.
const EFFLORESCENCE_TYPES = [
  "",
  "an insight",
  "a question",
  "an idea",
  "a feeling",
  "something to learn",
  "something to make",
  "something to discuss",
  "something to do",
  "something to protect",
  "something to appreciate",
  "nothing yet",
];

// Optional reflective lenses — the value streams the observation can be seen
// through. Selecting one records the lens and surfaces one plain-language
// prompt; the user is never asked to assess them all.
const LENSES = [
  ["Culture", "What cultural meaning or context is at play here?"],
  ["Risk", "What could go wrong, and who would it affect?"],
  ["Care", "Who might need support here? What response would genuinely help?"],
  ["Values", "What value or principle does this touch?"],
  ["Truth & evidence", "What do you know directly? What are you inferring or unsure about?"],
  ["Creativity", "What could you make or express from this?"],
  ["Future", "If this continued, where might it lead?"],
  ["Learning", "What did you learn, or want to understand better?"],
  ["Enjoyment", "What was good about this — worth savouring?"],
  ["Groundedness", "What steadies or settles you about this?"],
  ["Appreciation", "What are you grateful for here?"],
  ["Society & environment", "How does this touch other people or the world around you?"],
  ["Conversation", "Who is being heard here — and who isn't yet?"],
  ["Universal love", "How might this be met with goodwill toward all?"],
  ["Close observation", "What detail did you notice that others might miss?"],
  ["Mastery", "What skill or craft does this advance?"],
  ["Problem solving", "What problem is here, and what might resolve it?"],
  ["Stewardship", "How could this leave things better than before?"],
];

let attachmentSeq = 0;

// A single optional-disclosure section. Collapsed by default; the summary is a
// permissive invitation ("Add context"), never a demand.
function Section({ label, hint, open, onToggle, children }) {
  return (
    <div className={`section ${open ? "open" : ""}`}>
      <button type="button" className="section-toggle" aria-expanded={open} onClick={onToggle}>
        <span className="chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
        <span className="section-label">{label}</span>
        {hint && !open && <span className="section-hint">{hint}</span>}
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

export default function Capture({ onAdd, onViewWiki }) {
  // Level 1 — quick capture.
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]); // {id, kind, name, url?, previewUrl?, file?}
  const [addingLink, setAddingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");

  // Level 2 — context.
  const [openContext, setOpenContext] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [context, setContext] = useState("");
  const [tags, setTags] = useState("");
  const [encounterMode, setEncounterMode] = useState("");

  // Level 3 — reflect & develop.
  const [openReflect, setOpenReflect] = useState(false);
  const [interpretation, setInterpretation] = useState("");
  const [uncertainty, setUncertainty] = useState("");
  const [efflorescence, setEfflorescence] = useState("");
  const [efflorescenceType, setEfflorescenceType] = useState("");
  const [lenses, setLenses] = useState(() => new Set());

  // Level 4 — govern & connect.
  const [openGovern, setOpenGovern] = useState(false);
  const [sensitivity, setSensitivity] = useState("private");
  const [audience, setAudience] = useState("");

  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const speechSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const canSave = body.trim() || title.trim() || attachments.length > 0;

  function clearSaved() {
    if (justSaved) setJustSaved(false);
  }

  // Clean up any object URLs / live recogniser when the composer unmounts.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    };
    // Intentionally run only on unmount; attachment URLs are revoked on removal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(fileList) {
    const next = Array.from(fileList).map((file) => ({
      id: ++attachmentSeq,
      kind: "file",
      name: file.name,
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    if (next.length) {
      setAttachments((prev) => [...prev, ...next]);
      clearSaved();
    }
  }

  function addLink() {
    const value = linkDraft.trim();
    if (!value) return;
    setAttachments((prev) => [
      ...prev,
      { id: ++attachmentSeq, kind: "link", name: value, url: value },
    ]);
    setLinkDraft("");
    setAddingLink(false);
    clearSaved();
  }

  function removeAttachment(id) {
    setAttachments((prev) => {
      const gone = prev.find((a) => a.id === id);
      if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (finalText.trim()) {
        setBody((b) => (b ? `${b} ` : "") + finalText.trim());
        clearSaved();
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function toggleLens(name) {
    setLenses((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function reset() {
    attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    setBody("");
    setAttachments([]);
    setAddingLink(false);
    setLinkDraft("");
    setTitle("");
    setWhen("");
    setContext("");
    setTags("");
    setEncounterMode("");
    setInterpretation("");
    setUncertainty("");
    setEfflorescence("");
    setEfflorescenceType("");
    setLenses(new Set());
    setSensitivity("private");
    setAudience("");
    setOpenContext(false);
    setOpenReflect(false);
    setOpenGovern(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSave || busy) return;
    setBusy(true);
    setJustSaved(false);
    try {
      await onAdd({
        title: title.trim(),
        body,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        links: attachments.filter((a) => a.kind === "link").map((a) => a.url),
        files: attachments.filter((a) => a.kind === "file").map((a) => a.file),
        encounterMode,
        when: when.trim(),
        context: context.trim(),
        interpretation: interpretation.trim(),
        uncertainty: uncertainty.trim(),
        efflorescence: efflorescence.trim(),
        efflorescenceType,
        lenses: [...lenses],
        sensitivity,
        audience: audience.trim(),
      });
      reset();
      setJustSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const savedMessage =
    sensitivity === "sensitive" ? "Saved privately, flagged as sensitive." : "Saved privately.";

  return (
    <form className="composer card" onSubmit={handleSubmit}>
      <label className="composer-label" htmlFor="observation">
        What did you notice?
      </label>
      <textarea
        id="observation"
        className="observation"
        placeholder="A moment, thought, change, question, feeling, pattern, event, or detail…"
        rows={5}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          clearSaved();
        }}
        autoFocus
      />

      {/* Media & voice — capture considerations that don't fit in words. */}
      <div className="capture-tools">
        <button type="button" className="tool" onClick={() => fileInputRef.current?.click()}>
          📎 Add photo or file
        </button>
        <button type="button" className="tool" onClick={() => setAddingLink((v) => !v)}>
          🔗 Add link
        </button>
        {speechSupported && (
          <button
            type="button"
            className={`tool ${listening ? "listening" : ""}`}
            onClick={toggleVoice}
          >
            {listening ? "● Listening…" : "🎤 Voice"}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {addingLink && (
        <div className="link-draft">
          <input
            type="url"
            placeholder="https://…"
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
            autoFocus
          />
          <button type="button" className="tool" onClick={addLink}>
            Add
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="attachments">
          {attachments.map((a) => (
            <li key={a.id} className="attachment">
              {a.previewUrl ? (
                <img src={a.previewUrl} alt="" className="attachment-thumb" />
              ) : (
                <span className="attachment-icon" aria-hidden="true">
                  {a.kind === "link" ? "🔗" : "📄"}
                </span>
              )}
              <span className="attachment-name">{a.name}</span>
              <button
                type="button"
                className="attachment-remove"
                title="Remove"
                onClick={() => removeAttachment(a.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Optional enrichment — available, never demanded. */}
      <Section
        label="Add more details"
        hint="when, where, who, how you came across it"
        open={openContext}
        onToggle={() => setOpenContext((v) => !v)}
      >
        <input
          type="text"
          placeholder="Give it a title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="When did this happen? (e.g. this morning, last Tuesday)"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <input
          type="text"
          placeholder="Where or in what setting?"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <input
          type="text"
          placeholder="Connect to people, topics, or projects — comma separated"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <select value={encounterMode} onChange={(e) => setEncounterMode(e.target.value)}>
          {ENCOUNTER_MODES.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </Section>

      <Section
        label="Impressions and feelings"
        hint="the impression it left, how it felt, what emerged"
        open={openReflect}
        onToggle={() => setOpenReflect((v) => !v)}
      >
        <textarea
          rows={2}
          placeholder="What impression did this leave you with?"
          value={interpretation}
          onChange={(e) => setInterpretation(e.target.value)}
        />
        <textarea
          rows={2}
          placeholder="What did it make you feel?"
          value={uncertainty}
          onChange={(e) => setUncertainty(e.target.value)}
        />
        <div className="efflorescence-row">
          <label className="mini-label">Did anything emerge from this?</label>
          <select
            value={efflorescenceType}
            onChange={(e) => setEfflorescenceType(e.target.value)}
          >
            {EFFLORESCENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t || "— optional —"}
              </option>
            ))}
          </select>
        </div>
        {efflorescenceType && efflorescenceType !== "nothing yet" && (
          <textarea
            rows={2}
            placeholder={`Describe ${efflorescenceType}…`}
            value={efflorescence}
            onChange={(e) => setEfflorescence(e.target.value)}
          />
        )}

        <div className="lenses">
          <label className="mini-label">Look at this another way</label>
          <div className="lens-chips">
            {LENSES.map(([name]) => (
              <button
                key={name}
                type="button"
                className={`lens-chip ${lenses.has(name) ? "active" : ""}`}
                onClick={() => toggleLens(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {[...lenses].map((name) => {
            const prompt = LENSES.find(([n]) => n === name)?.[1];
            return (
              prompt && (
                <p key={name} className="lens-prompt">
                  <strong>{name}:</strong> {prompt}
                </p>
              )
            );
          })}
        </div>
      </Section>

      <Section
        label="Sharing & safety"
        hint="private by default"
        open={openGovern}
        onToggle={() => setOpenGovern((v) => !v)}
      >
        <div className="sensitivity-toggle">
          <label className={sensitivity === "private" ? "active" : ""}>
            <input
              type="radio"
              name="sensitivity"
              checked={sensitivity === "private"}
              onChange={() => setSensitivity("private")}
            />
            Private
          </label>
          <label className={sensitivity === "sensitive" ? "active" : ""}>
            <input
              type="radio"
              name="sensitivity"
              checked={sensitivity === "sensitive"}
              onChange={() => setSensitivity("sensitive")}
            />
            Sensitive — take care
          </label>
        </div>
        <input
          type="text"
          placeholder="Who is this for? (leave blank to keep it to yourself)"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
        />
        <p className="govern-note">
          Everything is stored in your own Pod and stays private until you grant
          access. Sharing controls live in the Access dashboard.
        </p>
      </Section>

      <div className="compose-row">
        <span
          className={`privacy ${sensitivity === "sensitive" ? "sensitive" : ""}`}
          title="Stored in your own Pod. Private until you choose to share it."
        >
          {sensitivity === "sensitive" ? "⚠ Sensitive · Private" : "🔒 Private"}
        </span>
        <button type="submit" className="save" disabled={busy || !canSave}>
          {busy ? "Saving to your Pod…" : "Save"}
        </button>
      </div>

      {justSaved && (
        <div className="saved-confirm" role="status">
          <span>{savedMessage}</span>
          <button type="button" className="link-button" onClick={onViewWiki}>
            View in your wiki
          </button>
        </div>
      )}
    </form>
  );
}
