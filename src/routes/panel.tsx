import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RainEffect } from "@/components/RainEffect";
import { logoutOnExit, onSessionLost, type Session } from "@/panel/api";
import { Login } from "@/panel/Login";
import { Shell } from "@/panel/Shell";

export const Route = createFileRoute("/panel")({
  // Oturum sadece tarayıcı belleğinde; sunucuda render edilecek bir şey yok.
  ssr: false,
  head: () => ({
    meta: [{ title: "667 · panel" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PanelRoot,
});

function PanelRoot() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    onSessionLost(() => setSession(null));
    window.addEventListener("pagehide", logoutOnExit);
    return () => window.removeEventListener("pagehide", logoutOnExit);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--halo)_0%,_transparent_60%)]" />
      <RainEffect dim={session !== null} />
      {session ? (
        <Shell session={session} onLogout={() => setSession(null)}>
          <Outlet />
        </Shell>
      ) : (
        <Login onSuccess={setSession} />
      )}
    </div>
  );
}
