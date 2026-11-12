import { MEMBERS } from "./members";

type LanyardActivity = {
  type: number;
  name: string;
  details?: string | null;
  state?: string | null;
  application_id?: string;
  timestamps?: { start?: number; end?: number } | null;
  assets?: { large_image?: string; large_text?: string } | null;
  emoji?: { name: string; id?: string; animated?: boolean } | null;
};

type LanyardPresence = {
  discord_user: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
    public_flags?: number;
    avatar_decoration_data?: { asset: string } | null;
    primary_guild?: {
      tag: string | null;
      badge: string | null;
      identity_guild_id: string | null;
      identity_enabled: boolean | null;
    } | null;
  };
  discord_status: string;
  active_on_discord_desktop: boolean;
  active_on_discord_mobile: boolean;
  active_on_discord_web: boolean;
  activities: LanyardActivity[];
};

const CDN = "https://cdn.discordapp.com";
const ICON_TTL_MS = 86_400_000;
const KINDS = ["playing", "streaming", "listening", "watching", "custom", "competing"];
const FLAG_BADGES: [number, string][] = [
  [1 << 0, "staff"],
  [1 << 1, "partner"],
  [1 << 18, "certified_moderator"],
  [1 << 2, "hypesquad_events"],
  [1 << 6, "hypesquad_bravery"],
  [1 << 7, "hypesquad_brilliance"],
  [1 << 8, "hypesquad_balance"],
  [1 << 3, "bug_hunter_1"],
  [1 << 14, "bug_hunter_2"],
  [1 << 22, "active_developer"],
  [1 << 17, "verified_developer"],
  [1 << 9, "early_supporter"],
];

const icons = new Map<string, { at: number; url: string | null }>();

function isSnowflake(id: string | null | undefined): id is string {
  return typeof id === "string" && /^\d+$/.test(id);
}

function isSpotify(a: LanyardActivity): boolean {
  return a.type === 2 && a.name === "Spotify";
}

function assetUrl(app: string | undefined, key: string | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("spotify:")) return `https://i.scdn.co/image/${key.slice(8)}`;
  if (key.startsWith("mp:")) return `https://media.discordapp.net/${key.slice(3)}`;
  return isSnowflake(app) ? `${CDN}/app-assets/${app}/${key}.png` : null;
}

async function appIcon(app: string | undefined): Promise<string | null> {
  if (!isSnowflake(app)) return null;
  const hit = icons.get(app);
  if (hit && Date.now() - hit.at < ICON_TTL_MS) return hit.url;
  try {
    const res = await fetch(`https://discord.com/api/v10/applications/${app}/rpc`, {
      signal: AbortSignal.timeout(4000),
    });
    const body = res.ok ? ((await res.json()) as { icon?: string | null }) : null;
    const url = body?.icon ? `${CDN}/app-icons/${app}/${body.icon}.png?size=160` : null;
    icons.set(app, { at: Date.now(), url });
    return url;
  } catch {
    return hit?.url ?? null;
  }
}

function emoji(e: LanyardActivity["emoji"]) {
  if (!e) return null;
  const url = isSnowflake(e.id)
    ? `${CDN}/emojis/${e.id}.${e.animated ? "gif" : "webp"}?size=64`
    : null;
  return { name: e.name, url };
}

async function toUser(p: LanyardPresence) {
  const u = p.discord_user;
  const activities = Array.isArray(p.activities) ? p.activities : [];
  const custom = activities.find((a) => a.type === 4);
  const spotify = activities.find(isSpotify);
  const others = await Promise.all(
    activities
      .filter((a) => a.type !== 4 && !isSpotify(a))
      .map(async (a) => ({
        kind: KINDS[a.type] ?? "other",
        name: a.name,
        details: a.details ?? null,
        state: a.state ?? null,
        start: a.timestamps?.start ?? null,
        end: a.timestamps?.end ?? null,
        image:
          assetUrl(a.application_id, a.assets?.large_image) ?? (await appIcon(a.application_id)),
      })),
  );
  const animated = Boolean(u.avatar?.startsWith("a_"));
  const flags = u.public_flags ?? 0;
  const guild = u.primary_guild?.identity_enabled === false ? null : (u.primary_guild ?? null);
  const decoration = u.avatar_decoration_data?.asset;

  return {
    id: u.id,
    username: u.username,
    global_name: u.global_name,
    nick: null,
    avatar: u.avatar
      ? `${CDN}/avatars/${u.id}/${u.avatar}.${animated ? "gif" : "webp"}?size=256`
      : null,
    status: p.discord_status,
    boost_since: null,
    platforms: {
      desktop: Boolean(p.active_on_discord_desktop),
      mobile: Boolean(p.active_on_discord_mobile),
      web: Boolean(p.active_on_discord_web),
    },
    custom: custom ? { text: custom.state ?? null, emoji: emoji(custom.emoji) } : null,
    spotify: spotify
      ? {
          song: spotify.details ?? null,
          artist: spotify.state ?? null,
          album: spotify.assets?.large_text ?? null,
          art: assetUrl(spotify.application_id, spotify.assets?.large_image),
          start: spotify.timestamps?.start ?? null,
          end: spotify.timestamps?.end ?? null,
        }
      : null,
    activities: others,
    banner: null,
    accent: null,
    decoration: decoration ? `${CDN}/avatar-decoration-presets/${decoration}.png?size=240` : null,
    tag: guild?.tag ?? null,
    tag_badge:
      guild?.badge && isSnowflake(guild.identity_guild_id)
        ? `${CDN}/guild-tag-badges/${guild.identity_guild_id}/${guild.badge}.png?size=64`
        : null,
    badges: FLAG_BADGES.filter(([bit]) => (flags & bit) !== 0).map(([, key]) => key),
    nitro: animated,
  };
}

async function lanyard(id: string): Promise<LanyardPresence | null> {
  const res = await fetch(`https://api.lanyard.rest/v1/users/${id}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`lanyard ${res.status}`);
  const body = (await res.json()) as { success?: boolean; data?: LanyardPresence };
  return body.success && body.data?.discord_user ? body.data : null;
}

export async function fetchPresence(): Promise<unknown[]> {
  const ids = MEMBERS.flatMap((m) => (isSnowflake(m.discordId) ? [m.discordId] : []));
  const found = await Promise.all(ids.map(lanyard));
  return Promise.all(found.flatMap((p) => (p ? [toUser(p)] : [])));
}
