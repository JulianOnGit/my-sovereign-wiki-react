import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev/preview server MUST run on port 4400: the Solid-OIDC client profile
// reused from app 6 registers `http://localhost:4400/redirect.html` as a
// redirect URI, and the identity provider rejects any redirect URI that is not
// listed there. `strictPort` fails fast rather than silently drifting to 4401.
//
// `redirect.html` is a second HTML entry point that mounts the very same app.
// Solid-OIDC returns the browser to the registered redirect URI carrying the
// auth `?code`; @inrupt's `handleIncomingRedirect` completes the token
// exchange using whatever URL the app is currently at, so the app must load
// *at* `/redirect.html` (not bounce to `/`) for the redirect URI to match.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4400,
    strictPort: true,
  },
  preview: {
    port: 4400,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        redirect: "redirect.html",
      },
    },
  },
});
