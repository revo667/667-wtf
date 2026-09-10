import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/panel/api";
import {
  ActionResult,
  ConfirmButton,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "@/panel/actions";
import { checkFile, fileToDataUri } from "@/panel/files";
import { ago, dateTime } from "@/panel/format";
import { useMeta } from "@/panel/hooks";
import { useSession } from "@/panel/session";
import { Avatar, Badge, Card, Notice, selectClass } from "@/panel/ui";

export const Route = createFileRoute("/panel/sunucu")({
  component: ServerPage,
});

interface Emoji {
  id: string;
  name: string;
  animated: boolean;
  managed: boolean;
  available: boolean;
  url: string;
}

interface Sticker {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  url: string | null;
}

interface Settings {
  name: string;
  description: string | null;
  icon: string | null;
  verification_level: number;
  explicit_content_filter: number;
  system_channel_id: string | null;
  afk_channel_id: string | null;
  afk_timeout: number | null;
  vanity: string | null;
  features: string[];
  emojis: Emoji[];
  stickers: Sticker[];
}

interface Invite {
  code: string;
  channel: string;
  uses: number;
  max_uses: number;
  max_age: number;
  temporary: boolean;
  created_at: number;
  inviter: string | null;
}

interface Webhook {
  id: string;
  name: string | null;
  channel: string | null;
  creator: string | null;
  created_at: number;
  application: boolean;
}

const VERIFICATION = [
  "Yok",
  "Düşük (e-postası doğrulanmış)",
  "Orta (5 dk'dan eski hesap)",
  "Yüksek (10 dk'dır üye)",
  "En yüksek (telefon doğrulanmış)",
];
const CONTENT_FILTER = ["Kapalı", "Rolü olmayanların medyası", "Herkesin medyası"];
const AFK_TIMEOUTS = [60, 300, 900, 1800, 3600];
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

function ServerPage() {
  const session = useSession();
  if (session.level === "mod") {
    return (
      <Card>
        <Notice empty="Sunucu ayarları için admin yetkisi gerekiyor." />
      </Card>
    );
  }
  return <ServerAdmin />;
}

function ServerAdmin() {
  const q = useQuery({
    queryKey: ["panel", "server"],
    queryFn: () => api<Settings>("GET", "/server"),
  });
  if (q.error) return <Notice error={q.error} />;
  if (!q.data) return <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>;
  const s = q.data;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <General key={`${s.name}-${s.icon}`} s={s} />
      <Emojis emojis={s.emojis} />
      <Stickers stickers={s.stickers} />
      <Invites />
      <Webhooks />
    </div>
  );
}

function General({ s }: { s: Settings }) {
  const meta = useMeta();
  const channels = meta.data?.channels ?? [];
  const [name, setName] = useState(s.name);
  const [description, setDescription] = useState(s.description ?? "");
  const [verification, setVerification] = useState(s.verification_level);
  const [filter, setFilter] = useState(s.explicit_content_filter);
  const [system, setSystem] = useState(s.system_channel_id ?? "");
  const [afk, setAfk] = useState(s.afk_channel_id ?? "");
  const [afkTimeout, setAfkTimeout] = useState(s.afk_timeout ?? 300);
  const [icon, setIcon] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const save = usePanelAction(
    () => {
      const body: Record<string, unknown> = {};
      if (name.trim() !== s.name) body["name"] = name.trim();
      if (description !== (s.description ?? "")) body["description"] = description;
      if (verification !== s.verification_level) body["verification_level"] = verification;
      if (filter !== s.explicit_content_filter) body["explicit_content_filter"] = filter;
      if (system !== (s.system_channel_id ?? "")) body["system_channel_id"] = system;
      if (afk !== (s.afk_channel_id ?? "")) body["afk_channel_id"] = afk;
      if (afk && afkTimeout !== s.afk_timeout) body["afk_timeout"] = afkTimeout;
      if (icon !== null) body["icon"] = icon;
      return api("PATCH", "/server", body);
    },
    { success: "Sunucu ayarları kaydedildi" },
  );

  const pickIcon = async (file: File | undefined) => {
    if (!file) return;
    const err = checkFile(file, IMAGE_TYPES, 1024);
    setFileError(err);
    if (!err) setIcon(await fileToDataUri(file));
  };

  return (
    <Card title="Genel">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar src={icon === "" ? null : (icon ?? s.icon)} size={64} />
          <div className="flex flex-wrap gap-2">
            <label className={`${buttonClass} cursor-pointer`}>
              İkon seç
              <input
                type="file"
                accept={IMAGE_TYPES.join(",")}
                onChange={(e) => void pickIcon(e.target.files?.[0])}
                className="sr-only"
              />
            </label>
            {s.icon && (
              <button type="button" onClick={() => setIcon("")} className={buttonClass}>
                İkonu kaldır
              </button>
            )}
          </div>
        </div>
        {fileError && <p className="text-xs text-destructive">{fileError}</p>}
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Ad</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">
            Açıklama
            {!s.features.includes("COMMUNITY") &&
              " (Discord bunu sadece Community sunucularında saklar)"}
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            rows={2}
            className={`${inputClass} h-auto py-2`}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="block text-muted-foreground">Doğrulama seviyesi</span>
            <select
              value={verification}
              onChange={(e) => setVerification(Number(e.target.value))}
              className={`${selectClass} w-full`}
            >
              {VERIFICATION.map((v, i) => (
                <option key={i} value={i}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="block text-muted-foreground">Uygunsuz içerik filtresi</span>
            <select
              value={filter}
              onChange={(e) => setFilter(Number(e.target.value))}
              className={`${selectClass} w-full`}
            >
              {CONTENT_FILTER.map((v, i) => (
                <option key={i} value={i}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="block text-muted-foreground">Sistem mesajları kanalı</span>
            <select
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className={`${selectClass} w-full`}
            >
              <option value="">Kapalı</option>
              {channels
                .filter((c) => c.kind === "text")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="block text-muted-foreground">AFK kanalı</span>
            <div className="flex gap-2">
              <select
                value={afk}
                onChange={(e) => setAfk(e.target.value)}
                className={`${selectClass} min-w-0 flex-1`}
              >
                <option value="">Yok</option>
                {channels
                  .filter((c) => c.kind === "voice")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              {afk && (
                <select
                  value={afkTimeout}
                  onChange={(e) => setAfkTimeout(Number(e.target.value))}
                  aria-label="AFK süresi"
                  className={selectClass}
                >
                  {AFK_TIMEOUTS.map((t) => (
                    <option key={t} value={t}>
                      {t < 3600 ? `${t / 60} dk` : "1 saat"}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </label>
        </div>
        {s.vanity && (
          <p className="text-xs text-muted-foreground">
            Özel davet bağlantısı: discord.gg/{s.vanity} (değişiklik koruması Faz 4'te)
          </p>
        )}
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
      </div>
    </Card>
  );
}

function Emojis({ emojis }: { emojis: Emoji[] }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const create = usePanelAction(() => api("POST", "/server/emojis", { name, image }), {
    success: "Emoji yüklendi",
    onDone: () => {
      setName("");
      setImage(null);
    },
  });
  const remove = usePanelAction((id: string) => api("DELETE", `/server/emojis/${id}`), {
    success: "Emoji silindi",
  });

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const e = checkFile(file, IMAGE_TYPES, 256);
    setErr(e);
    if (!e) {
      setImage(await fileToDataUri(file));
      if (!name)
        setName(
          file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[^A-Za-z0-9_]/g, "_")
            .slice(0, 32),
        );
    }
  };

  return (
    <Card title={`Emojiler (${emojis.length})`}>
      <div className="flex flex-wrap items-center gap-2">
        {image && <Avatar src={image} size={32} />}
        <label className={`${buttonClass} cursor-pointer`}>
          Görsel seç
          <input
            type="file"
            accept={IMAGE_TYPES.join(",")}
            onChange={(e) => void pick(e.target.files?.[0])}
            className="sr-only"
          />
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          placeholder="emoji_adi"
          className={`${inputClass} max-w-48`}
        />
        <button
          type="button"
          disabled={!image || name.length < 2 || create.busy}
          onClick={() => create.run(undefined)}
          className={primaryButtonClass}
        >
          Yükle
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <ActionResult msg={create.msg ?? remove.msg} />
      <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
        {emojis.map((e) => (
          <li
            key={e.id}
            className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 text-center"
          >
            <img
              src={e.url}
              alt=""
              width={32}
              height={32}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-8 w-8 object-contain"
            />
            <span className="w-full truncate text-xs">:{e.name}:</span>
            {e.managed ? (
              <Badge>entegrasyon</Badge>
            ) : (
              <ConfirmButton
                label="sil"
                confirmText="Silinsin mi?"
                busy={remove.busy}
                onConfirm={() => remove.run(e.id)}
              />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Stickers({ stickers }: { stickers: Sticker[] }) {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const create = usePanelAction(
    () => api("POST", "/server/stickers", { name, tags, description, image }),
    {
      success: "Çıkartma yüklendi",
      onDone: () => {
        setName("");
        setTags("");
        setDescription("");
        setImage(null);
      },
    },
  );
  const remove = usePanelAction((id: string) => api("DELETE", `/server/stickers/${id}`), {
    success: "Çıkartma silindi",
  });

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const e = checkFile(file, ["image/png", "image/gif"], 512);
    setErr(e);
    if (!e) setImage(await fileToDataUri(file));
  };

  return (
    <Card title={`Çıkartmalar (${stickers.length})`}>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="ad"
          className={inputClass}
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          maxLength={200}
          placeholder="ilgili emoji (ör. 😀)"
          className={inputClass}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={100}
          placeholder="açıklama (isteğe bağlı)"
          className={`${inputClass} sm:col-span-2`}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {image && <Avatar src={image} size={32} />}
        <label className={`${buttonClass} cursor-pointer`}>
          PNG / GIF seç
          <input
            type="file"
            accept="image/png,image/gif"
            onChange={(e) => void pick(e.target.files?.[0])}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          disabled={!image || name.trim().length < 2 || !tags.trim() || create.busy}
          onClick={() => create.run(undefined)}
          className={primaryButtonClass}
        >
          Yükle
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <ActionResult msg={create.msg ?? remove.msg} />
      {stickers.length === 0 ? (
        <Notice empty="Çıkartma yok" />
      ) : (
        <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
          {stickers.map((st) => (
            <li
              key={st.id}
              className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 text-center"
            >
              {st.url ? (
                <img
                  src={st.url}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 object-contain"
                />
              ) : (
                <span className="h-16" />
              )}
              <span className="w-full truncate text-xs">{st.name}</span>
              <ConfirmButton
                label="sil"
                confirmText="Silinsin mi?"
                busy={remove.busy}
                onConfirm={() => remove.run(st.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const MAX_AGES = [
  { v: 1800, l: "30 dakika" },
  { v: 3600, l: "1 saat" },
  { v: 21600, l: "6 saat" },
  { v: 86400, l: "1 gün" },
  { v: 604800, l: "7 gün" },
  { v: 0, l: "süresiz" },
];

function Invites() {
  const meta = useMeta();
  const channels = (meta.data?.channels ?? []).filter((c) => c.kind !== "category");
  const q = useQuery({
    queryKey: ["panel", "invites"],
    queryFn: () => api<{ items: Invite[] }>("GET", "/invites"),
  });
  const [channel, setChannel] = useState("");
  const [maxAge, setMaxAge] = useState(86400);
  const [maxUses, setMaxUses] = useState(0);
  const create = usePanelAction(
    () =>
      api<{ code: string }>("POST", "/invites", {
        channel_id: channel,
        max_age: maxAge,
        max_uses: maxUses,
      }),
    { success: "Davet oluşturuldu" },
  );
  const remove = usePanelAction((code: string) => api("DELETE", `/invites/${code}`), {
    success: "Davet silindi",
  });

  return (
    <Card title="Davetler">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Kanal"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className={selectClass}
        >
          <option value="">Kanal seç…</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Süre"
          value={maxAge}
          onChange={(e) => setMaxAge(Number(e.target.value))}
          className={selectClass}
        >
          {MAX_AGES.map((a) => (
            <option key={a.v} value={a.v}>
              {a.l}
            </option>
          ))}
        </select>
        <select
          aria-label="Kullanım"
          value={maxUses}
          onChange={(e) => setMaxUses(Number(e.target.value))}
          className={selectClass}
        >
          {[0, 1, 5, 10, 25, 50, 100].map((u) => (
            <option key={u} value={u}>
              {u === 0 ? "sınırsız kullanım" : `${u} kullanım`}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!channel || create.busy}
          onClick={() => create.run(undefined)}
          className={primaryButtonClass}
        >
          Oluştur
        </button>
      </div>
      <ActionResult msg={create.msg ?? remove.msg} />
      {q.error ? (
        <Notice error={q.error} />
      ) : !q.data ? null : q.data.items.length === 0 ? (
        <Notice empty="Aktif davet yok" />
      ) : (
        <ul className="mt-3 divide-y divide-border/50">
          {q.data.items.map((i) => (
            <li key={i.code} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="font-mono">discord.gg/{i.code}</span>
              <span className="text-xs text-muted-foreground">
                #{i.channel} · {i.uses}
                {i.max_uses ? `/${i.max_uses}` : ""} kullanım · {i.inviter ?? "?"} ·{" "}
                {i.max_age ? `bitiş ${ago(i.created_at + i.max_age * 1000)}` : "süresiz"}
              </span>
              <span className="ml-auto">
                <ConfirmButton
                  label="sil"
                  confirmText="Davet silinsin mi?"
                  busy={remove.busy}
                  onConfirm={() => remove.run(i.code)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Webhooks() {
  const q = useQuery({
    queryKey: ["panel", "webhooks"],
    queryFn: () => api<{ items: Webhook[] }>("GET", "/webhooks"),
  });
  const remove = usePanelAction((id: string) => api("DELETE", `/webhooks/${id}`), {
    success: "Webhook silindi",
  });
  return (
    <Card title="Webhook'lar">
      <p className="mb-3 text-xs text-muted-foreground">
        Webhook'lar kanala bot gibi mesaj atabilir. Tanımadığın bir webhook görürsen sil.
      </p>
      <ActionResult msg={remove.msg} />
      {q.error ? (
        <Notice error={q.error} />
      ) : !q.data ? null : q.data.items.length === 0 ? (
        <Notice empty="Webhook yok" />
      ) : (
        <ul className="divide-y divide-border/50">
          {q.data.items.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span>{w.name ?? "(adsız)"}</span>
              {w.application && <Badge>uygulama</Badge>}
              <span className="text-xs text-muted-foreground">
                #{w.channel ?? "?"} · {w.creator ?? "?"} · {dateTime(w.created_at)}
              </span>
              <span className="ml-auto">
                <ConfirmButton
                  label="sil"
                  confirmText="Webhook silinsin mi?"
                  busy={remove.busy}
                  onConfirm={() => remove.run(w.id)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
