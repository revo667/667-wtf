import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutTemplate, RefreshCw, Search, X } from "lucide-react";
import { api } from "@/panel/api";
import { buttonClass } from "@/panel/actions";
import { useDebounced, useMeta } from "@/panel/hooks";
import { useLive } from "@/panel/live";
import { MessageItem } from "@/panel/MessageItem";
import { DeleteMessageButton, PurgeTool } from "@/panel/MessageTools";
import { useSession } from "@/panel/session";
import type { MessagePage } from "@/panel/types";
import { Card, Notice, Segmented, selectClass } from "@/panel/ui";

type MessagesSearch = { author?: string; channel?: string };

// Snowflake'ler sayı olarak parse edilirse hassasiyet kaybolur; sadece rakamdan oluşan string kabul edilir.
const snowflake = (v: unknown) => (typeof v === "string" && /^\d{1,20}$/.test(v) ? v : undefined);

export const Route = createFileRoute("/panel/mesajlar")({
  validateSearch: (raw: Record<string, unknown>): MessagesSearch => {
    const out: MessagesSearch = {};
    const author = snowflake(raw["author"]);
    const channel = snowflake(raw["channel"]);
    if (author) out.author = author;
    if (channel) out.channel = channel;
    return out;
  },
  component: MessagesPage,
});

type Only = "" | "deleted" | "edited";

function MessagesPage() {
  const search = Route.useSearch();
  const isAdmin = useSession().level !== "mod";
  const navigate = useNavigate({ from: Route.fullPath });
  const [text, setText] = useState("");
  const q = useDebounced(text.trim(), 300);
  const [only, setOnly] = useState<Only>("");
  const channel = search.channel ?? "";
  const author = search.author ?? "";

  const meta = useMeta();
  const channels = (meta.data?.channels ?? []).filter((c) => c.kind !== "category");
  // Botun kendi mesajları Embed sekmesinde düzenlenebilir.
  const bot = useQuery({
    queryKey: ["panel", "bot"],
    queryFn: () => api<{ user: { id: string } }>("GET", "/bot"),
    enabled: isAdmin,
  });
  const botId = bot.data?.user.id;

  const msgs = useInfiniteQuery({
    queryKey: ["panel", "messages", q, channel, author, only],
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams({ q, channel, author, only, limit: "50" });
      if (pageParam) p.set("before", pageParam);
      return api<MessagePage>("GET", `/messages?${p.toString()}`);
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.next_before ?? undefined,
    placeholderData: keepPreviousData,
  });

  const live = useLive();
  const newCount = live.events.filter(
    (e) => e.type === "message" && e.at > msgs.dataUpdatedAt,
  ).length;
  const items = msgs.data?.pages.flatMap((p) => p.items) ?? [];

  const setChannel = (value: string) =>
    navigate({
      search: (prev) => {
        const next: MessagesSearch = { ...prev };
        if (value) next.channel = value;
        else delete next.channel;
        return next;
      },
    });
  const clearAuthor = () =>
    navigate({
      search: (prev) => {
        const next: MessagesSearch = { ...prev };
        delete next.author;
        return next;
      },
    });

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="grid gap-4">
          <Card title="Bot ile mesaj">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <p className="text-muted-foreground">
                Mesaj ve embed gönderme, botun mesajlarını düzenleme ve karşılama tasarımı Embed
                sekmesinde.
              </p>
              <Link to="/panel/embed" className={buttonClass}>
                <LayoutTemplate className="h-3.5 w-3.5" /> Embed sekmesi
              </Link>
            </div>
          </Card>
          <PurgeTool />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-56 flex-1 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 focus-within:border-accent">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Mesajlarda ara</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="mesajlarda ara (kelime başları eşleşir)"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </label>
        <select
          aria-label="Kanal"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className={selectClass}
        >
          <option value="">Tüm kanallar</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
        <Segmented<Only>
          label="Mesaj türü"
          value={only}
          onChange={setOnly}
          options={[
            { value: "", label: "tümü" },
            { value: "deleted", label: "silinenler" },
            { value: "edited", label: "düzenlenenler" },
          ]}
        />
      </div>

      {author && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          Yazar filtresi:{" "}
          <span className="font-mono text-foreground">{items[0]?.author ?? author}</span>
          <button
            type="button"
            onClick={clearAuthor}
            aria-label="Yazar filtresini kaldır"
            className="rounded-full border border-border p-0.5 hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </p>
      )}

      <Card
        title="Mesaj logu"
        action={
          newCount > 0 && (
            <button
              type="button"
              onClick={() => void msgs.refetch()}
              className="flex items-center gap-1.5 rounded-full border border-accent/50 px-3 py-1 text-xs text-accent hover:bg-accent/10"
            >
              <RefreshCw className="h-3 w-3" /> {newCount} yeni mesaj
            </button>
          )
        }
      >
        {msgs.error ? (
          <Notice error={msgs.error} />
        ) : msgs.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <Notice empty="Eşleşen mesaj yok" />
        ) : (
          <div className={`transition-opacity ${msgs.isPlaceholderData ? "opacity-60" : ""}`}>
            {items.map((m) => (
              <div key={m.id} className="relative">
                <MessageItem m={m} />
                <div className="absolute top-2 right-0 flex items-center gap-2">
                  {botId && m.author_id === botId && !m.deleted_at && (
                    <Link
                      to="/panel/embed"
                      search={{ hedef: "duzenle", kanal: m.channel_id, mesaj: m.id }}
                      className={buttonClass}
                    >
                      düzenle
                    </Link>
                  )}
                  <DeleteMessageButton m={m} />
                </div>
              </div>
            ))}
            {msgs.hasNextPage && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  disabled={msgs.isFetchingNextPage}
                  onClick={() => void msgs.fetchNextPage()}
                  className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {msgs.isFetchingNextPage ? "yükleniyor…" : "daha eski mesajlar"}
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
