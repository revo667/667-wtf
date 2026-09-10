// Panel yalnızca bu alan adlarında açılır. panel.localhost yerel geliştirme içindir
// (tarayıcılar *.localhost'u 127.0.0.1'e çözer).
const PANEL_HOSTNAMES = new Set(["panel.667.wtf", "panel.localhost"]);

export function isPanelHost(hostname: string): boolean {
  return PANEL_HOSTNAMES.has(hostname);
}

export const PANEL_PREFIX = "/panel";
