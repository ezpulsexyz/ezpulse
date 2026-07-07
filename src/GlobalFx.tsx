/** Fixed viewport overlays — ambient glow (behind) + CRT scanlines (above). */
export default function GlobalFx() {
  return (
    <>
      <div className="fx-glow" aria-hidden="true" />
      <div className="fx-overlay" aria-hidden="true">
        <div className="fx-scanlines" />
        <div className="fx-scan-beam" />
      </div>
    </>
  );
}