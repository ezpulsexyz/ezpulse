/**
 * ezpulse share cards — branded PNG generated client-side on <canvas>.
 */
import { terminalHref } from "../routes";
import { BLUE, DOMAIN, X_HANDLE } from "./brand";
import type { LiveLaunch } from "./kickstart";
import {
  isVerified,
  isGraduated,
  resolveTokenIcon,
  tokenNote,
  tokenSignalBias,
} from "./kickstart";

const W = 1200;
const H = 630;

const fmtUsd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
const fmtPrice = (p: number) => (p >= 1 ? `$${p.toFixed(2)}` : `$${p.toFixed(6)}`);

export type ShareInsights = {
  biasLabel: string;
  biasScore: number;
  rating: string;
  headline: string;
  insight: string;
  buyPressure: number;
  rank: number;
  feedSize: number;
};

export function shareInsights(c: LiveLaunch, feed: LiveLaunch[]): ShareInsights {
  const pool = feed.length ? feed : [c];
  const bias = tokenSignalBias(c, pool);
  const note = tokenNote(c, pool);
  const trades = c.buys24h + c.sells24h;
  const buyPressure = trades > 0 ? Math.round((c.buys24h / trades) * 100) : 50;
  const rank = [...pool].sort((a, b) => b.mcap - a.mcap).findIndex((x) => x.ca === c.ca) + 1;

  const headline = c.change24h >= 15
    ? `Momentum rip — +${c.change24h.toFixed(1)}% in 24h`
    : c.change24h <= -15
      ? `Sharp drawdown — ${c.change24h.toFixed(1)}% in 24h`
      : `${bias.label} tape · ${bias.bulls} bull / ${bias.bears} bear signals`;

  const turnover = c.mcap > 0 ? (c.volume24h / c.mcap) * 100 : 0;
  const liqPct = c.mcap > 0 ? (c.liquidity / c.mcap) * 100 : 0;
  const flow = buyPressure >= 58 ? "buyers leading" : buyPressure <= 42 ? "sellers leading" : "balanced flow";

  const insight = [
    note.note.split(".")[0] + ".",
    turnover > 0 ? `${turnover.toFixed(0)}% daily turnover · ${flow}.` : "",
    liqPct > 0 ? `Liquidity ${liqPct.toFixed(0)}% of cap.` : "",
  ].filter(Boolean).join(" ");

  return {
    biasLabel: bias.label,
    biasScore: bias.score,
    rating: note.rating,
    headline,
    insight: insight.length > 160 ? insight.slice(0, 157) + "…" : insight,
    buyPressure,
    rank,
    feedSize: pool.length,
  };
}

export function shareTokenUrl(c: LiveLaunch): string {
  const path = terminalHref({ section: "projects", projectCa: c.ca });
  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).href;
  }
  return `https://${DOMAIN}${path}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPulse(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, lw = 4) {
  const seg = w / 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + seg * 3, y);
  ctx.lineTo(x + seg * 3.7, y - seg * 1.2);
  ctx.lineTo(x + seg * 4.8, y + seg * 1.6);
  ctx.lineTo(x + seg * 5.6, y - seg * 1.0);
  ctx.lineTo(x + seg * 6.2, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  bg: string,
  fg: string,
): number {
  ctx.font = "700 18px Inter, system-ui, sans-serif";
  const padX = 18;
  const w = ctx.measureText(label).width + padX * 2;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, 36, 18);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(label, x + padX, y + 24);
  return w + 10;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

async function loadIcon(url: string): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/png");
    } catch {
      resolve(null);
    }
  });
}

async function paintShareCard(
  c: LiveLaunch,
  feed: LiveLaunch[],
  withIcon: boolean,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const info = shareInsights(c, feed);
  const up = c.change24h >= 0;
  const accent = up ? "#10b981" : "#ef4444";
  const biasColor =
    info.biasLabel === "BULLISH" ? "#059669" : info.biasLabel === "BEARISH" ? "#dc2626" : "#52525b";

  ctx.fillStyle = "#fbfbfd";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ececf1";
  for (let gx = 40; gx < W; gx += 36) {
    for (let gy = 40; gy < H; gy += 36) ctx.fillRect(gx, gy, 2, 2);
  }

  roundRect(ctx, 60, 52, 56, 56, 14);
  ctx.fillStyle = BLUE;
  ctx.fill();
  drawPulse(ctx, 68, 80, 40, "#ffffff", 4);
  ctx.fillStyle = "#18181b";
  ctx.font = "800 34px Inter, system-ui, sans-serif";
  ctx.fillText("ez", 132, 90);
  ctx.fillStyle = "#71717a";
  ctx.font = "400 34px Inter, system-ui, sans-serif";
  ctx.fillText("pulse", 168, 90);

  const biasLabel = `${info.biasLabel} · ${info.biasScore}`;
  ctx.font = "700 18px Inter, system-ui, sans-serif";
  const biasW = ctx.measureText(biasLabel).width + 36;
  ctx.fillStyle = info.biasLabel === "BULLISH" ? "#ecfdf5" : info.biasLabel === "BEARISH" ? "#fef2f2" : "#f4f4f5";
  roundRect(ctx, W - 460, 58, biasW, 40, 20);
  ctx.fill();
  ctx.fillStyle = biasColor;
  ctx.fillText(biasLabel, W - 442, 86);

  ctx.fillStyle = "#fef2f2";
  roundRect(ctx, W - 250, 58, 190, 44, 22);
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(W - 224, 80, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "700 20px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#ef4444";
  ctx.fillText("LIVE DATA", W - 205, 88);

  let textX = 60;
  if (withIcon) {
    const icon = resolveTokenIcon(c);
    if (icon) {
      const img = await loadIcon(icon);
      if (img) {
        try {
          ctx.save();
          ctx.beginPath();
          ctx.arc(104, 214, 42, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, 62, 172, 84, 84);
          ctx.restore();
          ctx.strokeStyle = "#e4e4e7";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(104, 214, 42, 0, Math.PI * 2);
          ctx.stroke();
          textX = 168;
        } catch {
          /* skip icon if canvas taint risk */
        }
      }
    }
  }

  ctx.fillStyle = "#18181b";
  ctx.font = "800 48px Inter, system-ui, sans-serif";
  const name = c.name.length > 24 ? c.name.slice(0, 23) + "…" : c.name;
  ctx.fillText(name, textX, 228);
  const nameW = ctx.measureText(name).width;
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 28px Inter, system-ui, sans-serif";
  ctx.fillText(`$${c.symbol}`, textX + nameW + 14, 228);

  let badgeX = textX;
  if (isVerified(c)) {
    badgeX += drawBadge(ctx, badgeX, 248, "✓ VERIFIED", BLUE, "#fff");
  }
  const lifeLabel = isGraduated(c)
    ? "🔗 BONDED"
    : `⏳ BONDING ${typeof c.bondingCurve === "number" ? Math.min(c.bondingCurve, 100).toFixed(0) + "%" : ""}`;
  badgeX += drawBadge(
    ctx,
    badgeX,
    248,
    lifeLabel.trim(),
    isGraduated(c) ? "#ecfdf5" : "#fffbeb",
    isGraduated(c) ? "#059669" : "#d97706",
  );
  const ratingColor =
    info.rating === "CONSTRUCTIVE" ? "#059669" : info.rating === "NEUTRAL" ? "#d97706" : "#dc2626";
  drawBadge(
    ctx,
    badgeX,
    248,
    info.rating,
    info.rating === "CONSTRUCTIVE" ? "#ecfdf5" : info.rating === "NEUTRAL" ? "#fffbeb" : "#fef2f2",
    ratingColor,
  );

  ctx.fillStyle = "#52525b";
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  ctx.fillText(info.headline, textX, 312);

  ctx.fillStyle = "#71717a";
  ctx.font = "500 20px Inter, system-ui, sans-serif";
  const insightLines = wrapText(ctx, info.insight, 640);
  insightLines.forEach((line, i) => ctx.fillText(line, textX, 346 + i * 28));

  ctx.fillStyle = accent;
  ctx.font = "900 108px Inter, system-ui, sans-serif";
  const chg = `${up ? "▲" : "▼"} ${Math.abs(c.change24h).toFixed(1)}%`;
  ctx.fillText(chg, 60, 468);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 24px Inter, system-ui, sans-serif";
  ctx.fillText("24h move · ranked #" + info.rank + " of " + info.feedSize, 66, 508);

  const stats: [string, string][] = [
    ["PRICE", c.priceUsd ? fmtPrice(c.priceUsd) : "—"],
    ["MARKET CAP", c.mcap ? fmtUsd(c.mcap) : "—"],
    ["VOL 24H", c.volume24h ? fmtUsd(c.volume24h) : "—"],
    ["BUY FLOW", `${info.buyPressure}% buys`],
  ];
  const bw = 240;
  const bh = 108;
  const bx0 = W - 60 - bw;
  const by0 = 318;
  stats.forEach(([label, value], i) => {
    const bx = bx0 - (i % 2) * (bw + 20);
    const by = by0 + Math.floor(i / 2) * (bh + 16);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, bx, by, bw, bh, 18);
    ctx.fill();
    ctx.strokeStyle = "#e4e4e7";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "700 16px Inter, system-ui, sans-serif";
    ctx.fillText(label, bx + 22, by + 36);
    ctx.fillStyle = "#18181b";
    ctx.font = "800 32px Inter, system-ui, sans-serif";
    ctx.fillText(value, bx + 22, by + 78);
  });

  drawPulse(ctx, 60, 560, 280, BLUE, 3.5);
  ctx.fillStyle = "#71717a";
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  ctx.fillText(DOMAIN, 370, 568);
  ctx.fillStyle = "#d4d4d8";
  ctx.font = "500 18px Inter, system-ui, sans-serif";
  ctx.fillText(
    `${X_HANDLE} · Kickstart terminal · signals · founder intel · not financial advice`,
    520,
    568,
  );

  return canvasToBlob(canvas);
}

/** Render a branded share card for a token. Returns a PNG blob. */
export async function renderShareCard(c: LiveLaunch, feed: LiveLaunch[] = []): Promise<Blob | null> {
  const withIcon = await paintShareCard(c, feed, true);
  if (withIcon) return withIcon;
  return paintShareCard(c, feed, false);
}

/** X share-intent URL with pre-filled text. */
export function xShareUrl(c: LiveLaunch, feed: LiveLaunch[] = []): string {
  const info = shareInsights(c, feed);
  const up = c.change24h >= 0;
  const url = shareTokenUrl(c);

  const text = [
    `$${c.symbol} on ezpulse`,
    `${up ? "▲" : "▼"} ${Math.abs(c.change24h).toFixed(1)}% · MC ${c.mcap ? fmtUsd(c.mcap) : "—"} · ${info.buyPressure}% buy flow`,
    `Signal bias: ${info.biasLabel} (${info.biasScore}/100) · ${info.rating}`,
    isGraduated(c)
      ? "🔗 Bonded on Kickstart"
      : `⏳ Bonding${typeof c.bondingCurve === "number" ? ` ${Math.min(c.bondingCurve, 100).toFixed(0)}%` : ""}`,
    "",
    info.headline,
    "",
    "Live market + signals for @easya_app Kickstart tokens ↓",
  ].join("\n");

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export async function copyCardToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export function downloadCard(blob: Blob, symbol: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ezpulse-${symbol}-${new Date().toISOString().slice(0, 10)}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}