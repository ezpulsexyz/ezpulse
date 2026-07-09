import { useState, useEffect, useCallback } from "react";
import {
  clearWalletSession,
  connectWalletReadOnly,
  getWalletOption,
  isMobileDevice,
  isWalletDetected,
  openMobileWalletBrowse,
  readWalletSession,
  saveWalletSession,
  type WalletId,
} from "../wallets";

type WalletListener = (session: { address: string | null; provider: WalletId | null }) => void;
const listeners = new Set<WalletListener>();

function emit(session: { address: string | null; provider: WalletId | null }) {
  listeners.forEach((fn) => fn(session));
}

export function useWallet() {
  const [session, setSession] = useState(readWalletSession);
  const [connecting, setConnecting] = useState(false);
  const [connectingId, setConnectingId] = useState<WalletId | null>(null);

  useEffect(() => {
    const saved = readWalletSession();
    setSession(saved);
    const onChange = (next: { address: string | null; provider: WalletId | null }) => setSession(next);
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, []);

  const connect = useCallback(async (providerId: WalletId): Promise<string | null> => {
    setConnecting(true);
    setConnectingId(providerId);
    try {
      if (!isWalletDetected(providerId)) {
        if (isMobileDevice()) {
          openMobileWalletBrowse(providerId);
          return null;
        }
        window.open(getWalletOption(providerId).installUrl, "_blank", "noopener,noreferrer");
        return null;
      }

      const address = await connectWalletReadOnly(providerId);
      if (address) {
        saveWalletSession(address, providerId);
        const next = { address, provider: providerId };
        setSession(next);
        emit(next);
        return address;
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setConnecting(false);
      setConnectingId(null);
    }
  }, []);

  const disconnect = useCallback(() => {
    clearWalletSession();
    const next = { address: null, provider: null };
    setSession(next);
    emit(next);
  }, []);

  return {
    wallet: session.address,
    walletProvider: session.provider,
    connecting,
    connectingId,
    connect,
    disconnect,
  };
}