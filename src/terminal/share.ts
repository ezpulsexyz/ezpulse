/**
 * ezpulse share cards — branded PNG generated client-side on <canvas>.
 * Every screenshot shared in the Kickstart Telegram / X becomes an ad.
 */
import { BLUE, X_HANDLE } from "./brand";
import type { LiveLaunch } from "./kickstart";
import { isVerified, isGraduated, resolveTokenIcon } from "./kickstart";

const W = 1200, H = 630;

const fmtUsd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
const fmtPrice = (p: number) => (p >= 1 ? `$${p.toFixed(2)}` : `$${p.toFixed(6)}`);

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

async function loadIcon(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // required to keep canvas exportable
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 4000);
    img.src = url;
  });
}

/** Render a branded share card for a token. Returns a PNG blob. */
export async function renderShareCard(c: LiveLaunch): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const up = c.change24h >= 0;
  const accent = up ? "#10b981" : "#ef4444";

  // background
  ctx.fillStyle = "#fbfbfd";
  ctx.fillRect(0, 0, W, H);
  // subtle dot grid
  ctx.fillStyle = "#ececf1";
  for (let gx = 40; gx < W; gx += 36) for (let gy = 40; gy < H; gy += 36) ctx.fillRect(gx, gy, 2, 2);

  // header: logo mark + wordmark
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
  // live pill
  ctx.fillStyle = "#fef2f2";
  roundRect(ctx, W - 250, 58, 190, 44, 22);
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(W - 224, 80, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "700 20px Inter, system-ui, sans-serif";
  ctx.fillText("LIVE DATA", W - 205, 88);

  // token icon (best-effort; CORS-safe or skipped)
  let textX = 60;
  const icon = resolveTokenIcon(c);
  if (icon) {
    const img = await loadIcon(icon);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(104, 220, 44, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 60, 176, 88, 88);
      ctx.restore();
      ctx.strokeStyle = "#e4e4e7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(104, 220, 44, 0, Math.PI * 2);
      ctx.stroke();
      textX = 172;
    }
  }

  // name + symbol + badges
  ctx.fillStyle = "#18181b";
  ctx.font = "800 52px Inter, system-ui, sans-serif";
  const name = c.name.length > 22 ? c.name.slice(0, 21) + "…" : c.name;
  ctx.fillText(name, textX, 238);
  const nameW = ctx.measureText(name).width;
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 30px Inter, system-ui, sans-serif";
  ctx.fillText(`$${c.symbol}`, textX + nameW + 18, 238);

  let badgeX = textX;
  if (isVerified(c)) {
    ctx.fillStyle = BLUE;
    roundRect(ctx, badgeX, 262, 150, 38, 19);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 19px Inter, system-ui, sans-serif";
    ctx.fillText("✓ VERIFIED", badgeX + 20, 288);
    badgeX += 166;
  }
  const lifeLabel = isGraduated(c) ? "🔗 BONDED" : `⏳ BONDING ${typeof c.bondingCurve === "number" ? Math.min(c.bondingCurve, 100).toFixed(0) + "%" : ""}`;
  ctx.fillStyle = isGraduated(c) ? "#ecfdf5" : "#fffbeb";
  roundRect(ctx, badgeX, 262, ctx.measureText(lifeLabel).width + 140, 38, 19);
  ctx.fill();
  ctx.fillStyle = isGraduated(c) ? "#059669" : "#d97706";
  ctx.font = "700 19px Inter, system-ui, sans-serif";
  ctx.fillText(lifeLabel, badgeX + 20, 288);

  // big 24h change
  ctx.fillStyle = accent;
  ctx.font = "900 120px Inter, system-ui, sans-serif";
  const chg = `${up ? "▲" : "▼"} ${Math.abs(c.change24h).toFixed(1)}%`;
  ctx.fillText(chg, 60, 448);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  ctx.fillText("last 24 hours", 66, 490);

  // stat boxes
  const stats: [string, string][] = [
    ["PRICE", c.priceUsd ? fmtPrice(c.priceUsd) : "—"],
    ["MARKET CAP", c.mcap ? fmtUsd(c.mcap) : "—"],
    ["VOL 24H", c.volume24h ? fmtUsd(c.volume24h) : "—"],
    ["HOLDERS", c.holderCount ? String(c.holderCount) : "—"],
  ];
  const bw = 240, bh = 110, bx0 = W - 60 - bw, by0 = 330;
  stats.forEach(([label, value], i) => {
    const bx = bx0 - (i % 2) * (bw + 20);
    const by = by0 + Math.floor(i / 2) * (bh + 18);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, bx, by, bw, bh, 18);
    ctx.fill();
    ctx.strokeStyle = "#e4e4e7";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "700 17px Inter, system-ui, sans-serif";
    ctx.fillText(label, bx + 24, by + 38);
    ctx.fillStyle = "#18181b";
    ctx.font = "800 34px Inter, system-ui, sans-serif";
    ctx.fillText(value, bx + 24, by + 82);
  });

  // footer: pulse divider + attribution
  drawPulse(ctx, 60, 560, 300, BLUE, 3.5);
  ctx.fillStyle = "#71717a";
  ctx.font = "600 24px Inter, system-ui, sans-serif";
  ctx.fillText("ezpulse.xyz", 390, 568);
  ctx.fillStyle = "#d4d4d8";
  ctx.font = "500 20px Inter, system-ui, sans-serif";
  ctx.fillText(`${X_HANDLE} · live Kickstart market data · not financial advice`, 540, 568);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** X share-intent URL with pre-filled text. */
export function xShareUrl(c: LiveLaunch): string {
  const up = c.change24h >= 0;
  const text = [
    `$${c.symbol} ${up ? "▲" : "▼"} ${Math.abs(c.change24h).toFixed(1)}% in 24h`,
    c.mcap ? `MC ${fmtUsd(c.mcap)}` : "",
    isGraduated(c) ? "🔗 bonded" : `⏳ bonding${typeof c.bondingCurve === "number" ? ` ${Math.min(c.bondingCurve, 100).toFixed(0)}%` : ""}`,
    ``,
    `Live on ezpulse.xyz — the terminal for @easya_app Kickstart tokens`,
  ].filter(Boolean).join("\n");
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://ezpulse.xyz")}`;
}

/** Copy a PNG blob to the clipboard (falls back to false if unsupported). */
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
