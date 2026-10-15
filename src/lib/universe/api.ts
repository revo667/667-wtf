import { getEnv } from "./env";
import {
  APPS,
  accessFor,
  allAccess,
  inspectAccount,
  inspectJournal,
  listJournalUsers,
  setAccess,
  setJournalUser,
  listUsers,
  revokeUser,
  createDeviceToken,
  createSession,
  destroySession,
  readState,
  upsertUser,
  userFromDeviceToken,
  userFromSession,
  writeState,
  type User,
} from "./db";

const SESSION_COOKIE = "universe_session";
const OAUTH_COOKIE = "universe_oauth";
const LOOPBACK = /^http:\/\/127\.0\.0\.1:\d{2,5}\/callback$/;

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");

  if (!header) return null;

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }

  return null;
}

function cookieDomain(request: Request): string | null {
  const host = new URL(getEnv().SITE_ORIGIN ?? request.url).hostname;

  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  const base = host.replace(/^www\./, "");

  return base.includes(".") ? base : null;
}

function setCookie(request: Request, name: string, value: string, maxAge: number) {
  const flags = ["Path=/", "HttpOnly", "Secure", "SameSite=Lax", `Max-Age=${maxAge}`];
  const domain = cookieDomain(request);

  if (domain) {
    flags.push(`Domain=${domain}`);
  }

  return `${name}=${encodeURIComponent(value)}; ${flags.join("; ")}`;
}

function publicUser(user: User) {
  return {
    id: user.id,
    login: user.login,
    name: user.name ?? user.login,
    email: user.email ?? "",
    avatar: user.avatar ?? "",
  };
}

function origin(request: Request) {
  return getEnv().SITE_ORIGIN ?? new URL(request.url).origin;
}

function sameSite(target: string, request: Request): boolean {
  try {
    const base = new URL(getEnv().SITE_ORIGIN ?? request.url).hostname.replace(/^www\./, "");
    const host = new URL(target).hostname;

    return host === base || host.endsWith(`.${base}`);
  } catch {
    return false;
  }
}

function safeNext(raw: string | null, request: Request): string {
  if (!raw) return "/universe";
  if (/^\/(?![/\\])/.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw) && sameSite(raw, request)) return raw;

  return "/universe";
}

function isAdmin(user: User): boolean {
  const list = (getEnv().ADMIN_LOGINS ?? "revo667")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return list.includes(user.login.toLowerCase());
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");

  return header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function startLogin(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"), request);
  const state = crypto.randomUUID();

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", getEnv().GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${origin(request)}/api/universe/callback`);
  authorize.searchParams.set("scope", "read:user user:email");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      "set-cookie": setCookie(request, OAUTH_COOKIE, `${state}|${next}`, 600),
    },
  });
}

async function finishLogin(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stored = readCookie(request, OAUTH_COOKIE);

  if (!code || !state || !stored) {
    const missing = [
      code ? null : "code",
      state ? null : "state",
      stored ? null : `${OAUTH_COOKIE} cerezi`,
    ].filter(Boolean);

    return json(
      {
        message: `Eksik OAuth parametresi: ${missing.join(", ")}`,
        host: new URL(request.url).host,
        cookieDomain: cookieDomain(request),
      },
      400,
    );
  }

  const [expected, next] = stored.split("|");

  if (state !== expected) {
    return json({ message: "OAuth state doğrulanamadı" }, 400);
  }

  const env = getEnv();

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${origin(request)}/api/universe/callback`,
    }),
  });

  const grant = (await tokenResponse.json()) as { access_token?: string; error?: string };

  if (!grant.access_token) {
    return json({ message: grant.error ?? "GitHub token alınamadı" }, 400);
  }

  const headers = {
    authorization: `Bearer ${grant.access_token}`,
    accept: "application/vnd.github+json",
    "user-agent": "universe-site",
  };

  const profile = (await (await fetch("https://api.github.com/user", { headers })).json()) as {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  };

  let email = profile.email;

  if (!email) {
    const list = (await (
      await fetch("https://api.github.com/user/emails", { headers })
    ).json()) as Array<{ email: string; primary: boolean; verified: boolean }>;

    email = list.find((entry) => entry.primary && entry.verified)?.email ?? null;
  }

  const user = await upsertUser({
    githubId: profile.id,
    login: profile.login,
    name: profile.name,
    email,
    avatar: profile.avatar_url,
  });

  const session = await createSession(user.id);
  const target = safeNext(next ?? null, request);

  const responseHeaders = new Headers({ location: target });

  responseHeaders.append(
    "set-cookie",
    setCookie(request, SESSION_COOKIE, session, 60 * 60 * 24 * 60),
  );
  responseHeaders.append("set-cookie", setCookie(request, OAUTH_COOKIE, "", 0));

  return new Response(null, { status: 302, headers: responseHeaders });
}

export async function handleUniverseApi(request: Request): Promise<Response> {
  try {
    return await route(request);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);

    console.error("universe api", message, cause);

    return json({ message, where: new URL(request.url).pathname }, 500);
  }
}

async function route(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/(universe|account)\/?/, "");

  if (route === "login") {
    return startLogin(request);
  }

  if (route === "callback") {
    return finishLogin(request);
  }

  if (route === "logout" && request.method === "POST") {
    await destroySession(readCookie(request, SESSION_COOKIE));

    return json({ ok: true }, 200, { "set-cookie": setCookie(request, SESSION_COOKIE, "", 0) });
  }

  if (route === "me") {
    const token = bearer(request);

    const user = token
      ? await userFromDeviceToken(token)
      : await userFromSession(readCookie(request, SESSION_COOKIE));

    if (!user) {
      return json({ message: "Oturum yok" }, 401);
    }

    return json({ ...publicUser(user), apps: await accessFor(user.id) });
  }

  if (route === "desktop-token" && request.method === "POST") {
    const user = await userFromSession(readCookie(request, SESSION_COOKIE));

    if (!user) {
      return json({ message: "Oturum yok" }, 401);
    }

    const body = (await request.json().catch(() => ({}))) as { redirect?: string };

    if (body.redirect && !LOOPBACK.test(body.redirect)) {
      return json({ message: "Geçersiz yönlendirme adresi" }, 400);
    }

    return json({ token: await createDeviceToken(user.id) });
  }

  if (route.startsWith("admin/")) {
    const user = await userFromSession(readCookie(request, SESSION_COOKIE));

    if (!user) {
      return json({ message: "Oturum yok" }, 401);
    }

    if (!isAdmin(user)) {
      return json({ message: "Bu alan yonetici hesabina ait" }, 403);
    }

    if (route === "admin/users" && request.method === "GET") {
      const users = await listUsers();
      const week = Date.now() - 7 * 24 * 60 * 60 * 1000;

      return json({
        users,
        summary: {
          total: users.length,
          devices: users.reduce((sum, entry) => sum + entry.devices, 0),
          activeWeek: users.filter(
            (entry) => entry.lastSync && new Date(entry.lastSync).getTime() > week,
          ).length,
        },
      });
    }

    if (route === "admin/journal" && request.method === "GET") {
      return json(await listJournalUsers());
    }

    if (route === "admin/journal-user" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        id?: string;
        isActive?: boolean;
        role?: string;
      };

      if (!body.id) {
        return json({ message: "id gerekli" }, 400);
      }

      const patch: { isActive?: boolean; role?: string } = {};
      if (body.isActive !== undefined) patch.isActive = body.isActive;
      if (body.role !== undefined) patch.role = body.role;
      const ok = await setJournalUser(body.id, patch);

      return ok ? json({ ok: true }) : json({ message: "Journal veritabani bagli degil" }, 503);
    }

    if (route === "admin/inspect" && request.method === "GET") {
      const app = url.searchParams.get("app") ?? "universe";
      const id = url.searchParams.get("id") ?? "";

      if (!id) {
        return json({ message: "id gerekli" }, 400);
      }

      if (app === "trading") {
        const report = await inspectJournal(id);

        return json({ tables: report.tables, available: report.available });
      }

      return json({ tables: await inspectAccount(id), available: true });
    }

    if (route === "admin/access" && request.method === "GET") {
      return json({ apps: APPS, rows: await allAccess() });
    }

    if (route === "admin/access" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        userId?: string;
        app?: string;
        enabled?: boolean;
      };

      if (!body.userId || !body.app || !(APPS as readonly string[]).includes(body.app)) {
        return json({ message: "userId ve gecerli app gerekli" }, 400);
      }

      await setAccess(body.userId, body.app, body.enabled !== false);

      return json({ ok: true });
    }

    if (route === "admin/revoke" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { userId?: string };

      if (!body.userId) {
        return json({ message: "userId gerekli" }, 400);
      }

      await revokeUser(body.userId);

      return json({ ok: true });
    }

    return json({ message: "Bulunamadi" }, 404);
  }

  if (route === "state") {
    const user = await userFromDeviceToken(bearer(request));

    if (!user) {
      return json({ message: "Geçersiz cihaz anahtarı" }, 401);
    }

    if (request.method === "GET") {
      return json(await readState(user.id));
    }

    if (request.method === "PUT") {
      const body = (await request.json().catch(() => ({}))) as {
        layout?: unknown;
        connectors?: unknown;
      };

      return json(await writeState(user.id, body.layout, body.connectors));
    }
  }

  return json({ message: "Bulunamadı" }, 404);
}
