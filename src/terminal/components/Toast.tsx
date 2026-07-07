interface ToastProps {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}

export default function Toast({ type, message, onClose }: ToastProps) {
  const isSuccess = type === "success";

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
      <div
        className={`flex items-center gap-4 rounded-2xl border px-6 py-4 shadow-xl ${
          isSuccess ? "border-emerald-200 bg-white" : "border-red-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`text-xl ${isSuccess ? "text-emerald-500" : "text-red-500"}`}>
            {isSuccess ? "✓" : "⚠️"}
          </div>
          <div className={`max-w-md text-sm ${isSuccess ? "text-emerald-700" : "text-red-700"}`}>
            {message}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`text-xl leading-none ${
            isSuccess ? "text-emerald-400 hover:text-emerald-600" : "text-red-400 hover:text-red-600"
          }`}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export type ToastState = { type: "success" | "error"; message: string } | null;