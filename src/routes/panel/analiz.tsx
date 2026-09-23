import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Bot, MessageSquare, Mic, Search } from "lucide-react";
import { api } from "@/panel/api";
import { ago, hours, num } from "@/panel/format";
import { useDebounced } from "@/panel/hooks";
import { MemberDrawer } from "@/panel/MemberDetail";
import type { UserStatsOut } from "@/panel/types";
import { Avatar, Card, Notice, Segmented, selectClass, StatTile } from "@/panel/ui";

export const Route = createFileRoute("/panel/analiz")({
  component: AnalyticsPage,
});

// "0" = tüm zaman
type Period = "7" | "30" | "90" | "0";
type Sort = "messages" | "voice";
const PAGE = 50;

const periodLabel: Record<Period, string> = {
  "7": "son 7 gün",
  "30": "son 30 gün",
  "90": "son 90 gün",
  "0": "tüm zaman",
};

function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30");
  const [sort, setSort] = useState<Sort>("messages");
  const [text, setText] = useState("");
  const q = useDebounced(text.trim(), 250);
  const [bots, setBots] = useState<"" | "only" | "hide">("hide");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);

  // Filtre değişince ilk sayfaya dön.
  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(0);
    };

  const params = new URLSearchParams({
    days: period,
    sort,
    q,
    bots,
    offset: String(page * PAGE),
    limit: String(PAGE),
  });
  const stats = useQuery({
    queryKey: ["panel", "user-stats", params.toString()],
    queryFn: () =>
      api<UserStatsOut>("GET", `/stats/users?${params.toString()}`, undefined, {
        background: true,
      }),
    placeholderData: keepPreviousData,
  });

  const totals = stats.data?.totals;
  const total = stats.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Analiz</h1>
        <p className="text-xs text-muted-foreground">
          Üyelerin mesaj ve ses etkinliği · {periodLabel[period]}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="Toplam mesaj"
          value={totals ? num(totals.messages) : "…"}
          sub={periodLabel[period]}
        />
        <StatTile
          label="Toplam ses"
          value={totals ? hours(totals.voice_seconds) : "…"}
          sub={periodLabel[period]}
        />
        <StatTile
          label="Aktif kullanıcı"
          value={totals ? num(totals.active_users) : "…"}
          sub={`bu dönemde etkinliği olan ${bots === "hide" ? "insan" : "üye"}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-56 flex-1 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 focus-within:border-accent">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Kullanıcı ara</span>
          <input
            value={text}
            onChange={(e) => filter(setText)(e.target.value)}
            placeholder="ad, kullanıcı adı veya ID ile ara"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </label>
        <Segmented<Period>
          label="Dönem"
          value={period}
          onChange={filter(setPeriod)}
          options={[
            { value: "7", label: "7g" },
            { value: "30", label: "30g" },
            { value: "90", label: "90g" },
            { value: "0", label: "Tümü" },
          ]}
        />
        <Segmented<Sort>
          label="Sırala"
          value={sort}
          onChange={filter(setSort)}
          options={[
            { value: "messages", label: "Mesaj" },
            { value: "voice", label: "Ses" },
          ]}
        />
        <select
          aria-label="Botlar"
          value={bots}
          onChange={(e) => filter(setBots)(e.target.value as "" | "only" | "hide")}
          className={selectClass}
        >
          <option value="hide">Botları gizle</option>
          <option value="">Botlar dahil</option>
          <option value="only">Sadece botlar</option>
        </select>
      </div>

      <Card title={`${num(total)} kullanıcı`}>
        {stats.error ? (
          <Notice error={stats.error} />
        ) : stats.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        ) : stats.data.items.length === 0 ? (
          <Notice empty="Bu dönemde veriye uyan kullanıcı yok" />
        ) : (
          <div
            className={`overflow-x-auto transition-opacity ${stats.isPlaceholderData ? "opacity-60" : ""}`}
          >
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 text-right font-normal">#</th>
                  <th className="px-3 py-2 font-normal">Kullanıcı</th>
                  <th className="px-3 py-2 text-right font-normal whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> Mesaj
                    </span>
                  </th>
                  <th className="px-3 py-2 text-right font-normal whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Mic className="h-3.5 w-3.5" /> Ses
                    </span>
                  </th>
                  <th className="py-2 pl-3 text-right font-normal whitespace-nowrap">
                    Son etkinlik
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {stats.data.items.map((u, i) => (
                  <tr
                    key={u.id}
                    tabIndex={0}
                    onClick={() => setOpen(u.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setOpen(u.id);
                    }}
                    className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-background/50 focus:bg-background/50 focus:outline-none"
                  >
                    <td className="py-2 pr-3 text-right text-xs text-muted-foreground">
                      {page * PAGE + i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatar} size={32} />
                        <span className="min-w-0 truncate font-medium">{u.name}</span>
                        {u.bot && (
                          <span className="flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            <Bot className="h-2.5 w-2.5" /> bot
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{num(u.messages)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {u.voice_seconds > 0 ? hours(u.voice_seconds) : "—"}
                    </td>
                    <td className="py-2 pl-3 text-right text-xs whitespace-nowrap text-muted-foreground">
                      {ago(u.last_active_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-border px-3 py-1 hover:text-foreground disabled:opacity-40"
            >
              önceki
            </button>
            <span className="tabular-nums">
              {page + 1} / {pages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border px-3 py-1 hover:text-foreground disabled:opacity-40"
            >
              sonraki
            </button>
          </div>
        )}
      </Card>

      <MemberDrawer id={open} onClose={close} />
    </div>
  );
}
