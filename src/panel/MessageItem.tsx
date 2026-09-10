import { Paperclip, Pencil, Trash2 } from "lucide-react";
import { dateTime } from "./format";
import type { MessageOut } from "./types";
import { Avatar, Badge } from "./ui";

/** Mesaj logundaki tek mesaj: silinme ve düzenleme geçmişiyle birlikte. */
export function MessageItem({ m, showAuthor = true }: { m: MessageOut; showAuthor?: boolean }) {
  const deleted = m.deleted_at !== null;
  return (
    <article
      className={`flex gap-3 border-b border-border/60 py-3 last:border-0 ${deleted ? "opacity-80" : ""}`}
    >
      {showAuthor && <Avatar src={m.avatar} size={32} />}
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
          {showAuthor && <span className="font-medium text-foreground">{m.author}</span>}
          {m.author_bot && <Badge>bot</Badge>}
          <span className="text-muted-foreground">#{m.channel ?? m.channel_id}</span>
          <time
            className="text-muted-foreground/70"
            dateTime={new Date(m.created_at).toISOString()}
          >
            {dateTime(m.created_at)}
          </time>
          {m.edited_at && (
            <Badge tone="accent">
              <Pencil className="h-2.5 w-2.5" /> düzenlendi
            </Badge>
          )}
          {deleted && (
            <Badge tone="danger">
              <Trash2 className="h-2.5 w-2.5" /> silindi · {dateTime(m.deleted_at!)}
            </Badge>
          )}
        </header>

        {m.content ? (
          <p className="mt-1 text-sm break-words whitespace-pre-wrap text-foreground/90">
            {m.content}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground italic">(metin yok)</p>
        )}

        {m.attachments.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {m.attachments.map((a) => (
              <li key={a.url}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-3 w-3" /> {a.filename}
                </a>
              </li>
            ))}
          </ul>
        )}
        {m.embeds_count > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">{m.embeds_count} embed</p>
        )}

        {m.edits.length > 0 && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              düzenleme geçmişi ({m.edits.length})
            </summary>
            <ol className="mt-2 space-y-2 border-l border-border pl-3">
              {m.edits.map((e, i) => (
                <li key={i}>
                  <time className="text-muted-foreground/70">{dateTime(e.at)}</time>
                  <p className="break-words whitespace-pre-wrap text-foreground/70">
                    {e.content || "(boş)"}
                  </p>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </article>
  );
}
