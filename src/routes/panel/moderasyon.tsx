import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { api } from "@/panel/api";
import { ActionResult, ConfirmButton, usePanelAction } from "@/panel/actions";
import { ago, dateTime } from "@/panel/format";
import { MemberDrawer } from "@/panel/MemberDetail";
import { useSession } from "@/panel/session";
import { Avatar, Badge, Card, Notice } from "@/panel/ui";

export const Route = createFileRoute("/panel/moderasyon")({
  component: ModerationPage,
});

interface Ban {
  id: string;
  name: string;
  username: string;
  avatar: string;
  reason: string | null;
}

interface Punishment {
  id: number;
  user_id: string;
  name: string;
  avatar: string | null;
  kind: string;
  reason: string | null;
  actor: string;
  at: number;
  expires_at: number | null;
  revoked_at: number | null;
  revoked_by: string | null;
}

const KIND: Record<string, string> = { timeout: "Zaman aşımı", kick: "Atma", ban: "Yasaklama" };

function ModerationPage() {
  const session = useSession();
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const bans = useQuery({
    queryKey: ["panel", "bans"],
    queryFn: () => api<{ items: Ban[] }>("GET", "/bans"),
  });
  const history = useQuery({
    queryKey: ["panel", "punishments"],
    queryFn: () => api<{ items: Punishment[] }>("GET", "/punishments?limit=200"),
  });
  const unban = usePanelAction((id: string) => api("DELETE", `/bans/${id}`), {
    success: "Yasak kaldırıldı",
  });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card
        title={bans.data ? `${bans.data.items.length} yasaklı kullanıcı` : "Yasaklılar"}
        action={<ActionResult msg={unban.msg} />}
      >
        {bans.error ? (
          <Notice error={bans.error} />
        ) : !bans.data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        ) : bans.data.items.length === 0 ? (
          <Notice empty="Yasaklı kullanıcı yok" />
        ) : (
          <ul className="divide-y divide-border/50">
            {bans.data.items.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                <Avatar src={b.avatar} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {b.name} <span className="text-xs text-muted-foreground">@{b.username}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.reason ?? "sebep yok"}
                  </p>
                </div>
                {session.level !== "mod" && (
                  <ConfirmButton
                    label="Kaldır"
                    confirmText="Yasak kaldırılsın mı?"
                    danger={false}
                    busy={unban.busy}
                    onConfirm={() => unban.run(b.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Ceza geçmişi">
        {history.error ? (
          <Notice error={history.error} />
        ) : !history.data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        ) : history.data.items.length === 0 ? (
          <Notice empty="Henüz panelden ceza verilmedi" />
        ) : (
          <ul className="divide-y divide-border/50">
            {history.data.items.map((p) => {
              const active =
                !p.revoked_at && (p.kind === "ban" || (p.expires_at ?? 0) > Date.now());
              return (
                <li key={p.id} className="py-2.5">
                  <button
                    type="button"
                    onClick={() => setOpen(p.user_id)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <Avatar src={p.avatar} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        {p.name}
                        <Badge tone={p.kind === "ban" ? "danger" : "muted"}>
                          {KIND[p.kind] ?? p.kind}
                        </Badge>
                        {active && <Badge tone="accent">aktif</Badge>}
                        {p.revoked_at && <Badge>kaldırıldı · {p.revoked_by}</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.actor} · {dateTime(p.at)}
                        {p.expires_at && p.kind === "timeout"
                          ? ` · bitiş ${ago(p.expires_at)}`
                          : ""}
                      </p>
                      {p.reason && <p className="text-xs text-foreground/80">{p.reason}</p>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <MemberDrawer id={open} onClose={close} />
    </div>
  );
}
