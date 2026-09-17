import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { api, streamSse } from "@/panel/api";
import {
  ActionResult,
  ConfirmButton,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "@/panel/actions";
import { BotProfile } from "@/panel/BotProfile";
import { Drawer } from "@/panel/Drawer";
import { BlocksEditor } from "@/panel/embed/BlocksEditor";
import { ClassicEditor } from "@/panel/embed/ClassicEditor";
import { emptyDoc, newEmbed, normalize, type Doc } from "@/panel/embed/doc";
import { MessagePreview } from "@/panel/embed/Preview";
import { dateTime, roleHex } from "@/panel/format";
import { useMeta } from "@/panel/hooks";
import { RolePicker } from "@/panel/RolePicker";
import { useSession } from "@/panel/session";
import type { RoleMeta } from "@/panel/types";
import { Avatar, Badge, Card, Notice, Segmented, Toggle, selectClass } from "@/panel/ui";

export const Route = createFileRoute("/panel/bot")({
  component: BotPage,
});

interface CommandRow {
  name: string;
  description: string;
  enabled: boolean;
  /** null: genel komut rolleri geçerli */
  roles: string[] | null;
}

interface GuildTag {
  role_id: string | null;
  enabled: boolean;
  auto_add: boolean;
  auto_remove: boolean;
}

interface BotInfo {
  user: { id: string; name: string; avatar: string };
  ready: boolean;
  voice: { channel_id: string; name: string | null } | null;
  default_roles: string[];
  commands: CommandRow[];
  guild_tag: GuildTag;
  /** Bu rollerdekiler /ban ile banlanamaz; sadece panelden admin/owner. */
  ban_protected_roles: string[];
  locked: { id: string; name: string; reason: string; at: number }[];
}

interface PanelButton {
  role_id: string;
  label: string;
  emoji: string | null;
  style: string;
}

interface RolePanel {
  id: number;
  channel_id: string;
  message_id: string | null;
  title: string;
  description: string;
  color: number;
  buttons: PanelButton[];
  /** Embed sekmesinin tam tasarımı; yoksa title/description/color'dan basit embed gider. */
  design: Doc | null;
  created_by: string;
  created_at: number;
  updated_at: number;
}

interface ReactionRow {
  message_id: string;
  channel_id: string;
  emoji_key: string;
  emoji: string;
  role_id: string;
  created_by: string;
  created_at: number;
}

interface LogLine {
  seq: number;
  at: number;
  level: string;
  target: string;
  text: string;
}

type Tab = "genel" | "profil" | "komutlar" | "paneller" | "log";

const TABS: { value: Tab; label: string }[] = [
  { value: "genel", label: "Genel" },
  { value: "profil", label: "Durum ve profil" },
  { value: "komutlar", label: "Komutlar" },
  { value: "paneller", label: "Rol panelleri" },
  { value: "log", label: "Terminal logu" },
];

/** Panelden/komuttan verilebilen roller: @everyone ve entegrasyon rolleri hariç. */
const assignable = (roles: RoleMeta[] | undefined) =>
  (roles ?? []).filter((r) => !r.managed && r.name !== "@everyone");

const smallButton =
  "rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background/60 hover:text-foreground";

function BotPage() {
  const session = useSession();
  const isOwner = session.level === "owner";
  const [tab, setTab] = useState<Tab>("genel");
  const q = useQuery({
    queryKey: ["panel", "bot"],
    queryFn: () => api<BotInfo>("GET", "/bot"),
    enabled: session.level !== "mod",
  });

  if (session.level === "mod") return <Notice empty="Bot sayfası admin ve owner içindir." />;

  let body;
  if (tab === "paneller") body = <RolePanels />;
  else if (tab === "profil") body = <BotProfile isOwner={isOwner} />;
  else if (tab === "log") body = <Terminal />;
  else if (q.error) body = <Notice error={q.error} />;
  else if (!q.data)
    body = <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>;
  else if (tab === "genel") body = <General info={q.data} isOwner={isOwner} />;
  else
    body = (
      <Commands
        key={JSON.stringify([q.data.default_roles, q.data.commands, q.data.ban_protected_roles])}
        info={q.data}
        isOwner={isOwner}
      />
    );

  return (
    <div className="space-y-4">
      <Segmented value={tab} options={TABS} onChange={setTab} label="Bot bölümleri" />
      {body}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Genel

function General({ info, isOwner }: { info: BotInfo; isOwner: boolean }) {
  const meta = useMeta();
  const voiceChannels = (meta.data?.channels ?? []).filter(
    (c) => c.kind === "voice" || c.kind === "stage",
  );
  const [channel, setChannel] = useState(info.voice?.channel_id ?? "");
  const join = usePanelAction(() => api("POST", "/bot/voice", { channel_id: channel }), {
    success: "Bot sese girdi",
  });
  const leave = usePanelAction(() => api("DELETE", "/bot/voice"), { success: "Bot sesten çıktı" });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Bot">
        <div className="flex items-center gap-3">
          <Avatar src={info.user.avatar} size={40} />
          <div>
            <p className="text-sm font-medium">{info.user.name}</p>
            <p className="text-xs text-muted-foreground">
              {info.ready ? "Discord'a bağlı" : "bağlanıyor…"}
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Ses:{" "}
            {info.voice ? (
              <span className="text-foreground">#{info.voice.name ?? info.voice.channel_id}</span>
            ) : (
              "seste değil"
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Ses kanalı"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className={selectClass}
            >
              <option value="">Ses kanalı seç…</option>
              {voiceChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!channel || join.busy}
              onClick={() => join.run(undefined)}
              className={primaryButtonClass}
            >
              Sese sok
            </button>
            {info.voice && (
              <button
                type="button"
                disabled={leave.busy}
                onClick={() => leave.run(undefined)}
                className={buttonClass}
              >
                Sesten çıkar
              </button>
            )}
          </div>
          <ActionResult msg={join.msg ?? leave.msg} />
          <p className="text-xs text-muted-foreground">
            Bot seste sadece durur, ses çalmaz. Discord'dan /join ve /leave ile de yapılır.
          </p>
        </div>
      </Card>
      <GuildTagCard key={JSON.stringify(info.guild_tag)} tag={info.guild_tag} />
      {info.locked.length > 0 && (
        <Card title="Komutları kilitlenenler" className="lg:col-span-2">
          <p className="mb-3 text-xs text-muted-foreground">
            /ban, /nuke ya da /toplurol sınırını aşanların Discord komutları kilitlenir.
          </p>
          <ul className="space-y-2">
            {info.locked.map((l) => (
              <LockedRow key={l.id} item={l} isOwner={isOwner} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function GuildTagCard({ tag }: { tag: GuildTag }) {
  const meta = useMeta();
  const roles = assignable(meta.data?.roles);
  const [form, setForm] = useState<GuildTag>(tag);
  const [given, setGiven] = useState<number | null>(null);
  const save = usePanelAction(() => api("PUT", "/bot/guild-tag", form), { success: "Kaydedildi" });
  const give = usePanelAction(
    async () => {
      const r = await api<{ count: number }>("POST", "/bot/guild-tag/give");
      setGiven(r.count);
    },
    { success: "Dağıtım başladı" },
  );

  return (
    <Card title="Sunucu etiketi rolü">
      <p className="mb-3 text-xs text-muted-foreground">
        Sunucunun etiketini profilinde taşıyana rol verilir, etiketi kaldırandan alınır. Discord'dan
        /guildrolesetup ile de ayarlanır.
      </p>
      <div className="space-y-3">
        <select
          aria-label="Etiket rolü"
          value={form.role_id ?? ""}
          onChange={(e) => setForm({ ...form, role_id: e.target.value || null })}
          className={`${selectClass} w-full`}
        >
          <option value="">Rol seç…</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-4">
          <Toggle
            checked={form.enabled}
            onChange={(v) => setForm({ ...form, enabled: v })}
            label="açık"
          />
          <Toggle
            checked={form.auto_add}
            onChange={(v) => setForm({ ...form, auto_add: v })}
            label="etiketi takana ver"
          />
          <Toggle
            checked={form.auto_remove}
            onChange={(v) => setForm({ ...form, auto_remove: v })}
            label="kaldırandan al"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={save.busy}
            onClick={() => save.run(undefined)}
            className={primaryButtonClass}
          >
            Kaydet
          </button>
          {tag.role_id && (
            <ConfirmButton
              label="Etiketi takanlara şimdi ver"
              danger={false}
              confirmText="Etiketi takıp rolü olmayan herkese verilsin mi?"
              busy={give.busy}
              onConfirm={() => give.run(undefined)}
            />
          )}
          <ActionResult msg={save.msg ?? give.msg} />
        </div>
        {given !== null && (
          <p className="text-xs text-muted-foreground">
            {given === 0
              ? "Etiketi takıp da rolü olmayan kimse yok."
              : `${given} kişiye arka planda veriliyor.`}
          </p>
        )}
      </div>
    </Card>
  );
}

function LockedRow({ item, isOwner }: { item: BotInfo["locked"][number]; isOwner: boolean }) {
  const unlock = usePanelAction(() => api("POST", `/bot/locks/${item.id}/release`), {
    success: "Kilit açıldı",
  });
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-0 flex-1">
        {item.name}{" "}
        <span className="text-xs text-muted-foreground">
          ({item.id}) · {item.reason} · {dateTime(item.at)}
        </span>
      </span>
      {isOwner && (
        <button
          type="button"
          disabled={unlock.busy}
          onClick={() => unlock.run(undefined)}
          className={buttonClass}
        >
          kilidi aç
        </button>
      )}
      <ActionResult msg={unlock.msg} />
    </li>
  );
}

// ---------------------------------------------------------------------------------------------
// Komutlar

function Commands({ info, isOwner }: { info: BotInfo; isOwner: boolean }) {
  const meta = useMeta();
  const roles = assignable(meta.data?.roles);
  const [defaults, setDefaults] = useState(info.default_roles);
  const [rows, setRows] = useState(info.commands);
  const [protectedRoles, setProtectedRoles] = useState(info.ban_protected_roles);
  const set = (name: string, patch: Partial<CommandRow>) =>
    setRows((rs) => rs.map((r) => (r.name === name ? { ...r, ...patch } : r)));
  const save = usePanelAction(
    () =>
      api("PUT", "/bot/commands", {
        default_roles: defaults,
        commands: Object.fromEntries(
          rows.map((r) => [r.name, { enabled: r.enabled, roles: r.roles }]),
        ),
        ban_protected_roles: protectedRoles,
      }),
    { success: "Komut yetkileri kaydedildi" },
  );

  return (
    <div className="space-y-4">
      <Card title="Genel komut rolleri">
        <p className="mb-3 text-xs text-muted-foreground">
          Aşağıda ayrı rol seçilmeyen komutları bu rollerdeki üyeler kullanabilir. Sunucu
          yöneticiliği muafiyet sağlamaz: rol yoksa kimse kullanamaz.
        </p>
        <RolePicker value={defaults} onChange={setDefaults} roles={roles} disabled={!isOwner} />
      </Card>
      <Card title="Sadece panelden banlanabilen roller">
        <p className="mb-3 text-xs text-muted-foreground">
          Bu rollerdeki üyeler Discord'da /ban ile banlanamaz; onları sadece panelden admin ya da
          owner banlayabilir (panelde ban zaten sadece admin ve owner'a açık).
        </p>
        <RolePicker
          value={protectedRoles}
          onChange={setProtectedRoles}
          roles={roles}
          disabled={!isOwner}
          emptyText="korumalı rol yok: /ban herkese kullanılabilir"
        />
      </Card>
      <Card title="Komutlar">
        <ul className="divide-y divide-border">
          {rows.map((c) => (
            <li key={c.name} className="flex flex-wrap items-start gap-3 py-3">
              <div className="w-52 shrink-0">
                <p className="font-mono text-sm">/{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap gap-4">
                  <Toggle
                    checked={c.enabled}
                    onChange={(v) => set(c.name, { enabled: v })}
                    label="açık"
                    disabled={!isOwner}
                  />
                  <Toggle
                    checked={c.roles !== null}
                    onChange={(v) => set(c.name, { roles: v ? [...defaults] : null })}
                    label="bu komut için ayrı roller"
                    disabled={!isOwner}
                  />
                </div>
                {c.roles === null ? (
                  <p className="text-xs text-muted-foreground">genel komut rolleri</p>
                ) : (
                  <RolePicker
                    value={c.roles}
                    onChange={(v) => set(c.name, { roles: v })}
                    roles={roles}
                    disabled={!isOwner}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {isOwner ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={save.busy}
            onClick={() => save.run(undefined)}
            className={primaryButtonClass}
          >
            Kaydet
          </button>
          <ActionResult msg={save.msg} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Komut yetkilerini sadece owner değiştirebilir.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Rol panelleri

const STYLES: { value: string; label: string; color: string }[] = [
  { value: "secondary", label: "gri", color: "#4e5058" },
  { value: "primary", label: "mavi", color: "#5865f2" },
  { value: "success", label: "yeşil", color: "#248046" },
  { value: "danger", label: "kırmızı", color: "#da373c" },
];

const MESSAGE_KINDS = ["text", "announcement", "voice", "stage"];

/** Standart emoji olduğu gibi; özel emoji (<:ad:id>) Discord CDN'inden görsel olarak. */
function EmojiView({ raw }: { raw: string }) {
  const m = /^<(a?):\w+:(\d+)>$/.exec(raw.trim());
  if (!m) return <span>{raw}</span>;
  return (
    <img
      src={`https://cdn.discordapp.com/emojis/${m[2]}.${m[1] ? "gif" : "png"}?size=32`}
      alt=""
      className="inline h-4 w-4"
    />
  );
}

/** Panelin rol butonları (mesaj tasarımının altında görünür, 5'erli satırlar). */
function RoleButtonsPreview({ buttons }: { buttons: PanelButton[] }) {
  if (buttons.length === 0)
    return <p className="text-xs text-muted-foreground italic">Henüz rol butonu yok.</p>;
  const rows: PanelButton[][] = [];
  for (let i = 0; i < buttons.length; i += 5) rows.push(buttons.slice(i, i + 5));
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex max-w-md flex-wrap gap-2">
          {row.map((b) => (
            <span
              key={b.role_id}
              className="inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm font-medium text-white"
              style={{
                backgroundColor: STYLES.find((s) => s.value === b.style)?.color ?? "#4e5058",
              }}
            >
              {b.emoji && <EmojiView raw={b.emoji} />}
              {b.label || "…"}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function RolePanels() {
  const meta = useMeta();
  const q = useQuery({
    queryKey: ["panel", "bot", "panels"],
    queryFn: () => api<{ panels: RolePanel[] }>("GET", "/bot/role-panels"),
  });
  const [editing, setEditing] = useState<RolePanel | "new" | null>(null);
  const close = useCallback(() => setEditing(null), []);
  const channelName = (id: string) => meta.data?.channels.find((c) => c.id === id)?.name ?? id;

  let list;
  if (q.error) list = <Notice error={q.error} />;
  else if (!q.data)
    list = <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>;
  else if (q.data.panels.length === 0)
    list = (
      <Notice empty="Henüz rol paneli yok. Yeni panel kur ya da Discord'da /rolpanel kullan." />
    );
  else
    list = (
      <div className="grid gap-4 lg:grid-cols-2">
        {q.data.panels.map((p) => (
          <Card
            key={p.id}
            title={p.title || "(başlıksız)"}
            action={
              <button type="button" onClick={() => setEditing(p)} className={smallButton}>
                düzenle
              </button>
            }
          >
            <p className="text-xs text-muted-foreground">
              #{channelName(p.channel_id)} · {p.buttons.length} rol · {p.created_by} ·{" "}
              {dateTime(p.updated_at)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {p.buttons.map((b) => (
                <Badge key={b.role_id}>
                  {b.emoji && <EmojiView raw={b.emoji} />}
                  {b.label}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setEditing("new")} className={primaryButtonClass}>
          <Plus className="h-4 w-4" /> Yeni rol paneli
        </button>
      </div>
      {list}
      <ReactionRoles />
      <Drawer
        open={editing !== null}
        onClose={close}
        title={editing === "new" ? "Yeni rol paneli" : "Rol panelini düzenle"}
      >
        {editing !== null && (
          <PanelEditor
            key={editing === "new" ? "new" : editing.id}
            panel={editing === "new" ? null : editing}
            onDone={close}
          />
        )}
      </Drawer>
    </div>
  );
}

/** Tasarım yoksa eski title/description/color'dan tek embed'li bir tasarım kurulur. */
function seedDesign(panel: RolePanel | null): Doc {
  if (panel?.design) return normalize(panel.design);
  const doc = emptyDoc();
  doc.embeds = [
    {
      ...newEmbed(),
      title: panel?.title ?? "",
      description: panel?.description ?? "",
      color: panel?.color ?? 0x5b2c6f,
    },
  ];
  return doc;
}

function PanelEditor({ panel, onDone }: { panel: RolePanel | null; onDone: () => void }) {
  const meta = useMeta();
  const botQ = useQuery({
    queryKey: ["panel", "bot"],
    queryFn: () => api<{ user: { name: string; avatar: string } }>("GET", "/bot"),
  });
  const bot = { name: botQ.data?.user.name ?? "bot", avatar: botQ.data?.user.avatar ?? null };
  const channels = (meta.data?.channels ?? []).filter((c) => MESSAGE_KINDS.includes(c.kind));
  const allRoles = meta.data?.roles ?? [];
  const roles = assignable(allRoles);
  const roleById = new Map(allRoles.map((r) => [r.id, r]));
  const [channel, setChannel] = useState(panel?.channel_id ?? "");
  const [design, setDesign] = useState<Doc>(() => seedDesign(panel));
  const [buttons, setButtons] = useState<PanelButton[]>(panel?.buttons ?? []);

  const body = () => ({ channel_id: channel, design, buttons });
  const save = usePanelAction(
    () =>
      panel
        ? api("PATCH", `/bot/role-panels/${panel.id}`, body())
        : api("POST", "/bot/role-panels", body()),
    { success: panel ? "Panel güncellendi" : "Panel gönderildi", onDone },
  );
  const remove = usePanelAction(() => api("DELETE", `/bot/role-panels/${panel?.id}`), {
    success: "Panel silindi",
    onDone,
  });

  const setButton = (i: number, patch: Partial<PanelButton>) =>
    setButtons((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const move = (i: number, d: number) =>
    setButtons((bs) => {
      const a = bs[i];
      const b = bs[i + d];
      if (!a || !b) return bs;
      const next = [...bs];
      next[i] = b;
      next[i + d] = a;
      return next;
    });
  const used = new Set(buttons.map((b) => b.role_id));
  const addable = roles.filter((r) => !used.has(r.id));
  const designFilled =
    design.content.trim() !== "" ||
    (design.mode === "embed"
      ? design.embeds.some(
          (e) =>
            e.title.trim() ||
            e.description.trim() ||
            e.author_name.trim() ||
            e.thumbnail.trim() ||
            e.image.trim() ||
            e.fields.length > 0,
        )
      : design.blocks.some((b) =>
          b.kind === "text"
            ? b.text.trim() !== "" || !!b.image?.url.trim()
            : b.kind === "gallery"
              ? b.items.some((m) => m.url.trim() !== "")
              : false,
        ));
  const ready = !!channel && buttons.length > 0 && designFilled;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <select
          aria-label="Kanal"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className={`${selectClass} w-full`}
        >
          <option value="">Panelin gönderileceği kanal…</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
        <Segmented
          value={design.mode}
          options={[
            { value: "embed", label: "Klasik embed" },
            { value: "blocks", label: "Blok düzeni" },
          ]}
          onChange={(mode) => setDesign({ ...design, mode })}
          label="Mesaj biçimi"
        />
        {design.mode === "embed" ? (
          <ClassicEditor doc={design} onChange={setDesign} vars={false} noButtons />
        ) : (
          <BlocksEditor doc={design} onChange={setDesign} vars={false} noButtons />
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">
          Butonlar <span className="text-xs text-muted-foreground">({buttons.length}/25)</span>
        </h3>
        {buttons.map((b, i) => {
          const r = roleById.get(b.role_id);
          return (
            <div
              key={b.role_id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2"
            >
              <span className="w-28 truncate text-sm" style={{ color: roleHex(r?.color) }}>
                @{r?.name ?? b.role_id}
              </span>
              <input
                value={b.label}
                onChange={(e) => setButton(i, { label: e.target.value })}
                maxLength={80}
                placeholder="buton yazısı"
                aria-label="Buton yazısı"
                className={`${inputClass} w-auto min-w-32 flex-1`}
              />
              <input
                value={b.emoji ?? ""}
                onChange={(e) => setButton(i, { emoji: e.target.value || null })}
                placeholder="emoji"
                aria-label="Emoji"
                className={`${inputClass} w-24`}
              />
              <select
                aria-label="Renk"
                value={b.style}
                onChange={(e) => setButton(i, { style: e.target.value })}
                className={selectClass}
              >
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className="flex">
                <button
                  type="button"
                  aria-label="Yukarı"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className={`${smallButton} disabled:opacity-30`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Aşağı"
                  disabled={i === buttons.length - 1}
                  onClick={() => move(i, 1)}
                  className={`${smallButton} disabled:opacity-30`}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Kaldır"
                  onClick={() => setButtons((bs) => bs.filter((_, j) => j !== i))}
                  className={`${smallButton} hover:text-destructive`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          );
        })}
        {buttons.length < 25 && addable.length > 0 && (
          <select
            aria-label="Rol ekle"
            value=""
            onChange={(e) => {
              const r = roleById.get(e.target.value);
              if (r)
                setButtons((bs) => [
                  ...bs,
                  { role_id: r.id, label: r.name, emoji: null, style: "secondary" },
                ]);
            }}
            className={selectClass}
          >
            <option value="">+ rol ekle…</option>
            {addable.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
        <p className="text-xs text-muted-foreground">
          Emoji: standart emoji ya da sunucunun özel emojisi (&lt;:ad:id&gt;). Yetkili roller
          (yönetim, ban, mesaj yönetme gibi) panelden dağıtılamaz.
        </p>
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground">Önizleme</p>
        <MessagePreview doc={design} meta={meta.data} bot={bot} />
        <RoleButtonsPreview buttons={buttons} />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={save.busy || !ready}
          onClick={() => save.run(undefined)}
          className={primaryButtonClass}
        >
          {panel ? "Güncelle" : "Gönder"}
        </button>
        {panel && (
          <ConfirmButton
            label="Paneli sil"
            confirmText="Panel ve Discord'daki mesajı silinsin mi?"
            busy={remove.busy}
            onConfirm={() => remove.run(undefined)}
          />
        )}
        <ActionResult msg={save.msg ?? remove.msg} />
      </div>
    </div>
  );
}

function ReactionRoles() {
  const meta = useMeta();
  const q = useQuery({
    queryKey: ["panel", "bot", "reactions"],
    queryFn: () => api<{ items: ReactionRow[] }>("GET", "/bot/reaction-roles"),
  });
  const channelName = (id: string) => meta.data?.channels.find((c) => c.id === id)?.name ?? id;
  const role = (id: string) => meta.data?.roles.find((r) => r.id === id);

  let body;
  if (q.error) body = <Notice error={q.error} />;
  else if (!q.data) body = null;
  else if (q.data.items.length === 0) body = <Notice empty="Tepki rolü yok" />;
  else
    body = (
      <ul className="divide-y divide-border">
        {q.data.items.map((r) => (
          <ReactionItem
            key={`${r.message_id}:${r.emoji_key}`}
            item={r}
            channel={channelName(r.channel_id)}
            role={role(r.role_id)}
          />
        ))}
      </ul>
    );

  return (
    <Card title="Tepki rolleri">
      <p className="mb-3 text-xs text-muted-foreground">
        Discord'da /roltepki ile eklenir: mesajdaki emojiye tepki veren rolü alır, tepkisini
        kaldıran bırakır.
      </p>
      {body}
    </Card>
  );
}

function ReactionItem({
  item,
  channel,
  role,
}: {
  item: ReactionRow;
  channel: string;
  role: RoleMeta | undefined;
}) {
  const remove = usePanelAction(
    () =>
      api("DELETE", `/bot/reaction-roles/${item.message_id}/${encodeURIComponent(item.emoji_key)}`),
    { success: "Kaldırıldı" },
  );
  return (
    <li className="flex flex-wrap items-center gap-2 py-2 text-sm">
      <span className="w-8 text-center">
        <EmojiView raw={item.emoji} />
      </span>
      <span className="min-w-0 flex-1">
        <span style={{ color: roleHex(role?.color) }}>@{role?.name ?? item.role_id}</span>{" "}
        <span className="text-xs text-muted-foreground">
          #{channel} · mesaj {item.message_id} · {item.created_by}
        </span>
      </span>
      <ConfirmButton
        label="kaldır"
        confirmText="Eşleşme kaldırılsın mı?"
        busy={remove.busy}
        onConfirm={() => remove.run(undefined)}
      />
      <ActionResult msg={remove.msg} />
    </li>
  );
}

// ---------------------------------------------------------------------------------------------
// Terminal logu

const MAX_LINES = 2000;

const LEVEL_TONE: Record<string, string> = {
  error: "text-destructive",
  warn: "text-amber-400",
  info: "text-accent",
};

const timeFmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type LevelFilter = "all" | "warn" | "error";

function Terminal() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [state, setState] = useState<"connecting" | "live" | "closed">("connecting");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");
  const [follow, setFollow] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  // Önce akış açılır, sonra son satırlar çekilir; ikisi sıra numarasına göre birleşir, arada satır kaçmaz.
  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    const merge = (incoming: LogLine[]) =>
      setLines((prev) => {
        const bySeq = new Map(prev.map((l) => [l.seq, l]));
        for (const l of incoming) bySeq.set(l.seq, l);
        return [...bySeq.values()].sort((a, b) => a.seq - b.seq).slice(-MAX_LINES);
      });
    void (async () => {
      while (alive) {
        try {
          await streamSse<LogLine>(
            "/bot/logs/stream",
            (ev) => {
              if (ev && typeof ev === "object" && "seq" in ev) merge([ev]);
            },
            ctrl.signal,
            () => {
              setState("live");
              api<{ lines: LogLine[] }>("GET", "/bot/logs?limit=500", undefined, {
                background: true,
              })
                .then((r) => merge(r.lines))
                .catch(() => {});
            },
          );
        } catch {
          // Ağ hatası: birazdan yeniden denenir.
        }
        if (!alive) break;
        setState("closed");
        await new Promise((r) => setTimeout(r, 3000));
      }
    })();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, []);

  const needle = search.trim().toLowerCase();
  const shown = lines.filter(
    (l) =>
      (level === "all" || l.level === "error" || (level === "warn" && l.level === "warn")) &&
      (!needle || `${l.target} ${l.text}`.toLowerCase().includes(needle)),
  );

  useEffect(() => {
    if (follow && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [shown.length, follow]);

  const onScroll = () => {
    const el = box.current;
    if (el && follow && el.scrollHeight - el.scrollTop - el.clientHeight > 40) setFollow(false);
  };

  return (
    <Card
      title="Terminal logu"
      action={
        <span className="text-xs text-muted-foreground">
          {state === "live"
            ? "canlı"
            : state === "connecting"
              ? "bağlanıyor…"
              : "bağlantı koptu, yeniden deneniyor…"}
        </span>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Segmented
          value={level}
          onChange={setLevel}
          label="Seviye"
          options={[
            { value: "all", label: "tümü" },
            { value: "warn", label: "uyarı ve hata" },
            { value: "error", label: "hata" },
          ]}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ara"
          aria-label="Logda ara"
          className={`${inputClass} max-w-56`}
        />
        <Toggle checked={follow} onChange={setFollow} label="en alta kaydır" />
        <span className="ml-auto text-xs text-muted-foreground">
          {shown.length} / {lines.length} satır
        </span>
      </div>
      <div
        ref={box}
        onScroll={onScroll}
        className="h-[60vh] overflow-auto rounded-lg border border-border bg-black/60 p-3 font-mono text-[11px] leading-relaxed"
      >
        {shown.length === 0 ? (
          <p className="text-muted-foreground">Kayıt yok</p>
        ) : (
          shown.map((l) => (
            <div key={l.seq} className="break-all whitespace-pre-wrap">
              <span className="text-muted-foreground">{timeFmt.format(l.at)} </span>
              <span className={`uppercase ${LEVEL_TONE[l.level] ?? "text-muted-foreground"}`}>
                {l.level.padEnd(5)}{" "}
              </span>
              <span className="text-muted-foreground/70">{l.target}: </span>
              <span>{l.text}</span>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Son 2000 satır tutulur; bot yeniden başlayınca liste sıfırlanır. Heroku'nun kendi
        yönlendirici logları burada yok.
      </p>
    </Card>
  );
}
