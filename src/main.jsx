import React from "react";
import ReactDOM from "react-dom/client";
import { SessionProvider } from "@inrupt/solid-ui-react";
import App from "./App.jsx";
import "./App.css";

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
