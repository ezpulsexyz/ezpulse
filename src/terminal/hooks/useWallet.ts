import { useState, useEffect, useCallback } from "react";
import { connectPhantomReadOnly, isPhantomAvailable } from "../kickstart";

type WalletListener = (wallet: string | null) => void;
const listeners = new Set<WalletListener>();

function readSavedWallet(): string | null {
  try {
    return localStorage.getItem("ezpulse:phantom");
  } catch {
    return null;
  }
}

function emit(wallet: string | null) {
  listeners.forEach((fn) => fn(wallet));
}

export function useWallet() {
  const [wallet, setWallet] = useState<string | null>(readSavedWallet);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const saved = readSavedWallet();
    if (saved) setWallet(saved);
    listeners.add(setWallet);
    return () => {
      listeners.delete(setWallet);
    };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    if (!isPhantomAvailable()) {
      alert("Phantom wallet not found. Please install it.");
      return null;
    }

    setConnecting(true);
    try {
      const address = await connectPhantomReadOnly();
      if (address) {
        localStorage.setItem("ezpulse:phantom", address);
        setWallet(address);
        emit(address);
        return address;
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem("ezpulse:phantom");
    setWallet(null);
    emit(null);
  }, []);

  return { wallet, connecting, connect, disconnect };
}