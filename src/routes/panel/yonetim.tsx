import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/panel/api";
import { Accounts, type Account } from "@/panel/Accounts";
import { ActionResult, ConfirmButton, buttonClass, usePanelAction } from "@/panel/actions";
import { ago, dateTime } from "@/panel/format";
import { useSession } from "@/panel/session";
import { Badge, Card, Notice, selectClass } from "@/panel/ui";

export const Route = createFileRoute("/panel/yonetim")({
  component: PanelAdminPage,
});

function PanelAdminPage() {
  const session = useSession();
  const admin = session.level !== "mod";
  const owner = session.level === "owner";
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Sessions owner={owner} />
        <Levels />
      </div>
      {admin && <Accounts owner={owner} me={session.username} />}
      {admin && <Audit owner={owner} />}
    </div>
  );
}

interface SessionRow {
  id: string;
  username: string;
  level: string;
  ip: string;
  created_at: number;
  idle_seconds: number;
  current: boolean;
}

function idle(sec: number): string {
  return sec < 60 ? `${sec} sn` : `${Math.floor(sec / 60)} dk`;
}

function Sessions({ owner }: { owner: boolean }) {
  const q = useQuery({
    queryKey: ["panel", "sessions"],
    queryFn: () =>
      api<{ sessions: SessionRow[] }>("GET", "/auth/sessions", undefined, { background: true }),
    refetchInterval: 15_000,
  });
  const kill = usePanelAction((id: string) => api("DELETE", `/auth/sessions/${id}`), {
    success: "Oturum kapatıldı",
  });
  const killOthers = usePanelAction(
    () => api<{ killed: number }>("DELETE", "/auth/sessions/others"),
    { success: "Diğer oturumlar kapatıldı" },
  );
  const list = q.data?.sessions ?? [];
  const others = list.filter((s) => !s.current).length;

  return (
    <Card
      title={owner ? "Açık oturumlar" : "Oturumun"}
      action={
        owner && others > 0 ? (
          <ConfirmButton
            label="Diğerlerini kapat"
            confirmText={`Senin dışındaki ${others} oturum kapansın mı?`}
            busy={killOthers.busy}
            onConfirm={() => killOthers.run(undefined)}
          />
        ) : null
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        Oturumlar sadece sunucunun belleğinde tutulur; 10 dk hareketsizlikte ya da 60 dk sonra
        biter, yeni girişte aynı hesabın eski oturumu kapanır. Sunucu yeniden başlarsa herkes çıkmış
        olur.
      </p>
      {q.error ? (
        <Notice error={q.error} />
      ) : !q.data ? null : (
        <ul className="divide-y divide-border/50">
          {list.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
              <span className="font-medium">{s.username}</span>
              <Badge>{s.level}</Badge>
              {s.current && <Badge tone="accent">bu oturum</Badge>}
              {owner && !s.current && (
                <span className="ml-auto">
                  <ConfirmButton
                    label="Kapat"
                    confirmText="Oturum kapansın mı?"
                    busy={kill.busy}
                    onConfirm={() => kill.run(s.id)}
                  />
                </span>
              )}
              <p className="w-full text-xs text-muted-foreground">
                {s.ip} · {ago(s.created_at)} açıldı · {idle(s.idle_seconds)} boşta
              </p>
            </li>
          ))}
        </ul>
      )}
      <ActionResult msg={kill.msg ?? killOthers.msg} />
    </Card>
  );
}

const LEVELS: { level: string; can: string[] }[] = [
  {
    level: "mod",
    can: [
      "üyeleri, mesajları ve istatistikleri görür",
      "takma ad değiştirir, susturur, atar, ses kanalından taşır",
      "tek mesaj siler, cezaları ve davetleri görür",
    ],
  },
  {
    level: "admin",
    can: [
      "mod'un yaptığı her şey",
      "rolleri, kanalları ve kanal izinlerini yönetir; yasaklar",
      "sunucu ayarları, emoji, çıkartma, davet ve webhook",
      "bot ile mesaj gönderir, toplu siler, otomasyonu ayarlar",
      "koruma ayarlarını ve denetim kaydını görür, elle yedek alır",
      "raid kilidini atar/açar, karantinadan çıkarır",
    ],
  },
  {
    level: "owner",
    can: [
      "admin'in yaptığı her şey",
      "koruma ayarları, yetkili logu ve yedekten geri yükleme",
      "panel hesaplarını dondurur/açar, tüm oturumları görür ve kapatır",
      "denetim kaydında IP adreslerini görür, log kanallarında silebilir",
    ],
  },
];

function Levels() {
  return (
    <Card title="Yetki seviyeleri">
      <ul className="space-y-3 text-sm">
        {LEVELS.map((l) => (
          <li key={l.level}>
            <Badge tone={l.level === "owner" ? "accent" : "muted"}>{l.level}</Badge>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {l.can.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Hesaplar ve seviyeler Heroku'daki PANEL_USERS ayarında durur ve bilerek panelden
        değiştirilemez: ele geçirilmiş bir oturum kendini ya da başkasını yükseltemesin. Değiştirmek
        için:{" "}
        <code className="font-mono text-foreground/80">
          heroku config:set PANEL_USERS=... -a admin-667-api &gt; /dev/null
        </code>
      </p>
    </Card>
  );
}

interface AuditItem {
  id: number;
  at: number;
  actor: string;
  action: string;
  title: string;
  target: string | null;
  reason: string | null;
  detail: string[];
  ip: string | null;
}

interface AuditPage {
  items: AuditItem[];
  next_before: number | null;
}

const KINDS: { value: string; label: string }[] = [
  { value: "", label: "Tüm kayıtlar" },
  { value: "auth", label: "Girişler ve oturumlar" },
  { value: "member", label: "Üyeler" },
  { value: "role", label: "Roller" },
  { value: "channel", label: "Kanallar" },
  { value: "message", label: "Mesajlar" },
  { value: "server", label: "Sunucu" },
  { value: "settings", label: "Ayarlar ve yedekler" },
  { value: "account", label: "Panel hesapları" },
];

const actorLabel = (a: string) => (a === "?" ? "tanımsız kullanıcı" : a);

function Audit({ owner }: { owner: boolean }) {
  const [kind, setKind] = useState("");
  const [actor, setActor] = useState("");
  const accounts = useQuery({
    queryKey: ["panel", "accounts"],
    queryFn: () => api<{ items: Account[] }>("GET", "/accounts"),
  });
  const q = useInfiniteQuery({
    queryKey: ["panel", "audit", kind, actor],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "50" });
      if (kind) params.set("kind", kind);
      if (actor) params.set("actor", actor);
      if (pageParam) params.set("before", String(pageParam));
      return api<AuditPage>("GET", `/audit?${params.toString()}`);
    },
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.next_before,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const actors = [...(accounts.data?.items.map((a) => a.username) ?? []), "koruma", "?"];

  return (
    <Card
      title="Denetim kaydı"
      action={
        <span className="flex flex-wrap gap-2">
          <select
            aria-label="Kişi"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className={selectClass}
          >
            <option value="">Herkes</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {actorLabel(a)}
              </option>
            ))}
          </select>
          <select
            aria-label="Tür"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={selectClass}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </span>
      }
    >
      {q.error ? (
        <Notice error={q.error} />
      ) : !q.data ? null : items.length === 0 ? (
        <Notice empty="Kayıt yok" />
      ) : (
        <>
          <ul className="divide-y divide-border/50">
            {items.map((it) => (
              <li key={it.id} className="py-2.5 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-medium">{actorLabel(it.actor)}</span>
                  <span>{it.title}</span>
                  {it.target && <span className="text-muted-foreground">→ {it.target}</span>}
                  <span className="ml-auto text-xs text-muted-foreground" title={dateTime(it.at)}>
                    {ago(it.at)}
                  </span>
                </div>
                {it.reason && <p className="text-xs">Sebep: {it.reason}</p>}
                {it.detail.length > 0 && (
                  <p className="text-xs break-words text-muted-foreground">
                    {it.detail.join(" · ")}
                  </p>
                )}
                {owner && it.ip && <p className="text-xs text-muted-foreground/70">IP: {it.ip}</p>}
              </li>
            ))}
          </ul>
          {q.hasNextPage && (
            <button
              type="button"
              disabled={q.isFetchingNextPage}
              onClick={() => void q.fetchNextPage()}
              className={`${buttonClass} mt-3`}
            >
              Daha eski
            </button>
          )}
        </>
      )}
    </Card>
  );
}
