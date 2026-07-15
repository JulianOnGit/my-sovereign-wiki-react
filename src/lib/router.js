import { useCallback, useSyncExternalStore } from "react";

// Minimal hash-based router.
//
// The app is a statically-hosted SPA (GitHub Pages / vite preview, no server
// rewrites) and the Solid-OIDC redirect uses the `?code=` query on
// /redirect.html — so path-based routing would 404 on refresh and risk the login
// flow. Hash routing sidesteps both: every hash change is a real browser-history
// entry (back/forward works, URLs are shareable/bookmarkable), and the hash never
// reaches the server or collides with the OIDC query string.
//
// State is encoded as slash-separated, URL-encoded segments after `#/`, e.g.
// `#/wiki/article/Nora`, `#/explore/date/2026-07-16`.

function getHash() {
  return window.location.hash.replace(/^#\/?/, "");
}

function subscribe(callback) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

/// Returns `{ segments, navigate }`. `segments` is the decoded path (e.g.
/// `["wiki", "article", "Nora"]`); `navigate("wiki", "article", name)` pushes a
/// new history entry with each segment URL-encoded.
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, getHash, () => "");
  const segments = hash.split("/").filter(Boolean).map(safeDecode);

  const navigate = useCallback((...segs) => {
    const encoded = segs
      .filter((s) => s != null && String(s) !== "")
      .map((s) => encodeURIComponent(String(s)))
      .join("/");
    window.location.hash = encoded ? `#/${encoded}` : "#/";
  }, []);

  return { segments, navigate };
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
