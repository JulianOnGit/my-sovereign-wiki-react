import { useEffect, useState } from "react";

// Dark / light slide toggle in the app header.
//
// Three effective sources of truth, in priority order: an explicit choice the
// user made here (persisted in localStorage as `ssw.theme`), else the OS
// preference. The choice lands on <html data-theme="light|dark">, which the
// stylesheet honours over the prefers-color-scheme default — and which the
// canvas graph watches to re-read its palette. main.jsx applies the stored
// value before first paint so there's no flash of the wrong theme.

const KEY = "ssw.theme";

function systemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

export function applyStoredTheme() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch {
    /* storage disabled — system preference rules */
  }
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored === "light" || stored === "dark") return stored === "dark";
    } catch {
      /* fall through to system */
    }
    return systemPrefersDark();
  });

  // If the user has made no explicit choice, follow the OS live.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e) => {
      try {
        if (!localStorage.getItem(KEY)) setDark(e.matches);
      } catch {
        setDark(e.matches);
      }
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const theme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* not persisted, still applied */
    }
  }

  return (
    <button
      type="button"
      className={`theme-switch${dark ? " is-dark" : ""}`}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      <span className="theme-switch-icon theme-switch-sun" aria-hidden="true">☀️</span>
      <span className="theme-switch-icon theme-switch-moon" aria-hidden="true">🌙</span>
      <span className="theme-switch-knob" aria-hidden="true" />
    </button>
  );
}
