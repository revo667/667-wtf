import { MEMBERS } from "./members";

type Status = "online" | "idle" | "dnd" | "offline";

type CardActivity = {
  kind?: string;
  name?: string;
  details?: string | null;
  state?: string | null;
  start?: number | null;
  end?: number | null;
  image?: string | null;
};

type CardUser = {
  id?: string;
  username?: string | null;
  global_name?: string | null;
  nick?: string | null;
  avatar?: string | null;
  status?: Status;
  custom?: { text?: string | null } | null;
  spotify?: {
    song?: string | null;
    artist?: string | null;
    album?: string | null;
    art?: string | null;
    start?: number | null;
    end?: number | null;
  } | null;
  activities?: CardActivity[];
  tag?: string | null;
  tag_badge?: string | null;
};

const CARD_ID = "1118833327307227236";
const W = 400;
const PAD = 16;
const BANNER_H = 112;
const BG = "#000000";
const FONT = `'gg sans','Noto Sans','Helvetica Neue',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
const DISCORD_PATH =
  "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z";

const STATUS: Record<Status, { label: string; color: string }> = {
  online: { label: "Online", color: "#23a55a" },
  idle: { label: "Idle", color: "#f0b232" },
  dnd: { label: "Do not disturb", color: "#f23f43" },
  offline: { label: "Offline", color: "#80848e" },
};

const KIND_LABEL: Record<string, string> = {
  playing: "Playing",
  streaming: "Streaming",
  listening: "Listening to",
  watching: "Watching",
  competing: "Competing in",
};

const BADGE_SVGS = import.meta.glob<string>("/public/badges/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

function badgeSvg(key: string): string | null {
  const file = key.startsWith("boost_") ? `discordboost${key.slice(6)}` : key;
  return BADGE_SVGS[`/public/badges/${file}.svg`] ?? null;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fit(text: string, width: number, size: number): string {
  const max = Math.max(1, Math.floor(width / (size * 0.56)));
  const chars = Array.from(text);
  return chars.length > max
    ? `${chars
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`
    : text;
}

function wrap(text: string, width: number, size: number, lines: number): string[] {
  const max = Math.max(1, Math.floor(width / (size * 0.56)));
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (Array.from(next).length <= max) {
      line = next;
      continue;
    }
    if (line) out.push(line);
    line = word;
    if (out.length === lines) break;
  }
  if (line && out.length < lines) out.push(line);
  if (out.length === lines && out.join(" ").length < text.trim().length) {
    out[lines - 1] = fit(`${out[lines - 1]}…`, width, size);
  }
  return out.map((l) => fit(l, width, size));
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function svgData(svg: string): string {
  return `data:image/svg+xml;base64,${toBase64(new TextEncoder().encode(svg))}`;
}

async function inline(url: string | null | undefined): Promise<string | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
    if (!type.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > 600_000) return null;
    return `data:${type};base64,${toBase64(buf)}`;
  } catch {
    return null;
  }
}

function sized(url: string | null | undefined, size: number): string | null {
  if (!url) return null;
  if (url.includes("cdn.discordapp.com") || url.includes("media.discordapp.net")) {
    const u = new URL(url);
    u.searchParams.set("size", String(size));
    return u.toString();
  }
  return url.replace("ab67616d0000b273", "ab67616d00001e02");
}

function activityImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("mp:external/")) return `https://media.discordapp.net/${url.slice(3)}`;
  return url;
}

type Row = {
  label: string;
  title: string;
  lines: string[];
  image: string | null;
  start: number | null;
  end: number | null;
  accent: string;
};

function rowHeight(row: Row): number {
  const timed = row.start !== null;
  const text = 15 + 18 + row.lines.length * 15 + (timed ? 16 : 0);
  return Math.max(56, text) + 20;
}

function renderRow(row: Row, y: number, now: number, id: number): string {
  const h = rowHeight(row);
  const x = PAD;
  const w = W - PAD * 2;
  const imgY = y + (h - 56) / 2;
  const tx = x + 10 + 56 + 12;
  const tw = w - (tx - x) - 10;
  const parts: string[] = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#ffffff" fill-opacity="0.035" stroke="#ffffff" stroke-opacity="0.07"/>`,
  ];
  if (row.image) {
    parts.push(
      `<clipPath id="a${id}"><rect x="${x + 10}" y="${imgY}" width="56" height="56" rx="8"/></clipPath>`,
      `<image href="${row.image}" x="${x + 10}" y="${imgY}" width="56" height="56" preserveAspectRatio="xMidYMid slice" clip-path="url(#a${id})"/>`,
    );
  } else {
    parts.push(
      `<rect x="${x + 10}" y="${imgY}" width="56" height="56" rx="8" fill="#ffffff" fill-opacity="0.06"/>`,
      `<path d="${DISCORD_PATH}" transform="translate(${x + 26} ${imgY + 16}) scale(1)" fill="#ffffff" fill-opacity="0.5"/>`,
    );
  }
  let ty = y + 10 + 11;
  parts.push(
    `<text x="${tx}" y="${ty}" font-size="10" font-weight="600" letter-spacing="1" fill="#ffffff" fill-opacity="0.45">${esc(fit(row.label.toUpperCase(), tw, 11))}</text>`,
  );
  ty += 17;
  parts.push(
    `<text x="${tx}" y="${ty}" font-size="13" font-weight="600" fill="#ffffff">${esc(fit(row.title, tw, 13))}</text>`,
  );
  for (const line of row.lines) {
    ty += 15;
    parts.push(
      `<text x="${tx}" y="${ty}" font-size="11" fill="#ffffff" fill-opacity="0.55">${esc(fit(line, tw, 11))}</text>`,
    );
  }
  if (row.start !== null) {
    ty += 16;
    const elapsed = now - row.start;
    if (row.end !== null) {
      const total = row.end - row.start;
      const pct = Math.min(1, Math.max(0, elapsed / total));
      const bx = tx + 32;
      const bw = tw - 64;
      parts.push(
        `<text x="${tx}" y="${ty}" font-family="${MONO}" font-size="9" fill="#ffffff" fill-opacity="0.4">${clock(Math.min(elapsed, total))}</text>`,
        `<rect x="${bx}" y="${ty - 5}" width="${bw}" height="3" rx="1.5" fill="#ffffff" fill-opacity="0.1"/>`,
        `<rect x="${bx}" y="${ty - 5}" width="${(bw * pct).toFixed(1)}" height="3" rx="1.5" fill="${row.accent}"/>`,
        `<text x="${tx + tw}" y="${ty}" text-anchor="end" font-family="${MONO}" font-size="9" fill="#ffffff" fill-opacity="0.4">${clock(total)}</text>`,
      );
    } else {
      parts.push(
        `<text x="${tx}" y="${ty}" font-family="${MONO}" font-size="10" fill="#ffffff" fill-opacity="0.4">${clock(elapsed)} elapsed</text>`,
      );
    }
  }
  return parts.join("");
}

export async function renderDiscordCard(users: unknown[]): Promise<string> {
  const member = MEMBERS.find((m) => m.discordId === CARD_ID);
  const p = (users as CardUser[]).find((u) => u?.id === CARD_ID) ?? null;
  const now = Date.now();

  const status = p?.status && STATUS[p.status] ? STATUS[p.status] : null;
  const display = p?.nick ?? p?.global_name ?? p?.username ?? member?.name ?? "selim";
  const username = p?.username ?? member?.handle ?? "";
  const quote = p?.custom?.text ?? member?.quote ?? null;

  const rows: Row[] = [];
  const spotify = p?.spotify ?? null;
  const activities = Array.isArray(p?.activities) ? p.activities : [];
  const [avatar, tagBadge, art, ...actImages] = await Promise.all([
    inline(sized(p?.avatar, 160)),
    inline(sized(p?.tag_badge, 32)),
    inline(sized(spotify?.art, 300)),
    ...activities.slice(0, spotify ? 2 : 3).map((a) => inline(activityImage(a.image))),
  ]);

  if (spotify) {
    rows.push({
      label: "Listening to Spotify",
      title: spotify.song ?? "Spotify",
      lines: [spotify.artist ? `by ${spotify.artist}` : null, spotify.album ?? null].filter(
        (l): l is string => Boolean(l),
      ),
      image: art,
      start: spotify.start ?? null,
      end: spotify.end ?? null,
      accent: "#1db954",
    });
  }
  activities.slice(0, spotify ? 2 : 3).forEach((a, i) => {
    const kind = a.kind ?? "other";
    rows.push({
      label: KIND_LABEL[kind] || a.name || "",
      title: a.name ?? "",
      lines: [a.details ?? null, a.state ?? null].filter((l): l is string => Boolean(l)),
      image: actImages[i] ?? null,
      start: a.start ?? null,
      end: a.end ?? null,
      accent: "#dcdde0",
    });
  });

  const badges = (member?.discordBadges ?? []).flatMap((key) => {
    const svg = badgeSvg(key);
    return svg ? [svgData(svg)] : [];
  });

  const body: string[] = [];
  const avX = PAD;
  const avY = BANNER_H - 40;
  const avR = 40;
  const avCx = avX + avR;
  const avCy = avY + avR;

  if (quote) {
    const lines = wrap(`“${quote}”`, W - 64, 13, 2);
    const firstY = BANNER_H / 2 - ((lines.length - 1) * 17) / 2 + 4;
    lines.forEach((l, i) => {
      body.push(
        `<text x="${W / 2}" y="${firstY + i * 17}" text-anchor="middle" font-size="13" font-weight="600" font-style="italic" fill="#ffffff">${esc(l)}</text>`,
      );
    });
  }

  body.push(`<circle cx="${avCx}" cy="${avCy}" r="${avR + 4}" fill="${BG}"/>`);
  if (avatar) {
    body.push(
      `<clipPath id="av"><circle cx="${avCx}" cy="${avCy}" r="${avR}"/></clipPath>`,
      `<image href="${avatar}" x="${avX}" y="${avY}" width="${avR * 2}" height="${avR * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#av)"/>`,
    );
  } else {
    body.push(
      `<circle cx="${avCx}" cy="${avCy}" r="${avR}" fill="#3a3a40"/>`,
      `<text x="${avCx}" y="${avCy + 11}" text-anchor="middle" font-size="30" fill="#ffffff">${esc(display.charAt(0).toUpperCase())}</text>`,
    );
  }
  body.push(
    `<circle cx="${avCx}" cy="${avCy}" r="${avR}" fill="none" stroke="#ffffff" stroke-opacity="0.15"/>`,
  );
  if (status) {
    body.push(
      `<circle cx="${avX + avR * 2 - 11}" cy="${avY + avR * 2 - 11}" r="9" fill="${status.color}" stroke="${BG}" stroke-width="4"/>`,
    );
  }

  const iconY = avY + avR * 2 - 4 - 20;
  let bx = W - PAD - 20;
  body.push(
    `<path d="${DISCORD_PATH}" transform="translate(${bx} ${iconY}) scale(${20 / 24})" fill="#5865f2"/>`,
  );
  bx -= 8;
  for (const src of [...badges].reverse()) {
    bx -= 18;
    body.push(`<image href="${src}" x="${bx}" y="${iconY + 1}" width="18" height="18"/>`);
    bx -= 4;
  }

  let y = avY + avR * 2 + 8 + 18;
  body.push(
    `<text x="${PAD}" y="${y}" font-size="19" font-weight="700" fill="#ffffff">${esc(fit(display, W - PAD * 2, 19))}</text>`,
  );
  y += 20;
  const userText = fit(username, 200, 12);
  body.push(
    `<text x="${PAD}" y="${y}" font-size="12" fill="#ffffff" fill-opacity="0.55">${esc(userText)}</text>`,
  );
  if (p?.tag) {
    const px = PAD + Array.from(userText).length * 12 * 0.56 + 8;
    const tagW = (tagBadge ? 16 : 0) + Array.from(p.tag).length * 6.5 + 12;
    body.push(
      `<rect x="${px.toFixed(1)}" y="${y - 12}" width="${tagW.toFixed(1)}" height="17" rx="5" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.1"/>`,
    );
    if (tagBadge) {
      body.push(
        `<image href="${tagBadge}" x="${(px + 6).toFixed(1)}" y="${y - 9.5}" width="12" height="12"/>`,
      );
    }
    body.push(
      `<text x="${(px + 6 + (tagBadge ? 16 : 0)).toFixed(1)}" y="${y + 0.5}" font-size="10" font-weight="700" fill="#ffffff" fill-opacity="0.85">${esc(p.tag)}</text>`,
    );
  }
  y += 19;
  body.push(
    `<circle cx="${PAD + 4}" cy="${y - 4}" r="4" fill="${status?.color ?? "#5865f2"}"/>`,
    `<text x="${PAD + 14}" y="${y}" font-size="12" fill="#ffffff" fill-opacity="0.6">${status ? status.label : "View on Discord"}</text>`,
  );
  y += 14;

  rows.forEach((row, i) => {
    body.push(renderRow(row, y, now, i));
    y += rowHeight(row) + 8;
  });
  if (p && rows.length === 0) {
    body.push(
      `<rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="46" rx="12" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-dasharray="4 3"/>`,
      `<text x="${W / 2}" y="${y + 27}" text-anchor="middle" font-size="12" fill="#ffffff" fill-opacity="0.35">No activity right now</text>`,
    );
    y += 46 + 8;
  }
  const H = y - 8 + PAD;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`,
    `<defs>`,
    `<clipPath id="card"><rect width="${W}" height="${H}" rx="16"/></clipPath>`,
    `</defs>`,
    `<g clip-path="url(#card)">`,
    `<rect width="${W}" height="${H}" fill="${BG}"/>`,
    ...body,
    `</g>`,
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="15.5" fill="none" stroke="#ffffff" stroke-opacity="0.1"/>`,
    `</svg>`,
  ].join("");
}
