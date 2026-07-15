// ── Solid app registration ───────────────────────────────────────────────────
//
// These values are the login-flow configuration reused verbatim from app 6
// (6-self-sovereign-wiki-2). `APP_CLIENT_ID` resolves to a publicly hosted
// Solid-OIDC client profile document whose `redirect_uris` list must contain
// exactly `REDIRECT_URL`; if it does not, the identity provider rejects login.
//
// Source: 6-self-sovereign-wiki-2/my_sovereign_wiki/lib/constants/app.dart
//         and .../solid/client-profile.jsonld

/// Public Solid-OIDC client profile document (static client registration).
export const APP_CLIENT_ID =
  "https://julianongit.github.io/self-sovereign-wiki/solid/client-profile.jsonld";

/// Human-readable client name shown on the identity provider's consent screen.
/// Matches `client_name` in the hosted client profile document.
export const CLIENT_NAME = "MySovereignWiki";

/// The redirect URI the identity provider returns to. MUST be one of the
/// `redirect_uris` registered in the client profile document, and the dev
/// server MUST be served from this exact origin/port (see vite.config.js).
export const REDIRECT_URL = "http://localhost:4400/redirect.html";

/// Default Solid server / OIDC issuer. Derived from app 6's registered redirect
/// host (`*.solidcommunity.au`). Users on another Pod provider can override this
/// in the login form.
export const DEFAULT_OIDC_ISSUER = "https://solidcommunity.au";

/// Folder created in the user's Pod to hold wiki data. Kept identical to app 6
/// so both apps read/write the same container.
export const POD_APP_DIR = "my_sovereign_wiki";
