import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Sağdan açılan panel. Radix Dialog yerine sade bir çekmece: Radix, sıkı CSP'ye takılan
 * nonce'suz <style> etiketleri enjekte ediyor.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background px-5 py-6 sm:px-6">
        <header className="mb-5 flex items-center gap-3 pr-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
        </header>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </aside>
    </div>
  );
}
