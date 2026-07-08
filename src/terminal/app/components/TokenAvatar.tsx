import { useEffect, useState } from "react";
import { fetchKickstartIcons, resolveTokenIcon, type LiveLaunch } from "../../kickstart";

type TokenLike = Pick<LiveLaunch, "ca" | "icon" | "symbol" | "name">;

export function TokenAvatar({
  token,
  className = "coin-row__avatar",
  fallbackClassName = "coin-row__avatar coin-row__avatar--fallback",
}: {
  token: TokenLike;
  className?: string;
  fallbackClassName?: string;
}) {
  const [icon, setIcon] = useState(() => resolveTokenIcon(token));

  useEffect(() => {
    setIcon(resolveTokenIcon(token));
  }, [token.ca, token.icon]);

  useEffect(() => {
    if (icon) return;
    let alive = true;
    void fetchKickstartIcons([token.ca]).then((icons) => {
      if (!alive) return;
      const next = icons.get(token.ca.toLowerCase());
      if (next) setIcon(next);
    });
    return () => {
      alive = false;
    };
  }, [icon, token.ca]);

  if (icon) {
    return (
      <img
        src={icon}
        alt=""
        className={className}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          setIcon(undefined);
        }}
      />
    );
  }

  return (
    <span className={fallbackClassName} aria-hidden>
      {(token.symbol || token.name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}