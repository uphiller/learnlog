import { useToast } from "./ToastContext";

export function ToastHost() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="m-toast-host" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`m-toast m-toast--${toast.kind}`}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          <p className="m-toast__message">{toast.message}</p>
          <button
            type="button"
            className="m-toast__close"
            aria-label="Close"
            onClick={() => dismissToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
