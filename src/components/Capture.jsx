import { useState } from "react";

// Capture screen: add a note or bookmark with tags. Mirrors app 6's Capture
// screen and WikiItem shape (title / body / url / tags / type).
export default function Capture({ onAdd }) {
  const [type, setType] = useState("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim() && !body.trim()) return;
    setBusy(true);
    try {
      await onAdd({
        type,
        title,
        body,
        link,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setTitle("");
      setBody("");
      setLink("");
      setTags("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="capture card" onSubmit={handleSubmit}>
      <div className="type-toggle">
        <label className={type === "note" ? "active" : ""}>
          <input
            type="radio"
            name="type"
            value="note"
            checked={type === "note"}
            onChange={() => setType("note")}
          />
          Note
        </label>
        <label className={type === "bookmark" ? "active" : ""}>
          <input
            type="radio"
            name="type"
            value="bookmark"
            checked={type === "bookmark"}
            onChange={() => setType("bookmark")}
          />
          Bookmark
        </label>
      </div>

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {type === "bookmark" && (
        <input
          type="url"
          placeholder="https://…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      )}

      <textarea
        placeholder={type === "bookmark" ? "Description (optional)" : "Write your note…"}
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <input
        type="text"
        placeholder="Tags, comma separated"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />

      <button type="submit" disabled={busy}>
        {busy ? "Saving to your Pod…" : "Capture"}
      </button>
    </form>
  );
}
