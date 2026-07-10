import type { LiveLaunch } from "./kickstart";

/**
 * DexScreener WebSocket real-time price feed.
 * Provides live pair updates (price, volume, txns, liquidity) for Solana tokens.
 */

const WS_URL = "wss://io.dexscreener.com/dex/socket/pair";

let socket: WebSocket | null = null;
let isConnected = false;
let reconnectTimeout: NodeJS.Timeout | null = null;
let subscribedPairs = new Set<string>();

const listeners = new Set<(update: Partial<LiveLaunch> & { ca: string }) => void>();

/** Subscribe to real-time updates for a specific token CA */
export function subscribeToPair(ca: string, callback: (update: Partial<LiveLaunch> & { ca: string }) => void) {
  listeners.add(callback);
  if (isConnected && socket) {
    socket.send(JSON.stringify({ type: "subscribe", pairId: ca }));
    subscribedPairs.add(ca);
  }
  return () => {
    listeners.delete(callback);
  };
}

/** Unsubscribe from a pair */
export function unsubscribeFromPair(ca: string) {
  subscribedPairs.delete(ca);
  if (socket && isConnected) {
    socket.send(JSON.stringify({ type: "unsubscribe", pairId: ca }));
  }
}

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      isConnected = true;
      console.log("[DexScreener WS] Connected");

      // Re-subscribe to all pairs we care about
      subscribedPairs.forEach((ca) => {
        socket?.send(JSON.stringify({ type: "subscribe", pairId: ca }));
      });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // DexScreener sends pair updates in this shape
        if (data.type === "pair" && data.pair?.baseToken?.address) {
          const pair = data.pair;
          const ca = pair.baseToken.address;

          const update: Partial<LiveLaunch> & { ca: string } = {
            ca,
            priceUsd: Number(pair.priceUsd) || undefined,
            change24h: Number(pair.priceChange?.h24) || undefined,
            change1h: Number(pair.priceChange?.h1) || undefined,
            volume24h: Number(pair.volume?.h24) || undefined,
            volume1h: Number(pair.volume?.h1) || undefined,
            liquidity: Number(pair.liquidity?.usd) || undefined,
            buys24h: Number(pair.txns?.h24?.buys) || undefined,
            sells24h: Number(pair.txns?.h24?.sells) || undefined,
          };

          listeners.forEach((cb) => cb(update));
        }
      } catch (err) {
        // Ignore malformed messages
      }
    };

    socket.onclose = () => {
      isConnected = false;
      console.log("[DexScreener WS] Disconnected - reconnecting...");
      scheduleReconnect();
    };

    socket.onerror = (err) => {
      console.warn("[DexScreener WS] Error:", err);
      socket?.close();
    };
  } catch (err) {
    console.error("Failed to connect to DexScreener WebSocket:", err);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    connect();
  }, 3000);
}

/** Initialize the DexScreener WebSocket connection */
export function initDexScreenerSocket() {
  if (!socket) {
    connect();
  }
}

/** Clean up the WebSocket connection */
export function closeDexScreenerSocket() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  if (socket) {
    socket.close();
    socket = null;
  }
  isConnected = false;
  subscribedPairs.clear();
  listeners.clear();
}
