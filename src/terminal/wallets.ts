import { appBase } from "../routes";
import { startMobileWalletConnect, supportsMobileConnect } from "./mobileWalletConnect";

export type WalletId = "phantom" | "solflare" | "backpack" | "jupiter";

export interface WalletOption {
  id: WalletId;
  name: string;
  /** Filename under `/wallets/` (resolved via `walletLogoUrl`). */
  logo: string;
  installUrl: string;
  /** Jupiter mobile — opens in-app browser (no connect deeplink yet). */
  mobileBrowseUrl?: (pageUrl: string, refUrl: string) => string;
}

type SessionListener = (session: { address: string | null; provider: WalletId | null }) => void;
const sessionListeners = new Set<SessionListener>();

export function subscribeWalletSession(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function notifyWalletSession(session: { address: string | null; provider: WalletId | null }) {
  sessionListeners.forEach((fn) => fn(session));
}

export function applyWalletSession(address: string, provider: WalletId): void {
  saveWalletSession(address, provider);
  notifyWalletSession({ address, provider });
}

interface SolanaInjected {
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  publicKey?: { toString(): string } | null;
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  isJupiter?: boolean;
}

const STORAGE_ADDRESS = "ezpulse:wallet";
const STORAGE_PROVIDER = "ezpulse:wallet-provider";
const LEGACY_STORAGE = "ezpulse:phantom";

export const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "phantom",
    name: "Phantom",
    logo: "phantom.svg",
    installUrl: "https://phantom.com/download",
  },
  {
    id: "solflare",
    name: "Solflare",
    logo: "solflare.svg",
    installUrl: "https://solflare.com/download",
  },
  {
    id: "backpack",
    name: "Backpack",
    logo: "backpack.png",
    installUrl: "https://backpack.app/download",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    logo: "jupiter.svg",
    installUrl: "https://chromewebstore.google.com/detail/jupiter-wallet/iledlaeogohbilgbfhmbgkgmpplbfboh",
    mobileBrowseUrl: (pageUrl, refUrl) =>
      `https://jup.ag/wallet?browse=${encodeURIComponent(pageUrl)}&ref=${encodeURIComponent(refUrl)}`,
  },
];

function walletWindow(): Window & {
  solana?: SolanaInjected;
  solflare?: SolanaInjected;
  backpack?: { solana?: SolanaInjected };
  jupiter?: { solana?: SolanaInjected };
} {
  return window;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.maxTouchPoints > 1 && window.innerWidth < 1024;
}

export function getWalletOption(id: WalletId): WalletOption {
  return WALLET_OPTIONS.find((w) => w.id === id) ?? WALLET_OPTIONS[0];
}

export function walletLogoUrl(filename: string): string {
  const base = appBase();
  return `${base}/wallets/${filename}`;
}

export function getWalletProvider(id: WalletId): SolanaInjected | null {
  const w = walletWindow();
  switch (id) {
    case "phantom":
      return w.solana?.isPhantom ? w.solana : null;
    case "solflare":
      if (w.solflare?.isSolflare) return w.solflare;
      return w.solana?.isSolflare ? w.solana : null;
    case "backpack":
      return w.backpack?.solana?.connect ? w.backpack.solana : null;
    case "jupiter":
      if (w.jupiter?.solana?.connect) return w.jupiter.solana;
      if (w.solana?.isJupiter) return w.solana;
      return null;
    default:
      return null;
  }
}

export function isWalletDetected(id: WalletId): boolean {
  return !!getWalletProvider(id);
}

export function anyWalletDetected(): boolean {
  return WALLET_OPTIONS.some((w) => isWalletDetected(w.id));
}

/** @deprecated Use `isWalletDetected("phantom")` */
export function isPhantomAvailable(): boolean {
  return isWalletDetected("phantom");
}

export function readWalletSession(): { address: string | null; provider: WalletId | null } {
  try {
    const address = localStorage.getItem(STORAGE_ADDRESS) ?? localStorage.getItem(LEGACY_STORAGE);
    const rawProvider = localStorage.getItem(STORAGE_PROVIDER) as WalletId | null;
    const provider = rawProvider && WALLET_OPTIONS.some((w) => w.id === rawProvider)
      ? rawProvider
      : address
        ? "phantom"
        : null;
    return { address, provider };
  } catch {
    return { address: null, provider: null };
  }
}

export function saveWalletSession(address: string, provider: WalletId): void {
  try {
    localStorage.setItem(STORAGE_ADDRESS, address);
    localStorage.setItem(STORAGE_PROVIDER, provider);
    localStorage.removeItem(LEGACY_STORAGE);
  } catch {
    /* noop */
  }
}

export function clearWalletSession(): void {
  try {
    localStorage.removeItem(STORAGE_ADDRESS);
    localStorage.removeItem(STORAGE_PROVIDER);
    localStorage.removeItem(LEGACY_STORAGE);
  } catch {
    /* noop */
  }
  notifyWalletSession({ address: null, provider: null });
}

export function currentAppUrl(): string {
  return window.location.href;
}

export function appRefUrl(): string {
  const base = appBase();
  return `${window.location.origin}${base || ""}`;
}

export function openMobileWalletBrowse(id: WalletId): void {
  const option = getWalletOption(id);
  if (!option.mobileBrowseUrl) return;
  const url = option.mobileBrowseUrl(currentAppUrl(), appRefUrl());
  window.location.assign(url);
}

/** Mobile Safari/Chrome: open native wallet app to connect, then redirect back here. */
export function openMobileWalletConnect(id: WalletId): void {
  if (supportsMobileConnect(id)) {
    startMobileWalletConnect(id);
    return;
  }
  openMobileWalletBrowse(id);
}

export function shouldUseMobileWalletAppConnect(id: WalletId): boolean {
  return isMobileDevice() && !isWalletDetected(id);
}

/** Connect a wallet in read-only mode (public key only; no signing requested). */
export async function connectWalletReadOnly(id: WalletId): Promise<string | null> {
  if (shouldUseMobileWalletAppConnect(id)) {
    openMobileWalletConnect(id);
    return null;
  }

  const provider = getWalletProvider(id);
  if (!provider) {
    if (isMobileDevice()) openMobileWalletConnect(id);
    return null;
  }
  try {
    const res = await provider.connect();
    return res.publicKey.toString();
  } catch {
    return null;
  }
}

/** @deprecated Use `connectWalletReadOnly("phantom")` */
export async function connectPhantomReadOnly(): Promise<string | null> {
  return connectWalletReadOnly("phantom");
}