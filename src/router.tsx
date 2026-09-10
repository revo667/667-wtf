import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { isPanelHost, PANEL_PREFIX } from "./lib/hosts";
import { routeTree } from "./routeTree.gen";

// src/server.ts'in panel istekleri için ürettiği CSP nonce'u. Router bunu inline script'lere
// ekler. İstemci tarafı nonce'u sayfadaki csp-nonce meta etiketinden kendisi okur.
const getNonce = createIsomorphicFn()
  .server(() => getRequestHeader("x-csp-nonce"))
  .client(() => undefined);

// panel.667.wtf/x adresi router'ın içinde /panel/x rotasına denk gelir (ve linkler geri çevrilir).
const panelHostRewrite = {
  input: ({ url }: { url: URL }) => {
    if (!isPanelHost(url.hostname)) return undefined;
    const out = new URL(url);
    out.pathname = url.pathname === "/" ? PANEL_PREFIX : `${PANEL_PREFIX}${url.pathname}`;
    return out;
  },
  output: ({ url }: { url: URL }) => {
    if (!isPanelHost(url.hostname)) return undefined;
    if (url.pathname !== PANEL_PREFIX && !url.pathname.startsWith(`${PANEL_PREFIX}/`))
      return undefined;
    const out = new URL(url);
    out.pathname = url.pathname.slice(PANEL_PREFIX.length) || "/";
    return out;
  },
};

export const getRouter = () => {
  const queryClient = new QueryClient();
  const nonce = getNonce();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    rewrite: panelHostRewrite,
    ...(nonce ? { ssr: { nonce } } : {}),
  });

  return router;
};
