import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AtSign,
  Bold,
  Braces,
  Clock,
  Code,
  EyeOff,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Smile,
  SquareCode,
  Strikethrough,
  Subscript,
  TextQuote,
  Underline,
  type LucideIcon,
} from "lucide-react";
import { buttonClass, inputClass } from "../actions";
import { useMeta } from "../hooks";
import { formatTimestamp } from "../markdown";
import { roleHex } from "../format";
import { GREETING_VARS } from "./doc";
import { Counter, iconButton } from "./parts";

type Edit = (v: string, s: number, e: number) => { value: string; sel: [number, number] };
type Menu = "mention" | "emoji" | "time" | "vars";

const HEADING = /^(#{1,3}|-#) /;
const LIST = /^(- |\d+\. )/;

const COMMON_EMOJI = [
  "🔥",
  "✅",
  "❌",
  "⭐",
  "🎉",
  "❤️",
  "💜",
  "🖤",
  "👋",
  "📌",
  "⚠️",
  "🔔",
  "📢",
  "🎮",
  "🎵",
  "👑",
  "💎",
  "🚀",
  "✨",
  "🔒",
];

const TIME_STYLES: [string, string][] = [
  ["t", "kısa saat"],
  ["T", "uzun saat"],
  ["d", "kısa tarih"],
  ["D", "uzun tarih"],
  ["f", "tarih ve saat"],
  ["F", "gün, tarih ve saat"],
  ["R", "göreli"],
];

const pad = (n: number) => String(n).padStart(2, "0");
const localInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Discord markdown'ı için yazı editörü: seçili yazıyı biçimlendiren araç çubuğu (Ctrl+B/I/U),
 * etiket, emoji, zaman damgası ve (karşılama tasarımında) değişken ekleme menüleri.
 */
export function TextEditor({
  value,
  onChange,
  max,
  rows = 4,
  placeholder,
  blocks = true,
  vars = false,
  compact = false,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
  rows?: number;
  placeholder?: string;
  /** Başlık, liste, alıntı gibi satır biçimleri bu alanda çalışıyor mu */
  blocks?: boolean;
  /** Karşılama/ayrılma değişkenleri menüsü */
  vars?: boolean;
  /** Dar araç çubuğu (alan değerleri için) */
  compact?: boolean;
  label?: ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<Menu | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setMenu(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  function apply(edit: Edit) {
    const el = ref.current;
    if (!el) return;
    const { value: next, sel } = edit(value, el.selectionStart, el.selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(sel[0], sel[1]);
    });
  }

  /** Seçimi sarar; zaten sarılıysa sarmayı kaldırır. */
  const wrap = (l: string, r = l) =>
    apply((v, s, e) => {
      if (s !== e && v.slice(s - l.length, s) === l && v.slice(e, e + r.length) === r) {
        return {
          value: v.slice(0, s - l.length) + v.slice(s, e) + v.slice(e + r.length),
          sel: [s - l.length, e - l.length],
        };
      }
      const text = v.slice(s, e) || "yazı";
      return {
        value: v.slice(0, s) + l + text + r + v.slice(e),
        sel: [s + l.length, s + l.length + text.length],
      };
    });

  /** Seçili satırların başına biçim ekler (aynı ailedeki eski biçimin yerine); varsa kaldırır. */
  const prefix = (p: string, family: RegExp | null, numbered = false) =>
    apply((v, s, e) => {
      const start = v.lastIndexOf("\n", s - 1) + 1;
      const nl = v.indexOf("\n", e);
      const end = nl < 0 ? v.length : nl;
      const lines = v.slice(start, end).split("\n");
      const has = (l: string) => (numbered ? /^\d+\. /.test(l) : l.startsWith(p));
      const off = lines.every(has);
      const strip = (l: string) => (family ? l.replace(family, "") : l);
      const out = lines
        .map((l, i) =>
          off ? l.replace(numbered ? /^\d+\. / : p, "") : (numbered ? `${i + 1}. ` : p) + strip(l),
        )
        .join("\n");
      return { value: v.slice(0, start) + out + v.slice(end), sel: [start, start + out.length] };
    });

  const insert = (t: string) => {
    apply((v, s, e) => ({
      value: v.slice(0, s) + t + v.slice(e),
      sel: [s + t.length, s + t.length],
    }));
    setMenu(null);
  };

  const link = () =>
    apply((v, s, e) => {
      const text = v.slice(s, e) || "bağlantı";
      const md = `[${text}](https://)`;
      // Bağlantı kısmı seçili kalır, hemen yazılabilir.
      return {
        value: v.slice(0, s) + md + v.slice(e),
        sel: [s + text.length + 3, s + md.length - 1],
      };
    });

  const tools: {
    icon: LucideIcon;
    title: string;
    run: () => void;
    block?: boolean;
    wide?: boolean;
  }[] = [
    { icon: Bold, title: "Kalın (Ctrl+B)", run: () => wrap("**") },
    { icon: Italic, title: "İtalik (Ctrl+I)", run: () => wrap("*") },
    { icon: Underline, title: "Altı çizili (Ctrl+U)", run: () => wrap("__") },
    { icon: Strikethrough, title: "Üstü çizili", run: () => wrap("~~") },
    { icon: EyeOff, title: "Spoiler (tıklayınca açılır)", run: () => wrap("||") },
    { icon: Code, title: "Satır içi kod", run: () => wrap("`") },
    { icon: SquareCode, title: "Kod bloğu", run: () => wrap("```\n", "\n```"), wide: true },
    { icon: Link2, title: "Bağlantı [yazı](adres)", run: link },
    { icon: TextQuote, title: "Alıntı", run: () => prefix("> ", null), block: true },
    {
      icon: Heading1,
      title: "Büyük başlık",
      run: () => prefix("# ", HEADING),
      block: true,
      wide: true,
    },
    {
      icon: Heading2,
      title: "Orta başlık",
      run: () => prefix("## ", HEADING),
      block: true,
      wide: true,
    },
    {
      icon: Heading3,
      title: "Küçük başlık",
      run: () => prefix("### ", HEADING),
      block: true,
      wide: true,
    },
    {
      icon: Subscript,
      title: "Alt yazı (küçük gri)",
      run: () => prefix("-# ", HEADING),
      block: true,
    },
    { icon: List, title: "Liste", run: () => prefix("- ", LIST), block: true },
    {
      icon: ListOrdered,
      title: "Numaralı liste",
      run: () => prefix("", LIST, true),
      block: true,
      wide: true,
    },
  ];

  const menus: { key: Menu; icon: LucideIcon; title: string }[] = [
    { key: "mention", icon: AtSign, title: "Rol, kanal ya da üye etiketi" },
    { key: "emoji", icon: Smile, title: "Emoji" },
    { key: "time", icon: Clock, title: "Zaman damgası (herkese kendi saatinde görünür)" },
    ...(vars ? [{ key: "vars" as const, icon: Braces, title: "Değişken" }] : []),
  ];

  return (
    <div className="min-w-0 space-y-1.5 text-sm">
      {label && <span className="block text-muted-foreground">{label}</span>}
      <div
        ref={box}
        className="relative rounded-lg border border-border bg-background/60 focus-within:border-accent"
      >
        <div
          role="toolbar"
          aria-label="Biçimlendirme"
          className="flex flex-wrap items-center gap-0.5 border-b border-border/70 px-1.5 py-1"
        >
          {tools
            .filter((t) => (blocks || !t.block) && (!compact || !t.wide))
            .map((t) => (
              <button
                key={t.title}
                type="button"
                title={t.title}
                aria-label={t.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={t.run}
                className={iconButton}
              >
                <t.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {menus.map((m) => (
            <button
              key={m.key}
              type="button"
              title={m.title}
              aria-label={m.title}
              aria-expanded={menu === m.key}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setMenu(menu === m.key ? null : m.key)}
              className={`${iconButton} ${menu === m.key ? "bg-background/60 text-accent" : ""}`}
            >
              <m.icon className="h-3.5 w-3.5" />
            </button>
          ))}
          <span className="ml-auto px-1">
            <Counter value={value} max={max} />
          </span>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const k = e.key.toLowerCase();
            const mark = k === "b" ? "**" : k === "i" ? "*" : k === "u" ? "__" : null;
            if (mark) {
              e.preventDefault();
              wrap(mark);
            }
          }}
          rows={rows}
          placeholder={placeholder}
          className="block w-full resize-y bg-transparent px-3 py-2 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/50"
        />
        {menu && (
          <div className="absolute top-9 left-0 z-30 max-h-80 w-80 max-w-[calc(100vw-3rem)] overflow-auto rounded-lg border border-border bg-card p-3 shadow-xl">
            {menu === "mention" && <MentionMenu onPick={insert} />}
            {menu === "emoji" && <EmojiMenu onPick={insert} />}
            {menu === "time" && <TimeMenu onPick={insert} />}
            {menu === "vars" && (
              <ul className="space-y-1">
                {GREETING_VARS.map((v) => (
                  <li key={v.key}>
                    <button
                      type="button"
                      onClick={() => insert(v.key)}
                      className="flex w-full items-baseline gap-2 rounded px-2 py-1 text-left hover:bg-background/60"
                    >
                      <code className="text-accent">{v.key}</code>
                      <span className="text-xs text-muted-foreground">{v.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const pickClass =
  "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-background/60";

function MentionMenu({ onPick }: { onPick: (t: string) => void }) {
  const meta = useMeta();
  const [q, setQ] = useState("");
  const [uid, setUid] = useState("");
  const needle = q.trim().toLocaleLowerCase("tr");
  const roles = (meta.data?.roles ?? [])
    .filter((r) => r.name !== "@everyone" && r.name.toLocaleLowerCase("tr").includes(needle))
    .slice(0, 40);
  const channels = (meta.data?.channels ?? [])
    .filter((c) => c.kind !== "category" && c.name.toLocaleLowerCase("tr").includes(needle))
    .slice(0, 40);
  const validUid = /^\d{15,21}$/.test(uid.trim());
  return (
    <div className="space-y-3">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="rol ya da kanal ara"
        className={inputClass}
      />
      <div className="flex gap-2">
        <input
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="üye ID'si"
          inputMode="numeric"
          className={inputClass}
        />
        <button
          type="button"
          disabled={!validUid}
          onClick={() => onPick(`<@${uid.trim()}>`)}
          className={buttonClass}
        >
          ekle
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Etiketler sadece gönderirken "etiketler çalışsın" açıksa bildirim gönderir. @everyone ve
        @here hiçbir zaman.
      </p>
      {roles.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] tracking-wider text-muted-foreground uppercase">Roller</p>
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(`<@&${r.id}>`)}
              className={pickClass}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground"
                style={roleHex(r.color) ? { backgroundColor: roleHex(r.color) } : undefined}
              />
              <span className="truncate">@{r.name}</span>
            </button>
          ))}
        </div>
      )}
      {channels.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] tracking-wider text-muted-foreground uppercase">
            Kanallar
          </p>
          {channels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(`<#${c.id}>`)}
              className={pickClass}
            >
              <span className="text-muted-foreground">#</span>
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmojiMenu({ onPick }: { onPick: (t: string) => void }) {
  const meta = useMeta();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const custom = (meta.data?.emojis ?? []).filter((e) => e.name.toLowerCase().includes(needle));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {COMMON_EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            className="h-8 w-8 rounded text-lg hover:bg-background/60"
          >
            {e}
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="sunucu emojisi ara"
        className={inputClass}
      />
      {custom.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sunucu emojisi yok</p>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {custom.map((e) => (
            <button
              key={e.id}
              type="button"
              title={`:${e.name}:`}
              onClick={() => onPick(`<${e.animated ? "a" : ""}:${e.name}:${e.id}>`)}
              className="grid h-9 w-9 place-items-center rounded hover:bg-background/60"
            >
              <img
                src={e.url}
                alt={`:${e.name}:`}
                loading="lazy"
                className="h-6 w-6 object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TimeMenu({ onPick }: { onPick: (t: string) => void }) {
  const [when, setWhen] = useState(() => localInput(new Date()));
  const [style, setStyle] = useState("f");
  const unix = Math.floor(new Date(when).getTime() / 1000);
  const valid = Number.isFinite(unix);
  return (
    <div className="space-y-3">
      <input
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className={inputClass}
      />
      <div className="space-y-0.5">
        {TIME_STYLES.map(([key, label]) => (
          <label key={key} className={`${pickClass} cursor-pointer`}>
            <input
              type="radio"
              name="time-style"
              checked={style === key}
              onChange={() => setStyle(key)}
              className="accent-accent"
            />
            <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="truncate">{valid ? formatTimestamp(unix, key) : "—"}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!valid}
        onClick={() => onPick(`<t:${unix}:${style}>`)}
        className={buttonClass}
      >
        ekle
      </button>
    </div>
  );
}
