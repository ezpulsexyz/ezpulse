import { useEffect, useState } from "react";
import { backendReady, getThesesForToken, type SavedInvestorThesis } from "../backend";
import { loadInvestorTheses, localPostToSaved } from "../investorThesis";

interface ThesesListProps {
  tokenCa: string;
  /** Bump to re-fetch after a new thesis is posted */
  refreshKey?: number;
  onCountChange?: (count: number) => void;
}

export default function ThesesList({ tokenCa, refreshKey = 0, onCountChange }: ThesesListProps) {
  const [theses, setTheses] = useState<SavedInvestorThesis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadTheses = async () => {
      setLoading(true);
      const data = backendReady
        ? await getThesesForToken(tokenCa)
        : loadInvestorTheses(tokenCa).map(localPostToSaved);
      if (alive) {
        setTheses(data);
        onCountChange?.(data.length);
        setLoading(false);
      }
    };

    void loadTheses();
    return () => {
      alive = false;
    };
  }, [tokenCa, refreshKey]);

  if (loading) {
    return <div className="py-12 text-center text-zinc-400">Loading theses...</div>;
  }

  if (theses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
        <p className="text-zinc-500">No theses posted yet for this token.</p>
        <p className="mt-1 text-sm text-zinc-400">Be the first to share your analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {theses.map((thesis) => {
        const keyPoints = Array.isArray(thesis.key_points) ? thesis.key_points : [];
        return (
          <div key={thesis.id} className="rounded-3xl border border-zinc-200 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    thesis.verdict === "Bullish"
                      ? "bg-emerald-100 text-emerald-700"
                      : thesis.verdict === "Bearish"
                        ? "bg-red-100 text-red-700"
                        : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {thesis.verdict}
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  {thesis.wallet_address.slice(0, 4)}...{thesis.wallet_address.slice(-4)}
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                {new Date(thesis.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="mb-4 leading-relaxed text-zinc-700">{thesis.content}</p>

            {keyPoints.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Key Points</div>
                <ul className="space-y-1.5 pl-1">
                  {keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-zinc-600">
                      <span className="mt-1 text-emerald-500">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}