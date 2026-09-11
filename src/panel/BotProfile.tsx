import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Gamepad2, Headphones, Radio, Trophy, Tv, type LucideIcon } from "lucide-react";
import { api } from "./api";
import {
  ActionResult,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "./actions";
import { checkFile, fileToDataUri } from "./files";
import { Card, Notice, Segmented, selectClass } from "./ui";

type Status = "online" | "idle" | "dnd" | "invisible";
type Kind = "none" | "playing" | "streaming" | "listening" | "watching" | "competing" | "custom";

interface Presence {
  status: Status;
  kind: Kind;
  name: string;
  state: string;
  url: string;
}

interface ProfileInfo {
  presence: Presence;
  global: {
    id: string;
    username: string;
    avatar: string | null;
    banner: string | null;
    face: string;
  };
  server: { nick: string | null; avatar: string | null; banner: string | null; bio: string };
}

const STATUSES: { value: Status; label: string; color: string }[] = [
  { value: "online", label: "Çevrimiçi", color: "#23a55a" },
  { value: "idle", label: "Boşta", color: "#f0b232" },
  { value: "dnd", label: "Rahatsız etmeyin", color: "#f23f43" },
  { value: "invisible", label: "Görünmez", color: "#80848e" },
];

const KINDS: { value: Kind; label: string; name: string; icon: LucideIcon | null }[] = [
  { value: "none", label: "Aktivite yok", name: "", icon: null },
  { value: "playing", label: "Oynuyor", name: "Oyun adı", icon: Gamepad2 },
  { value: "streaming", label: "Yayında", name: "Yayın başlığı", icon: Radio },
  { value: "listening", label: "Dinliyor", name: "Ne dinliyor", icon: Headphones },
  { value: "watching", label: "İzliyor", name: "Ne izliyor", icon: Tv },
  { value: "competing", label: "Yarışıyor", name: "Neyde yarışıyor", icon: Trophy },
  { value: "custom", label: "Özel durum", name: "", icon: null },
];

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

/** Bot sayfası › Durum ve profil. */
export function BotProfile({ isOwner }: { isOwner: boolean }) {
  const q = useQuery({
    queryKey: ["panel", "bot-profile"],
    queryFn: () => api<ProfileInfo>("GET", "/bot/profile"),
  });
  if (q.error) return <Notice error={q.error} />;
  if (!q.data) return <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>;
  return <ProfileForms info={q.data} isOwner={isOwner} />;
}

/**
 * Görsel seçici. `value`: null değişmedi, "" kaldır, data URI yeni görsel.
 * `current` Discord'daki şu anki görsel.
 */
function ImagePick({
  label,
  value,
  current,
  onChange,
  maxKb,
  wide = false,
  disabled = false,
}: {
  label: string;
  value: string | null;
  current: string | null;
  onChange: (v: string | null) => void;
  maxKb: number;
  wide?: boolean;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const shown = value === "" ? null : (value ?? current);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    const err = checkFile(file, IMAGE_TYPES, maxKb);
    setError(err);
    if (!err) onChange(await fileToDataUri(file));
  };
  return (
    <div className="space-y-1.5 text-sm">
      <span className="block text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        {shown ? (
          <img
            src={shown}
            alt=""
            referrerPolicy="no-referrer"
            className={`${wide ? "h-14 w-36 rounded-md" : "h-14 w-14 rounded-full"} bg-muted object-cover`}
          />
        ) : (
          <span
            className={`${wide ? "h-14 w-36 rounded-md" : "h-14 w-14 rounded-full"} grid place-items-center bg-muted text-[10px] text-muted-foreground`}
          >
            yok
          </span>
        )}
        {!disabled && (
          <div className="flex flex-wrap gap-2">
            <label className={`${buttonClass} cursor-pointer`}>
              Seç
              <input
                type="file"
                accept={IMAGE_TYPES.join(",")}
                onChange={(e) => void pick(e.target.files?.[0])}
                className="sr-only"
              />
            </label>
            {(current || value) && value !== "" && (
              <button type="button" onClick={() => onChange("")} className={buttonClass}>
                Kaldır
              </button>
            )}
            {value !== null && (
              <button type="button" onClick={() => onChange(null)} className={buttonClass}>
                Vazgeç
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ProfileForms({ info, isOwner }: { info: ProfileInfo; isOwner: boolean }) {
  const [presence, setPresence] = useState<Presence>(info.presence);
  const [nick, setNick] = useState(info.server.nick ?? "");
  const [bio, setBio] = useState(info.server.bio);
  const [sAvatar, setSAvatar] = useState<string | null>(null);
  const [sBanner, setSBanner] = useState<string | null>(null);
  const [username, setUsername] = useState(info.global.username);
  const [gAvatar, setGAvatar] = useState<string | null>(null);
  const [gBanner, setGBanner] = useState<string | null>(null);
  const [view, setView] = useState<"server" | "global">("server");

  const setP = (patch: Partial<Presence>) => setPresence((p) => ({ ...p, ...patch }));
  const presenceDirty = JSON.stringify(presence) !== JSON.stringify(info.presence);
  const savePresence = usePanelAction(() => api("PUT", "/bot/presence", presence), {
    success: "Durum güncellendi",
  });

  const serverBody = () => {
    const body: Record<string, string> = {};
    if (nick.trim() !== (info.server.nick ?? "")) body["nick"] = nick.trim();
    if (bio.trim() !== info.server.bio) body["bio"] = bio.trim();
    if (sAvatar !== null) body["avatar"] = sAvatar;
    if (sBanner !== null) body["banner"] = sBanner;
    return body;
  };
  const saveServer = usePanelAction(() => api("PATCH", "/bot/profile/server", serverBody()), {
    success: "Sunucu profili güncellendi",
    onDone: () => {
      setSAvatar(null);
      setSBanner(null);
    },
  });

  const globalBody = () => {
    const body: Record<string, string> = {};
    if (username.trim() !== info.global.username) body["username"] = username.trim();
    if (gAvatar !== null) body["avatar"] = gAvatar;
    if (gBanner !== null) body["banner"] = gBanner;
    return body;
  };
  const saveGlobal = usePanelAction(() => api("PATCH", "/bot/profile/global", globalBody()), {
    success: "Genel profil güncellendi",
    onDone: () => {
      setGAvatar(null);
      setGBanner(null);
    },
  });

  // Önizleme: sunucu profili boş olan her şeyde genel profile düşer.
  const globalAvatar =
    gAvatar === "" ? DEFAULT_AVATAR : (gAvatar ?? info.global.avatar ?? info.global.face);
  const globalBanner = gBanner === "" ? null : (gBanner ?? info.global.banner);
  const serverAvatar =
    sAvatar === "" ? globalAvatar : (sAvatar ?? info.server.avatar ?? globalAvatar);
  const serverBanner =
    sBanner === "" ? globalBanner : (sBanner ?? info.server.banner ?? globalBanner);
  const kind = KINDS.find((k) => k.value === presence.kind) ?? KINDS[0]!;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
        <Card title="Durum">
          <div className="space-y-4">
            <div role="radiogroup" aria-label="Durum" className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={presence.status === s.value}
                  onClick={() => setP({ status: s.value })}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    presence.status === s.value
                      ? "border-accent bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="block text-muted-foreground">Aktivite</span>
              <select
                value={presence.kind}
                onChange={(e) => setP({ kind: e.target.value as Kind })}
                className={`${selectClass} w-full sm:w-64`}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            {kind.name && (
              <Field
                label={kind.name}
                value={presence.name}
                onChange={(name) => setP({ name })}
                max={128}
              />
            )}
            {presence.kind !== "none" && (
              <Field
                label={presence.kind === "custom" ? "Durum yazısı" : "İkinci satır (isteğe bağlı)"}
                value={presence.state}
                onChange={(state) => setP({ state })}
                max={128}
              />
            )}
            {presence.kind === "streaming" && (
              <Field
                label="Yayın bağlantısı (Twitch ya da YouTube)"
                value={presence.url}
                onChange={(url) => setP({ url })}
                max={512}
                placeholder="https://twitch.tv/…"
              />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!presenceDirty || savePresence.busy}
                onClick={() => savePresence.run(undefined)}
                className={primaryButtonClass}
              >
                Durumu uygula
              </button>
              <ActionResult msg={savePresence.msg} />
            </div>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none hover:text-foreground">
                Rich presence'ın diğer alanları neden yok?
              </summary>
              <p className="mt-2">
                Discord bot hesaplarında sadece durumu, aktivitenin türünü, adını, ikinci satırını
                ve yayın bağlantısını kabul ediyor. details, başlangıç/bitiş zamanı, büyük/küçük
                görsel ve yazıları, parti ve katılma anahtarı sadece bir kullanıcının bilgisayarında
                çalışan oyunlar (Rich Presence / Game SDK) için; Discord bunları botlardan gelince
                yok sayıyor. Botun görselini aşağıdaki profil ayarları değiştirir. Durum kaydedilir,
                bot yeniden başlayınca da uygulanır.
              </p>
            </details>
          </div>
        </Card>

        <Card title="Sunucu profili · sadece bu sunucuda">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ImagePick
                label="Avatar"
                value={sAvatar}
                current={info.server.avatar}
                onChange={setSAvatar}
                maxKb={1024}
              />
              <ImagePick
                label="Banner"
                value={sBanner}
                current={info.server.banner}
                onChange={setSBanner}
                maxKb={2048}
                wide
              />
            </div>
            <Field
              label="Takma ad"
              value={nick}
              onChange={setNick}
              max={32}
              placeholder={info.global.username}
            />
            <label className="block space-y-1.5 text-sm">
              <span className="flex justify-between text-muted-foreground">
                Hakkında
                <span className="text-[11px] tabular-nums">{[...bio].length}/190</span>
              </span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className={`${inputClass} h-auto py-2`}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={Object.keys(serverBody()).length === 0 || saveServer.busy}
                onClick={() => saveServer.run(undefined)}
                className={primaryButtonClass}
              >
                Kaydet
              </button>
              <ActionResult msg={saveServer.msg} />
            </div>
            <p className="text-xs text-muted-foreground">
              Üye listesinde, mesajlarda ve profil kartında sadece bu sunucuda görünür. Boş
              bırakılan ya da kaldırılan her şeyde genel profil görünür.
            </p>
          </div>
        </Card>

        <Card title="Genel profil · botun olduğu tüm sunucularda">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ImagePick
                label="Avatar"
                value={gAvatar}
                current={info.global.avatar}
                onChange={setGAvatar}
                maxKb={1024}
                disabled={!isOwner}
              />
              <ImagePick
                label="Banner"
                value={gBanner}
                current={info.global.banner}
                onChange={setGBanner}
                maxKb={2048}
                wide
                disabled={!isOwner}
              />
            </div>
            <Field
              label="Kullanıcı adı"
              value={username}
              onChange={setUsername}
              max={32}
              disabled={!isOwner}
            />
            {isOwner ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={Object.keys(globalBody()).length === 0 || saveGlobal.busy}
                  onClick={() => saveGlobal.run(undefined)}
                  className={primaryButtonClass}
                >
                  Kaydet
                </button>
                <ActionResult msg={saveGlobal.msg} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Genel profili sadece owner değiştirebilir.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Bot başka sunucularda da kullanıldığı için bu değişiklik oralarda da görünür. Discord
              kullanıcı adı değişikliğini saatte 2 ile, avatar değişikliğini de kısa sürede birkaç
              kezle sınırlar.
            </p>
          </div>
        </Card>
      </div>

      <div className="min-w-0 space-y-2 lg:sticky lg:top-20">
        <Segmented<"server" | "global">
          label="Profil önizlemesi"
          value={view}
          onChange={setView}
          options={[
            { value: "server", label: "bu sunucuda" },
            { value: "global", label: "diğer sunucularda" },
          ]}
        />
        <ProfilePreview
          name={view === "server" ? nick.trim() || username : username}
          username={username}
          avatar={view === "server" ? serverAvatar : globalAvatar}
          banner={view === "server" ? serverBanner : globalBanner}
          bio={view === "server" ? bio.trim() : ""}
          presence={presence}
        />
        <p className="text-xs text-muted-foreground">
          Discord'un profil kartına benzer önizleme; kaydedilmemiş değişiklikler de görünür.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  const n = [...value].length;
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="flex justify-between text-muted-foreground">
        {label}
        <span className={`text-[11px] tabular-nums ${n > max ? "text-destructive" : ""}`}>
          {n}/{max}
        </span>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${inputClass} disabled:opacity-60`}
      />
    </label>
  );
}

function ProfilePreview({
  name,
  username,
  avatar,
  banner,
  bio,
  presence,
}: {
  name: string;
  username: string;
  avatar: string;
  banner: string | null;
  bio: string;
  presence: Presence;
}) {
  const status = STATUSES.find((s) => s.value === presence.status) ?? STATUSES[0]!;
  const kind = KINDS.find((k) => k.value === presence.kind) ?? KINDS[0]!;
  const hidden = presence.status === "invisible";
  const activity: ReactNode =
    !hidden && kind.icon && presence.name.trim() ? (
      <div className="rounded-lg bg-[#2b2d31] p-3">
        <p className="text-xs font-bold text-[#b5bac1]">{kind.label}</p>
        <div className="mt-2 flex gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#1e1f22]">
            <kind.icon className="h-7 w-7 text-[#b5bac1]" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold text-white">{presence.name}</p>
            {presence.state.trim() && <p className="truncate">{presence.state}</p>}
            {presence.kind === "streaming" && presence.url.trim() && (
              <p className="truncate text-xs text-[#00a8fc]">{presence.url}</p>
            )}
          </div>
        </div>
      </div>
    ) : null;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#232428] text-[#dbdee1]">
      <div className="relative h-24 bg-[#5865f2]">
        {banner && (
          <img
            src={banner}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute -bottom-10 left-4 rounded-full border-[6px] border-[#232428] bg-[#232428]">
          <img
            src={avatar}
            alt=""
            referrerPolicy="no-referrer"
            className="h-20 w-20 rounded-full object-cover"
          />
          <span
            title={status.label}
            className="absolute right-0 bottom-0 h-6 w-6 rounded-full border-[4px] border-[#232428]"
            style={{ backgroundColor: hidden ? "#80848e" : status.color }}
          />
        </div>
      </div>
      <div className="space-y-3 px-4 pt-12 pb-4">
        <div>
          <p className="text-xl leading-tight font-bold text-white">{name}</p>
          <p className="flex items-center gap-1.5 text-sm">
            {username}
            <span className="rounded-[3px] bg-[#5865f2] px-1 py-px text-[10px] font-semibold text-white">
              UYGULAMA
            </span>
          </p>
        </div>
        {!hidden && presence.kind === "custom" && presence.state.trim() && (
          <div className="rounded-lg bg-[#2b2d31] px-3 py-2 text-sm">{presence.state}</div>
        )}
        {bio && (
          <div>
            <p className="text-xs font-bold text-[#b5bac1]">Hakkında</p>
            <p className="text-sm whitespace-pre-wrap">{bio}</p>
          </div>
        )}
        {activity}
        {hidden && (
          <p className="text-xs text-[#949ba4]">
            Görünmezken bot çevrimdışı ve aktivitesiz görünür.
          </p>
        )}
      </div>
    </div>
  );
}
