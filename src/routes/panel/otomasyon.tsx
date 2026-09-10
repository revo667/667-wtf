import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/panel/api";
import {
  ActionResult,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "@/panel/actions";
import { useMeta } from "@/panel/hooks";
import { useSession } from "@/panel/session";
import type { ChannelMeta, RoleMeta } from "@/panel/types";
import { Card, Notice, selectClass } from "@/panel/ui";

export const Route = createFileRoute("/panel/otomasyon")({
  component: AutomationPage,
});

interface Greeting {
  enabled: boolean;
  channel_id: string | null;
  message: string;
  embed: boolean;
  color: number;
}

interface Logs {
  members: string | null;
  messages: string | null;
  moderation: string | null;
  voice: string | null;
}

interface Automation {
  welcome: Greeting;
  leave: Greeting;
  autorole: { enabled: boolean; role_ids: string[] };
  logs: Logs;
}

const MAX_AUTOROLES = 10;

const LOGS: { key: keyof Logs; label: string; hint: string }[] = [
  { key: "members", label: "Üye logu", hint: "katılan, ayrılan, eklenen botlar" },
  { key: "messages", label: "Mesaj logu", hint: "silinen ve düzenlenen mesajlar" },
  { key: "moderation", label: "Moderasyon logu", hint: "panelden verilen cezalar" },
  { key: "voice", label: "Ses logu", hint: "sese giriş, çıkış, kanal değişimi" },
];

/** Boş seçimleri null yapar; kaydedilen ile formdaki karşılaştırılabilsin. */
function clean(a: Automation): Automation {
  const ch = (v: string | null) => (v ? v : null);
  return {
    welcome: { ...a.welcome, channel_id: ch(a.welcome.channel_id) },
    leave: { ...a.leave, channel_id: ch(a.leave.channel_id) },
    autorole: { ...a.autorole, role_ids: [...a.autorole.role_ids].sort() },
    logs: {
      members: ch(a.logs.members),
      messages: ch(a.logs.messages),
      moderation: ch(a.logs.moderation),
      voice: ch(a.logs.voice),
    },
  };
}

const hex = (n: number) => `#${(n & 0xffffff).toString(16).padStart(6, "0")}`;

function AutomationPage() {
  const session = useSession();
  if (session.level === "mod") {
    return (
      <Card>
        <Notice empty="Otomasyon ayarları için admin yetkisi gerekiyor." />
      </Card>
    );
  }
  return <AutomationAdmin />;
}

function AutomationAdmin() {
  const q = useQuery({
    queryKey: ["panel", "automation"],
    queryFn: () => api<Automation>("GET", "/automation"),
  });
  if (q.error) return <Notice error={q.error} />;
  if (!q.data) return <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>;
  return <AutomationForm saved={q.data} />;
}

function AutomationForm({ saved }: { saved: Automation }) {
  const meta = useMeta();
  const channels = (meta.data?.channels ?? []).filter(
    (c) => c.kind === "text" || c.kind === "announcement",
  );
  const roles = (meta.data?.roles ?? []).filter((r) => !r.managed && r.name !== "@everyone");
  const [form, setForm] = useState<Automation>(() => clean(saved));
  const dirty = JSON.stringify(clean(form)) !== JSON.stringify(clean(saved));

  const save = usePanelAction(() => api("PUT", "/automation", clean(form)), {
    success: "Otomasyon ayarları kaydedildi",
  });
  const test = usePanelAction(
    (kind: "welcome" | "leave") => api("POST", "/automation/test", { kind }),
    { success: "Önizleme kanala gönderildi" },
  );

  return (
    <div className="space-y-4 pb-20">
      <div className="grid gap-4 xl:grid-cols-2">
        <GreetingCard
          title="Karşılama mesajı"
          value={form.welcome}
          saved={saved.welcome}
          onChange={(welcome) => setForm({ ...form, welcome })}
          channels={channels}
          dirty={dirty}
          testing={test.busy}
          onTest={() => test.run("welcome")}
        />
        <GreetingCard
          title="Ayrılma mesajı"
          value={form.leave}
          saved={saved.leave}
          onChange={(leave) => setForm({ ...form, leave })}
          channels={channels}
          dirty={dirty}
          testing={test.busy}
          onTest={() => test.run("leave")}
        />
        <AutoRoleCard
          value={form.autorole}
          onChange={(autorole) => setForm({ ...form, autorole })}
          roles={roles}
        />
        <Card title="Log kanalları">
          <p className="mb-4 text-xs text-muted-foreground">
            Log kanallarını sadece yetkililerin görebildiği kanallardan seç. Log kanallarındaki
            olaylar tekrar loglanmaz.
          </p>
          <div className="space-y-3">
            {LOGS.map((l) => (
              <label key={l.key} className="block space-y-1.5 text-sm">
                <span className="block text-muted-foreground">
                  {l.label} <span className="text-xs text-muted-foreground/70">· {l.hint}</span>
                </span>
                <ChannelSelect
                  value={form.logs[l.key]}
                  onChange={(v) => setForm({ ...form, logs: { ...form.logs, [l.key]: v } })}
                  channels={channels}
                  empty="Kapalı"
                />
              </label>
            ))}
          </div>
        </Card>
      </div>
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
          <button type="button" onClick={() => setForm(clean(saved))} className={buttonClass}>
            Değişiklikleri geri al
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          {dirty ? "Kaydedilmemiş değişiklik var" : "Tüm değişiklikler kaydedildi"}
        </span>
        <ActionResult msg={save.msg ?? test.msg} />
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      <span>{label}</span>
    </label>
  );
}

function ChannelSelect({
  value,
  onChange,
  channels,
  empty,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  channels: ChannelMeta[];
  empty: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={`${selectClass} w-full`}
    >
      <option value="">{empty}</option>
      {channels.map((c) => (
        <option key={c.id} value={c.id}>
          #{c.name}
        </option>
      ))}
    </select>
  );
}

function GreetingCard({
  title,
  value,
  saved,
  onChange,
  channels,
  dirty,
  testing,
  onTest,
}: {
  title: string;
  value: Greeting;
  saved: Greeting;
  onChange: (g: Greeting) => void;
  channels: ChannelMeta[];
  dirty: boolean;
  testing: boolean;
  onTest: () => void;
}) {
  const set = (patch: Partial<Greeting>) => onChange({ ...value, ...patch });
  const preview = value.message
    .replaceAll("{user}", "@yeni-üye")
    .replaceAll("{name}", "yeni üye")
    .replaceAll("{server}", "667")
    .replaceAll("{count}", "1.375");
  return (
    <Card title={title}>
      <div className="space-y-4">
        <Toggle checked={value.enabled} onChange={(enabled) => set({ enabled })} label="Açık" />
        <label className="block space-y-1.5 text-sm">
          <span className="block text-muted-foreground">Kanal</span>
          <ChannelSelect
            value={value.channel_id}
            onChange={(channel_id) => set({ channel_id })}
            channels={channels}
            empty="Kanal seç…"
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="block text-muted-foreground">Mesaj</span>
          <textarea
            value={value.message}
            onChange={(e) => set({ message: e.target.value })}
            maxLength={1500}
            rows={3}
            className={`${inputClass} h-auto py-2`}
          />
          <span className="block text-xs text-muted-foreground">
            {"{user}"} üyeyi etiketler · {"{name}"} adı · {"{server}"} sunucu adı · {"{count}"} üye
            sayısı. @everyone ve roller asla etiketlenmez.
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <Toggle
            checked={value.embed}
            onChange={(embed) => set({ embed })}
            label="Gömülü (embed)"
          />
          {value.embed && (
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Renk</span>
              <input
                type="color"
                value={hex(value.color)}
                onChange={(e) => set({ color: parseInt(e.target.value.slice(1), 16) })}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
              />
            </label>
          )}
        </div>
        <div>
          <span className="mb-1.5 block text-xs text-muted-foreground">Görünüm</span>
          {value.embed ? (
            <div
              className="rounded-md border-l-4 bg-foreground/5 px-3 py-2 text-sm whitespace-pre-wrap"
              style={{ borderLeftColor: hex(value.color) }}
            >
              {preview || <span className="text-muted-foreground">(boş)</span>}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {preview || <span className="text-muted-foreground">(boş)</span>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={dirty || !saved.channel_id || testing}
            onClick={onTest}
            className={buttonClass}
          >
            Kanala önizleme gönder
          </button>
          <span className="text-xs text-muted-foreground">
            {dirty
              ? "Önizleme için önce kaydet"
              : !saved.channel_id
                ? "Önce bir kanal seç"
                : "Üye yerine bot kullanılır"}
          </span>
        </div>
      </div>
    </Card>
  );
}

function AutoRoleCard({
  value,
  onChange,
  roles,
}: {
  value: Automation["autorole"];
  onChange: (v: Automation["autorole"]) => void;
  roles: RoleMeta[];
}) {
  const toggle = (id: string) =>
    onChange({
      ...value,
      role_ids: value.role_ids.includes(id)
        ? value.role_ids.filter((r) => r !== id)
        : [...value.role_ids, id],
    });
  const full = value.role_ids.length >= MAX_AUTOROLES;
  return (
    <Card title="Otomatik rol">
      <div className="space-y-4">
        <Toggle
          checked={value.enabled}
          onChange={(enabled) => onChange({ ...value, enabled })}
          label="Katılan üyelere ver"
        />
        <p className="text-xs text-muted-foreground">
          Botlara verilmez. Yasaklı yetkisi olan ya da botun rolünden yüksek roller seçilemez; rol
          sonradan böyle olursa katılma anında atlanır. En fazla {MAX_AUTOROLES} rol.
        </p>
        {roles.length === 0 ? (
          <Notice empty="Rol yok" />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {roles.map((r) => {
              const on = value.role_ids.includes(r.id);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={!on && full}
                    onClick={() => toggle(r.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40 ${
                      on
                        ? "border-accent bg-accent/15 text-foreground"
                        : "border-border text-muted-foreground hover:border-accent"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: r.color ? hex(r.color) : "currentColor" }}
                    />
                    {r.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
