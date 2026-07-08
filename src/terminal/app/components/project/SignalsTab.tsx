import { Stat } from "../../../components";
import { tokenSignalBias, tokenSignals, type LiveLaunch } from "../../../kickstart";

function signalEmoji(kind: string): string {
  if (kind === "WHALE") return "🐋";
  if (kind === "MOMENTUM") return "📈";
  if (kind === "VOLUME") return "🔊";
  if (kind === "LIQUIDITY") return "💧";
  if (kind === "RANK") return "👑";
  return "✓";
}

export function SignalsTab({ token, feed }: { token: LiveLaunch; feed: LiveLaunch[] }) {
  const signals = tokenSignals(token, feed);
  const bias = tokenSignalBias(token, feed);
  const biasBg =
    bias.label === "BULLISH" ? "bg-emerald-600" : bias.label === "BEARISH" ? "bg-red-500" : "bg-zinc-800";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={`rounded-2xl p-6 text-white ${biasBg}`}>
          <div className="text-sm opacity-75">Signal Bias</div>
          <div className="mt-2 text-4xl font-semibold">{bias.label}</div>
          <div className="mt-1 text-xs opacity-75">
            {bias.bulls} bullish · {bias.bears} bearish · score {bias.score}/100
          </div>
        </div>
        <Stat label="Active Signals" value={signals.length.toString()} />
        <Stat label="Data Source" value="Live" sub="DexScreener + Jupiter" />
      </div>

      <div className="space-y-4">
        {signals.length > 0 ? (
          signals.map((signal, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{signalEmoji(signal.kind)}</span>
                <div>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                      signal.strength === "BULLISH"
                        ? "bg-emerald-100 text-emerald-700"
                        : signal.strength === "BEARISH"
                          ? "bg-red-100 text-red-700"
                          : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {signal.strength}
                  </span>
                  <span className="ml-3 text-xs uppercase tracking-widest text-zinc-400">
                    {signal.kind}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-lg font-medium">{signal.title}</p>
              <p className="mt-2 text-zinc-600">{signal.detail}</p>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-zinc-500">No strong signals firing right now.</div>
        )}
      </div>
    </div>
  );
}