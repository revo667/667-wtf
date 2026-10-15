import { getEnv } from "./env";

export type User = {
  id: string;
  github_id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
};

const SESSION_DAYS = 60;

function db() {
  return getEnv().DB;
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));

  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function upsertUser(profile: {
  githubId: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
}): Promise<User> {
  const existing = await db()
    .prepare("SELECT * FROM users WHERE github_id = ?")
    .bind(profile.githubId)
    .first<User>();

  if (existing) {
    await db()
      .prepare("UPDATE users SET login = ?, name = ?, email = ?, avatar = ? WHERE id = ?")
      .bind(profile.login, profile.name, profile.email, profile.avatar, existing.id)
      .run();

    return { ...existing, ...profile, github_id: profile.githubId };
  }

  const id = randomToken().slice(0, 24);

  await db()
    .prepare(
      "INSERT INTO users (id, github_id, login, name, email, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      profile.githubId,
      profile.login,
      profile.name,
      profile.email,
      profile.avatar,
      Date.now(),
    )
    .run();

  return {
    id,
    github_id: profile.githubId,
    login: profile.login,
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar,
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;

  await db()
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    )
    .bind(await hashToken(token), userId, Date.now(), expires)
    .run();

  return token;
}

export async function userFromSession(token: string | null): Promise<User | null> {
  if (!token) return null;

  const row = await db()
    .prepare(
      `SELECT users.* FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .bind(await hashToken(token), Date.now())
    .first<User>();

  return row ?? null;
}

export async function destroySession(token: string | null): Promise<void> {
  if (!token) return;

  await db()
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await hashToken(token))
    .run();
}

export async function createDeviceToken(userId: string): Promise<string> {
  const token = randomToken();

  await db()
    .prepare("INSERT INTO device_tokens (token_hash, user_id, created_at) VALUES (?, ?, ?)")
    .bind(await hashToken(token), userId, Date.now())
    .run();

  return token;
}

export async function userFromDeviceToken(token: string | null): Promise<User | null> {
  if (!token) return null;

  const hash = await hashToken(token);

  const row = await db()
    .prepare(
      `SELECT users.* FROM device_tokens
       JOIN users ON users.id = device_tokens.user_id
       WHERE device_tokens.token_hash = ?`,
    )
    .bind(hash)
    .first<User>();

  if (row) {
    await db()
      .prepare("UPDATE device_tokens SET last_used_at = ? WHERE token_hash = ?")
      .bind(Date.now(), hash)
      .run();
  }

  return row ?? null;
}

export async function readState(userId: string) {
  const row = await db()
    .prepare("SELECT layout, connectors, updated_at FROM states WHERE user_id = ?")
    .bind(userId)
    .first<{ layout: string; connectors: string; updated_at: number }>();

  if (!row) {
    return { layout: null, connectors: {}, updatedAt: null };
  }

  return {
    layout: JSON.parse(row.layout),
    connectors: JSON.parse(row.connectors),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function writeState(userId: string, layout: unknown, connectors: unknown) {
  const now = Date.now();

  await db()
    .prepare(
      `INSERT INTO states (user_id, layout, connectors, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET layout = excluded.layout,
         connectors = excluded.connectors, updated_at = excluded.updated_at`,
    )
    .bind(userId, JSON.stringify(layout ?? {}), JSON.stringify(connectors ?? {}), now)
    .run();

  return { updatedAt: new Date(now).toISOString() };
}

export type AdminRow = {
  id: string;
  login: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  createdAt: string;
  devices: number;
  activeSessions: number;
  lastSync: string | null;
  panels: number;
  connectorKeys: string[];
  connectors: Record<string, Record<string, unknown>>;
};

function countPanels(raw: string | null): number {
  if (!raw) return 0;

  try {
    const layout = JSON.parse(raw) as { panels?: Array<{ closed?: boolean }> };

    return (layout.panels ?? []).filter((panel) => !panel.closed).length;
  } catch {
    return 0;
  }
}

function parseConnectors(raw: string | null): Record<string, Record<string, unknown>> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function listUsers(): Promise<AdminRow[]> {
  const result = await db()
    .prepare(
      `SELECT users.id, users.login, users.name, users.email, users.avatar, users.created_at,
              (SELECT COUNT(*) FROM device_tokens d WHERE d.user_id = users.id) AS devices,
              (SELECT COUNT(*) FROM sessions s WHERE s.user_id = users.id AND s.expires_at > ?) AS active_sessions,
              states.updated_at AS state_updated,
              states.layout AS layout,
              states.connectors AS connectors
       FROM users
       LEFT JOIN states ON states.user_id = users.id
       ORDER BY users.created_at DESC
       LIMIT 500`,
    )
    .bind(Date.now())
    .all<{
      id: string;
      login: string;
      name: string | null;
      email: string | null;
      avatar: string | null;
      created_at: number;
      devices: number;
      active_sessions: number;
      state_updated: number | null;
      layout: string | null;
      connectors: string | null;
    }>();

  return (result.results ?? []).map((row) => ({
    id: row.id,
    login: row.login,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    createdAt: new Date(row.created_at).toISOString(),
    devices: row.devices,
    activeSessions: row.active_sessions,
    lastSync: row.state_updated ? new Date(row.state_updated).toISOString() : null,
    panels: countPanels(row.layout),
    connectorKeys: Object.keys(parseConnectors(row.connectors)),
    connectors: parseConnectors(row.connectors),
  }));
}

export async function revokeUser(userId: string): Promise<void> {
  await db().prepare("DELETE FROM device_tokens WHERE user_id = ?").bind(userId).run();
  await db().prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
}

export const APPS = ["universe", "trading", "utility"] as const;
export type AppKey = (typeof APPS)[number];

function journalDb(): D1Database | null {
  return getEnv().JOURNAL_DB ?? null;
}

export async function accessFor(userId: string): Promise<Record<string, boolean>> {
  const result = await db()
    .prepare("SELECT app, enabled FROM app_access WHERE user_id = ?")
    .bind(userId)
    .all<{ app: string; enabled: number }>();

  const out: Record<string, boolean> = {};

  for (const app of APPS) out[app] = true;
  for (const row of result.results ?? []) out[row.app] = Boolean(row.enabled);

  return out;
}

export async function setAccess(userId: string, app: string, enabled: boolean): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO app_access (user_id, app, enabled, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, app) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
    )
    .bind(userId, app, enabled ? 1 : 0, Date.now())
    .run();
}

export type AccessRow = { user_id: string; app: string; enabled: number };

export async function allAccess(): Promise<AccessRow[]> {
  const result = await db()
    .prepare("SELECT user_id, app, enabled FROM app_access")
    .all<AccessRow>();

  return result.results ?? [];
}

export type JournalUser = {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  displayName: string | null;
  accountId: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  trades: number;
  notes: number;
};

export async function listJournalUsers(): Promise<{ users: JournalUser[]; available: boolean }> {
  const journal = journalDb();

  if (!journal) return { users: [], available: false };

  try {
    const result = await journal
      .prepare(
        `SELECT users.id, users.username, users.role, users.is_active, users.display_name,
                users.account_id, users.created_at, users.last_login_at,
                (SELECT COUNT(*) FROM trades t WHERE t.user_id = users.id) AS trades,
                (SELECT COUNT(*) FROM notes n WHERE n.user_id = users.id) AS notes
         FROM users ORDER BY users.created_at ASC LIMIT 200`,
      )
      .all<{
        id: string;
        username: string;
        role: string;
        is_active: number;
        display_name: string | null;
        account_id: string | null;
        created_at: string | null;
        last_login_at: string | null;
        trades: number;
        notes: number;
      }>();

    return {
      available: true,
      users: (result.results ?? []).map((row) => ({
        id: row.id,
        username: row.username,
        role: row.role,
        isActive: Boolean(row.is_active),
        displayName: row.display_name,
        accountId: row.account_id,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        trades: row.trades,
        notes: row.notes,
      })),
    };
  } catch {
    return { users: [], available: false };
  }
}

export async function setJournalUser(
  id: string,
  patch: { isActive?: boolean; role?: string },
): Promise<boolean> {
  const journal = journalDb();

  if (!journal) return false;

  if (patch.isActive !== undefined) {
    await journal
      .prepare("UPDATE users SET is_active = ? WHERE id = ?")
      .bind(patch.isActive ? 1 : 0, id)
      .run();
  }

  if (patch.role === "admin" || patch.role === "user") {
    await journal.prepare("UPDATE users SET role = ? WHERE id = ?").bind(patch.role, id).run();
  }

  return true;
}

const SAFE_NAME = /^[A-Za-z0-9_]+$/;
const SECRET_COLUMN = /(hash|salt|secret|password|token)/i;
const ROW_LIMIT = 50;

export type DataTable = {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  truncated: boolean;
};

function redact(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (SECRET_COLUMN.test(key) && typeof value === "string" && value.length > 8) {
      out[key] = `${value.slice(0, 6)}… (${value.length} karakter, gizlendi)`;
    } else {
      out[key] = value;
    }
  }

  return out;
}

async function tablesWithColumn(source: D1Database, column: string): Promise<string[]> {
  const list = await source
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
       ORDER BY name`,
    )
    .all<{ name: string }>();

  const names: string[] = [];

  for (const row of list.results ?? []) {
    if (!SAFE_NAME.test(row.name)) continue;

    const info = await source.prepare(`PRAGMA table_info(${row.name})`).all<{ name: string }>();

    if ((info.results ?? []).some((col) => col.name === column)) {
      names.push(row.name);
    }
  }

  return names;
}

async function dumpFor(
  source: D1Database,
  ownerColumn: string,
  ownerId: string,
): Promise<DataTable[]> {
  const names = await tablesWithColumn(source, ownerColumn);
  const out: DataTable[] = [];

  for (const table of names) {
    const count = await source
      .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${ownerColumn} = ?`)
      .bind(ownerId)
      .first<{ n: number }>();

    const total = count?.n ?? 0;

    if (!total) continue;

    const result = await source
      .prepare(`SELECT * FROM ${table} WHERE ${ownerColumn} = ? LIMIT ${ROW_LIMIT}`)
      .bind(ownerId)
      .all<Record<string, unknown>>();

    const rows = (result.results ?? []).map(redact);

    out.push({
      table,
      columns: rows[0] ? Object.keys(rows[0]) : [],
      rows,
      total,
      truncated: total > ROW_LIMIT,
    });
  }

  return out;
}

export async function inspectAccount(userId: string): Promise<DataTable[]> {
  const source = db();
  const profile = await source
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first<Record<string, unknown>>();

  const sections: DataTable[] = [];

  if (profile) {
    const row = redact(profile);

    sections.push({
      table: "users",
      columns: Object.keys(row),
      rows: [row],
      total: 1,
      truncated: false,
    });
  }

  sections.push(...(await dumpFor(source, "user_id", userId)));

  return sections;
}

export async function inspectJournal(journalUserId: string): Promise<{
  tables: DataTable[];
  available: boolean;
}> {
  const journal = journalDb();

  if (!journal) return { tables: [], available: false };

  try {
    const profile = await journal
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(journalUserId)
      .first<Record<string, unknown>>();

    const tables: DataTable[] = [];

    if (profile) {
      const row = redact(profile);

      tables.push({
        table: "users",
        columns: Object.keys(row),
        rows: [row],
        total: 1,
        truncated: false,
      });
    }

    tables.push(...(await dumpFor(journal, "user_id", journalUserId)));

    return { tables, available: true };
  } catch {
    return { tables: [], available: false };
  }
}
