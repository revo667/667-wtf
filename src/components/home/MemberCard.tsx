import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Code2, Gamepad2, Globe, Monitor, Music2, Radio, Smartphone, Tv } from "lucide-react";
import type { Badge, Member } from "@/lib/members";
import { DiscordIcon } from "./icons";

type Status = "online" | "idle" | "dnd" | "offline";

type Activity = {
  kind: "playing" | "streaming" | "listening" | "watching" | "competing" | "other";
  name: string;
  details: string | null;
  state: string | null;
  start: number | null;
  end: number | null;
  image: string | null;
};

type PresenceUser = {
  id: string;
  username: string | null;
  global_name: string | null;
  nick: string | null;
  avatar: string | null;
  status: Status;
  platforms: { desktop: boolean; mobile: boolean; web: boolean };
  custom: { text: string | null; emoji: { name: string; url: string | null } | null } | null;
  spotify: {
    song: string | null;
    artist: string | null;
    album: string | null;
    art: string | null;
    start: number | null;
    end: number | null;
  } | null;
  activities: Activity[];
  banner: string | null;
  accent: number | null;
  decoration: string | null;
  tag: string | null;
  tag_badge: string | null;
  badges: string[];
  nitro: boolean;
  boost_since: number | null;
};

const FLAG_BADGES = [
  "staff",
  "partner",
  "certified_moderator",
  "hypesquad_events",
  "hypesquad_bravery",
  "hypesquad_brilliance",
  "hypesquad_balance",
  "bug_hunter_1",
  "bug_hunter_2",
  "active_developer",
  "verified_developer",
  "early_supporter",
];

const BOOST_MONTHS = [0, 2, 3, 6, 9, 12, 15, 18, 24];
const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;
const NITRO_TIERS = ["bronze", "silver", "gold", "platinum", "diamond", "emerald", "ruby", "opal"];

const BADGE_ASSETS: Record<string, { src: string; label: string; inset?: boolean }> = {
  staff: { src: "/badges/discordstaff.svg", label: "Discord Staff" },
  partner: { src: "/badges/discordpartner.svg", label: "Partnered Server Owner" },
  certified_moderator: { src: "/badges/discordmod.svg", label: "Moderator Programs Alumni" },
  hypesquad_events: { src: "/badges/hypesquadevents.svg", label: "HypeSquad Events" },
  hypesquad_bravery: { src: "/badges/hypesquadbravery.svg", label: "HypeSquad Bravery" },
  hypesquad_brilliance: { src: "/badges/hypesquadbrilliance.svg", label: "HypeSquad Brilliance" },
  hypesquad_balance: { src: "/badges/hypesquadbalance.svg", label: "HypeSquad Balance" },
  bug_hunter_1: { src: "/badges/discordbughunter1.svg", label: "Discord Bug Hunter" },
  bug_hunter_2: { src: "/badges/discordbughunter2.svg", label: "Discord Bug Hunter" },
  active_developer: { src: "/badges/activedeveloper.svg", label: "Active Developer" },
  verified_developer: { src: "/badges/discordbotdev.svg", label: "Early Verified Bot Developer" },
  early_supporter: { src: "/badges/discordearlysupporter.svg", label: "Early Supporter" },
  nitro: { src: "/badges/discordnitro.svg", label: "Nitro" },
  quest: { src: "/badges/quest.png", label: "Completed a Quest" },
  orb: { src: "/badges/orb.svg", label: "Orbs Apprentice", inset: true },
  april_fools_2026: { src: "/badges/april_fools_2026.svg", label: "April Fools 2026" },
  gift_champion: { src: "/badges/gift_champion.png", label: "Gifting Champion" },
  ...Object.fromEntries(
    NITRO_TIERS.map((t) => [
      `nitro_${t}`,
      { src: `/badges/nitro_${t}.svg`, label: `Nitro ${t[0]!.toUpperCase()}${t.slice(1)}` },
    ]),
  ),
  ...Object.fromEntries(
    BOOST_MONTHS.map((m, i) => [
      `boost_${i + 1}`,
      {
        src: `/badges/discordboost${i + 1}.svg`,
        label: m ? `Server boosting for ${m} months` : "Server Booster",
      },
    ]),
  ),
};

function badgeList(member: Member, p: PresenceUser | null) {
  if (member.discordBadges) {
    return member.discordBadges.flatMap((key) => {
      const asset = BADGE_ASSETS[key];
      return asset ? [asset] : [];
    });
  }
  if (!p) return [];
  const list = FLAG_BADGES.filter((key) => p.badges.includes(key)).flatMap((key) => {
    const asset = BADGE_ASSETS[key];
    return asset ? [asset] : [];
  });
  if (p.nitro) list.push(BADGE_ASSETS["nitro"]!);
  if (p.boost_since) {
    const months = (Date.now() - p.boost_since) / MONTH_MS;
    const level = BOOST_MONTHS.filter((m) => months >= m).length;
    const asset = BADGE_ASSETS[`boost_${level}`];
    if (asset) list.push(asset);
  }
  return list;
}

const STATUS: Record<Status, { label: string; color: string }> = {
  online: { label: "Online", color: "#23a55a" },
  idle: { label: "Idle", color: "#f0b232" },
  dnd: { label: "Do not disturb", color: "#f23f43" },
  offline: { label: "Offline", color: "#80848e" },
};

const KIND_LABEL: Record<Activity["kind"], string> = {
  playing: "Playing",
  streaming: "Streaming",
  listening: "Listening to",
  watching: "Watching",
  competing: "Competing in",
  other: "",
};

const KIND_ICON = {
  playing: Gamepad2,
  streaming: Radio,
  listening: Music2,
  watching: Tv,
  competing: Gamepad2,
  other: Gamepad2,
} as const;

const BADGE: Record<Badge, { Icon: typeof Code2; label: string; className: string }> = {
  developer: { Icon: Code2, label: "Developer", className: "text-accent" },
};

const CARD_BG = "oklch(0.1 0 0)";

const STATUSES = new Set<Status>(["online", "idle", "dnd", "offline"]);

function normalize(raw: Partial<PresenceUser> & { id: string }): PresenceUser {
  return {
    id: raw.id,
    username: raw.username ?? null,
    global_name: raw.global_name ?? null,
    nick: raw.nick ?? null,
    avatar: raw.avatar ?? null,
    status: raw.status && STATUSES.has(raw.status) ? raw.status : "offline",
    platforms: {
      desktop: Boolean(raw.platforms?.desktop),
      mobile: Boolean(raw.platforms?.mobile),
      web: Boolean(raw.platforms?.web),
    },
    custom: raw.custom ?? null,
    spotify: raw.spotify ?? null,
    activities: Array.isArray(raw.activities) ? raw.activities : [],
    banner: raw.banner ?? null,
    accent: raw.accent ?? null,
    decoration: raw.decoration ?? null,
    tag: raw.tag ?? null,
    tag_badge: raw.tag_badge ?? null,
    badges: Array.isArray(raw.badges) ? raw.badges : [],
    nitro: Boolean(raw.nitro),
    boost_since: raw.boost_since ?? null,
  };
}

function usePresence(id: string | undefined) {
  const { data } = useQuery({
    queryKey: ["presence"],
    enabled: Boolean(id),
    refetchInterval: 15_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/presence");
      if (!res.ok) return [] as PresenceUser[];
      const body = (await res.json()) as { users?: (Partial<PresenceUser> & { id: string })[] };
      return Array.isArray(body.users) ? body.users.filter((u) => u?.id).map(normalize) : [];
    },
  });
  return data?.find((u) => u.id === id) ?? null;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function accentHex(accent: number | null) {
  return accent === null ? null : `#${accent.toString(16).padStart(6, "0")}`;
}

function Avatar({
  src,
  name,
  status,
  decoration,
  size,
  glow,
}: {
  src: string | null | undefined;
  name: string;
  status?: string | undefined;
  decoration?: string | null | undefined;
  size: "lg" | "md";
  glow?: boolean;
}) {
  const box = size === "lg" ? "size-24" : "size-20";
  const dot = size === "lg" ? "size-5 border-[4px]" : "size-[18px] border-[4px]";
  return (
    <div className={`relative shrink-0 ${box}`}>
      {glow && <div className="absolute -inset-4 rounded-full bg-accent/35 blur-2xl" aria-hidden />}
      {src ? (
        <img
          src={src}
          alt={name}
          className="relative size-full rounded-full object-cover ring-1 ring-white/15"
          style={{ boxShadow: `0 0 0 4px ${CARD_BG}` }}
        />
      ) : (
        <div className="relative grid size-full place-items-center rounded-full bg-gradient-to-br from-accent/70 to-primary/30 font-display text-3xl text-white ring-1 ring-white/15">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {decoration && (
        <img
          src={decoration}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -inset-[10%] size-[120%] max-w-none"
        />
      )}
      {status && (
        <span
          className={`absolute right-0.5 bottom-0.5 rounded-full ${dot}`}
          style={{ backgroundColor: status, borderColor: CARD_BG }}
        />
      )}
    </div>
  );
}

function ActivityRow({
  icon,
  label,
  title,
  lines,
  image,
  start,
  end,
  now,
  accent,
}: {
  icon: typeof Gamepad2;
  label: string;
  title: string;
  lines: (string | null)[];
  image: string | null;
  start: number | null;
  end: number | null;
  now: number;
  accent: string;
}) {
  const Icon = icon;
  const total = start && end ? end - start : null;
  const elapsed = start ? now - start : null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] p-2.5">
      {image ? (
        <img src={image} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-white/[0.06]">
          <Icon className="size-6 text-white/60" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-wider text-white/45 uppercase">{label}</p>
        <p className="truncate text-[13px] font-semibold text-white">{title}</p>
        {lines
          .filter((l): l is string => Boolean(l))
          .map((l) => (
            <p key={l} className="truncate text-[11px] text-white/55">
              {l}
            </p>
          ))}
        {total !== null && elapsed !== null ? (
          <div className="mt-1.5 flex items-center gap-2 font-mono text-[9px] text-white/40">
            <span>{clock(Math.min(elapsed, total))}</span>
            <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.min(100, (elapsed / total) * 100)}%`,
                  backgroundColor: accent,
                }}
              />
            </span>
            <span>{clock(total)}</span>
          </div>
        ) : elapsed !== null ? (
          <p className="mt-0.5 font-mono text-[10px] text-white/40">{clock(elapsed)} elapsed</p>
        ) : null}
      </div>
    </div>
  );
}

function DiscordPanel({ member, presence }: { member: Member; presence: PresenceUser | null }) {
  const live = Boolean(presence && (presence.spotify || presence.activities.some((a) => a.start)));
  const now = useNow(live);
  const status = presence ? STATUS[presence.status] : null;
  const display = presence?.nick ?? presence?.global_name ?? presence?.username ?? member.name;
  const username = presence?.username ?? member.handle;
  const quote = presence?.custom?.text ?? member.quote;
  const accent = accentHex(presence?.accent ?? null);
  const Device =
    presence?.platforms.mobile && !presence.platforms.desktop
      ? Smartphone
      : presence?.platforms.web && !presence.platforms.desktop
        ? Globe
        : Monitor;
  const activities = presence?.activities ?? [];
  const badges = badgeList(member, presence);
  const spotify = presence?.spotify ?? null;

  return (
    <a
      href={member.discordId ? `https://discord.com/users/${member.discordId}` : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-colors hover:border-[#5865f2]/50"
    >
      <div
        className="relative h-28 shrink-0 overflow-hidden"
        style={{
          background: presence?.banner
            ? undefined
            : `radial-gradient(120% 140% at 80% 0%, ${accent ?? "oklch(0.55 0.005 260 / 0.5)"}, transparent 62%), linear-gradient(135deg, oklch(0.17 0 0), oklch(0.07 0 0))`,
        }}
      >
        {presence?.banner && (
          <img src={presence.banner} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        {quote && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 px-8">
            <p className="line-clamp-2 text-center text-[13px] leading-snug font-semibold text-white italic drop-shadow">
              {presence?.custom?.emoji &&
                (presence.custom.emoji.url ? (
                  <img
                    src={presence.custom.emoji.url}
                    alt={presence.custom.emoji.name}
                    className="mr-1.5 inline size-4 align-[-3px]"
                  />
                ) : (
                  <span className="mr-1.5 not-italic">{presence.custom.emoji.name}</span>
                ))}
              “{quote}”
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="-mt-10 flex items-end justify-between">
          <Avatar
            src={presence?.avatar ?? member.avatar}
            name={display}
            status={status?.color}
            decoration={presence?.decoration}
            size="md"
          />
          <div className="flex items-center gap-2 pb-1">
            {badges.length > 0 && (
              <div className="flex items-center gap-1">
                {badges.map((b) => (
                  <img
                    key={b.src}
                    src={b.src}
                    alt={b.label}
                    title={b.label}
                    className={`size-[18px] ${b.inset ? "p-[2.5px]" : ""}`}
                  />
                ))}
              </div>
            )}
            <DiscordIcon className="size-5 text-[#5865f2]" />
          </div>
        </div>
        <p className="mt-2 truncate text-[19px] leading-tight font-bold text-white">{display}</p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[12px] text-white/55">{username}</span>
          {presence?.tag && (
            <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-white/85">
              {presence.tag_badge && <img src={presence.tag_badge} alt="" className="size-3" />}
              {presence.tag}
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-white/60">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: status?.color ?? "#5865f2" }}
          />
          {status ? status.label : "View on Discord"}
          {presence && presence.status !== "offline" && (
            <Device className="ml-0.5 size-3.5 text-white/40" />
          )}
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {spotify && (
            <ActivityRow
              icon={Music2}
              label="Listening to Spotify"
              title={spotify.song ?? "Spotify"}
              lines={[spotify.artist ? `by ${spotify.artist}` : null, spotify.album]}
              image={spotify.art}
              start={spotify.start}
              end={spotify.end}
              now={now}
              accent="#1db954"
            />
          )}
          {activities.slice(0, spotify ? 2 : 3).map((a) => (
            <ActivityRow
              key={`${a.kind}-${a.name}`}
              icon={KIND_ICON[a.kind]}
              label={KIND_LABEL[a.kind] || a.name}
              title={a.name}
              lines={[a.details, a.state]}
              image={a.image}
              start={a.start}
              end={a.end}
              now={now}
              accent="oklch(0.88 0.005 260)"
            />
          ))}
          {presence && !spotify && activities.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-[12px] text-white/35">
              No activity right now
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

export function MemberCard({ member }: { member: Member }) {
  const presence = usePresence(member.discordId);
  const hasSide = Boolean(member.discordId);

  return (
    <article
      data-spotlight
      className={`spotlight-card flex w-[min(86vw,360px)] shrink-0 snap-center rounded-[28px] border border-white/10 bg-[oklch(0.08_0_0/0.6)] p-5 shadow-[0_30px_80px_-30px_oklch(1_0_0/0.1)] backdrop-blur-xl ${
        hasSide ? "lg:w-[620px]" : "lg:w-[330px]"
      }`}
    >
      <div
        className={`grid w-full gap-5 ${hasSide ? "lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]" : ""}`}
      >
        <div className="flex flex-col gap-3">
          <div className={hasSide ? "hidden lg:block" : ""}>
            <Avatar src={member.avatar} name={member.name} size="lg" glow />
          </div>
          <div className="mt-1">
            <h3 className="flex items-center gap-1.5">
              <span className="glow-text text-[26px] leading-tight font-semibold tracking-tight text-white">
                {member.name}
              </span>
              {member.badges.map((b) => {
                const { Icon, label, className } = BADGE[b];
                return <Icon key={b} aria-label={label} className={`size-5 ${className}`} />;
              })}
            </h3>
            <p className="mt-0.5 text-[13px] text-white/50">@{member.handle}</p>
          </div>
          {member.mood && (
            <span className="grid h-7 w-fit min-w-7 place-items-center rounded-full border border-white/15 bg-white/[0.06] px-2 text-[13px] text-white/90">
              {member.mood}
            </span>
          )}
          {member.bio && (
            <p className="text-[13px] leading-relaxed whitespace-pre-line text-white/75">
              {member.bio}
            </p>
          )}
          {member.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {member.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/60"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {hasSide && (
          <div className="flex flex-col gap-3">
            <a
              href={member.banner.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative hidden h-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(90%_120%_at_50%_0%,oklch(0.5_0.005_260/0.45),transparent_70%),linear-gradient(160deg,oklch(0.15_0_0),oklch(0.05_0_0))] lg:block"
            >
              <img
                src={member.banner.image}
                alt=""
                className="absolute top-1/2 left-1/2 h-20 -translate-x-1/2 -translate-y-[58%] opacity-85 drop-shadow-[0_0_18px_oklch(1_0_0/0.35)] transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute bottom-3 left-3.5 flex items-center gap-1.5 text-[14px] font-semibold text-white">
                <Globe className="size-4 text-white/70" />
                {member.banner.label}
              </span>
            </a>
            <DiscordPanel member={member} presence={presence} />
          </div>
        )}
      </div>
    </article>
  );
}
