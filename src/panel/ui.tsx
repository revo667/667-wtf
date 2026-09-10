import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { ApiError } from "./api";
import type { Status } from "./types";

export const selectClass =
  "h-9 rounded-lg border border-border bg-background/60 px-3 text-sm text-foreground outline-none transition-colors focus:border-accent";

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-card/70 p-5 backdrop-blur ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <div className="ml-auto">{action}</div>
        </header>
      )}
      {children}
    </section>
  );
}

/** Tek sayı kartı. Büyük sayı orantılı rakamlarla (tabular-nums değil). */
export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 backdrop-blur">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Grafik + aynı verinin tablo görünümü (erişilebilirlik: değer sadece tooltip'te kalmasın). */
export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  table: ReactNode;
  children: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card
      title={
        <span className="flex flex-col">
          {title}
          {subtitle && (
            <span className="text-xs font-normal text-muted-foreground">{subtitle}</span>
          )}
        </span>
      }
      action={
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          aria-pressed={asTable}
        >
          {asTable ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
          {asTable ? "grafik" : "tablo"}
        </button>
      }
    >
      {legend && !asTable && (
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">{legend}</div>
      )}
      {asTable ? <div className="max-h-72 overflow-auto">{table}</div> : children}
    </Card>
  );
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-border bg-background/60 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-xs transition-colors ${
            o.value === value
              ? "bg-primary/25 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Durum renkleri durum paletinden gelir ve sadece durum için kullanılır; hep bir etiketle birlikte.
const STATUS: Record<Status, { label: string; color: string }> = {
  online: { label: "Çevrimiçi", color: "#0ca30c" },
  idle: { label: "Boşta", color: "#fab219" },
  dnd: { label: "Rahatsız etmeyin", color: "#d03b3b" },
  offline: { label: "Çevrimdışı", color: "#5d5669" },
};

export function StatusDot({ status, withLabel = false }: { status: Status; withLabel?: boolean }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5" title={s.label}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
      {withLabel ? (
        <span className="text-xs text-muted-foreground">{s.label}</span>
      ) : (
        <span className="sr-only">{s.label}</span>
      )}
    </span>
  );
}

export function Avatar({ src, size = 32 }: { src: string | null | undefined; size?: number }) {
  if (!src) {
    return (
      <span
        className="inline-block shrink-0 rounded-full bg-muted"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="shrink-0 rounded-full bg-muted object-cover"
    />
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "danger";
}) {
  const tones = {
    muted: "border-border text-muted-foreground",
    accent: "border-accent/50 text-accent",
    danger: "border-destructive/50 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] tracking-wide uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`inline-flex items-center gap-2 text-sm ${disabled ? "opacity-60" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      <span>{label}</span>
    </label>
  );
}

/** Sorgu hatası / boş durum. 503 = bot henüz bağlanmadı. */
export function Notice({ error, empty }: { error?: unknown; empty?: string }) {
  if (error) {
    const msg = error instanceof ApiError ? error.message : "Veri alınamadı";
    return <p className="py-8 text-center text-sm text-destructive">{msg}</p>;
  }
  return <p className="py-8 text-center text-sm text-muted-foreground">{empty ?? "Kayıt yok"}</p>;
}
