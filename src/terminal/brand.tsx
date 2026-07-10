export const BLUE = "#2743f0";
export const DOMAIN = "ezpulse.xyz";
export const CONTACT = "contact@ezpulse.xyz";
export const X_URL = "https://x.com/ezpulsexyz";
export const X_HANDLE = "@ezpulsexyz";
export const TELEGRAM_URL = "https://t.me/+FEKfKRWaCrYxZmM1";

/** ezpulse mark: a heartbeat/pulse line in a rounded square. */
export function PulseMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  // Much thicker stroke for small/collapsed sizes
  const strokeWidth = size < 36 ? 3.5 : 2.6;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`block shrink-0 ${className}`.trim()}
      aria-label="ezpulse logo"
    >
      <rect 
        width="32" 
        height="32" 
        rx="8" 
        fill={BLUE} 
      />
      <path
        d="M4 16.5 h6 l2.5 -8 l4.5 16 l3.5 -11 l2 4.5 H28"
        fill="none" 
        stroke="#fff" 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round"
        strokeOpacity="0.95"
      />
    </svg>
  );
}

/** ezpulse wordmark: "ez" bold + "pulse" light. */
export function Wordmark({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  if (dark) {
    return (
      <span className={`font-bold tracking-tight ${className}`}>
        <span className="text-white">ez</span>
        <span className="font-normal text-white/60">pulse</span>
      </span>
    );
  }
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="term-wordmark-strong">ez</span>
      <span className="term-wordmark-muted font-normal">pulse</span>
    </span>
  );
}

export function Logo({
  size = 32,
  textClass = "text-[15px]",
  dark = false,
  compact = false,
  className = "",
}: {
  size?: number;
  textClass?: string;
  dark?: boolean;
  compact?: boolean;
  className?: string;
}) {
  if (compact) return <PulseMark size={size} className={className} />;
  return (
    <span className={`flex shrink-0 items-center gap-2 ${className}`.trim()}>
      <PulseMark size={size} />
      <Wordmark className={textClass} dark={dark} />
    </span>
  );
}
