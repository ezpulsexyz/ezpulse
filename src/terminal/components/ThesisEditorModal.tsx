import { useEffect, useState } from "react";

export type ThesisEditorVerdict = "BULL" | "NEUTRAL" | "BEAR";

export interface ThesisEditorSubmission {
  verdict: ThesisEditorVerdict;
  content: string;
  keyPoints: string[];
}

interface ThesisEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenSymbol: string;
  isVerifiedHolder: boolean;
  onSubmit: (thesis: ThesisEditorSubmission) => void | Promise<void>;
}

export default function ThesisEditorModal({
  isOpen,
  onClose,
  tokenSymbol,
  isVerifiedHolder,
  onSubmit,
}: ThesisEditorModalProps) {
  const [verdict, setVerdict] = useState<ThesisEditorVerdict>("BULL");
  const [content, setContent] = useState("");
  const [keyPoint, setKeyPoint] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setVerdict("BULL");
      setContent("");
      setKeyPoint("");
      setKeyPoints([]);
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddPoint = () => {
    if (keyPoint.trim()) {
      setKeyPoints([...keyPoints, keyPoint.trim()]);
      setKeyPoint("");
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit({
        verdict,
        content: content.trim(),
        keyPoints,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const verdictConfig = {
    BULL: { label: "BULL", color: "bg-emerald-600", text: "text-white" },
    NEUTRAL: { label: "NEUTRAL", color: "bg-zinc-600", text: "text-white" },
    BEAR: { label: "BEAR", color: "bg-red-600", text: "text-white" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 lg:items-center lg:p-4">
      <div className="thesis-modal flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl lg:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Write Community Thesis</h2>
            <p className="text-sm text-zinc-500">${tokenSymbol}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-3xl leading-none text-zinc-400 transition hover:text-zinc-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Verdict Selector - more terminal / professional */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-600">Your Verdict</label>
            <div className="grid grid-cols-3 gap-2">
              {(["BULL", "NEUTRAL", "BEAR"] as const).map((v) => {
                const cfg = verdictConfig[v];
                const isActive = verdict === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVerdict(v)}
                    className={`rounded-2xl py-3.5 text-sm font-bold tracking-widest transition-all active:scale-[0.985] ${
                      isActive 
                        ? `${cfg.color} ${cfg.text} shadow-sm` 
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400">This helps others quickly understand your stance.</p>
          </div>

          {/* Main Thesis */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-600">Your Thesis</label>
              <span className="text-[10px] text-zinc-400">{content.length}/800</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 800))}
              placeholder="Be specific. What signals convinced you? What would change your mind?"
              className="h-44 w-full resize-y rounded-2xl border border-zinc-200 p-4 text-[15px] leading-relaxed focus:border-zinc-400 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-400">Write like you're explaining it to a smart friend. Avoid hype.</p>
          </div>

          {/* Key Points */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-600">Key Points (Optional)</label>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={keyPoint}
                onChange={(e) => setKeyPoint(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPoint())}
                placeholder="e.g. Strong founder execution, low FDV, rising volume"
                className="flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-base"
              />
              <button
                type="button"
                onClick={handleAddPoint}
                disabled={!keyPoint.trim()}
                className="rounded-2xl bg-zinc-900 px-6 py-3 text-base font-medium text-white disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {keyPoints.length > 0 && (
              <div className="space-y-2">
                {keyPoints.map((point, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm"
                  >
                    <span>{point}</span>
                    <button
                      type="button"
                      onClick={() => setKeyPoints(keyPoints.filter((_, i) => i !== index))}
                      className="px-2 text-lg text-red-400 hover:text-red-600"
                      aria-label="Remove key point"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t bg-white p-6 lg:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-zinc-200 py-3.5 text-base font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!content.trim() || !isVerifiedHolder || submitting}
            className={`flex-1 rounded-2xl py-3.5 text-base font-medium text-white transition disabled:bg-zinc-300 disabled:text-zinc-500 ${
              isVerifiedHolder ? "bg-emerald-600" : "bg-zinc-400"
            }`}
          >
            {submitting 
              ? "Posting…" 
              : isVerifiedHolder 
                ? "Post Thesis" 
                : "Connect & hold to post"}
          </button>
        </div>

        {!isVerifiedHolder && (
          <div className="px-6 pb-6 text-center text-[11px] text-amber-600">
            You need to hold ${tokenSymbol} to post a thesis (any amount qualifies).
          </div>
        )}
      </div>
    </div>
  );
}
