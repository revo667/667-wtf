export type Account = {
  id: string;
  login: string;
  name: string;
  email: string;
  avatar: string;
  apps?: Record<string, boolean>;
};

const API = "/api/account";

export function signInUrl(next?: string) {
  const target =
    next &&
    (/^\/(?![/\\])/.test(next) ||
      /^https:\/\/([a-z0-9-]+\.)?(revo667\.com|667\.wtf)(\/|$)/i.test(next))
      ? next
      : "/universe";

  return `${API}/login?next=${encodeURIComponent(target)}`;
}

export async function me(): Promise<Account | null> {
  const response = await fetch(`${API}/me`, { credentials: "include" });

  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Sunucu hatası (${response.status})`);

  return (await response.json()) as Account;
}

export async function logout(): Promise<void> {
  await fetch(`${API}/logout`, { method: "POST", credentials: "include" });
}

export async function mintDesktopToken(redirect?: string): Promise<string> {
  const response = await fetch(`${API}/desktop-token`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ redirect }),
  });

  const body = (await response.json()) as { token?: string; message?: string };

  if (!response.ok || !body.token) {
    throw new Error(body.message ?? "Cihaz anahtarı alınamadı");
  }

  return body.token;
}

const LOOPBACK = /^http:\/\/127\.0\.0\.1:\d{2,5}\/callback$/;

export function isLoopback(redirect: string | null | undefined): redirect is string {
  return typeof redirect === "string" && LOOPBACK.test(redirect);
}

export type AdminUser = {
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

export type AdminReport = {
  users: AdminUser[];
  summary: { total: number; devices: number; activeWeek: number };
};

export async function adminUsers(): Promise<AdminReport> {
  const response = await fetch(`${API}/admin/users`, { credentials: "include" });
  const body = await response.json();

  if (!response.ok) {
    throw new Error((body as { message?: string }).message ?? `Sunucu hatası (${response.status})`);
  }

  return body as AdminReport;
}

export async function adminRevoke(userId: string): Promise<void> {
  const response = await fetch(`${API}/admin/revoke`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const body = (await response.json()) as { message?: string };
    throw new Error(body.message ?? "Iptal edilemedi");
  }
}

export const APP_KEYS = ["universe", "trading", "utility"] as const;
export type AppKey = (typeof APP_KEYS)[number];

export const APP_LABELS: Record<AppKey, string> = {
  universe: "Universe",
  trading: "Trading Journal",
  utility: "667 Utility",
};

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

async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { credentials: "include", ...init });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((body as { message?: string }).message ?? `Sunucu hatasi (${response.status})`);
  }

  return body as T;
}

export function adminJournal(): Promise<{ users: JournalUser[]; available: boolean }> {
  return send("/admin/journal");
}

export function adminJournalUser(
  id: string,
  patch: { isActive?: boolean; role?: string },
): Promise<{ ok: true }> {
  return send("/admin/journal-user", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, ...patch }),
  });
}

export function adminAccess(): Promise<{
  apps: AppKey[];
  rows: { user_id: string; app: string; enabled: number }[];
}> {
  return send("/admin/access");
}

export function adminSetAccess(
  userId: string,
  app: AppKey,
  enabled: boolean,
): Promise<{ ok: true }> {
  return send("/admin/access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, app, enabled }),
  });
}

export type DataTable = {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  truncated: boolean;
};

export function adminInspect(
  app: AppKey,
  id: string,
): Promise<{ tables: DataTable[]; available: boolean }> {
  return send(`/admin/inspect?app=${encodeURIComponent(app)}&id=${encodeURIComponent(id)}`);
}
