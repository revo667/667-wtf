import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/panel/api";
import {
  ActionResult,
  ConfirmButton,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "@/panel/actions";
import { ago, dateTime } from "@/panel/format";
import { useLive } from "@/panel/live";
import { useSession } from "@/panel/session";
import { Avatar, Badge, Card, Notice, Segmented, Toggle } from "@/panel/ui";

export const Route = createFileRoute("/panel/koruma")({
  component: ProtectionPage,
});

interface Protection {
  guard: { enabled: boolean };
  bots: { enabled: boolean; allowed: string[] };
  vanity: { enabled: boolean; code: string | null };
}

interface BotRow {
  id: string;
  name: string;
  avatar: string;
}

interface Status {
  vanity_supported: boolean;
  vanity_current: string | null;
  unauthorized_bots: BotRow[];
  allowed_bots: { id: string; name: string | null }[];
  env_allowed_bots: string[];
}

interface ProtectionOut {
  settings: Protection;
  status: Status;
}

interface ProtectionEvent {
  id: number;
  at: number;
  module: string;
  severity: string;
  summary: string;
  actor_id: string | null;
  actor: string | null;
  target: string | null;
}

const MODULES: Record<string, string> = {
  guard: "Yetki koruması",
  bots: "İzinsiz bot",
  vanity: "Özel davet",
  panel: "Panel hesabı",
};

const SEVERITY: Record<string, { label: string; tone: "muted" | "accent" | "danger" }> = {
  info: { label: "bilgi", tone: "muted" },
  high: { label: "müdahale", tone: "danger" },
  critical: { label: "kritik", tone: "danger" },
};

const FORBIDDEN_LABELS = [
  "Yönetici",
  "Sunucuyu yönet",
  "Rolleri yönet",
  "Kanalları yönet",
  "Webhook'ları yönet",
  "Üyeleri yasakla",
  "Üyeleri at",
  "Zaman aşımı",
  "Takma adları yönet",
  "İfadeleri yönet",
  "Etkinlikleri yönet",
  "@everyone etiketle",
];

const SNOWFLAKE = /^\d{15,21}$/;

function normalize(p: Protection): Protection {
  return {
    guard: { enabled: p.guard.enabled },
    bots: { enabled: p.bots.enabled, allowed: [...new Set(p.bots.allowed)].sort() },
    vanity: { enabled: p.vanity.enabled, code: p.vanity.code?.trim() || null },
  };
}

function ProtectionPage() {
  const session = useSession();
  if (session.level === "mod") {
    return (
      <Card>
        <Notice empty="Koruma ayarları için admin yetkisi gerekiyor." />
      </Card>
    );
  }
  return <ProtectionAdmin owner={session.level === "owner"} me={session.username} />;
}

function ProtectionAdmin({ owner, me }: { owner: boolean; me: string }) {
  const q = useQuery({
    queryKey: ["panel", "protection"],
    queryFn: () => api<ProtectionOut>("GET", "/protection"),
  });
  if (q.error) return <Notice error={q.error} />;
  if (!q.data) return <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>;
  return (
    <div className="space-y-4">
      {!owner && (
        <p className="text-xs text-muted-foreground">
          Koruma ayarlarını sadece owner değiştirebilir; admin olarak görüntülüyorsun.
        </p>
      )}
      <ProtectionForm data={q.data} owner={owner} />
      <Accounts owner={owner} me={me} />
      <Events />
    </div>
  );
}

interface Account {
  username: string;
  level: string;
  sessions: number;
  frozen_at: number | null;
  frozen_reason: string | null;
  frozen_by: string | null;
}

function Accounts({ owner, me }: { owner: boolean; me: string }) {
  const q = useQuery({
    queryKey: ["panel", "accounts"],
    queryFn: () => api<{ items: Account[] }>("GET", "/accounts"),
  });
  const freeze = usePanelAction(
    (name: string) =>
      api("POST", `/accounts/${encodeURIComponent(name)}/freeze`, { reason: "owner kararı" }),
    { success: "Hesap donduruldu" },
  );
  const unfreeze = usePanelAction(
    (name: string) => api("POST", `/accounts/${encodeURIComponent(name)}/unfreeze`),
    { success: "Hesap açıldı" },
  );

  return (
    <Card title="Panel hesapları">
      <p className="mb-3 text-xs text-muted-foreground">
        Bir hesap 60 saniyede 5 ban/kick, 3 kanal/rol silme, 5 toplu silme, 10 susturma ya da 10
        emoji/davet/webhook silme sınırını aşarsa anında dondurulur ve oturumları kapanır. Son 5
        dakikadaki yasak ve susturmaları geri alınır. Dondurulan hesap giriş yapamaz; sadece owner
        açabilir.
      </p>
      {q.error ? (
        <Notice error={q.error} />
      ) : !q.data ? null : (
        <ul className="divide-y divide-border/50">
          {q.data.items.map((a) => (
            <li
              key={a.username}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
            >
              <span className="font-medium">{a.username}</span>
              <Badge>{a.level}</Badge>
              {a.frozen_at ? (
                <Badge tone="danger">donduruldu</Badge>
              ) : a.sessions > 0 ? (
                <Badge tone="accent">çevrimiçi</Badge>
              ) : null}
              {owner && a.username !== me && (
                <span className="ml-auto">
                  {a.frozen_at ? (
                    <ConfirmButton
                      label="Aç"
                      confirmText="Hesap açılsın mı?"
                      danger={false}
                      busy={unfreeze.busy}
                      onConfirm={() => unfreeze.run(a.username)}
                    />
                  ) : (
                    <ConfirmButton
                      label="Dondur"
                      confirmText="Hesap dondurulsun ve oturumları kapansın mı?"
                      busy={freeze.busy}
                      onConfirm={() => freeze.run(a.username)}
                    />
                  )}
                </span>
              )}
              {a.frozen_at && (
                <p className="w-full text-xs text-muted-foreground">
                  {ago(a.frozen_at)} · {a.frozen_by ?? "?"}
                  {a.frozen_reason ? ` · ${a.frozen_reason}` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <ActionResult msg={freeze.msg ?? unfreeze.msg} />
    </Card>
  );
}

function ProtectionForm({ data, owner }: { data: ProtectionOut; owner: boolean }) {
  const saved = normalize(data.settings);
  const status = data.status;
  const [form, setForm] = useState<Protection>(saved);
  const [botId, setBotId] = useState("");
  const dirty = JSON.stringify(normalize(form)) !== JSON.stringify(saved);

  const save = usePanelAction(() => api("PUT", "/protection", normalize(form)), {
    success: "Koruma ayarları kaydedildi",
  });
  const scan = usePanelAction(() => api<{ fixed: number }>("POST", "/protection/scan"), {
    success: "Tarama bitti",
  });
  const vanityTest = usePanelAction(() => api("POST", "/protection/vanity-test"), {
    success: "Test başarılı: bot davet bağlantısını geri alabiliyor",
  });
  const kick = usePanelAction(
    (id: string) => api("POST", `/members/${id}/kick`, { reason: "İzinsiz bot" }),
    { success: "Bot atıldı" },
  );

  const allow = (id: string) =>
    setForm({ ...form, bots: { ...form.bots, allowed: [...form.bots.allowed, id] } });
  const names = new Map(status.allowed_bots.map((b) => [b.id, b.name]));

  return (
    <div className={`space-y-4 ${owner ? "pb-20" : ""}`}>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Yetki koruması">
          <div className="space-y-4">
            <Toggle
              checked={form.guard.enabled}
              disabled={!owner}
              onChange={(enabled) => setForm({ ...form, guard: { enabled } })}
              label="Açık"
            />
            <p className="text-xs text-muted-foreground">
              Bu yetkiler bot rolü dışında hiçbir rolde ve kanal izninde duramaz. Görüldüğü anda
              kaldırılır, yapan kişi owner'lara bildirilir.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {FORBIDDEN_LABELS.map((l) => (
                <li key={l}>
                  <Badge>{l}</Badge>
                </li>
              ))}
            </ul>
            {owner && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!saved.guard.enabled || dirty || scan.busy}
                  onClick={() => scan.run(undefined)}
                  className={buttonClass}
                >
                  Şimdi tara
                </button>
                <ActionResult msg={scan.msg} />
              </div>
            )}
          </div>
        </Card>

        <Card title="İzinsiz bot">
          <div className="space-y-4">
            <Toggle
              checked={form.bots.enabled}
              disabled={!owner}
              onChange={(enabled) => setForm({ ...form, bots: { ...form.bots, enabled } })}
              label="Açık"
            />
            <p className="text-xs text-muted-foreground">
              İzin listesinde olmayan bir bot sunucuya eklenirse hemen atılır. Botu eklemeden önce
              ID'sini buraya ekle.
            </p>
            <div>
              <span className="mb-1.5 block text-xs text-muted-foreground">İzinli botlar</span>
              {form.bots.allowed.length === 0 && status.env_allowed_bots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Yok</p>
              ) : (
                <ul className="space-y-1.5">
                  {status.env_allowed_bots.map((id) => (
                    <li key={`env-${id}`} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs">{id}</span>
                      <Badge>sunucu ayarı</Badge>
                    </li>
                  ))}
                  {form.bots.allowed.map((id) => (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs">{id}</span>
                      {names.get(id) && (
                        <span className="text-muted-foreground">{names.get(id)}</span>
                      )}
                      {owner && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              bots: {
                                ...form.bots,
                                allowed: form.bots.allowed.filter((a) => a !== id),
                              },
                            })
                          }
                          className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                        >
                          kaldır
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {owner && (
              <div className="flex gap-2">
                <input
                  value={botId}
                  onChange={(e) => setBotId(e.target.value.trim())}
                  placeholder="Bot ID"
                  inputMode="numeric"
                  className={`${inputClass} min-w-0 flex-1 font-mono`}
                />
                <button
                  type="button"
                  disabled={!SNOWFLAKE.test(botId) || form.bots.allowed.includes(botId)}
                  onClick={() => {
                    allow(botId);
                    setBotId("");
                  }}
                  className={buttonClass}
                >
                  Ekle
                </button>
              </div>
            )}
            {status.unauthorized_bots.length > 0 && (
              <div>
                <span className="mb-1.5 block text-xs text-destructive">
                  Sunucuda izinsiz bot var
                </span>
                <ul className="space-y-2">
                  {status.unauthorized_bots.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <Avatar src={b.avatar} size={24} />
                      <span>{b.name}</span>
                      <span className="ml-auto flex gap-2">
                        {owner && !form.bots.allowed.includes(b.id) && (
                          <button type="button" onClick={() => allow(b.id)} className={buttonClass}>
                            İzin ver
                          </button>
                        )}
                        <ConfirmButton
                          label="At"
                          confirmText="Bot atılsın mı?"
                          busy={kick.busy}
                          onConfirm={() => kick.run(b.id)}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
                <ActionResult msg={kick.msg} />
              </div>
            )}
          </div>
        </Card>

        <Card title="Özel davet bağlantısı">
          <div className="space-y-4">
            <Toggle
              checked={form.vanity.enabled}
              disabled={!owner}
              onChange={(enabled) => setForm({ ...form, vanity: { ...form.vanity, enabled } })}
              label="Açık"
            />
            <p className="text-xs text-muted-foreground">
              Bağlantı kilitli koddan farklı bir koda çevrilirse bot hemen geri almaya çalışır;
              alamazsa owner'lara acil bildirim gider.
            </p>
            <label className="block space-y-1.5 text-sm">
              <span className="block text-muted-foreground">Kilitli kod</span>
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">discord.gg/</span>
                <input
                  value={form.vanity.code ?? ""}
                  disabled={!owner}
                  onChange={(e) =>
                    setForm({ ...form, vanity: { ...form.vanity, code: e.target.value } })
                  }
                  maxLength={32}
                  placeholder="ilk görülen kod kilitlenir"
                  className={`${inputClass} min-w-0 flex-1`}
                />
              </span>
            </label>
            <p className="text-sm">
              <span className="text-muted-foreground">Şu anki: </span>
              {status.vanity_current ? `discord.gg/${status.vanity_current}` : "yok"}
            </p>
            {!status.vanity_supported ? (
              <p className="text-xs text-muted-foreground">
                Bu sunucuda özel davet bağlantısı yok (3. seviye takviye gerekir). Koruma, bağlantı
                olduğunda devreye girer.
              </p>
            ) : (
              owner && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={vanityTest.busy}
                    onClick={() => vanityTest.run(undefined)}
                    className={buttonClass}
                  >
                    Zararsız test
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Bot bağlantıyı aynı koda yeniden ayarlamayı dener. Başarılıysa geri alma da
                    çalışıyor demektir.
                  </p>
                  <ActionResult msg={vanityTest.msg} />
                </div>
              )
            )}
          </div>
        </Card>
      </div>

      {owner && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            disabled={!dirty || save.busy}
            onClick={() => save.run(undefined)}
            className={primaryButtonClass}
          >
            Kaydet
          </button>
          {dirty && (
            <button type="button" onClick={() => setForm(saved)} className={buttonClass}>
              Değişiklikleri geri al
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {dirty ? "Kaydedilmemiş değişiklik var" : "Tüm değişiklikler kaydedildi"}
          </span>
          <ActionResult msg={save.msg} />
        </div>
      )}
    </div>
  );
}

type ModuleFilter = "" | "guard" | "bots" | "vanity" | "panel";

function Events() {
  const qc = useQueryClient();
  const live = useLive();
  const latestAt = live.events.find((e) => e.type === "protection")?.at;
  const [module, setModule] = useState<ModuleFilter>("");
  const q = useQuery({
    queryKey: ["panel", "protection", "events", module],
    queryFn: () =>
      api<{ items: ProtectionEvent[] }>(
        "GET",
        `/protection/events?limit=100${module ? `&module=${module}` : ""}`,
      ),
  });

  // Canlı akışa koruma olayı düşünce liste ve durum yenilenir.
  useEffect(() => {
    if (latestAt) void qc.invalidateQueries({ queryKey: ["panel", "protection"] });
  }, [latestAt, qc]);

  return (
    <Card
      title="Koruma olayları"
      action={
        <Segmented<ModuleFilter>
          label="Modül"
          value={module}
          onChange={setModule}
          options={[
            { value: "", label: "Tümü" },
            { value: "guard", label: "Yetki" },
            { value: "bots", label: "Bot" },
            { value: "vanity", label: "Davet" },
            { value: "panel", label: "Hesap" },
          ]}
        />
      }
    >
      {q.error ? (
        <Notice error={q.error} />
      ) : !q.data ? null : q.data.items.length === 0 ? (
        <Notice empty="Henüz koruma olayı yok" />
      ) : (
        <ul className="divide-y divide-border/50">
          {q.data.items.map((e) => {
            const sev = SEVERITY[e.severity] ?? { label: e.severity, tone: "muted" as const };
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <Badge tone={sev.tone}>{sev.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {MODULES[e.module] ?? e.module}
                </span>
                <span className="ml-auto text-xs text-muted-foreground" title={dateTime(e.at)}>
                  {ago(e.at)}
                </span>
                <p className="w-full">{e.summary}</p>
                {e.actor && (
                  <p className="w-full text-xs text-muted-foreground">Yapan: {e.actor}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
