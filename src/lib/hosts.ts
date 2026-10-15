// Panel yalnızca bu alan adlarında açılır. panel.localhost yerel geliştirme içindir
// (tarayıcılar *.localhost'u 127.0.0.1'e çözer).
const PANEL_HOSTNAMES = new Set(["panel.667.wtf", "panel.localhost"]);

export const ACCOUNT_ORIGIN = "https://www.revo667.com";

const ACCOUNT_PATH = /^\/(admin|universe)(\/|$)/;

export function isPanelHost(hostname: string): boolean {
  return PANEL_HOSTNAMES.has(hostname);
}

export function siteRedirect(url: URL): { location: string; status: number } | null {
  if (url.hostname === "revo667.com") {
    return { location: `${ACCOUNT_ORIGIN}${url.pathname}${url.search}`, status: 301 };
  }
  if (url.hostname === "admin.revo667.com" && url.pathname === "/") {
    return { location: "/admin", status: 302 };
  }
  if (
    (url.hostname === "667.wtf" || url.hostname === "www.667.wtf") &&
    ACCOUNT_PATH.test(url.pathname)
  ) {
    return { location: `${ACCOUNT_ORIGIN}${url.pathname}${url.search}`, status: 302 };
  }
  return null;
}

export const PANEL_PREFIX = "/panel";
