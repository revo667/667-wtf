import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { isPanelHost, PANEL_PREFIX, siteRedirect } from "./lib/hosts";
import { ensureEnv } from "./lib/universe/env";
import { handleUniverseApi } from "./lib/universe/api";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Panel: alan adı ayrımı, /api proxy'si ve güvenlik header'ları
// ---------------------------------------------------------------------------

function readEnv(name: string): string | undefined {
  // Cloudflare'de Worker secret'larını nitro globalThis.__env__'ye koyar; yerelde process.env kullanılır.
  const cfEnv = (globalThis as { __env__?: Record<string, unknown> }).__env__;
  const value = cfEnv?.[name] ?? process.env[name];
  return typeof value === "string" && value !== "" ? value : undefined;
}

function textResponse(status: number, body: string): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Tarayıcıdan backend'e yalnızca bu header'lar geçer. Güven taşıyan x-origin-auth ve
// x-client-ip'yi sadece Worker koyar; tarayıcı bunları gönderse bile iletilmez.
const FORWARDED_HEADERS = [
  "accept",
  "content-type",
  "cookie",
  "origin",
  "user-agent",
  "x-session-bind",
  "x-background",
];

async function proxyApi(request: Request, url: URL): Promise<Response> {
  const apiOrigin = readEnv("HEROKU_API_ORIGIN");
  const secret = readEnv("ORIGIN_SECRET");
  if (!apiOrigin || !secret) return jsonError(503, "Panel API yapılandırılmamış");

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set("x-origin-auth", secret);
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-client-ip", clientIp);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(new URL(url.pathname + url.search, apiOrigin), {
      method: request.method,
      headers,
      body: hasBody ? request.body : null,
      redirect: "manual",
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit);
  } catch {
    return jsonError(502, "Panel API'ye ulaşılamadı");
  }

  // Set-Cookie ve SSE akışı olduğu gibi geçer.
  const response = new Response(upstream.body, upstream);
  response.headers.delete("content-encoding");
  response.headers.delete("content-length");
  return response;
}

function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes));
}

/** Router'ın nonce'u okuyabilmesi için isteğe eklenir. Tarayıcıdan gelen aynı adlı header silinir. */
function withNonceHeader(request: Request, nonce: string | undefined): Request {
  if (!nonce && !request.headers.has("x-csp-nonce")) return request;
  const headers = new Headers(request.headers);
  headers.delete("x-csp-nonce");
  if (nonce) headers.set("x-csp-nonce", nonce);
  return new Request(request, {
    headers,
    ...(request.body ? { duplex: "half" } : {}),
  } as RequestInit);
}

function panelCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    // Embed önizlemesi kullanıcının girdiği https görsellerini gösterir; script/bağlantı yine kısıtlı.
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function withPanelHeaders(res: Response, nonce: string): Response {
  const out = new Response(res.body, res);
  const h = out.headers;
  // Yerelde Vite stilleri script ile enjekte ettiği için CSP sadece raporlanır. Build'de zorunludur.
  h.set(
    import.meta.env.DEV ? "content-security-policy-report-only" : "content-security-policy",
    panelCsp(nonce),
  );
  h.set("x-content-type-options", "nosniff");
  h.set("x-frame-options", "DENY");
  h.set("referrer-policy", "no-referrer");
  h.set("cross-origin-opener-policy", "same-origin");
  h.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  h.set("x-robots-tag", "noindex, nofollow");
  h.set("cache-control", "no-store");
  if (!import.meta.env.DEV)
    h.set("strict-transport-security", "max-age=63072000; includeSubDomains");
  return out;
}

function withSiteHeaders(res: Response): Response {
  const out = new Response(res.body, res);
  const h = out.headers;
  h.set("x-content-type-options", "nosniff");
  h.set("x-frame-options", "DENY");
  h.set("referrer-policy", "strict-origin-when-cross-origin");
  h.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  // includeSubDomains yok: 667.wtf'in bilinmeyen başka alt alan adlarını bozmasın.
  if (!import.meta.env.DEV) h.set("strict-transport-security", "max-age=63072000");
  return out;
}

function isPanelPath(pathname: string): boolean {
  return pathname === PANEL_PREFIX || pathname.startsWith(`${PANEL_PREFIX}/`);
}

const SITE_API_ROUTES = new Set([
  "/api/667tool-update",
  "/api/667tool-license",
  "/api/667tool-admin",
  "/api/discord-card",
]);

const PRESENCE_TTL_MS = 15_000;
const DEV_PRESENCE_URL = "https://panel.667.wtf/api/public/presence";
let presenceCache: { at: number; body: string } | null = null;

async function presenceApi(): Promise<Response> {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=10",
  };
  if (presenceCache && Date.now() - presenceCache.at < PRESENCE_TTL_MS) {
    return new Response(presenceCache.body, { headers });
  }
  const apiOrigin = readEnv("HEROKU_API_ORIGIN");
  const secret = readEnv("ORIGIN_SECRET");
  const devFallback = import.meta.env.DEV && (!apiOrigin || !secret);
  if (!devFallback && (!apiOrigin || !secret)) {
    return jsonError(503, "Durum servisi yapılandırılmamış");
  }
  try {
    const upstream = devFallback
      ? await fetch(DEV_PRESENCE_URL, { headers: { accept: "application/json" } })
      : await fetch(new URL("/api/public/presence", apiOrigin), {
          headers: { accept: "application/json", "x-origin-auth": secret ?? "" },
        });
    if (!upstream.ok) throw new Error(`presence ${upstream.status}`);
    const body = await upstream.text();
    presenceCache = { at: Date.now(), body };
    return new Response(body, { headers });
  } catch (error) {
    console.error(error);
    if (presenceCache) return new Response(presenceCache.body, { headers });
    return jsonError(502, "Durum servisine ulaşılamadı");
  }
}

async function siteApi(request: Request, url: URL, env: unknown): Promise<Response | null> {
  if (url.pathname === "/api/presence" && request.method === "GET") {
    return withSiteHeaders(await presenceApi());
  }
  if (url.pathname.startsWith("/api/universe") || url.pathname.startsWith("/api/account")) {
    await ensureEnv(env);
    return withSiteHeaders(await handleUniverseApi(request));
  }
  if (SITE_API_ROUTES.has(url.pathname)) return null;
  return textResponse(404, "Not Found");
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const panel = isPanelHost(url.hostname);
    const isApi = url.pathname.startsWith("/api/");

    if (!isApi && (request.method === "GET" || request.method === "HEAD")) {
      const target = siteRedirect(url);
      if (target) {
        return new Response(null, {
          status: target.status,
          headers: { location: target.location },
        });
      }
    }

    if (isApi) {
      if (panel) return proxyApi(request, url);
      try {
        const handled = await siteApi(request, url, env);
        if (handled) return handled;
      } catch (error) {
        console.error(error);
        return jsonError(500, "Sunucu hatası");
      }
    }
    if (!panel && isPanelPath(url.pathname)) return textResponse(404, "Not Found");

    const nonce = panel ? makeNonce() : undefined;
    try {
      const handler = await getServerEntry();
      const response = await normalizeCatastrophicSsrResponse(
        await handler.fetch(withNonceHeader(request, nonce), env, ctx),
      );
      return nonce ? withPanelHeaders(response, nonce) : withSiteHeaders(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
