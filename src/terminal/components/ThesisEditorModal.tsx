import { useEffect, useState } from "react";

export type ThesisEditorVerdict = "Bullish" | "Bearish" | "Neutral";

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
  const [verdict, setVerdict] = useState<ThesisEditorVerdict>("Bullish");
  const [content, setContent] = useState("");
  const [keyPoint, setKeyPoint] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setVerdict("Bullish");
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 lg:items-center lg:p-4">
      <div className="thesis-modal flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl lg:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold">Write Thesis</h2>
            <p className="text-sm text-zinc-500">${tokenSymbol}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-zinc-400 transition hover:text-zinc-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600">Your Verdict</label>
            <div className="grid grid-cols-3 gap-2">
              {(["Bullish", "Neutral", "Bearish"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerdict(v)}
                  className={`rounded-2xl py-3 text-sm font-medium transition ${
                    verdict === v ? "bg-blue-600 text-white" : "bg-zinc-100 hover:bg-zinc-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600">Your Thesis</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your analysis..."
              className="h-48 w-full resize-y rounded-2xl border border-zinc-200 p-4 text-base focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600">Key Points (Optional)</label>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={keyPoint}
                onChange={(e) => setKeyPoint(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPoint())}
                placeholder="Add a key point..."
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
            className="flex-1 rounded-2xl bg-emerald-600 py-3.5 text-base font-medium text-white disabled:bg-zinc-300 disabled:text-zinc-500"
          >
            {submitting ? "Posting…" : "Post Thesis"}
          </button>
        </div>
      </div>
    </div>
  );
}