/**
 * DexScreener pair-socket binary message decoder.
 * Messages use length-prefixed strings + IEEE-754 doubles (little-endian).
 */

export interface DecodedPairUpdate {
  ca: string;
  pairAddress?: string;
  chainId?: string;
  dexId?: string;
  symbol?: string;
  name?: string;
  priceUsd?: number;
  change24h?: number;
  change1h?: number;
  volume24h?: number;
  liquidity?: number;
}

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function readByteString(data: Uint8Array, pos: number): [string, number] | null {
  if (pos >= data.length) return null;

  // Long address marker: 0x00 'X' + base58 address
  if (data[pos] === 0 && pos + 2 < data.length && data[pos + 1] === 0x58) {
    pos += 2;
    let end = pos;
    while (end < data.length && data[end] >= 0x30 && data[end] <= 0x7a) end++;
    const value = new TextDecoder().decode(data.slice(pos, end));
    return value ? [value, end] : null;
  }

  const len = data[pos];
  pos += 1;
  if (len === 0 || pos + len > data.length) return null;
  const value = new TextDecoder().decode(data.slice(pos, pos + len));
  return [value, pos + len];
}

function readDouble(data: Uint8Array, pos: number): [number, number] | null {
  const aligned = (pos + 7) & ~7;
  if (aligned + 8 > data.length) return null;
  const view = new DataView(data.buffer, data.byteOffset + aligned, 8);
  const value = view.getFloat64(0, true);
  if (!Number.isFinite(value)) return null;
  return [value, aligned + 8];
}

function extractDecimals(text: string): number[] {
  const out: number[] = [];
  const re = /\d+\.\d+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const n = Number(match[0]);
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) out.push(n);
  }
  return out;
}

function parseStructuredPair(data: Uint8Array): DecodedPairUpdate | null {
  const pairIdx = findSequence(data, [0x70, 0x61, 0x69, 0x72]); // "pair"
  const start = pairIdx >= 0 ? pairIdx + 4 : 0;
  let pos = start;

  // Skip optional framing byte after "pair"
  if (pos < data.length && data[pos] <= 0x08) pos += 1;

  const fields: string[] = [];
  for (let i = 0; i < 8 && pos < data.length; i++) {
    const next = readByteString(data, pos);
    if (!next) break;
    const [value, nextPos] = next;
    if (value.length >= 2) fields.push(value);
    pos = nextPos;
  }

  if (fields.length < 3) return null;

  const chainId = fields[0];
  const dexId = fields[1];
  const pairAddress = fields[2];
  const name = fields[3];
  const symbol = fields[4];
  let tokenAddress = fields.find((f) => BASE58_RE.test(f) && f !== pairAddress);

  pos = (pos + 7) & ~7;
  const metrics: number[] = [];
  for (let i = 0; i < 12 && pos + 8 <= data.length; i++) {
    const next = readDouble(data, pos);
    if (!next) break;
    const [value, nextPos] = next;
    if (Math.abs(value) > 0 && Math.abs(value) < 1e12) metrics.push(value);
    pos = nextPos;
  }

  const printable = Array.from(data, (b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : " ")).join("");
  const decimals = extractDecimals(printable);

  let priceUsd: number | undefined;
  for (const m of metrics) {
    if (m > 0 && m < 1_000_000) {
      priceUsd = m;
      break;
    }
  }
  if (!priceUsd) {
    priceUsd = decimals.find((d) => d > 0 && d < 1_000_000);
  }

  if (!tokenAddress) {
    const words = printable.split(/\s+/).filter((w) => BASE58_RE.test(w));
    tokenAddress = words.find((w) => w !== pairAddress);
  }

  if (!tokenAddress && !priceUsd) return null;

  return {
    ca: tokenAddress ?? pairAddress,
    pairAddress,
    chainId,
    dexId,
    name,
    symbol,
    priceUsd,
    change24h: metrics.find((m) => Math.abs(m) <= 500 && m !== priceUsd),
    volume24h: metrics.find((m) => m >= 100 && m < 1e10),
    liquidity: metrics.find((m) => m >= 1_000 && m < 1e9),
  };
}

function findSequence(data: Uint8Array, seq: number[]): number {
  outer: for (let i = 0; i <= data.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (data[i + j] !== seq[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function parseJsonPair(raw: string): DecodedPairUpdate | null {
  try {
    const data = JSON.parse(raw) as {
      type?: string;
      pair?: {
        chainId?: string;
        dexId?: string;
        pairAddress?: string;
        priceUsd?: string | number;
        priceChange?: { h24?: number; h1?: number };
        volume?: { h24?: number };
        liquidity?: { usd?: number };
        baseToken?: { address?: string; symbol?: string; name?: string };
      };
    };

    const pair = data.pair;
    if (!pair?.baseToken?.address) return null;

    const priceUsd = Number(pair.priceUsd);
    return {
      ca: pair.baseToken.address,
      pairAddress: pair.pairAddress,
      chainId: pair.chainId,
      dexId: pair.dexId,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      priceUsd: Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : undefined,
      change24h: Number(pair.priceChange?.h24) || undefined,
      change1h: Number(pair.priceChange?.h1) || undefined,
      volume24h: Number(pair.volume?.h24) || undefined,
      liquidity: Number(pair.liquidity?.usd) || undefined,
    };
  } catch {
    return null;
  }
}

function pickPriceUsd(decimals: number[]): number | undefined {
  const candidates = decimals.filter((d) => d > 0 && d < 1_000_000);
  if (!candidates.length) return undefined;
  const underOne = candidates.filter((d) => d < 1);
  if (underOne.length >= 2) return Math.max(...underOne);
  if (underOne.length === 1) return underOne[0];
  return candidates[0];
}

function extractPairAddress(data: Uint8Array): string | undefined {
  for (let i = 0; i < data.length - 2; i++) {
    if (data[i] === 0 && data[i + 1] === 0x58) {
      let end = i + 2;
      while (end < data.length) {
        const c = data[end];
        if (!((c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a))) break;
        end++;
      }
      const addr = new TextDecoder().decode(data.slice(i + 2, end));
      if (BASE58_RE.test(addr)) return addr;
    }
  }
  return undefined;
}

function parseTextFallback(data: Uint8Array): DecodedPairUpdate | null {
  const printable = Array.from(data, (b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : " ")).join("");
  if (!printable.includes("solana") && !printable.includes("pair")) return null;

  const pairAddress = extractPairAddress(data);
  const addresses = printable.split(/\s+/).filter((w) => BASE58_RE.test(w));
  const decimals = extractDecimals(printable);
  const priceUsd = pickPriceUsd(decimals);
  if (!priceUsd) return null;

  const tokenAddress = addresses.find((a) => a !== pairAddress && a !== "So11111111111111111111111111111111111111112");

  return {
    ca: tokenAddress ?? pairAddress ?? addresses[0] ?? "",
    pairAddress: pairAddress ?? addresses[0],
    priceUsd,
  };
}

/** Decode a DexScreener pair-socket frame (JSON or binary). */
export function decodePairSocketMessage(payload: string | ArrayBuffer | Blob): DecodedPairUpdate | null {
  if (payload instanceof Blob) return null;

  if (typeof payload === "string") {
    return parseJsonPair(payload);
  }

  const data = payload instanceof ArrayBuffer ? new Uint8Array(payload) : payload;
  if (!data.byteLength) return null;

  // JSON payloads occasionally arrive as UTF-8 text
  if (data[0] === 0x7b /* { */) {
    const json = new TextDecoder().decode(data);
    const parsed = parseJsonPair(json);
    if (parsed) return parsed;
  }

  return parseTextFallback(data) ?? parseStructuredPair(data);
}