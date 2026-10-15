import { ensureEnv, getEnv } from "./universe/env";

export type Release = {
  id: number;
  version: string;
  notes: string | null;
  mac_url: string | null;
  mac_name: string | null;
  win_url: string | null;
  win_name: string | null;
  published_at: number;
  published_by: string | null;
};

export type License = {
  key_hash: string;
  label: string | null;
  note: string | null;
  created_at: number;
  created_by: string | null;
  revoked: number;
  last_seen: number | null;
  last_ip: string | null;
};

const SESSION_HOURS = 12;

async function db() {
  await ensureEnv();
  return getEnv().DB;
}

export async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function adminUsers(): string[] {
  const raw = (getEnv().ADMIN_LOGINS ?? "revo667").toLowerCase();
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function adminLogin(username: string, secret: string): Promise<string | null> {
  await ensureEnv();
  const expected = getEnv().TOOL_ADMIN_SECRET;
  const u = username.trim().toLowerCase();
  if (!expected || secret !== expected || !adminUsers().includes(u)) return null;
  const token = randomToken();
  const now = Date.now();
  await (
    await db()
  )
    .prepare(
      "INSERT INTO tool_admin_session (token_hash, username, created_at, expires_at) VALUES (?,?,?,?)",
    )
    .bind(await sha256(token), u, now, now + SESSION_HOURS * 3600_000)
    .run();
  return token;
}

export async function adminFromToken(token: string | null): Promise<string | null> {
  if (!token) return null;
  const row = await (
    await db()
  )
    .prepare("SELECT username, expires_at FROM tool_admin_session WHERE token_hash = ?")
    .bind(await sha256(token))
    .first<{ username: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  return row.username;
}

export async function adminLogout(token: string | null): Promise<void> {
  if (!token) return;
  await (
    await db()
  )
    .prepare("DELETE FROM tool_admin_session WHERE token_hash = ?")
    .bind(await sha256(token))
    .run();
}

export async function latestRelease(): Promise<Release | null> {
  return (await db())
    .prepare("SELECT * FROM tool_release ORDER BY published_at DESC LIMIT 1")
    .first<Release>();
}

export async function listReleases(limit = 20): Promise<Release[]> {
  const res = await (
    await db()
  )
    .prepare("SELECT * FROM tool_release ORDER BY published_at DESC LIMIT ?")
    .bind(limit)
    .all<Release>();
  return res.results ?? [];
}

export async function publishRelease(r: {
  version: string;
  notes?: string;
  mac_url?: string;
  mac_name?: string;
  win_url?: string;
  win_name?: string;
  by: string;
}): Promise<void> {
  await (
    await db()
  )
    .prepare(
      "INSERT INTO tool_release (version, notes, mac_url, mac_name, win_url, win_name, published_at, published_by) VALUES (?,?,?,?,?,?,?,?)",
    )
    .bind(
      r.version.trim(),
      r.notes?.trim() || null,
      r.mac_url?.trim() || null,
      r.mac_name?.trim() || null,
      r.win_url?.trim() || null,
      r.win_name?.trim() || null,
      Date.now(),
      r.by,
    )
    .run();
}

export async function listLicenses(limit = 200): Promise<License[]> {
  const res = await (
    await db()
  )
    .prepare("SELECT * FROM tool_license ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all<License>();
  return res.results ?? [];
}

export async function createLicense(label: string, note: string, by: string): Promise<string> {
  const key = `667-${randomToken(12)}`;
  await (
    await db()
  )
    .prepare(
      "INSERT INTO tool_license (key_hash, label, note, created_at, created_by, revoked) VALUES (?,?,?,?,?,0)",
    )
    .bind(await sha256(key), label.trim() || null, note.trim() || null, Date.now(), by)
    .run();
  return key;
}

export async function setLicenseRevoked(keyHash: string, revoked: boolean): Promise<void> {
  await (
    await db()
  )
    .prepare("UPDATE tool_license SET revoked = ? WHERE key_hash = ?")
    .bind(revoked ? 1 : 0, keyHash)
    .run();
}

export type AccessEvent = {
  id: number;
  label: string | null;
  ip: string | null;
  at: number;
  event: string;
};

async function logAccess(
  keyHash: string | null,
  label: string | null,
  ip: string | null,
  event: string,
) {
  try {
    await (
      await db()
    )
      .prepare("INSERT INTO tool_access_log (key_hash, label, ip, at, event) VALUES (?,?,?,?,?)")
      .bind(keyHash, label, ip, Date.now(), event)
      .run();
  } catch (error) {
    console.error(error);
  }
}

export async function listAccessLog(limit = 100): Promise<AccessEvent[]> {
  try {
    const res = await (
      await db()
    )
      .prepare("SELECT id, label, ip, at, event FROM tool_access_log ORDER BY at DESC LIMIT ?")
      .bind(limit)
      .all<AccessEvent>();
    return res.results ?? [];
  } catch {
    return [];
  }
}

export async function checkLicense(
  key: string,
  ip: string | null,
): Promise<{ valid: boolean; revoked: boolean }> {
  const row = await (
    await db()
  )
    .prepare("SELECT key_hash, label, revoked FROM tool_license WHERE key_hash = ?")
    .bind(await sha256(key))
    .first<{ key_hash: string; label: string | null; revoked: number }>();
  if (!row) {
    await logAccess(null, null, ip, "invalid");
    return { valid: false, revoked: false };
  }
  if (row.revoked) {
    await logAccess(row.key_hash, row.label, ip, "revoked");
    return { valid: false, revoked: true };
  }
  await (
    await db()
  )
    .prepare("UPDATE tool_license SET last_seen = ?, last_ip = ? WHERE key_hash = ?")
    .bind(Date.now(), ip, row.key_hash)
    .run();
  await logAccess(row.key_hash, row.label, ip, "ok");
  return { valid: true, revoked: false };
}

export function manifestFromRelease(r: Release | null): Record<string, unknown> {
  if (!r) return { latest: null };
  const assets: { mac?: string; windows?: string } = {};
  if (r.mac_url) assets.mac = r.mac_url;
  if (r.win_url) assets.windows = r.win_url;
  return {
    latest: r.version,
    notes: r.notes,
    assets,
    names: { mac: r.mac_name, windows: r.win_name },
    published_at: r.published_at,
  };
}
