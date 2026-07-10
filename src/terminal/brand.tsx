export const BLUE = "#2743f0";
export const DOMAIN = "ezpulse.xyz";
export const CONTACT = "contact@ezpulse.xyz";
export const X_URL = "https://x.com/ezpulsexyz";
export const X_HANDLE = "@ezpulsexyz";
export const TELEGRAM_URL = "https://t.me/+FEKfKRWaCrYxZmM1";

/** ezpulse mark: a heartbeat/pulse line in a rounded square. */
export function PulseMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  // Better stroke width for small sizes (collapsed sidebar)
  const strokeWidth = size <= 28 ? 2.2 : 2.4;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      className={className} 
      aria-label="ezpulse logo"
    >
      <rect 
        width="32" 
        height="32" 
        rx="8" 
        fill={BLUE} 
      />
      <path
        d="M5 16.5 h5.5 l2.5 -7 l4 13 l3 -9 l1.5 3 H27"
        fill="none" 
        stroke="#fff" 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round"
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
}: {
  size?: number;
  textClass?: string;
  dark?: boolean;
  compact?: boolean;
}) {
  if (compact) return <PulseMark size={size} />;
  return (
    <span className="flex items-center gap-2">
      <PulseMark size={size} />
      <Wordmark className={textClass} dark={dark} />
    </span>
  );
}
