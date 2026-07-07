import { useEffect, useState } from "react";
import { BLUE } from "../../components";
import { renderShareCard, xShareUrl, copyCardToClipboard, downloadCard } from "../../share";
import type { LiveLaunch } from "../../kickstart";

export function ShareModal({ c, onClose }: { c: LiveLaunch; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    let alive = true;
    renderShareCard(c).then((b) => {
      if (!alive || !b) return;
      setBlob(b);
      setPreviewUrl(URL.createObjectURL(b));
    });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
      setPreviewUrl((u) => { if (u) URL.revokeObjectURL(u); return null; });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c]);

  const doCopy = async () => {
    if (!blob) return;
    const ok = await copyCardToClipboard(blob);
    setCopied(ok ? "ok" : "fail");
    setTimeout(() => setCopied(null), 2500);
    if (!ok) downloadCard(blob, c.symbol); // clipboard unsupported → download instead
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl animate-fade-up overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <span className="text-[13px] font-bold text-zinc-900">Share ${c.symbol}</span>
          <button onClick={onClose} className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">✕</button>
        </div>
        <div className="p-5">
          {previewUrl ? (
            <img src={previewUrl} alt={`${c.symbol} share card`} className="w-full rounded-xl border border-zinc-200 shadow-sm" />
          ) : (
            <div className="flex aspect-[1200/630] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
              <span className="flex items-center gap-2 text-[13px] text-zinc-400">
                <span className="term-blink h-2 w-2 rounded-full" style={{ background: BLUE }} /> Rendering card…
              </span>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={xShareUrl(c)} target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[12px] font-bold uppercase tracking-wide text-white transition hover:-translate-y-px" style={{ background: "#0b0e13" }}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Post on X
            </a>
            <button onClick={doCopy} disabled={!blob}
              className="flex-1 rounded-full py-2.5 text-[12px] font-bold uppercase tracking-wide text-white transition hover:-translate-y-px disabled:opacity-40" style={{ background: BLUE }}>
              {copied === "ok" ? "✓ Copied!" : copied === "fail" ? "Downloaded ↓" : "⧉ Copy image"}
            </button>
            <button onClick={() => blob && downloadCard(blob, c.symbol)} disabled={!blob}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40">
              ↓ Save
            </button>
          </div>
          <p className="mt-3 text-center text-[10px] text-zinc-400">
            Tip: paste the image into your X post — screenshots with receipts travel furthest.
          </p>
        </div>
      </div>
    </div>
  );
}
