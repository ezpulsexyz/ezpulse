import bs58 from "bs58";
import nacl from "tweetnacl";
import { appBase } from "../routes";
import type { WalletId } from "./wallets";

function appRefUrl(): string {
  const base = appBase();
  return `${window.location.origin}${base || ""}`;
}

const PENDING_KEY = "ezpulse:wallet-connect-pending";

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

interface PendingConnect {
  walletId: WalletId;
  secretKey: number[];
}

export interface MobileConnectResult {
  address: string;
  provider: WalletId;
  session?: string;
}

function decryptPayload(data: string, nonce: string, sharedSecret: Uint8Array): { public_key: string; session?: string } {
  const decrypted = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), sharedSecret);
  if (!decrypted) throw new Error("Unable to decrypt wallet connect payload");
  return JSON.parse(new TextDecoder().decode(decrypted)) as { public_key: string; session?: string };
}

function buildRedirectLink(walletId: WalletId): string {
  const url = new URL(window.location.href);
  for (const key of [
    CALLBACK_PARAM,
    "phantom_encryption_public_key",
    "solflare_encryption_public_key",
    "wallet_encryption_public_key",
    "nonce",
    "data",
    "errorCode",
    "errorMessage",
  ]) {
    url.searchParams.delete(key);
  }
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
  const pending: PendingConnect = {
    walletId: id,
    secretKey: Array.from(keyPair.secretKey),
  };
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* continue — callback may fail without pending state */
  }

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
  const keys = [
    CALLBACK_PARAM,
    "phantom_encryption_public_key",
    "solflare_encryption_public_key",
    "wallet_encryption_public_key",
    "nonce",
    "data",
    "errorCode",
    "errorMessage",
  ];
  let changed = false;
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

export function parseMobileWalletCallback(): MobileConnectResult | { error: string } | null {
  const url = new URL(window.location.href);
  const walletId = url.searchParams.get(CALLBACK_PARAM) as WalletId | null;
  if (!walletId || !CONNECT_BASE[walletId]) return null;

  const errorCode = url.searchParams.get("errorCode");
  if (errorCode) {
    const errorMessage = url.searchParams.get("errorMessage") ?? errorCode;
    stripWalletCallbackParams();
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* noop */ }
    return { error: errorMessage };
  }

  const encKeyName = WALLET_ENC_KEY[walletId];
  const walletEncPubKey = encKeyName ? url.searchParams.get(encKeyName) : null;
  const nonce = url.searchParams.get("nonce");
  const data = url.searchParams.get("data");
  if (!walletEncPubKey || !nonce || !data) return null;

  let pending: PendingConnect | null = null;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (raw) pending = JSON.parse(raw) as PendingConnect;
  } catch {
    pending = null;
  }
  if (!pending || pending.walletId !== walletId) return null;

  try {
    const sharedSecret = nacl.box.before(
      bs58.decode(walletEncPubKey),
      new Uint8Array(pending.secretKey),
    );
    const payload = decryptPayload(data, nonce, sharedSecret);
    if (!payload.public_key) throw new Error("Missing public key in wallet response");

    if (payload.session) {
      try {
        sessionStorage.setItem(`ezpulse:wallet-deeplink-session:${walletId}`, payload.session);
      } catch { /* noop */ }
    }

    stripWalletCallbackParams();
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* noop */ }

    return { address: payload.public_key, provider: walletId, session: payload.session };
  } catch {
    stripWalletCallbackParams();
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* noop */ }
    return { error: "Could not complete wallet connection — try again." };
  }
}