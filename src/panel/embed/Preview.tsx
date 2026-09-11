import { useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Markdown, inline } from "../markdown";
import type { Meta } from "../types";
import {
  hex,
  type Block,
  type Doc,
  type Embed,
  type Field,
  type LinkButton,
  type Media,
} from "./doc";

const pad = (n: number) => String(n).padStart(2, "0");

function discordTime(d: Date): string {
  const now = new Date();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) return `Bugün ${hm}`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${hm}`;
}

/** Görsel; bağlantı https değilse ya da yüklenemezse yerine not gösterilir. */
function Img({
  src,
  className,
  spoiler = false,
  alt = "",
  round = false,
}: {
  src: string;
  className: string;
  spoiler?: boolean;
  alt?: string;
  round?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const url = src.trim();
  if (!url.startsWith("https://") || failed === url) {
    return (
      <span
        className={`${className} grid place-items-center overflow-hidden bg-[#1e1f22] p-1 text-center text-[10px] leading-tight text-[#949ba4] ${round ? "rounded-full" : "rounded"}`}
      >
        {url.startsWith("https://") ? "yüklenemedi" : "görsel"}
      </span>
    );
  }
  return (
    <span className={`relative block overflow-hidden ${round ? "rounded-full" : "rounded"}`}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(url)}
        className={`${className} ${spoiler && !shown ? "scale-110 blur-2xl" : ""}`}
      />
      {spoiler && !shown && (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="absolute inset-0 grid place-items-center"
        >
          <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold tracking-wider text-white">
            SPOILER
          </span>
        </button>
      )}
    </span>
  );
}

function Buttons({ buttons }: { buttons: LinkButton[] }) {
  const list = buttons.filter((b) => b.url.trim() && (b.label.trim() || b.emoji.trim()));
  if (!list.length) return null;
  const rows: LinkButton[][] = [];
  for (let i = 0; i < list.length; i += 5) rows.push(list.slice(i, i + 5));
  return (
    <div className="mt-2 space-y-2">
      {rows.map((row, r) => (
        <div key={r} className="flex flex-wrap gap-2">
          {row.map((b, i) => (
            <span
              key={i}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#4e5058] px-4 text-sm font-medium text-white"
            >
              {b.emoji.trim() && <span>{inline(b.emoji.trim(), {})}</span>}
              {b.label.trim()}
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Discord'un alan dizilişi: yan yana alanlar satırda en fazla 3 (küçük görsel varsa 2). */
function fieldRows(fields: Field[], perRow: number): Field[][] {
  const rows: Field[][] = [];
  let cur: Field[] = [];
  for (const f of fields) {
    if (!f.inline) {
      if (cur.length) rows.push(cur);
      rows.push([f]);
      cur = [];
      continue;
    }
    cur.push(f);
    if (cur.length === perRow) {
      rows.push(cur);
      cur = [];
    }
  }
  if (cur.length) rows.push(cur);
  return rows;
}

const ROW_COLS = ["grid-cols-1", "grid-cols-1", "grid-cols-2", "grid-cols-3"];

function EmbedView({ e, meta }: { e: Embed; meta: Meta | undefined }) {
  const fields = e.fields.filter((f) => f.name.trim() || f.value.trim());
  const empty =
    !e.author_name.trim() &&
    !e.title.trim() &&
    !e.description.trim() &&
    !fields.length &&
    !e.image.trim() &&
    !e.thumbnail.trim() &&
    !e.footer_text.trim();
  if (empty) return null;
  const thumb = e.thumbnail.trim();
  const ts = e.timestamp === "now" ? new Date() : e.timestamp ? new Date(e.timestamp) : null;
  return (
    <div
      className="mt-1 max-w-[520px] rounded-[4px] border-l-4 bg-[#2b2d31]"
      style={{ borderLeftColor: e.color === null ? "#1e1f22" : hex(e.color) }}
    >
      <div className="flex gap-4 px-3 pt-2 pb-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          {e.author_name.trim() && (
            <div className="flex items-center gap-2 pt-1">
              {e.author_icon.trim() && (
                <Img src={e.author_icon} round className="h-6 w-6 object-cover" />
              )}
              <span
                className={`text-sm font-semibold text-white ${e.author_url.trim() ? "hover:underline" : ""}`}
              >
                {e.author_name}
              </span>
            </div>
          )}
          {e.title.trim() && (
            <div className={`pt-1 font-semibold ${e.url.trim() ? "text-[#00a8fc]" : "text-white"}`}>
              {inline(e.title, { meta })}
            </div>
          )}
          {e.description.trim() && (
            <div className="text-sm">
              <Markdown text={e.description} meta={meta} blocks />
            </div>
          )}
          {fields.length > 0 && (
            <div className="space-y-2 pt-1">
              {fieldRows(fields, thumb ? 2 : 3).map((row, r) => (
                <div key={r} className={`grid gap-2 ${ROW_COLS[row.length]}`}>
                  {row.map((f, i) => (
                    <div key={i} className="min-w-0 text-sm">
                      <div className="font-semibold text-white">{inline(f.name, { meta })}</div>
                      <Markdown text={f.value} meta={meta} blocks />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {e.image.trim() && (
            <div className="pt-2">
              <Img src={e.image} className="max-h-[300px] w-auto max-w-full object-contain" />
            </div>
          )}
          {(e.footer_text.trim() || ts) && (
            <div className="flex items-center gap-2 pt-1 text-xs text-[#949ba4]">
              {e.footer_icon.trim() && e.footer_text.trim() && (
                <Img src={e.footer_icon} round className="h-5 w-5 object-cover" />
              )}
              <span>
                {e.footer_text.trim()}
                {e.footer_text.trim() && ts && " • "}
                {ts && !Number.isNaN(ts.getTime()) && discordTime(ts)}
              </span>
            </div>
          )}
        </div>
        {thumb && (
          <div className="shrink-0 pt-2">
            <Img src={thumb} className="h-20 w-20 object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

const GRID = ["grid-cols-1", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-2"];

function Gallery({ items }: { items: Media[] }) {
  const list = items.filter((m) => m.url.trim());
  if (!list.length) return null;
  const n = list.length;
  return (
    <div className={`grid max-w-[520px] gap-1 ${GRID[n] ?? "grid-cols-3"}`}>
      {list.map((m, i) => (
        <Img
          key={i}
          src={m.url}
          spoiler={m.spoiler}
          alt={m.description}
          className={
            n === 1 ? "max-h-[350px] w-full object-contain" : "aspect-square w-full object-cover"
          }
        />
      ))}
    </div>
  );
}

function BlockView({ b, meta }: { b: Block; meta: Meta | undefined }) {
  switch (b.kind) {
    case "text": {
      const text = b.text.trim() ? <Markdown text={b.text} meta={meta} blocks /> : null;
      const img = b.image?.url.trim() ? b.image : null;
      if (!img) return text;
      if (!text) return <Gallery items={[img]} />;
      if (b.image_pos === "right") {
        return (
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">{text}</div>
            <Img src={img.url} spoiler={img.spoiler} className="h-[85px] w-[85px] object-cover" />
          </div>
        );
      }
      return (
        <div className="space-y-2">
          {b.image_pos === "top" && <Gallery items={[img]} />}
          {text}
          {b.image_pos === "bottom" && <Gallery items={[img]} />}
        </div>
      );
    }
    case "gallery":
      return <Gallery items={b.items} />;
    case "separator":
      return b.divider ? (
        <hr className={`border-[#4e5058]/60 ${b.large ? "my-3" : "my-1"}`} />
      ) : (
        <div className={b.large ? "h-5" : "h-1.5"} />
      );
    case "buttons":
      return <Buttons buttons={b.buttons} />;
  }
}

/** Mesajın Discord'daki görünümüne yakın önizleme (koyu tema). */
export function MessagePreview({
  doc,
  meta,
  bot,
  empty,
}: {
  doc: Doc;
  meta: Meta | undefined;
  bot: { name: string; avatar: string | null };
  empty?: ReactNode;
}) {
  let body: ReactNode;
  if (doc.mode === "embed") {
    const shown = doc.embeds.filter((e) => e);
    body = (
      <>
        {doc.content.trim() && <Markdown text={doc.content} meta={meta} blocks />}
        {shown.map((e, i) => (
          <EmbedView key={i} e={e} meta={meta} />
        ))}
        <Buttons buttons={doc.buttons} />
      </>
    );
  } else {
    const blocks = doc.blocks.map((b, i) => <BlockView key={i} b={b} meta={meta} />);
    body = doc.container ? (
      <div
        className="mt-1 max-w-[560px] space-y-2 rounded-lg border border-[#3f4147] bg-[#2b2d31] p-4"
        style={doc.accent !== null ? { borderLeft: `4px solid ${hex(doc.accent)}` } : undefined}
      >
        {blocks}
      </div>
    ) : (
      <div className="mt-1 space-y-2">{blocks}</div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#313338] p-4 font-sans text-[15px] leading-[1.375] text-[#dbdee1]">
      <div className="flex gap-4">
        {bot.avatar ? (
          <img
            src={bot.avatar}
            alt=""
            referrerPolicy="no-referrer"
            className="h-10 w-10 shrink-0 rounded-full"
          />
        ) : (
          <span className="h-10 w-10 shrink-0 rounded-full bg-[#5865f2]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-white">{bot.name}</span>
            <span className="rounded-[3px] bg-[#5865f2] px-1 py-px text-[10px] font-semibold text-white">
              UYGULAMA
            </span>
            <span className="ml-1 text-xs text-[#949ba4]">{discordTime(new Date())}</span>
          </div>
          <div className="space-y-1">{body}</div>
          {empty}
        </div>
      </div>
    </div>
  );
}
