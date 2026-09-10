import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/panel/api";
import { ActionResult, ConfirmButton, primaryButtonClass, usePanelAction } from "@/panel/actions";
import { ago, dateTime } from "@/panel/format";
import { useSession } from "@/panel/session";
import { Badge, Card, Notice, Toggle } from "@/panel/ui";

export const Route = createFileRoute("/panel/yedekler")({
  component: BackupsPage,
});

interface Backup {
  id: number;
  at: number;
  kind: string;
  roles: number;
  channels: number;
  members: number;
}

interface BackupList {
  items: Backup[];
  enabled: boolean;
  keep: number;
}

interface Plan {
  roles: string[];
  channels: string[];
  member_roles: number;
  members: number;
}

interface Options {
  roles: boolean;
  channels: boolean;
  members: boolean;
}

function BackupsPage() {
  const session = useSession();
  if (session.level === "mod") {
    return (
      <Card>
        <Notice empty="Yedekler için admin yetkisi gerekiyor." />
      </Card>
    );
  }
  return <Backups owner={session.level === "owner"} />;
}

function Backups({ owner }: { owner: boolean }) {
  const q = useQuery({
    queryKey: ["panel", "backups"],
    queryFn: () => api<BackupList>("GET", "/backups"),
  });
  const [selected, setSelected] = useState<number | null>(null);
  const create = usePanelAction(() => api<{ id: number }>("POST", "/backups"), {
    success: "Yedek alındı",
  });

  if (q.error) return <Notice error={q.error} />;
  if (!q.data) return <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>;
  const d = q.data;
  const current = d.items.find((b) => b.id === selected);

  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_3fr]">
      <Card
        title="Yedekler"
        action={
          <button
            type="button"
            disabled={create.busy}
            onClick={() => create.run(undefined)}
            className={primaryButtonClass}
          >
            Şimdi yedekle
          </button>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground">
          {d.enabled
            ? `Günlük otomatik yedek açık; son ${d.keep} otomatik yedek saklanır.`
            : "Günlük otomatik yedek kapalı (Koruma sayfasından açılır)."}{" "}
          Elle alınan son 20 yedek ayrıca saklanır. Yedekte roller, kanallar, kanal izinleri ve
          kimde hangi rol olduğu bulunur; mesajlar yedeklenmez.
        </p>
        <ActionResult msg={create.msg} />
        {d.items.length === 0 ? (
          <Notice empty="Henüz yedek yok" />
        ) : (
          <ul className="mt-2 divide-y divide-border/50">
            {d.items.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  aria-pressed={selected === b.id}
                  onClick={() => setSelected(b.id)}
                  className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-card ${
                    selected === b.id ? "bg-primary/15" : ""
                  }`}
                >
                  <span className="font-medium">#{b.id}</span>
                  <Badge tone={b.kind === "manual" ? "accent" : "muted"}>
                    {b.kind === "manual" ? "elle" : "otomatik"}
                  </Badge>
                  <span className="text-xs text-muted-foreground" title={dateTime(b.at)}>
                    {ago(b.at)}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {b.roles} rol · {b.channels} kanal · {b.members} üye
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {current ? (
        <Restore key={current.id} backup={current} owner={owner} />
      ) : (
        <Card title="Geri yükleme">
          <Notice empty="Soldan bir yedek seç" />
        </Card>
      )}
    </div>
  );
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  return (
    <p>
      <span className="text-muted-foreground">{title}: </span>
      {items.length === 0
        ? "yok"
        : `${items.slice(0, 30).join(", ")}${items.length > 30 ? ` ve ${items.length - 30} tane daha` : ""}`}
    </p>
  );
}

function Restore({ backup, owner }: { backup: Backup; owner: boolean }) {
  const [opts, setOpts] = useState<Options>({ roles: true, channels: true, members: true });
  const qs = `roles=${opts.roles}&channels=${opts.channels}&members=${opts.members}`;
  const plan = useQuery({
    queryKey: ["panel", "backups", backup.id, "plan", qs],
    queryFn: () => api<Plan>("GET", `/backups/${backup.id}/plan?${qs}`),
    enabled: owner,
  });
  const restore = usePanelAction(() => api("POST", `/backups/${backup.id}/restore`, opts), {
    success: "Geri yükleme başladı; bitince Koruma olaylarında ve Telegram'da görünür",
  });
  const p = plan.data;
  const nothing = p && p.roles.length === 0 && p.channels.length === 0 && p.member_roles === 0;

  return (
    <Card title={`Yedek #${backup.id} · ${dateTime(backup.at)}`}>
      {!owner ? (
        <Notice empty="Geri yükleme sadece owner tarafından yapılabilir." />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Geri yükleme sadece eksik olanı tamamlar: silinmiş rolleri ve kanalları izinleriyle
            yeniden kurar, üyelere yedekte olup şimdi eksik olan rolleri verir. Mevcut rol ve
            kanallara dokunmaz, yasaklı yetkileri geri getirmez. Başlamadan önce mevcut durumun
            yedeği otomatik alınır.
          </p>
          <div className="flex flex-wrap gap-4">
            <Toggle
              checked={opts.roles}
              onChange={(roles) => setOpts({ ...opts, roles })}
              label="Silinen roller"
            />
            <Toggle
              checked={opts.channels}
              onChange={(channels) => setOpts({ ...opts, channels })}
              label="Silinen kanallar"
            />
            <Toggle
              checked={opts.members}
              onChange={(members) => setOpts({ ...opts, members })}
              label="Üyelerin rolleri"
            />
          </div>
          {plan.error ? (
            <Notice error={plan.error} />
          ) : !p ? (
            <p className="text-sm text-muted-foreground">Hesaplanıyor…</p>
          ) : (
            <div className="space-y-2 text-sm">
              <PlanList title="Yeniden kurulacak roller" items={p.roles} />
              <PlanList title="Yeniden kurulacak kanallar" items={p.channels.map((c) => `#${c}`)} />
              <p>
                <span className="text-muted-foreground">Geri verilecek rol ataması: </span>
                {p.member_roles} ({p.members} üye)
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {nothing ? (
              <span className="text-sm text-muted-foreground">
                Bu seçeneklerle geri yüklenecek eksik bir şey yok.
              </span>
            ) : (
              <ConfirmButton
                label="Geri yükle"
                confirmText="Yedek geri yüklensin mi?"
                busy={restore.busy || !p}
                onConfirm={() => restore.run(undefined)}
              />
            )}
            <ActionResult msg={restore.msg} />
          </div>
        </div>
      )}
    </Card>
  );
}
