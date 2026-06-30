export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent ${className}`}
    />
  );
}

export function PageError({ message, detail }: { message: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-danger-border bg-danger-muted p-6 text-center">
      <p className="text-danger">{message}</p>
      {detail && <p className="mt-1 text-sm text-danger/80">{detail}</p>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-5 py-3 backdrop-blur">
          <div className="min-w-0 flex-1">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-text-muted transition hover:bg-surface-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export const btnPrimary =
  "rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-hover disabled:opacity-40 transition";

export const btnSecondary =
  "rounded-lg border border-border bg-surface px-4 py-2.5 font-medium text-text hover:bg-surface-muted transition";

export const btnGhost =
  "rounded-lg px-4 py-2.5 text-sm text-text-muted hover:bg-surface-muted transition";
