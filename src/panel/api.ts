import type { LiveEvent } from "./types";

export type Level = "mod" | "admin" | "owner";

export interface LoginResult {
  username: string;
  level: Level;
  bind: string;
  idle_seconds: number;
  max_seconds: number;
}

export interface Session extends Omit<LoginResult, "bind"> {
  startedAt: number;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Oturumun ikinci yarısı. Bilerek sadece bellekte: localStorage/sessionStorage YOK.
// Sayfa yenilenince veya kapanınca kaybolur ve tekrar giriş gerekir.
let bind: string | null = null;
let sessionLost: (() => void) | null = null;

export function setBind(value: string | null) {
  bind = value;
}

export function onSessionLost(fn: () => void) {
  sessionLost = fn;
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function api<T = unknown>(
  method: Method,
  path: string,
  body?: unknown,
  opts: { background?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (bind) headers["X-Session-Bind"] = bind;
  if (opts.background) headers["X-Background"] = "1";

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Sunucuya ulaşılamadı");
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `HTTP ${res.status}`;
    if (res.status === 401 && bind) {
      bind = null;
      sessionLost?.();
    }
    throw new ApiError(res.status, message);
  }
  return data as T;
}

/**
 * Canlı olay akışı (SSE). EventSource özel header gönderemediği için fetch ile okunur.
 * Akış bitince (sunucu kapattı) döner; ağ hatasında fırlatır.
 */
export async function streamSse<T>(
  path: string,
  onEvent: (ev: T) => void,
  signal: AbortSignal,
  onOpen: () => void,
): Promise<void> {
  if (!bind) return;
  const res = await fetch(`/api${path}`, {
    headers: { "X-Session-Bind": bind, "X-Background": "1", Accept: "text/event-stream" },
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (res.status === 401) {
    if (bind) {
      bind = null;
      sessionLost?.();
    }
    return;
  }
  if (!res.ok || !res.body) throw new ApiError(res.status, `HTTP ${res.status}`);
  onOpen();

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    for (let end = buffer.indexOf("\n\n"); end >= 0; end = buffer.indexOf("\n\n")) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue; // ": ka" keepalive satırları
      try {
        onEvent(JSON.parse(data) as T);
      } catch {
        // Bozuk olay atlanır.
      }
    }
  }
}

/** Panelin canlı olay akışı (`/api/events`). */
export function streamEvents(
  onEvent: (ev: LiveEvent) => void,
  signal: AbortSignal,
  onOpen: () => void,
): Promise<void> {
  return streamSse<LiveEvent>("/events", onEvent, signal, onOpen);
}

/** Sayfa kapanırken/yenilenirken sunucudaki oturumu da hemen öldürür. */
export function logoutOnExit() {
  if (!bind) return;
  bind = null;
  void fetch("/api/auth/logout", { method: "POST", keepalive: true, credentials: "same-origin" });
}
