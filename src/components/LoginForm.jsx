import { useState } from "react";
import { useSession } from "@inrupt/solid-ui-react";
import BrandMark from "./BrandMark.jsx";
import {
  APP_CLIENT_ID,
  CLIENT_NAME,
  REDIRECT_URL,
  DEFAULT_OIDC_ISSUER,
} from "../constants.js";

// The login gate. We call `session.login` directly (rather than solid-ui-react's
// <LoginButton>) so we can pass the static `clientId` from app 6's client
// profile document — that is what makes the identity provider show the app name
// and reuse the registered redirect URIs instead of dynamically registering a
// throwaway client.
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
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--text)]">
            My Sovereign Wiki
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            A personal knowledge graph you actually own — capture, organise, ask,
            and share, with your data living in your own Solid Pod, not ours.
          </p>
        </div>

        <form onSubmit={handleLogin} className="card flex flex-col gap-3">
          <label htmlFor="issuer" className="text-sm font-medium text-[var(--muted)]">
            Your Pod provider
          </label>
          <input
            id="issuer"
            type="url"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="https://solidcommunity.au"
            required
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:outline-2 focus:outline-[color-mix(in_srgb,var(--accent)_45%,transparent)]"
          />
          <button type="submit" disabled={busy} className="save mt-1 w-full justify-center">
            {busy ? "Redirecting…" : "Sign in with Solid"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-[var(--muted)]">
          Signs in as <code>{CLIENT_NAME}</code> and stores everything under{" "}
          <code>/my_sovereign_wiki/</code> in your Pod. No account here, no copy of
          your data — sign out any time and it stays with you.
        </p>
      </div>
    </div>
  );
}
