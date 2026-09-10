import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { LogIn, LogOut, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { api } from "@/panel/api";
import { DailyColumns, JoinLeave, NEGATIVE, SERIES } from "@/panel/charts";
import { ago, compact, date, dayLabel, hours, num } from "@/panel/format";
import { useMeta } from "@/panel/hooks";
import { useLive } from "@/panel/live";
import { MemberDrawer } from "@/panel/MemberDetail";
import type { DayRow, LiveEvent, Overview as GuildOverview, StatsOut, TopRow } from "@/panel/types";
import {
  Avatar,
  Badge,
  Card,
  ChartCard,
  LegendItem,
  Notice,
  Segmented,
  StatTile,
} from "@/panel/ui";

export const Route = createFileRoute("/panel/")({
  component: Overview,
});

type Period = "7" | "30" | "90";
const NEW_ACCOUNT_MS = 7 * 86_400_000;

function DayTable({
  rows,
  columns,
}: {
  rows: DayRow[];
  columns: { label: string; value: (d: DayRow) => string }[];
}) {
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-card text-left text-muted-foreground">
        <tr>
          <th className="py-1 font-normal">Gün</th>
          {columns.map((c) => (
            <th key={c.label} className="py-1 text-right font-normal">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {[...rows].reverse().map((d) => (
          <tr key={d.day} className="border-t border-border/50">
            <td className="py-1">{dayLabel(d.day)}</td>
            {columns.map((c) => (
              <td key={c.label} className="py-1 text-right">
                {c.value(d)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TopList({
  rows,
  format,
  onOpen,
}: {
  rows: TopRow[];
  format: (v: number) => string;
  onOpen: (id: string) => void;
}) {
  if (rows.length === 0) return <Notice empty="Bu dönemde veri yok" />;
  return (
    <ol className="space-y-1">
      {rows.map((r, i) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onOpen(r.id)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-background/50"
          >
            <span className="w-4 text-right text-xs text-muted-foreground tabular-nums">
              {i + 1}
            </span>
            <Avatar src={r.avatar} size={24} />
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{format(r.value)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function FeedItem({ ev, channelName }: { ev: LiveEvent; channelName: (id: string) => string }) {
  switch (ev.type) {
    case "message":
      return (
        <>
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 truncate">
            <span className="text-foreground">{ev.author}</span>
            <span className="text-muted-foreground"> #{channelName(ev.channel_id)}: </span>
            {ev.content || <span className="text-muted-foreground italic">(ek)</span>}
          </p>
        </>
      );
    case "message_edit":
      return (
        <>
          <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 truncate text-muted-foreground">
            Mesaj düzenlendi #{channelName(ev.channel_id)}:{" "}
            <span className="text-foreground">{ev.content}</span>
          </p>
        </>
      );
    case "message_delete":
      return (
        <>
          <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="min-w-0 flex-1 truncate text-muted-foreground">
            {ev.ids.length} mesaj silindi #{channelName(ev.channel_id)}
          </p>
        </>
      );
    case "member_join":
      return (
        <>
          <LogIn className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <p className="min-w-0 flex-1 truncate">
            <span className="text-foreground">{ev.name}</span>
            <span className="text-muted-foreground">
              {" "}
              katıldı · hesap {ago(ev.account_created)}
            </span>{" "}
            {ev.at - ev.account_created < NEW_ACCOUNT_MS && <Badge tone="danger">yeni hesap</Badge>}
          </p>
        </>
      );
    case "member_leave":
      return (
        <>
          <LogOut className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 truncate">
            <span className="text-foreground">{ev.name}</span>
            <span className="text-muted-foreground"> ayrıldı</span>
          </p>
        </>
      );
    default:
      return null;
  }
}

function Overview() {
  const [period, setPeriod] = useState<Period>("30");
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);

  // Otomatik yenilemeler arka plan isteğidir; oturumun hareketsizlik süresini uzatmaz.
  const overview = useQuery({
    queryKey: ["panel", "overview"],
    queryFn: () => api<GuildOverview>("GET", "/guild", undefined, { background: true }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
  const stats = useQuery({
    queryKey: ["panel", "stats", period],
    queryFn: () => api<StatsOut>("GET", `/stats?days=${period}`, undefined, { background: true }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
  const meta = useMeta();
  const live = useLive();

  const channelById = new Map((meta.data?.channels ?? []).map((c) => [c.id, c.name]));
  const channelName = (id: string) => channelById.get(id) ?? id;
  const feed = live.events.filter((e) => e.type !== "voice").slice(0, 25);

  if (overview.error) {
    return (
      <Card>
        <Notice error={overview.error} />
      </Card>
    );
  }

  const g = overview.data;
  const days = stats.data?.days ?? [];
  const today = days.at(-1);
  const active = g ? g.status.online + g.status.idle + g.status.dnd : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <Avatar src={g?.icon} size={48} />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{g?.name ?? "…"}</h1>
          {g && (
            <p className="text-xs text-muted-foreground">
              {date(g.created_at)} tarihinde kuruldu · sahip {g.owner_name ?? g.owner_id}
              {g.vanity && ` · discord.gg/${g.vanity}`}
              {g.boosts > 0 && ` · seviye ${g.boost_tier}, ${g.boosts} boost`}
            </p>
          )}
        </div>
        {g && (
          <span className="ml-auto">
            {g.bot_ready ? (
              <Badge tone="accent">bot bağlı</Badge>
            ) : (
              <Badge tone="danger">bot bağlanıyor</Badge>
            )}
          </span>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Üye"
          value={g ? num(g.member_count) : "…"}
          sub={g && `${num(g.humans)} insan · ${num(g.bots)} bot`}
        />
        <StatTile
          label="Çevrimiçi"
          value={g ? num(active) : "…"}
          sub={
            g &&
            `${num(g.status.online)} aktif · ${num(g.status.idle)} boşta · ${num(g.status.dnd)} rahatsız etmeyin`
          }
        />
        <StatTile label="Seste" value={g ? num(g.in_voice) : "…"} sub="şu anda ses kanallarında" />
        <StatTile
          label="Bugün mesaj"
          value={today ? num(today.messages) : "…"}
          sub={today && `bugün ${today.joins} katılım · ${today.leaves} ayrılma`}
        />
      </div>

      <div className="flex items-center gap-3">
        <Segmented<Period>
          label="Dönem"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "7", label: "7 gün" },
            { value: "30", label: "30 gün" },
            { value: "90", label: "90 gün" },
          ]}
        />
        <span className="text-xs text-muted-foreground">
          İstatistikler dakikada bir güncellenir.
        </span>
      </div>

      {stats.error ? (
        <Card>
          <Notice error={stats.error} />
        </Card>
      ) : (
        <div className={`grid gap-4 xl:grid-cols-2 ${stats.isPlaceholderData ? "opacity-60" : ""}`}>
          <ChartCard
            title="Günlük mesaj"
            subtitle={`son ${period} gün`}
            table={
              <DayTable rows={days} columns={[{ label: "Mesaj", value: (d) => num(d.messages) }]} />
            }
          >
            <DailyColumns
              data={days.map((d) => ({ day: d.day, value: d.messages }))}
              name="Mesaj"
              format={num}
            />
          </ChartCard>
          <ChartCard
            title="Katılım ve ayrılma"
            subtitle={`son ${period} gün`}
            legend={
              <>
                <LegendItem color={SERIES} label="Katılım" />
                <LegendItem color={NEGATIVE} label="Ayrılma" />
              </>
            }
            table={
              <DayTable
                rows={days}
                columns={[
                  { label: "Katılım", value: (d) => num(d.joins) },
                  { label: "Ayrılma", value: (d) => num(d.leaves) },
                ]}
              />
            }
          >
            <JoinLeave data={days} />
          </ChartCard>
          <ChartCard
            title="Günlük ses süresi"
            subtitle={`son ${period} gün, saat`}
            table={
              <DayTable
                rows={days}
                columns={[{ label: "Ses", value: (d) => hours(d.voice_seconds) }]}
              />
            }
          >
            <DailyColumns
              data={days.map((d) => ({
                day: d.day,
                value: Math.round(d.voice_seconds / 360) / 10,
              }))}
              name="Ses (saat)"
              format={(v) => `${compact(v)} sa`}
            />
          </ChartCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="En çok mesaj">
              <TopList rows={stats.data?.top_messages ?? []} format={num} onOpen={setOpen} />
            </Card>
            <Card title="En çok seste">
              <TopList rows={stats.data?.top_voice ?? []} format={hours} onOpen={setOpen} />
            </Card>
          </div>
        </div>
      )}

      <Card
        title="Canlı akış"
        action={
          <span className="text-xs text-muted-foreground">
            {live.connected ? "bağlı" : "bağlanıyor…"}
          </span>
        }
      >
        {feed.length === 0 ? (
          <Notice empty="Panel açıldığından beri olay yok. Yeni mesajlar, katılımlar ve silinen mesajlar burada anında görünür." />
        ) : (
          <ul className="space-y-2 text-sm">
            {feed.map((ev, i) => (
              <li key={`${ev.type}-${ev.at}-${i}`} className="flex items-start gap-2">
                <FeedItem ev={ev} channelName={channelName} />
                <time className="shrink-0 text-xs text-muted-foreground/70">{ago(ev.at)}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <MemberDrawer id={open} onClose={close} />
    </div>
  );
}
