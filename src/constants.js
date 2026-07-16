// ── Solid app registration ───────────────────────────────────────────────────
//
// These values are the login-flow configuration. `APP_CLIENT_ID` resolves to a
// publicly hosted Solid-OIDC client profile document whose `redirect_uris` list
// must contain exactly `REDIRECT_URL`; if it does not, the identity provider
// rejects login.
//
// The client profile document is now served from this app's OWN origin
// (public/solid/client-profile.jsonld → https://mysovereignwiki.org/solid/...),
// so app 8 no longer depends on app 6's GitHub Pages repo. Its `redirect_uris`
// list both the production apex origin and `http://localhost:4400` for dev.

/// Public Solid-OIDC client profile document (static client registration).
/// MUST be byte-for-byte the URL this document is actually served from.
export const APP_CLIENT_ID =
  "https://mysovereignwiki.org/solid/client-profile.jsonld";

/// Human-readable client name shown on the identity provider's consent screen.
/// Matches `client_name` in the hosted client profile document.
export const CLIENT_NAME = "MySovereignWiki";

/// The redirect URI the identity provider returns to. Derived from the current
/// origin so one build serves both `http://localhost:4400` (dev) and
/// `https://mysovereignwiki.org` (prod). Whatever origin this resolves to MUST
/// be listed in the client profile document's `redirect_uris`.
export const REDIRECT_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/redirect.html`
    : "http://localhost:4400/redirect.html";

/// Default Solid server / OIDC issuer. Derived from app 6's registered redirect
/// host (`*.solidcommunity.au`). Users on another Pod provider can override this
/// in the login form.
export const DEFAULT_OIDC_ISSUER = "https://solidcommunity.au";

/// Folder created in the user's Pod to hold wiki data. Kept identical to app 6
/// so both apps read/write the same container.
export const POD_APP_DIR = "my_sovereign_wiki";
