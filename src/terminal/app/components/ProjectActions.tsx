import { isGraduated, isVerified, kickstartUrl, type LiveLaunch } from "../../kickstart";
import { useTerminalContext } from "../TerminalContext";

export function ProjectActions({
  token,
  isWatching,
  onShare,
  onWatch,
  onFounder,
}: {
  token: LiveLaunch;
  isWatching: boolean;
  onShare: () => void;
  onWatch: () => void;
  onFounder?: () => void;
}) {
  const { setPriceAlertToken } = useTerminalContext();
  const graduated = isGraduated(token);
  const verified = isVerified(token);

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
      {!graduated && (
        <a
          href={kickstartUrl(token.ca)}
          target="_blank"
          rel="noopener noreferrer"
          className="term-action term-action--brand col-span-2 sm:col-span-1 sm:min-w-[8.5rem]"
        >
          <BuyIcon />
          Buy on Kickstart
        </a>
      )}

      <button type="button" onClick={onWatch} className={`term-action ${isWatching ? "term-action--watch" : "term-action--outline"}`}>
        <WatchIcon filled={isWatching} />
        {isWatching ? "Watching" : "Watch"}
      </button>

      <button type="button" onClick={onShare} className="term-action term-action--outline">
        <ShareIcon />
        Share
      </button>

      <button
        type="button"
        onClick={() => setPriceAlertToken(token)}
        className="term-action term-action--outline"
      >
        <AlertIcon />
        Set Alert
      </button>

      {verified && onFounder && (
        <button type="button" onClick={onFounder} className="term-action term-action--founder col-span-2 sm:col-span-1">
          <FounderIcon />
          Founder Terminal
        </button>
      )}

      <a
        href={kickstartUrl(token.ca)}
        target="_blank"
        rel="noopener noreferrer"
        className="term-action term-action--outline col-span-2 sm:col-span-1"
      >
        <KickstartIcon />
        Kickstart
        <ExternalIcon />
      </a>
    </div>
  );
}

function BuyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WatchIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill={filled ? "currentColor" : "none"} aria-hidden>
      <path d="M8 3l1.6 3.2 3.6.52-2.6 2.54.61 3.56L8 11.1l-3.21 1.72.61-3.56L3.8 6.72l3.6-.52L8 3z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M8 2v1.5M4.5 12.5A4.5 4.5 0 0111.5 12.5M8 4.5a2.5 2.5 0 00-2.5 2.5v1.5l-1 1.5h7l-1-1.5V7A2.5 2.5 0 008 4.5z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M11 2l3 3-3 3M14 5H9a4 4 0 00-4 4v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FounderIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 13.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KickstartIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M3 5h10v8H3z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 5V3.5A1.5 1.5 0 017.5 2h1A1.5 1.5 0 0110 3.5V5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 opacity-50" fill="none" aria-hidden>
      <path d="M9 3h4v4M13 3L7 9M6 5H4.5A1.5 1.5 0 003 6.5v6A1.5 1.5 0 004.5 14h6a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}