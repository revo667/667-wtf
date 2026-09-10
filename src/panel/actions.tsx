import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "./api";

export const inputClass =
  "h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-accent";

export const buttonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 text-sm text-foreground transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40";

export const primaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm text-primary-foreground transition-colors hover:bg-primary/85 disabled:pointer-events-none disabled:opacity-40";

export const dangerButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-destructive/60 px-3 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-40";

type Msg = { ok: boolean; text: string } | null;

/** API'ye yazan işlem. Başarıda paneldeki tüm veriler yenilenir. */
export function usePanelAction<V>(
  fn: (vars: V) => Promise<unknown>,
  opts: { success?: string; onDone?: () => void } = {},
) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<Msg>(null);
  const m = useMutation({
    mutationFn: fn,
    onSuccess: () => {
      setMsg({ ok: true, text: opts.success ?? "Kaydedildi" });
      void qc.invalidateQueries({ queryKey: ["panel"] });
      opts.onDone?.();
    },
    onError: (e) =>
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : "İşlem başarısız" }),
  });
  return {
    run: (vars: V) => {
      setMsg(null);
      m.mutate(vars);
    },
    busy: m.isPending,
    msg,
  };
}

export function ActionResult({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p role="status" className={`text-xs ${msg.ok ? "text-accent" : "text-destructive"}`}>
      {msg.text}
    </p>
  );
}

/** İki adımlı onay: geri alınamayan işlemler (ban, silme) yanlışlıkla tek tıkla yapılmasın. */
export function ConfirmButton({
  label,
  confirmText,
  onConfirm,
  busy = false,
  danger = true,
}: {
  label: string;
  confirmText: string;
  onConfirm: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => setAsking(true)}
        className={danger ? dangerButtonClass : buttonClass}
      >
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">{confirmText}</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className={danger ? dangerButtonClass : primaryButtonClass}
      >
        Evet
      </button>
      <button type="button" onClick={() => setAsking(false)} className={buttonClass}>
        Vazgeç
      </button>
    </span>
  );
}
