import { createFileRoute } from "@tanstack/react-router";
import {
  adminFromToken,
  adminLogin,
  adminLogout,
  createLicense,
  listAccessLog,
  listLicenses,
  listReleases,
  publishRelease,
  setLicenseRevoked,
} from "@/lib/tool667.server";

const COOKIE = "tool_admin";

type AdminBody = Partial<
  Record<
    | "op"
    | "username"
    | "secret"
    | "version"
    | "notes"
    | "mac_url"
    | "mac_name"
    | "win_url"
    | "win_name"
    | "label"
    | "note"
    | "key_hash"
    | "revoked",
    unknown
  >
>;

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number): string {
  const base = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  return maxAgeSeconds <= 0 ? `${base}; Max-Age=0` : `${base}; Max-Age=${maxAgeSeconds}`;
}

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

export const Route = createFileRoute("/api/667tool-admin")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const who = await adminFromToken(readCookie(request, COOKIE));
        if (!who) return json({ authed: false }, { status: 401 });
        const [releases, licenses, accessLog] = await Promise.all([
          listReleases(),
          listLicenses(),
          listAccessLog(),
        ]);
        return json({ authed: true, username: who, releases, licenses, accessLog });
      },
      POST: async ({ request }: { request: Request }) => {
        const body = ((await request.json().catch(() => null)) ?? {}) as AdminBody;
        const op = String(body.op ?? "");

        if (op === "login") {
          const token = await adminLogin(String(body.username ?? ""), String(body.secret ?? ""));
          if (!token) return json({ ok: false, error: "Geçersiz giriş" }, { status: 401 });
          return json(
            { ok: true },
            { headers: { "Set-Cookie": setCookie(COOKIE, token, 12 * 3600) } },
          );
        }

        const cookie = readCookie(request, COOKIE);
        if (op === "logout") {
          await adminLogout(cookie);
          return json({ ok: true }, { headers: { "Set-Cookie": setCookie(COOKIE, "", 0) } });
        }

        const who = await adminFromToken(cookie);
        if (!who) return json({ ok: false, error: "Yetkisiz" }, { status: 401 });

        if (op === "publish") {
          const version = String(body.version ?? "").trim();
          if (!version) return json({ ok: false, error: "Sürüm gerekli" }, { status: 400 });
          await publishRelease({
            version,
            notes: String(body.notes ?? ""),
            mac_url: String(body.mac_url ?? ""),
            mac_name: String(body.mac_name ?? ""),
            win_url: String(body.win_url ?? ""),
            win_name: String(body.win_name ?? ""),
            by: who,
          });
          return json({ ok: true });
        }

        if (op === "license.create") {
          const key = await createLicense(String(body.label ?? ""), String(body.note ?? ""), who);
          return json({ ok: true, key });
        }

        if (op === "license.revoke") {
          await setLicenseRevoked(String(body.key_hash ?? ""), Boolean(body.revoked));
          return json({ ok: true });
        }

        return json({ ok: false, error: "Bilinmeyen işlem" }, { status: 400 });
      },
    },
  },
});
