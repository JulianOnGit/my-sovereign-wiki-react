import { useState } from "react";
import { useSession } from "@inrupt/solid-ui-react";
import {
  APP_CLIENT_ID,
  CLIENT_NAME,
  REDIRECT_URL,
  DEFAULT_OIDC_ISSUER,
} from "../constants.js";

// The login gate. We call `session.login` directly (rather than solid-ui-react's
// <LoginButton>) so we can pass the static `clientId` from app 6's client
// profile document — that is what makes the identity provider show "MySovereign
// Wiki" and reuse the registered redirect URIs instead of dynamically
// registering a throwaway client.
export default function LoginForm() {
  const { session } = useSession();
  const [issuer, setIssuer] = useState(DEFAULT_OIDC_ISSUER);
  const [busy, setBusy] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    await session.login({
      oidcIssuer: issuer.trim(),
      redirectUrl: REDIRECT_URL,
      clientId: APP_CLIENT_ID,
      clientName: CLIENT_NAME,
    });
    // `login` navigates away to the identity provider, so we never return here.
  }

  return (
    <div className="login">
      <h1>Self-Sovereign Wiki</h1>
      <p className="tagline">
        Your personal knowledge graph, on a Solid Pod you own.
      </p>
      <form onSubmit={handleLogin}>
        <label htmlFor="issuer">Your Pod provider</label>
        <input
          id="issuer"
          type="url"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          placeholder="https://solidcommunity.au"
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? "Redirecting…" : "Log in with Solid"}
        </button>
      </form>
      <p className="hint">
        Signs in as <code>{CLIENT_NAME}</code> and stores data under{" "}
        <code>/my_sovereign_wiki/</code> in your Pod.
      </p>
    </div>
  );
}
