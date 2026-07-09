import { useState, useEffect, useCallback } from "react";
import {
  applyWalletSession,
  clearWalletSession,
  connectWalletReadOnly,
  getWalletOption,
  isMobileDevice,
  isWalletDetected,
  openMobileWalletConnect,
  readWalletSession,
  shouldUseMobileWalletAppConnect,
  subscribeWalletSession,
  type WalletId,
} from "../wallets";

export function useWallet() {
  const [session, setSession] = useState(readWalletSession);
  const [connecting, setConnecting] = useState(false);
  const [connectingId, setConnectingId] = useState<WalletId | null>(null);

  useEffect(() => {
    setSession(readWalletSession());
    return subscribeWalletSession(setSession);
  }, []);

  const connect = useCallback(async (providerId: WalletId): Promise<string | null> => {
    setConnecting(true);
    setConnectingId(providerId);
    try {
      if (shouldUseMobileWalletAppConnect(providerId)) {
        openMobileWalletConnect(providerId);
        return null;
      }

      if (!isWalletDetected(providerId)) {
        if (isMobileDevice()) {
          openMobileWalletConnect(providerId);
          return null;
        }
        window.open(getWalletOption(providerId).installUrl, "_blank", "noopener,noreferrer");
        return null;
      }

      const address = await connectWalletReadOnly(providerId);
      if (address) {
        applyWalletSession(address, providerId);
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
    setSession({ address: null, provider: null });
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