import { Fragment, useState, type ReactNode } from "react";
import { roleHex } from "./format";
import type { Meta } from "./types";

/**
 * Discord markdown'ının önizlemesi (React düğümleri; HTML enjekte edilmez). Bağlantılar sadece
 * http(s) olabilir. Etiketler meta'daki rol/kanal adlarıyla gösterilir.
 */
export interface MdOptions {
  meta?: Meta | undefined;
  /** Başlık, alıntı, liste gibi satır biçimleri (embed başlığında, alan adında vb. çalışmaz) */
  blocks?: boolean;
}

const mentionClass = "rounded-[3px] bg-[#5865f2]/30 px-0.5 font-medium text-[#c9cdfb]";
const linkClass = "text-[#00a8fc] hover:underline";

function Spoiler({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setShown(true)}
      onKeyDown={(e) => e.key === "Enter" && setShown(true)}
      className={`rounded-[3px] px-0.5 ${shown ? "bg-white/10" : "cursor-pointer bg-[#1e1f22] text-transparent [&_*]:invisible"}`}
    >
      {children}
    </span>
  );
}

const TIME_STYLES: Record<string, Intl.DateTimeFormatOptions> = {
  t: { timeStyle: "short" },
  T: { timeStyle: "medium" },
  d: { dateStyle: "short" },
  D: { dateStyle: "long" },
  f: { dateStyle: "long", timeStyle: "short" },
  F: { dateStyle: "full", timeStyle: "short" },
};

const relative = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

export function formatTimestamp(unix: number, style = "f"): string {
  const ms = unix * 1000;
  if (style === "R") {
    const sec = Math.round((ms - Date.now()) / 1000);
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
      ["year", 31_536_000],
      ["month", 2_592_000],
      ["day", 86_400],
      ["hour", 3_600],
      ["minute", 60],
    ];
    for (const [unit, size] of steps) {
      if (Math.abs(sec) >= size) return relative.format(Math.round(sec / size), unit);
    }
    return relative.format(sec, "second");
  }
  return new Date(ms).toLocaleString("tr-TR", TIME_STYLES[style] ?? TIME_STYLES["f"]);
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

type Rule = {
  re: RegExp;
  /** Kural bu konumda denenebilir mi (ör. alt çizgi sadece kelime başında) */
  when?: (text: string, i: number) => boolean;
  render: (m: RegExpExecArray, o: MdOptions) => ReactNode;
};

const g = (m: RegExpExecArray, i: number) => m[i] ?? "";

const RULES: Rule[] = [
  { re: /\\([^\sA-Za-z0-9])/y, render: (m) => g(m, 1) },
  {
    re: /`([^`\n]+)`/y,
    render: (m) => (
      <code className="rounded-[3px] bg-[#1e1f22] px-1 py-0.5 font-mono text-[0.85em]">
        {g(m, 1)}
      </code>
    ),
  },
  {
    re: /\*\*([\s\S]+?)\*\*(?!\*)/y,
    render: (m, o) => <strong className="font-bold">{inline(g(m, 1), o)}</strong>,
  },
  { re: /__([\s\S]+?)__(?!_)/y, render: (m, o) => <u>{inline(g(m, 1), o)}</u> },
  { re: /\*(?![\s*])([\s\S]*?[^\s*])\*(?!\*)/y, render: (m, o) => <em>{inline(g(m, 1), o)}</em> },
  {
    re: /_(?![\s_])([\s\S]*?[^\s_])_(?![A-Za-z0-9_])/y,
    when: (t, i) => i === 0 || !/[A-Za-z0-9]/.test(t[i - 1] ?? ""),
    render: (m, o) => <em>{inline(g(m, 1), o)}</em>,
  },
  { re: /~~([\s\S]+?)~~/y, render: (m, o) => <s>{inline(g(m, 1), o)}</s> },
  { re: /\|\|([\s\S]+?)\|\|/y, render: (m, o) => <Spoiler>{inline(g(m, 1), o)}</Spoiler> },
  {
    re: /\[([^\]\n]+)\]\(<?(https?:\/\/[^\s)>]+)>?\)/y,
    render: (m, o) => <Link href={g(m, 2)}>{inline(g(m, 1), o)}</Link>,
  },
  { re: /<(https?:\/\/[^\s>]+)>/y, render: (m) => <Link href={g(m, 1)}>{g(m, 1)}</Link> },
  {
    re: /https?:\/\/[^\s<]*[^\s<.,:;"')\]!?]/y,
    render: (m) => <Link href={g(m, 0)}>{g(m, 0)}</Link>,
  },
  {
    re: /<@!?(\d{1,21})>/y,
    render: (m) => (
      <span className={mentionClass}>@{g(m, 1) === "0" ? "yeni-üye" : "kullanıcı"}</span>
    ),
  },
  {
    re: /<@&(\d{15,21})>/y,
    render: (m, o) => {
      const role = o.meta?.roles.find((r) => r.id === g(m, 1));
      const color = roleHex(role?.color);
      return (
        <span
          className={mentionClass}
          style={color ? { color, backgroundColor: `${color}26` } : undefined}
        >
          @{role?.name ?? "silinmiş-rol"}
        </span>
      );
    },
  },
  {
    re: /<#(\d{15,21})>/y,
    render: (m, o) => (
      <span className={mentionClass}>
        #{o.meta?.channels.find((c) => c.id === g(m, 1))?.name ?? "bilinmeyen"}
      </span>
    ),
  },
  {
    re: /<(a?):(\w{2,32}):(\d{15,21})>/y,
    render: (m) => (
      <img
        src={`https://cdn.discordapp.com/emojis/${g(m, 3)}.${g(m, 1) ? "gif" : "png"}?size=48`}
        alt={`:${g(m, 2)}:`}
        title={`:${g(m, 2)}:`}
        className="inline-block h-[1.375em] w-[1.375em] object-contain align-bottom"
      />
    ),
  },
  {
    re: /<t:(-?\d{1,13})(?::([tTdDfFR]))?>/y,
    render: (m) => (
      <span className="rounded-[3px] bg-white/10 px-0.5">
        {formatTimestamp(Number(g(m, 1)), g(m, 2) || "f")}
      </span>
    ),
  },
  { re: /@(everyone|here)/y, render: (m) => <span className={mentionClass}>{g(m, 0)}</span> },
];

// Bu karakterlerden biriyle başlamayan konumda hiçbir kural denenmez.
const SPECIAL = new Set(["\\", "`", "*", "_", "~", "|", "[", "<", "h", "@"]);

export function inline(text: string, o: MdOptions): ReactNode[] {
  const out: ReactNode[] = [];
  let buf = "";
  let i = 0;
  let key = 0;
  outer: while (i < text.length) {
    const ch = text[i] ?? "";
    if (SPECIAL.has(ch)) {
      for (const rule of RULES) {
        if (rule.when && !rule.when(text, i)) continue;
        rule.re.lastIndex = i;
        const m = rule.re.exec(text);
        if (!m) continue;
        if (buf) out.push(buf);
        buf = "";
        out.push(<Fragment key={key++}>{rule.render(m, o)}</Fragment>);
        i += m[0].length;
        continue outer;
      }
    }
    buf += ch;
    i++;
  }
  if (buf) out.push(buf);
  return out;
}

function Quote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 before:w-1 before:shrink-0 before:rounded before:bg-[#4e5058]">
      {children}
    </div>
  );
}

const HEADINGS = ["text-2xl", "text-xl", "text-base"];

/** Satır satır: kod blokları her yerde, diğer blok biçimleri `blocks` açıksa. */
function blockNodes(text: string, o: MdOptions): ReactNode[] {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let para: string[] = [];
  let key = 0;
  const flush = () => {
    if (para.length) out.push(<div key={key++}>{inline(para.join("\n"), o)}</div>);
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("```")) {
      const one = /^```([\s\S]*?)```\s*$/.exec(line);
      let end = -1;
      if (!one) {
        for (let j = i + 1; j < lines.length; j++) {
          if ((lines[j] ?? "").trimEnd().endsWith("```")) {
            end = j;
            break;
          }
        }
      }
      if (one || end >= 0) {
        flush();
        let code: string;
        if (one) code = one[1] ?? "";
        else {
          // İlk satırda tek kelime varsa dil adıdır, gösterilmez.
          const first = line.slice(3);
          const body = lines.slice(i + 1, end);
          const last = (lines[end] ?? "").trimEnd().slice(0, -3);
          code = [...(/^\w*$/.test(first) ? [] : [first]), ...body, ...(last ? [last] : [])].join(
            "\n",
          );
          i = end;
        }
        out.push(
          <pre
            key={key++}
            className="my-1 overflow-x-auto rounded border border-[#1e1f22] bg-[#1e1f22] p-2 font-mono text-[0.85em] whitespace-pre-wrap"
          >
            {code}
          </pre>,
        );
        continue;
      }
    }
    if (o.blocks) {
      if (line.startsWith(">>> ")) {
        flush();
        const rest = [line.slice(4), ...lines.slice(i + 1)].join("\n");
        out.push(<Quote key={key++}>{<div className="min-w-0">{blockNodes(rest, o)}</div>}</Quote>);
        break;
      }
      if (line.startsWith("> ") || line === ">") {
        flush();
        const quoted: string[] = [];
        while (i < lines.length && ((lines[i] ?? "").startsWith("> ") || lines[i] === ">")) {
          quoted.push((lines[i] ?? "").slice(2));
          i++;
        }
        i--;
        out.push(
          <Quote key={key++}>
            <div className="min-w-0">{blockNodes(quoted.join("\n"), o)}</div>
          </Quote>,
        );
        continue;
      }
      const h = /^(#{1,3}) (.+)$/.exec(line);
      if (h) {
        flush();
        out.push(
          <div
            key={key++}
            className={`mt-2 mb-1 leading-tight font-bold text-white ${HEADINGS[(h[1] ?? "#").length - 1]}`}
          >
            {inline(h[2] ?? "", o)}
          </div>,
        );
        continue;
      }
      const sub = /^-# (.+)$/.exec(line);
      if (sub) {
        flush();
        out.push(
          <div key={key++} className="text-xs text-[#949ba4]">
            {inline(sub[1] ?? "", o)}
          </div>,
        );
        continue;
      }
      if (/^\s*([-*]|\d+\.) /.test(line)) {
        flush();
        const items: { indent: number; ordered: boolean; text: string }[] = [];
        while (i < lines.length) {
          const li = /^(\s*)([-*]|\d+\.) (.*)$/.exec(lines[i] ?? "");
          if (!li) break;
          items.push({
            indent: Math.min(2, Math.floor((li[1] ?? "").length / 2)),
            ordered: /\d/.test(li[2] ?? ""),
            text: li[3] ?? "",
          });
          i++;
        }
        i--;
        out.push(
          <div key={key++} className="my-0.5">
            {items.map((it, n) => (
              <div key={n} className="flex gap-2" style={{ paddingLeft: `${it.indent * 1.25}rem` }}>
                <span className="shrink-0 text-[#949ba4]">{it.ordered ? `${n + 1}.` : "•"}</span>
                <span className="min-w-0">{inline(it.text, o)}</span>
              </div>
            ))}
          </div>,
        );
        continue;
      }
    }
    para.push(line);
  }
  flush();
  return out;
}

/** Discord markdown önizlemesi. Kapsayıcı satır sonlarını korur. */
export function Markdown({ text, ...o }: { text: string } & MdOptions) {
  return <div className="break-words whitespace-pre-wrap">{blockNodes(text, o)}</div>;
}
