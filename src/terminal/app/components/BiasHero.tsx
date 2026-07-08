import type { SignalBias } from "../../../../shared/signals-core";

export function BiasHero({ label, bias }: { label: string; bias: SignalBias }) {
  const tone =
    bias.label === "BULLISH"
      ? "term-bias-hero--bull"
      : bias.label === "BEARISH"
        ? "term-bias-hero--bear"
        : "term-bias-hero--neutral";

  return (
    <div className={`term-bias-hero ${tone}`}>
      <div className="term-bias-hero__label">{label}</div>
      <div className="term-bias-hero__value">{bias.label}</div>
      <div className="term-bias-hero__sub">
        {bias.bulls} bullish · {bias.bears} bearish · score {bias.score}/100
      </div>
    </div>
  );
}