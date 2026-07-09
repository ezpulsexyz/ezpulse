import bs58 from "bs58";
import nacl from "tweetnacl";
import { appBase } from "../routes";
import { applyWalletSession } from "./wallets";
import type { WalletId } from "./wallets";

function appRefUrl(): string {
  const base = appBase();
  return `${window.location.origin}${base || ""}`;
}

const PENDING_KEY = "ezpulse:wallet-connect-pending";
const PENDING_TTL_MS = 15 * 60 * 1000;
const SIGNIN_PENDING_KEY = "ezpulse:wallet-signin-pending";

const CONNECT_BASE: Partial<Record<WalletId, string>> = {
  phantom: "https://phantom.app/ul/v1/connect",
  solflare: "https://solflare.com/ul/v1/connect",
  backpack: "https://backpack.app/ul/v1/connect",
};

const WALLET_ENC_KEY: Partial<Record<WalletId, string>> = {
  phantom: "phantom_encryption_public_key",
  solflare: "solflare_encryption_public_key",
  backpack: "wallet_encryption_public_key",
};

const CALLBACK_PARAM = "walletConnect";

const CALLBACK_QUERY_KEYS = [
  CALLBACK_PARAM,
  "phantom_encryption_public_key",
  "solflare_encryption_public_key",
  "wallet_encryption_public_key",
  "nonce",
  "data",
  "errorCode",
  "errorMessage",
] as const;

interface PendingConnect {
  walletId: WalletId;
  secretKey: number[];
  createdAt: number;
}

export interface MobileConnectResult {
  address: string;
  provider: WalletId;
  session?: string;
}

function readPending(): PendingConnect | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as PendingConnect;
    if (!pending?.walletId || !Array.isArray(pending.secretKey)) return null;
    if (Date.now() - (pending.createdAt ?? 0) > PENDING_TTL_MS) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

function writePending(pending: PendingConnect): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* noop */
  }
}

function clearPending(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* noop */
  }
}

function decryptPayload(data: string, nonce: string, sharedSecret: Uint8Array): { public_key: string; session?: string } {
  const decrypted = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), sharedSecret);
  if (!decrypted) throw new Error("Unable to decrypt wallet connect payload");
  return JSON.parse(new TextDecoder().decode(decrypted)) as { public_key: string; session?: string };
}

/** Read wallet callback params from search and hash (some wallets append to either). */
export function getWalletCallbackParams(): URLSearchParams {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  const rawHash = url.hash.replace(/^#/, "");
  if (!rawHash || !rawHash.includes("=")) return params;

  const hashBody = rawHash.startsWith("?") ? rawHash.slice(1) : rawHash;
  const hashParams = new URLSearchParams(hashBody);
  for (const [key, value] of hashParams.entries()) {
    if (!params.has(key)) params.set(key, value);
  }
  return params;
}

export function hasWalletCallbackInUrl(): boolean {
  const params = getWalletCallbackParams();
  if (params.get("errorCode")) return true;
  if (inferWalletIdFromParams(params) && params.get("nonce") && params.get("data")) return true;
  return false;
}

function inferWalletIdFromParams(params: URLSearchParams): WalletId | null {
  const explicit = params.get(CALLBACK_PARAM) as WalletId | null;
  if (explicit && CONNECT_BASE[explicit]) return explicit;
  if (params.has("phantom_encryption_public_key")) return "phantom";
  if (params.has("solflare_encryption_public_key")) return "solflare";
  if (params.has("wallet_encryption_public_key")) return "backpack";
  return null;
}

function buildRedirectLink(walletId: WalletId): string {
  const url = new URL(window.location.href);
  url.hash = "";
  for (const key of CALLBACK_QUERY_KEYS) url.searchParams.delete(key);
  url.searchParams.set(CALLBACK_PARAM, walletId);
  return url.toString();
}

export function supportsMobileConnect(id: WalletId): boolean {
  return !!CONNECT_BASE[id];
}

/** Open the native wallet app to approve a read-only connection, then return to this page in mobile web. */
export function startMobileWalletConnect(id: WalletId): void {
  const base = CONNECT_BASE[id];
  if (!base) throw new Error(`Mobile connect not supported for ${id}`);

  const keyPair = nacl.box.keyPair();
  writePending({
    walletId: id,
    secretKey: Array.from(keyPair.secretKey),
    createdAt: Date.now(),
  });

  const params = new URLSearchParams({
    dapp_encryption_public_key: bs58.encode(keyPair.publicKey),
    cluster: "mainnet-beta",
    app_url: appRefUrl(),
    redirect_link: buildRedirectLink(id),
  });

  window.location.assign(`${base}?${params.toString()}`);
}

export function stripWalletCallbackParams(): void {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of CALLBACK_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (url.hash && url.hash.includes("=")) {
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, "").replace(/^\?/, ""));
    let hashChanged = false;
    for (const key of CALLBACK_QUERY_KEYS) {
      if (hashParams.has(key)) {
        hashParams.delete(key);
        hashChanged = true;
      }
    }
    if (hashChanged) {
      const nextHash = hashParams.toString();
      url.hash = nextHash ? `#${nextHash}` : "";
      changed = true;
    }
  }
  if (!changed) return;
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

/** Address saved by callback — terminal should finish watchlist/portfolio sync. */
export function consumePendingWalletSignIn(): string | null {
  try {
    const addr = localStorage.getItem(SIGNIN_PENDING_KEY);
    if (addr) localStorage.removeItem(SIGNIN_PENDING_KEY);
    return addr;
  } catch {
    return null;
  }
}

let callbackHandled = false;

/**
 * Parse wallet-app redirect, persist session, and clean the URL.
 * Safe to call synchronously on page load (before React routing).
 */
export function processMobileWalletCallback(): MobileConnectResult | { error: string } | null {
  if (callbackHandled) return null;

  const params = getWalletCallbackParams();
  const walletId = inferWalletIdFromParams(params);
  if (!walletId) return null;

  const hasPayload = !!(params.get("nonce") && params.get("data"));
  const hasError = !!params.get("errorCode");
  if (!hasPayload && !hasError) return null;

  callbackHandled = true;

  if (hasError) {
    const errorMessage = params.get("errorMessage") ?? params.get("errorCode") ?? "Connection declined";
    stripWalletCallbackParams();
    clearPending();
    return { error: errorMessage };
  }

  const encKeyName = WALLET_ENC_KEY[walletId];
  const walletEncPubKey = encKeyName ? params.get(encKeyName) : null;
  const nonce = params.get("nonce");
  const data = params.get("data");
  if (!walletEncPubKey || !nonce || !data) {
    callbackHandled = false;
    return { error: "Incomplete wallet response — try connecting again." };
  }

  const pending = readPending();
  if (!pending || pending.walletId !== walletId) {
    stripWalletCallbackParams();
    return {
      error: "Wallet session expired — tap Connect wallet and try again (keep the same browser tab).",
    };
  }

  try {
    const sharedSecret = nacl.box.before(
      bs58.decode(walletEncPubKey),
      new Uint8Array(pending.secretKey),
    );
    const payload = decryptPayload(data, nonce, sharedSecret);
    if (!payload.public_key) throw new Error("Missing public key in wallet response");

    if (payload.session) {
      try {
        localStorage.setItem(`ezpulse:wallet-deeplink-session:${walletId}`, payload.session);
      } catch { /* noop */ }
    }

    applyWalletSession(payload.public_key, walletId);
    try {
      localStorage.setItem(SIGNIN_PENDING_KEY, payload.public_key);
    } catch { /* noop */ }

    stripWalletCallbackParams();
    clearPending();

    return { address: payload.public_key, provider: walletId, session: payload.session };
  } catch (err) {
    console.error("Wallet callback decrypt failed:", err);
    stripWalletCallbackParams();
    clearPending();
    return { error: "Could not complete wallet connection — try again." };
  }
}

/** @deprecated Use processMobileWalletCallback */
export function parseMobileWalletCallback(): MobileConnectResult | { error: string } | null {
  return processMobileWalletCallback();
}