import { getWalletOption, walletLogoUrl, type WalletId } from "../../wallets";

export function WalletLogo({
  id,
  className = "h-6 w-6",
  size = 24,
}: {
  id: WalletId;
  className?: string;
  size?: number;
}) {
  const wallet = getWalletOption(id);
  return (
    <img
      src={walletLogoUrl(wallet.logo)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`object-contain ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}