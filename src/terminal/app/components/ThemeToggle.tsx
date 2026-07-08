import { useThemeContext } from "../ThemeContext";

export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const { resolved, toggle } = useThemeContext();
  const dark = resolved === "dark";

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="term-theme-row flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition"
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span className="flex items-center gap-2">
          <span className="term-icon-btn pointer-events-none h-7 w-7 border-0 bg-transparent">
            {dark ? <SunIcon /> : <MoonIcon />}
          </span>
          <span className="text-[12px] font-medium" style={{ color: "var(--term-text-secondary)" }}>
            {dark ? "Light mode" : "Dark mode"}
          </span>
        </span>
        <span
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${dark ? "bg-[var(--term-accent)]" : ""}`}
          style={dark ? undefined : { background: "var(--term-surface-3)" }}
          aria-hidden
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${dark ? "translate-x-4" : "translate-x-0.5"}`}
          />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="term-icon-btn"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M11.5 9.2a4.2 4.2 0 01-5.7-5.7A4.8 4.8 0 1011.5 9.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}