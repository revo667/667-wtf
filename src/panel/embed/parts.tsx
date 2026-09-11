import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { buttonClass, inputClass } from "../actions";
import { DEFAULT_COLOR, chars, fromHex, hex, newButton, type LinkButton } from "./doc";

export const hintClass = "text-xs text-muted-foreground";
export const iconButton =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

export function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

export function Counter({ value, max }: { value: string; max: number }) {
  const n = chars(value);
  return (
    <span
      className={`text-[11px] tabular-nums ${n > max ? "text-destructive" : "text-muted-foreground/70"}`}
    >
      {n}/{max}
    </span>
  );
}

/** Başlıklı kutu (yazar, başlık, alanlar...). */
export function Group({
  title,
  hint,
  children,
}: {
  title: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 space-y-3 rounded-lg border border-border/70 p-3">
      <legend className="px-1 text-[11px] tracking-wider text-muted-foreground uppercase">
        {title}
      </legend>
      {hint && <p className={hintClass}>{hint}</p>}
      {children}
    </fieldset>
  );
}

export function TextField({
  label,
  value,
  onChange,
  max,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0 space-y-1.5 text-sm">
      <span className="flex items-center justify-between gap-2 text-muted-foreground">
        {label}
        <Counter value={value} max={max} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

/** Bağlantı alanı. Karşılama tasarımında {avatar} gibi değişkenler de kabul edilir. */
export function UrlField({
  label,
  value,
  onChange,
  vars = false,
  hint,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  vars?: boolean;
  hint?: string;
}) {
  const v = value.trim();
  const bad = v !== "" && !v.startsWith("https://") && !(vars && /^\{\w+\}/.test(v));
  return (
    <label className="block min-w-0 space-y-1.5 text-sm">
      <span className="block text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={vars ? "https://… ya da {avatar}" : "https://…"}
        inputMode="url"
        className={`${inputClass} ${bad ? "border-destructive" : ""}`}
      />
      {bad ? (
        <span className="block text-xs text-destructive">Bağlantı https:// ile başlamalı</span>
      ) : (
        hint && <span className={`block ${hintClass}`}>{hint}</span>
      )}
    </label>
  );
}

const PRESETS: { color: number; name: string }[] = [
  { color: 0x8e64d7, name: "667 moru" },
  { color: 0x5b2c6f, name: "koyu mor" },
  { color: 0x5865f2, name: "Discord mavisi" },
  { color: 0x00a8fc, name: "açık mavi" },
  { color: 0x57f287, name: "yeşil" },
  { color: 0xfee75c, name: "sarı" },
  { color: 0xe0a04a, name: "turuncu" },
  { color: 0xed4245, name: "kırmızı" },
  { color: 0xeb459e, name: "pembe" },
  { color: 0xffffff, name: "beyaz" },
  { color: 0x1e1f22, name: "siyah" },
];

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (c: number | null) => void;
}) {
  const commit = (raw: string) => {
    const c = fromHex(raw);
    if (c !== null) onChange(c);
  };
  return (
    <div className="space-y-1.5 text-sm">
      <span className="block text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.color}
            type="button"
            title={p.name}
            aria-label={p.name}
            aria-pressed={value === p.color}
            onClick={() => onChange(p.color)}
            className={`h-6 w-6 rounded-full border border-border ${value === p.color ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`}
            style={{ backgroundColor: hex(p.color) }}
          />
        ))}
        <input
          type="color"
          value={hex(value ?? DEFAULT_COLOR)}
          onChange={(e) => commit(e.target.value)}
          aria-label="Özel renk"
          className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent"
        />
        <input
          key={hex(value)}
          defaultValue={hex(value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit(e.currentTarget.value)}
          placeholder="#8e64d7"
          aria-label="Renk kodu"
          className={`${inputClass} h-7 w-24 font-mono text-xs`}
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={`rounded-md border px-2 py-1 text-xs ${value === null ? "border-accent text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          renksiz
        </button>
      </div>
    </div>
  );
}

/** Listedeki bir öğenin yukarı/aşağı, kopyala ve sil düğmeleri. */
export function ItemControls({
  index,
  length,
  onMove,
  onDuplicate,
  onRemove,
  what,
}: {
  index: number;
  length: number;
  onMove: (to: number) => void;
  onDuplicate?: (() => void) | undefined;
  onRemove: () => void;
  what: string;
}) {
  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        aria-label={`${what} yukarı taşı`}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        className={iconButton}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={`${what} aşağı taşı`}
        disabled={index === length - 1}
        onClick={() => onMove(index + 1)}
        className={iconButton}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      {onDuplicate && (
        <button
          type="button"
          aria-label={`${what} kopyala`}
          onClick={onDuplicate}
          className={iconButton}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        aria-label={`${what} sil`}
        onClick={onRemove}
        className={`${iconButton} hover:text-destructive`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

/** Bağlantı butonları (tıklayan tarayıcıda bağlantıyı açar). */
export function ButtonsEditor({
  buttons,
  onChange,
  max,
  vars = false,
}: {
  buttons: LinkButton[];
  onChange: (b: LinkButton[]) => void;
  max: number;
  vars?: boolean;
}) {
  const set = (i: number, patch: Partial<LinkButton>) =>
    onChange(buttons.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  return (
    <div className="space-y-2">
      {buttons.map((b, i) => {
        const url = b.url.trim();
        const bad = url !== "" && !url.startsWith("https://") && !(vars && url.startsWith("{"));
        return (
          <div
            key={i}
            className="grid items-center gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.5fr)_auto]"
          >
            <input
              value={b.emoji}
              onChange={(e) => set(i, { emoji: e.target.value })}
              placeholder="emoji"
              aria-label="Buton emojisi"
              className={inputClass}
            />
            <input
              value={b.label}
              onChange={(e) => set(i, { label: e.target.value })}
              maxLength={80}
              placeholder="yazı"
              aria-label="Buton yazısı"
              className={inputClass}
            />
            <input
              value={b.url}
              onChange={(e) => set(i, { url: e.target.value })}
              placeholder="https://…"
              aria-label="Buton bağlantısı"
              className={`${inputClass} ${bad ? "border-destructive" : ""}`}
            />
            <ItemControls
              what="Butonu"
              index={i}
              length={buttons.length}
              onMove={(to) => onChange(move(buttons, i, to))}
              onRemove={() => onChange(buttons.filter((_, j) => j !== i))}
            />
          </div>
        );
      })}
      {buttons.length < max && (
        <button
          type="button"
          onClick={() => onChange([...buttons, newButton()])}
          className={buttonClass}
        >
          <Plus className="h-3.5 w-3.5" /> buton ekle
        </button>
      )}
      <p className={hintClass}>
        Sadece bağlantı butonu: tıklayan bağlantıyı açar. Emoji olarak 🔥 ya da {"<:ad:id>"}{" "}
        yazılabilir. Buton 5'erli sıralara dizilir.
      </p>
    </div>
  );
}
