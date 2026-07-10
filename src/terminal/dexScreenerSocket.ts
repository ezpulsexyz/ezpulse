import type { LiveLaunch } from "./kickstart";
import { decodePairSocketMessage } from "./dexScreenerBinary";

/**
 * DexScreener WebSocket real-time price feed.
 * Subscribes per token CA (resolved to best-liquidity pair via DexScreener REST).
 */

const WS_URL = "wss://io.dexscreener.com/dex/socket/pair";
const PAIR_RESOLVE_TTL_MS = 10 * 60_000;

export type PriceSocketStatus = "idle" | "connecting" | "connected" | "reconnecting";

export type PriceUpdate = Partial<LiveLaunch> & { ca: string };

type PairMeta = { chainId: string; pairAddress: string; resolvedAt: number };
type Listener = (update: PriceUpdate) => void;

let socket: WebSocket | null = null;
let status: PriceSocketStatus = "idle";
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

/** token CA (lowercase) → listeners */
const listenersByCa = new Map<string, Set<Listener>>();
/** token CA (lowercase) → Dex pair id used for subscribe */
const subscribedByCa = new Map<string, string>();
/** pair id → token CA */
const caByPairId = new Map<string, string>();
/** token CA → cached pair metadata */
const pairMetaCache = new Map<string, PairMeta>();

const statusListeners = new Set<(s: PriceSocketStatus) => void>();

function setStatus(next: PriceSocketStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((cb) => cb(next));
}

export function onPriceSocketStatus(cb: (status: PriceSocketStatus) => void): () => void {
  statusListeners.add(cb);
  cb(status);
  return () => statusListeners.delete(cb);
}

export function getPriceSocketStatus(): PriceSocketStatus {
  return status;
}

async function resolvePairForCa(ca: string): Promise<PairMeta | null> {
  const key = ca.toLowerCase();
  const cached = pairMetaCache.get(key);
  if (cached && Date.now() - cached.resolvedAt < PAIR_RESOLVE_TTL_MS) return cached;

  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(ca)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return cached ?? null;

    const data = (await res.json()) as { pairs?: Array<{ chainId?: string; pairAddress?: string; liquidity?: { usd?: number } }> };
    const pairs = Array.isArray(data.pairs) ? data.pairs : [];
    if (!pairs.length) return cached ?? null;

    const best = pairs.reduce((a, b) => {
      const la = Number(a.liquidity?.usd) || 0;
      const lb = Number(b.liquidity?.usd) || 0;
      return lb > la ? b : a;
    });

    if (!best.chainId || !best.pairAddress) return cached ?? null;

    const meta: PairMeta = {
      chainId: best.chainId,
      pairAddress: best.pairAddress,
      resolvedAt: Date.now(),
    };
    pairMetaCache.set(key, meta);
    return meta;
  } catch {
    return cached ?? null;
  }
}

function pairIdFromMeta(meta: PairMeta): string {
  return `${meta.chainId}:${meta.pairAddress}`;
}

function sendSubscribe(pairId: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: "subscribe", pairId }));
}

function sendUnsubscribe(pairId: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: "unsubscribe", pairId }));
}

function dispatchUpdate(ca: string, update: PriceUpdate) {
  const set = listenersByCa.get(ca.toLowerCase());
  if (!set?.size) return;
  set.forEach((cb) => cb(update));
}

function resolveCaFromDecoded(decoded: { ca?: string; pairAddress?: string; chainId?: string }): string | null {
  if (decoded.pairAddress) {
    for (const [pairId, ca] of caByPairId) {
      if (pairId.endsWith(decoded.pairAddress)) return ca;
    }
    const chain = decoded.chainId ?? "solana";
    const mapped = caByPairId.get(`${chain}:${decoded.pairAddress}`);
    if (mapped) return mapped;
  }

  if (decoded.ca) {
    const key = decoded.ca.toLowerCase();
    if (listenersByCa.has(key)) return key;
  }

  return null;
}

function handleSocketMessage(event: MessageEvent) {
  const decoded = decodePairSocketMessage(event.data);
  if (!decoded?.priceUsd) return;

  const ca = resolveCaFromDecoded(decoded);
  if (!ca) return;

  const update: PriceUpdate = {
    ca,
    priceUsd: decoded.priceUsd,
    change24h: decoded.change24h,
    change1h: decoded.change1h,
    volume24h: decoded.volume24h,
    liquidity: decoded.liquidity,
  };

  dispatchUpdate(ca, update);
}

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  setStatus(status === "reconnecting" ? "reconnecting" : "connecting");

  try {
    socket = new WebSocket(WS_URL);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      setStatus("connected");
      subscribedByCa.forEach((pairId) => sendSubscribe(pairId));
    };

    socket.onmessage = handleSocketMessage;

    socket.onclose = () => {
      setStatus("reconnecting");
      scheduleReconnect();
    };

    socket.onerror = () => {
      socket?.close();
    };
  } catch {
    setStatus("reconnecting");
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(connect, 3000);
}

async function ensureSubscribed(ca: string) {
  const key = ca.toLowerCase();
  if (subscribedByCa.has(key)) return;

  const meta = await resolvePairForCa(ca);
  if (!meta) return;

  const pairId = pairIdFromMeta(meta);
  subscribedByCa.set(key, pairId);
  caByPairId.set(pairId, key);

  if (socket?.readyState === WebSocket.OPEN) {
    sendSubscribe(pairId);
  }
}

function releaseSubscription(ca: string) {
  const key = ca.toLowerCase();
  const pairId = subscribedByCa.get(key);
  if (!pairId) return;

  subscribedByCa.delete(key);
  caByPairId.delete(pairId);
  sendUnsubscribe(pairId);
}

/** Subscribe to real-time updates for a token contract address. */
export function subscribeToPair(ca: string, callback: (update: PriceUpdate) => void): () => void {
  const key = ca.toLowerCase();
  let set = listenersByCa.get(key);
  if (!set) {
    set = new Set();
    listenersByCa.set(key, set);
    void ensureSubscribed(ca);
  }
  set.add(callback);

  initDexScreenerSocket();

  return () => {
    const bucket = listenersByCa.get(key);
    if (!bucket) return;
    bucket.delete(callback);
    if (bucket.size === 0) {
      listenersByCa.delete(key);
      releaseSubscription(ca);
    }
  };
}

/** Unsubscribe all listeners for a token (legacy helper). */
export function unsubscribeFromPair(ca: string) {
  const key = ca.toLowerCase();
  listenersByCa.delete(key);
  releaseSubscription(ca);
}

/** Initialize the DexScreener WebSocket connection. */
export function initDexScreenerSocket() {
  if (!socket) connect();
}

/** Clean up the WebSocket connection. */
export function closeDexScreenerSocket() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = null;
  if (socket) {
    socket.close();
    socket = null;
  }
  setStatus("idle");
  subscribedByCa.clear();
  caByPairId.clear();
  listenersByCa.clear();
  statusListeners.clear();
}