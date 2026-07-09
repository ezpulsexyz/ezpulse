import { appBase } from "../routes";

export type WalletId = "phantom" | "solflare" | "backpack" | "jupiter";

export interface WalletOption {
  id: WalletId;
  name: string;
  icon: string;
  installUrl: string;
  /** Opens the current page inside the wallet app's in-app browser (mobile). */
  mobileBrowseUrl: (pageUrl: string, refUrl: string) => string;
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
    icon: "👻",
    installUrl: "https://phantom.com/download",
    mobileBrowseUrl: (pageUrl, refUrl) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(pageUrl)}?ref=${encodeURIComponent(refUrl)}`,
  },
  {
    id: "solflare",
    name: "Solflare",
    icon: "🔥",
    installUrl: "https://solflare.com/download",
    mobileBrowseUrl: (pageUrl, refUrl) =>
      `https://solflare.com/ul/v1/browse/${encodeURIComponent(pageUrl)}?ref=${encodeURIComponent(refUrl)}`,
  },
  {
    id: "backpack",
    name: "Backpack",
    icon: "🎒",
    installUrl: "https://backpack.app/download",
    mobileBrowseUrl: (pageUrl, refUrl) =>
      `https://backpack.app/ul/v1/browse/${encodeURIComponent(pageUrl)}?ref=${encodeURIComponent(refUrl)}`,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    icon: "🪐",
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
  const url = option.mobileBrowseUrl(currentAppUrl(), appRefUrl());
  window.location.assign(url);
}

/** Connect a wallet in read-only mode (public key only; no signing requested). */
export async function connectWalletReadOnly(id: WalletId): Promise<string | null> {
  const provider = getWalletProvider(id);
  if (!provider) {
    if (isMobileDevice()) openMobileWalletBrowse(id);
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