import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, streamEvents } from "./api";
import type { LiveEvent } from "./types";

type Live = { events: LiveEvent[]; connected: boolean };

const LiveContext = createContext<Live>({ events: [], connected: false });

/** En yeni başta olmak üzere son canlı olaylar. */
export const useLive = () => useContext(LiveContext);

const MAX_EVENTS = 100;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Panel açıkken tek bir canlı akış bağlantısı tutar; koparsa artan aralıklarla yeniden bağlanır. */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Live>({ events: [], connected: false });

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      let delay = 1_000;
      while (!ctrl.signal.aborted) {
        try {
          await streamEvents(
            (ev) =>
              setState((s) => ({
                events: [ev, ...s.events].slice(0, MAX_EVENTS),
                connected: true,
              })),
            ctrl.signal,
            () => {
              delay = 1_000;
              setState((s) => ({ ...s, connected: true }));
            },
          );
        } catch {
          // Ağ hatası: aşağıda yeniden denenir.
        }
        if (ctrl.signal.aborted) break;
        setState((s) => ({ ...s, connected: false }));
        // Akışı sunucu kapattıysa oturum bitmiş olabilir. 401 ise api() oturumu kapatır.
        await api("GET", "/auth/me", undefined, { background: true }).catch(() => undefined);
        await sleep(delay);
        delay = Math.min(delay * 2, 30_000);
      }
    })();
    return () => ctrl.abort();
  }, []);

  return <LiveContext.Provider value={state}>{children}</LiveContext.Provider>;
}
