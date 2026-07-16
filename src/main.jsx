import React from "react";
import ReactDOM from "react-dom/client";
import { SessionProvider } from "@inrupt/solid-ui-react";
import App from "./App.jsx";
import { applyStoredTheme } from "./components/ThemeToggle.jsx";
import "./App.css";

// Apply any explicit theme choice before first paint, so a user who chose dark
// (or light) never sees a flash of the other theme.
applyStoredTheme();

// `SessionProvider` wraps the whole app so `useSession()` works everywhere.
// `restorePreviousSession` makes it (a) complete the Solid-OIDC redirect when
// the browser lands back on /redirect.html after login, and (b) silently
// restore an existing session (via refresh token) on a normal page load.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SessionProvider restorePreviousSession>
      <App />
    </SessionProvider>
  </React.StrictMode>,
);
