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
import { ago, dateTime, roleHex } from "@/panel/format";
import { useMeta } from "@/panel/hooks";
import { useLive } from "@/panel/live";
import { useSession } from "@/panel/session";
import { Avatar, Badge, Card, Notice, Toggle, selectClass } from "@/panel/ui";

export const Route = createFileRoute("/panel/koruma")({
  component: ProtectionPage,
});

interface Protection {
  guard: { enabled: boolean };
  bots: { enabled: boolean; allowed: string[] };
  vanity: { enabled: boolean; code: string | null };
  spam: {
    enabled: boolean;
    flood_count: number;
    flood_seconds: number;
    duplicate_count: number;
    duplicate_seconds: number;
    max_lines: number;
    max_emojis: number;
    attachment_count: number;
    attachment_seconds: number;
  };
  mentions: { enabled: boolean; max_mentions: number; ghost_ping: boolean };
  raid: { enabled: boolean; joins: number; seconds: number; lock_minutes: number };
  new_accounts: { enabled: boolean; min_age_days: number; quarantine_role: string | null };
  exempt: { roles: string[]; channels: string[] };
  backups: { enabled: boolean; keep: number };
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
  raid_locked_until: number | null;
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
  spam: "Spam",
  mentions: "Etiket",
  raid: "Raid",
  quarantine: "Karantina",
  backup: "Yedek",
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
  const ids = (list: string[]) => [...new Set(list)].sort();
  return {
    guard: { enabled: p.guard.enabled },
    bots: { enabled: p.bots.enabled, allowed: ids(p.bots.allowed) },
    vanity: { enabled: p.vanity.enabled, code: p.vanity.code?.trim() || null },
    spam: { ...p.spam },
    mentions: { ...p.mentions },
    raid: { ...p.raid },
    new_accounts: { ...p.new_accounts, quarantine_role: p.new_accounts.quarantine_role || null },
    exempt: { roles: ids(p.exempt.roles), channels: ids(p.exempt.channels) },
    backups: { ...p.backups },
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
      <div className="grid gap-4 xl:grid-cols-2">
        <Quarantine />
        <Accounts owner={owner} me={me} />
      </div>
      <Events />
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.round(Number(e.target.value) || 0))}
        className={`${inputClass} w-24 text-right`}
      />
    </label>
  );
}

function ProtectionForm({ data, owner }: { data: ProtectionOut; owner: boolean }) {
  const saved = normalize(data.settings);
  const status = data.status;
  const meta = useMeta();
  const roles = (meta.data?.roles ?? []).filter((r) => !r.managed && r.name !== "@everyone");
  const channels = (meta.data?.channels ?? []).filter((c) => c.kind !== "other");
  const [form, setForm] = useState<Protection>(saved);
  const [botId, setBotId] = useState("");
  const [exemptChannel, setExemptChannel] = useState("");
  const dirty = JSON.stringify(normalize(form)) !== JSON.stringify(saved);
  const locked = !owner;

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
  const raidLock = usePanelAction(() => api("POST", "/protection/raid/lock", {}), {
    success: "Davetler ve DM'ler durduruldu",
  });
  const raidUnlock = usePanelAction(() => api("POST", "/protection/raid/unlock"), {
    success: "Kilit kaldırıldı",
  });

  const allow = (id: string) =>
    setForm({ ...form, bots: { ...form.bots, allowed: [...form.bots.allowed, id] } });
  const names = new Map(status.allowed_bots.map((b) => [b.id, b.name]));
  const setSpam = (patch: Partial<Protection["spam"]>) =>
    setForm({ ...form, spam: { ...form.spam, ...patch } });
  const setMentions = (patch: Partial<Protection["mentions"]>) =>
    setForm({ ...form, mentions: { ...form.mentions, ...patch } });
  const setRaid = (patch: Partial<Protection["raid"]>) =>
    setForm({ ...form, raid: { ...form.raid, ...patch } });
  const setNew = (patch: Partial<Protection["new_accounts"]>) =>
    setForm({ ...form, new_accounts: { ...form.new_accounts, ...patch } });
  const toggleExemptRole = (id: string) =>
    setForm({
      ...form,
      exempt: {
        ...form.exempt,
        roles: form.exempt.roles.includes(id)
          ? form.exempt.roles.filter((r) => r !== id)
          : [...form.exempt.roles, id],
      },
    });
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  return (
    <div className={`space-y-4 ${owner ? "pb-20" : ""}`}>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Yetki koruması">
          <div className="space-y-4">
            <Toggle
              checked={form.guard.enabled}
              disabled={locked}
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
              disabled={locked}
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
              disabled={locked}
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
                  disabled={locked}
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

        <Card title="Spam">
          <div className="space-y-3">
            <Toggle
              checked={form.spam.enabled}
              disabled={locked}
              onChange={(enabled) => setSpam({ enabled })}
              label="Açık"
            />
            <p className="text-xs text-muted-foreground">
              Tetiklenince mesajlar silinir. Ceza son 24 saatteki ihlal sayısına göre artar: DM
              uyarısı, 10 dk, 1 saat, 1 gün susturma (dördüncüden itibaren owner'lara Telegram).
            </p>
            <NumberField
              label="Mesaj seli: mesaj"
              value={form.spam.flood_count}
              min={3}
              max={50}
              disabled={locked}
              onChange={(flood_count) => setSpam({ flood_count })}
            />
            <NumberField
              label="Mesaj seli: saniye"
              value={form.spam.flood_seconds}
              min={2}
              max={60}
              disabled={locked}
              onChange={(flood_seconds) => setSpam({ flood_seconds })}
            />
            <NumberField
              label="Aynı mesaj: kez"
              value={form.spam.duplicate_count}
              min={2}
              max={20}
              disabled={locked}
              onChange={(duplicate_count) => setSpam({ duplicate_count })}
            />
            <NumberField
              label="Aynı mesaj: saniye"
              value={form.spam.duplicate_seconds}
              min={5}
              max={300}
              disabled={locked}
              onChange={(duplicate_seconds) => setSpam({ duplicate_seconds })}
            />
            <NumberField
              label="Mesajda en fazla satır"
              value={form.spam.max_lines}
              min={5}
              max={200}
              disabled={locked}
              onChange={(max_lines) => setSpam({ max_lines })}
            />
            <NumberField
              label="Mesajda en fazla emoji"
              value={form.spam.max_emojis}
              min={5}
              max={200}
              disabled={locked}
              onChange={(max_emojis) => setSpam({ max_emojis })}
            />
            <NumberField
              label="Dosya seli: dosya"
              value={form.spam.attachment_count}
              min={2}
              max={50}
              disabled={locked}
              onChange={(attachment_count) => setSpam({ attachment_count })}
            />
            <NumberField
              label="Dosya seli: saniye"
              value={form.spam.attachment_seconds}
              min={2}
              max={120}
              disabled={locked}
              onChange={(attachment_seconds) => setSpam({ attachment_seconds })}
            />
          </div>
        </Card>

        <Card title="Etiket ve muafiyetler">
          <div className="space-y-3">
            <Toggle
              checked={form.mentions.enabled}
              disabled={locked}
              onChange={(enabled) => setMentions({ enabled })}
              label="Toplu etiket koruması"
            />
            <NumberField
              label="Mesajda en fazla etiket"
              value={form.mentions.max_mentions}
              min={2}
              max={50}
              disabled={locked}
              onChange={(max_mentions) => setMentions({ max_mentions })}
            />
            <Toggle
              checked={form.mentions.ghost_ping}
              disabled={locked || !form.mentions.enabled}
              onChange={(ghost_ping) => setMentions({ ghost_ping })}
              label="Ghost-ping yakala"
            />
            <p className="text-xs text-muted-foreground">
              Birini etiketleyip mesajını 1 dakika içinde silen yakalanır; kanala kimin kimi
              etiketlediği yazılır (kimse yeniden etiketlenmez) ve ihlal sayılır.
            </p>
            <div className="border-t border-border pt-3">
              <span className="mb-1.5 block text-xs text-muted-foreground">
                Spam ve etiket korumasından muaf roller (sunucu sahibi zaten muaf)
              </span>
              <ul className="flex flex-wrap gap-1.5">
                {roles.map((r) => {
                  const on = form.exempt.roles.includes(r.id);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={locked}
                        onClick={() => toggleExemptRole(r.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                          on
                            ? "border-accent bg-accent/15 text-foreground"
                            : "border-border text-muted-foreground hover:border-accent"
                        }`}
                      >
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: roleHex(r.color) }}
                        />
                        {r.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <span className="mb-1.5 block text-xs text-muted-foreground">
                Muaf kanallar (kategori seçilirse içindekiler de)
              </span>
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {form.exempt.channels.map((id) => (
                  <li key={id}>
                    <Badge>
                      #{channelName(id)}
                      {owner && (
                        <button
                          type="button"
                          aria-label="Muafiyeti kaldır"
                          onClick={() =>
                            setForm({
                              ...form,
                              exempt: {
                                ...form.exempt,
                                channels: form.exempt.channels.filter((c) => c !== id),
                              },
                            })
                          }
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  </li>
                ))}
              </ul>
              {owner && (
                <div className="flex gap-2">
                  <select
                    aria-label="Muaf kanal"
                    value={exemptChannel}
                    onChange={(e) => setExemptChannel(e.target.value)}
                    className={`${selectClass} min-w-0 flex-1`}
                  >
                    <option value="">Kanal seç…</option>
                    {channels
                      .filter((c) => !form.exempt.channels.includes(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.kind === "category" ? "▸ " : "#"}
                          {c.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!exemptChannel}
                    onClick={() => {
                      setForm({
                        ...form,
                        exempt: {
                          ...form.exempt,
                          channels: [...form.exempt.channels, exemptChannel],
                        },
                      });
                      setExemptChannel("");
                    }}
                    className={buttonClass}
                  >
                    Ekle
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Raid kilidi">
          <div className="space-y-3">
            <Toggle
              checked={form.raid.enabled}
              disabled={locked}
              onChange={(enabled) => setRaid({ enabled })}
              label="Açık"
            />
            <p className="text-xs text-muted-foreground">
              Kısa sürede çok fazla kişi katılırsa davetler ve üyeler arası DM'ler durdurulur,
              dalgada katılanlar karantinaya alınır ve owner'lara acil bildirim gider.
            </p>
            <NumberField
              label="Katılım sayısı"
              value={form.raid.joins}
              min={3}
              max={200}
              disabled={locked}
              onChange={(joins) => setRaid({ joins })}
            />
            <NumberField
              label="Süre (saniye)"
              value={form.raid.seconds}
              min={3}
              max={120}
              disabled={locked}
              onChange={(seconds) => setRaid({ seconds })}
            />
            <NumberField
              label="Kilit süresi (dakika)"
              value={form.raid.lock_minutes}
              min={1}
              max={1440}
              disabled={locked}
              onChange={(lock_minutes) => setRaid({ lock_minutes })}
            />
            <div className="border-t border-border pt-3">
              {status.raid_locked_until ? (
                <p className="text-sm text-destructive">
                  Davetler ve DM'ler kapalı · {dateTime(status.raid_locked_until)} kadar
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Davetler açık</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {status.raid_locked_until ? (
                  <ConfirmButton
                    label="Kilidi aç"
                    confirmText="Davetler ve DM'ler açılsın mı?"
                    danger={false}
                    busy={raidUnlock.busy}
                    onConfirm={() => raidUnlock.run(undefined)}
                  />
                ) : (
                  <ConfirmButton
                    label="Şimdi kilitle"
                    confirmText={`Davetler ve DM'ler ${saved.raid.lock_minutes} dk durdurulsun mu?`}
                    busy={raidLock.busy}
                    onConfirm={() => raidLock.run(undefined)}
                  />
                )}
                <ActionResult msg={raidLock.msg ?? raidUnlock.msg} />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Yeni hesap filtresi">
          <div className="space-y-3">
            <Toggle
              checked={form.new_accounts.enabled}
              disabled={locked}
              onChange={(enabled) => setNew({ enabled })}
              label="Açık"
            />
            <NumberField
              label="En az hesap yaşı (gün)"
              value={form.new_accounts.min_age_days}
              min={1}
              max={90}
              disabled={locked}
              onChange={(min_age_days) => setNew({ min_age_days })}
            />
            <label className="block space-y-1.5 text-sm">
              <span className="block text-muted-foreground">Karantina rolü</span>
              <select
                value={form.new_accounts.quarantine_role ?? ""}
                disabled={locked}
                onChange={(e) => setNew({ quarantine_role: e.target.value || null })}
                className={`${selectClass} w-full`}
              >
                <option value="">Yok: susturma kullanılır</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-muted-foreground">
              Karantina rolü seçilirse üyenin rolleri alınır ve sadece bu rol verilir; rolün hangi
              kanalları göreceğini kanal izinlerinden sen ayarla. Seçilmezse üye, hesabı yeterince
              eskiyene kadar susturulur. Karantinadan çıkıp tekrar giren yine karantinaya düşer.
            </p>
          </div>
        </Card>

        <Card title="Yedekleme">
          <div className="space-y-3">
            <Toggle
              checked={form.backups.enabled}
              disabled={locked}
              onChange={(enabled) => setForm({ ...form, backups: { ...form.backups, enabled } })}
              label="Günlük otomatik yedek"
            />
            <NumberField
              label="Saklanacak yedek (gün)"
              value={form.backups.keep}
              min={3}
              max={365}
              disabled={locked}
              onChange={(keep) => setForm({ ...form, backups: { ...form.backups, keep } })}
            />
            <p className="text-xs text-muted-foreground">
              Roller, kanallar, kanal izinleri ve kimde hangi rol olduğu yedeklenir. Elle yedek ve
              geri yükleme Yedekler sayfasından yapılır.
            </p>
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

interface QuarantineRow {
  id: string;
  name: string;
  avatar: string | null;
  reason: string;
  at: number;
  mode: string;
  until: number | null;
  present: boolean;
}

function Quarantine() {
  const q = useQuery({
    queryKey: ["panel", "protection", "quarantine"],
    queryFn: () => api<{ items: QuarantineRow[] }>("GET", "/quarantine"),
  });
  const release = usePanelAction((id: string) => api("POST", `/quarantine/${id}/release`), {
    success: "Karantinadan çıkarıldı",
  });
  return (
    <Card title="Karantina">
      {q.error ? (
        <Notice error={q.error} />
      ) : !q.data ? null : q.data.items.length === 0 ? (
        <Notice empty="Karantinada kimse yok" />
      ) : (
        <ul className="divide-y divide-border/50">
          {q.data.items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
              <Avatar src={r.avatar} size={24} />
              <span className="font-medium">{r.name}</span>
              <Badge>{r.mode === "role" ? "rol" : "susturma"}</Badge>
              {!r.present && <Badge>sunucuda değil</Badge>}
              <span className="ml-auto">
                <ConfirmButton
                  label="Serbest bırak"
                  confirmText="Karantinadan çıkarılsın mı?"
                  danger={false}
                  busy={release.busy}
                  onConfirm={() => release.run(r.id)}
                />
              </span>
              <p className="w-full text-xs text-muted-foreground">
                {r.reason} · {ago(r.at)}
                {r.until ? ` · ${dateTime(r.until)} kadar` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <ActionResult msg={release.msg} />
    </Card>
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
        Bir hesap 60 saniyede 5 ban/kick, 3 kanal/rol silme, 5 toplu silme, 10 susturma, 10
        emoji/davet/webhook silme ya da 20 üye düzenleme sınırını aşarsa anında dondurulur ve
        oturumları kapanır. Son 5 dakikadaki yasak ve susturmaları geri alınır, sildiği kanal ve
        roller yeniden kurulur. Dondurulan hesap giriş yapamaz; sadece owner açabilir.
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

function Events() {
  const qc = useQueryClient();
  const live = useLive();
  const latestAt = live.events.find((e) => e.type === "protection")?.at;
  const [module, setModule] = useState("");
  const q = useQuery({
    queryKey: ["panel", "protection", "events", module],
    queryFn: () =>
      api<{ items: ProtectionEvent[] }>(
        "GET",
        `/protection/events?limit=100${module ? `&module=${module}` : ""}`,
      ),
  });

  // Canlı akışa koruma olayı düşünce liste, durum ve karantina yenilenir.
  useEffect(() => {
    if (latestAt) void qc.invalidateQueries({ queryKey: ["panel", "protection"] });
  }, [latestAt, qc]);

  return (
    <Card
      title="Koruma olayları"
      action={
        <select
          aria-label="Modül"
          value={module}
          onChange={(e) => setModule(e.target.value)}
          className={selectClass}
        >
          <option value="">Tümü</option>
          {Object.entries(MODULES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
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
