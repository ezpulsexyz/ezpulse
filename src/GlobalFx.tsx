import { useEffect, useState } from "react";

/**
 * Aggressive Bloomberg Terminal-grade visual effects.
 * Includes: strong CRT scanlines, subtle noise, vignette, and layered glow.
 */
export default function GlobalFx() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);

    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return (
    <>
      {/* Ambient background glow (behind everything) */}
      <div className="fx-glow" aria-hidden="true" />

      {/* Main CRT overlay layer */}
      <div className="fx-overlay" aria-hidden="true">
        {/* Classic scanlines */}
        <div className="fx-scanlines" />

        {/* Moving scan beam (subtle) */}
        {!reducedMotion && <div className="fx-scan-beam" />}

        {/* Subtle film grain / noise for terminal texture */}
        <div className="fx-noise" />

        {/* Soft vignette to focus attention toward center */}
        <div className="fx-vignette" />
      </div>
    </>
  );
}
