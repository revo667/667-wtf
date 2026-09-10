import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bot, Mic, X } from "lucide-react";
import { api } from "./api";
import { DailyColumns } from "./charts";
import { ago, date, hours, num, roleHex } from "./format";
import { useMeta } from "./hooks";
import { MemberActions } from "./MemberActions";
import { MessageItem } from "./MessageItem";
import type { MemberDetail as Detail } from "./types";
import { Avatar, Badge, Card, Notice, StatTile, StatusDot } from "./ui";

const EVENT_LABEL: Record<string, string> = {
  join: "Sunucuya katıldı",
  leave: "Sunucudan ayrıldı",
};

/** Sağdan açılan üye detayı. Radix Dialog yerine (CSP'ye takılan <style> enjekte ediyor) sade bir çekmece. */
export function MemberDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!id) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  if (!id) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Üye detayı"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background px-5 py-6 sm:px-6">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <MemberDetailBody id={id} />
      </aside>
    </div>
  );
}

function MemberDetailBody({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["panel", "member", id],
    queryFn: () => api<Detail>("GET", `/members/${id}`),
  });
  const meta = useMeta();
  if (q.isPending) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  if (q.error) return <Notice error={q.error} />;

  const d = q.data;
  const m = d.member;
  const roles = (meta.data?.roles ?? []).filter((r) => m?.roles.includes(r.id));
  const s = d.stats;
  const name = m?.display_name ?? d.recent_messages[0]?.author ?? d.id;

  return (
    <div className="space-y-5 pr-8">
      <header className="flex items-center gap-4">
        <Avatar src={m?.avatar ?? d.recent_messages[0]?.avatar} size={64} />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold" style={{ color: roleHex(m?.color) }}>
            {name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {m ? `@${m.username}` : "Sunucuda değil"} · <span className="font-mono">{d.id}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {m && <StatusDot status={m.status} withLabel />}
            {m?.bot && (
              <Badge>
                <Bot className="h-2.5 w-2.5" /> bot
              </Badge>
            )}
            {m?.in_voice && (
              <Badge tone="accent">
                <Mic className="h-2.5 w-2.5" /> seste{" "}
                {d.profile.voice?.name ? `· ${d.profile.voice.name}` : ""}
              </Badge>
            )}
            {m?.timed_out_until && <Badge tone="danger">timeout · {ago(m.timed_out_until)}</Badge>}
          </div>
        </div>
      </header>

      {m && !m.bot && <MemberActions member={m} voiceChannelId={d.profile.voice?.id ?? null} />}

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Mesaj (30 gün)"
          value={num(s.messages_30d)}
          sub={`toplam ${num(s.messages_total)}`}
        />
        <StatTile
          label="Ses (30 gün)"
          value={hours(s.voice_seconds_30d)}
          sub={`toplam ${hours(s.voice_seconds_total)}`}
        />
        <StatTile
          label="Son mesaj"
          value={<span className="text-lg">{ago(s.last_message_at)}</span>}
        />
        <StatTile
          label="Son görülme"
          value={
            <span className="text-lg">
              {m && m.status !== "offline" ? "şu an" : ago(s.last_online_at)}
            </span>
          }
        />
      </div>

      <Card title="Günlük mesaj · son 30 gün">
        <DailyColumns
          data={s.daily.map((x) => ({ day: x.day, value: x.messages }))}
          name="Mesaj"
          format={num}
          height={140}
        />
      </Card>

      <Card title="Profil">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Sunucuya katılma</dt>
          <dd>{m?.joined_at ? `${date(m.joined_at)} (${ago(m.joined_at)})` : "—"}</dd>
          <dt className="text-muted-foreground">Hesap oluşturma</dt>
          <dd>{m ? `${date(m.created_at)} (${ago(m.created_at)})` : "—"}</dd>
          {d.profile.nick && (
            <>
              <dt className="text-muted-foreground">Takma ad</dt>
              <dd>{d.profile.nick}</dd>
            </>
          )}
          {d.profile.premium_since && (
            <>
              <dt className="text-muted-foreground">Boost</dt>
              <dd>{ago(d.profile.premium_since)}</dd>
            </>
          )}
        </dl>
        {roles.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: roleHex(r.color) ?? "#5d5669" }}
                />
                {r.name}
              </li>
            ))}
          </ul>
        )}
        {(d.profile.activities?.length ?? 0) > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {d.profile.activities!.map((a, i) => (
              <li key={i}>
                <span className="text-foreground">{a.name}</span>
                {a.details ? ` · ${a.details}` : ""}
                {a.state ? ` · ${a.state}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Son mesajlar"
        action={
          <Link
            to="/panel/mesajlar"
            search={{ author: d.id }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            tümü →
          </Link>
        }
      >
        {d.recent_messages.length === 0 ? (
          <Notice empty="Kayıtlı mesaj yok" />
        ) : (
          d.recent_messages.map((msg) => <MessageItem key={msg.id} m={msg} showAuthor={false} />)
        )}
      </Card>

      {d.events.length > 0 && (
        <Card title="Üye olayları">
          <ul className="space-y-1.5 text-sm">
            {d.events.map((e, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{EVENT_LABEL[e.kind] ?? e.kind}</span>
                <span className="text-xs text-muted-foreground">{ago(e.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
