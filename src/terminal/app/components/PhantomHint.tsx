export function PhantomHint({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <span className="mt-px text-[13px]">👻</span>
      <div className="min-w-0 text-left">
        <p className={`font-semibold text-amber-800 ${compact ? "text-[11.5px]" : "text-[12.5px]"}`}>
          Phantom isn't detected in this browser.
        </p>
        <p className={`text-amber-700/80 ${compact ? "text-[10.5px]" : "text-[11.5px]"}`}>
          Install Phantom or enable the browser extension, then reload.{" "}
          <a href="https://phantom.com/download" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2 hover:text-amber-900">
            Get Phantom ↗
          </a>
        </p>
      </div>
    </div>
  );
}
