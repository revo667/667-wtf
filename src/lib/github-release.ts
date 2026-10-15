export type Platform = "mac" | "windows" | "linux";

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
}

export interface LatestRelease {
  version: string;
  publishedAt: string;
  pageUrl: string;
  assets: ReleaseAsset[];
}

const PATTERNS: Record<Platform, RegExp[]> = {
  mac: [/\.dmg$/i, /\.pkg$/i, /(mac|macos|osx|darwin|apple)/i],
  windows: [/\.exe$/i, /\.msi$/i, /(win32|win64|windows|\bwin\b)/i],
  linux: [/\.appimage$/i, /\.deb$/i, /\.rpm$/i, /\.flatpak$/i, /(linux|ubuntu|debian)/i],
};

const OTHER: Record<Platform, RegExp[]> = {
  mac: [...PATTERNS.windows, ...PATTERNS.linux],
  windows: [...PATTERNS.mac, ...PATTERNS.linux],
  linux: [...PATTERNS.mac, ...PATTERNS.windows],
};

export function detectPlatform(ua: string, platformHint = ""): Platform | null {
  const s = `${platformHint} ${ua}`.toLowerCase();
  if (/android/.test(s)) return null;
  if (/iphone|ipad|ipod/.test(s)) return null;
  if (/mac|darwin/.test(s)) return "mac";
  if (/win/.test(s)) return "windows";
  if (/linux|x11|ubuntu|debian|cros/.test(s)) return "linux";
  return null;
}

export function pickAsset(assets: ReleaseAsset[], platform: Platform): ReleaseAsset | null {
  const notOther = (a: ReleaseAsset) => !OTHER[platform].some((re) => re.test(a.name));

  for (const re of PATTERNS[platform]) {
    const hit = assets.find((a) => re.test(a.name) && notOther(a));
    if (hit) return hit;
  }
  return null;
}

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export async function fetchLatestRelease(repo: string): Promise<LatestRelease | null> {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    tag_name?: string;
    name?: string;
    published_at?: string;
    html_url?: string;
    assets?: Array<{ name?: string; browser_download_url?: string; size?: number }>;
  };

  return {
    version: json.tag_name ?? json.name ?? "",
    publishedAt: json.published_at ?? "",
    pageUrl: json.html_url ?? `https://github.com/${repo}/releases/latest`,
    assets: (json.assets ?? [])
      .filter((a) => a.name && a.browser_download_url)
      .map((a) => ({
        name: a.name as string,
        url: a.browser_download_url as string,
        size: Number(a.size ?? 0),
      })),
  };
}
