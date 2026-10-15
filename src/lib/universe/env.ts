export type UniverseEnv = {
  DB: D1Database;
  JOURNAL_DB?: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SITE_ORIGIN?: string;
  ADMIN_LOGINS?: string;
  ADMIN_ORIGIN?: string;
  TOOL_ADMIN_SECRET?: string;
};

let cached: UniverseEnv | null = null;
let trace: string[] = [];

function describe(candidate: unknown): string {
  if (candidate === undefined) return "undefined";
  if (candidate === null) return "null";
  if (typeof candidate !== "object") return typeof candidate;

  const keys = Object.keys(candidate as object);

  return keys.length ? `object{${keys.slice(0, 12).join(",")}}` : "object{bos}";
}

function accept(candidate: unknown, source: string): boolean {
  trace.push(`${source}=${describe(candidate)}`);

  if (candidate && typeof candidate === "object" && "DB" in (candidate as object)) {
    cached = candidate as UniverseEnv;
    return true;
  }

  return false;
}

export function setEnv(candidate: unknown): void {
  if (cached) return;

  accept(candidate, "fetch-arg");
}

export async function ensureEnv(candidate?: unknown): Promise<void> {
  if (cached) return;

  trace = [];

  if (accept(candidate, "fetch-arg")) return;

  try {
    const specifier = ["cloudflare", "workers"].join(":");
    const module = (await import(/* @vite-ignore */ specifier)) as { env?: unknown };

    if (accept(module.env, "cloudflare:workers")) return;
  } catch (error) {
    trace.push(`cloudflare:workers hata=${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    if (accept((globalThis as { __env__?: unknown }).__env__, "globalThis.__env__")) return;
  } catch (error) {
    trace.push("globalThis okunamadi");
  }
}

export function getEnv(): UniverseEnv {
  if (!cached) {
    throw new Error(`env bulunamadi. Denenenler: ${trace.join(" | ") || "hicbiri"}`);
  }

  return cached;
}
