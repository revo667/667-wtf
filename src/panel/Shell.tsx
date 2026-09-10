import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Gavel,
  Hash,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Server,
  Shield,
  ShieldCheck,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Clock } from "@/components/Clock";
import { api, setBind, type Session } from "./api";
import { LiveProvider, useLive } from "./live";
import { SessionContext } from "./session";

type NavTo =
  | "/panel"
  | "/panel/uyeler"
  | "/panel/mesajlar"
  | "/panel/roller"
  | "/panel/kanallar"
  | "/panel/sunucu"
  | "/panel/otomasyon"
  | "/panel/moderasyon";
// `to` olmayanlar henüz yapılmamış modüller: menüde görünür ama tıklanamaz.
type NavItem = { label: string; icon: LucideIcon; to?: NavTo };

const NAV: NavItem[] = [
  { label: "Genel Bakış", icon: LayoutDashboard, to: "/panel" },
  { label: "Üyeler", icon: Users, to: "/panel/uyeler" },
  { label: "Mesajlar", icon: MessagesSquare, to: "/panel/mesajlar" },
  { label: "Roller", icon: Shield, to: "/panel/roller" },
  { label: "Kanallar", icon: Hash, to: "/panel/kanallar" },
  { label: "Sunucu", icon: Server, to: "/panel/sunucu" },
  { label: "Otomasyon", icon: Workflow, to: "/panel/otomasyon" },
  { label: "Koruma", icon: ShieldCheck },
  { label: "Moderasyon", icon: Gavel, to: "/panel/moderasyon" },
  { label: "Panel", icon: KeyRound },
];

const itemClass = "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors";

function NavEntry({ item }: { item: NavItem }) {
  const Icon = item.icon;
  if (!item.to) {
    return (
      <span className={`${itemClass} cursor-not-allowed text-muted-foreground/40`} title="Yakında">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {item.label}
      </span>
    );
  }
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === "/panel" }}
      className={`${itemClass} text-muted-foreground hover:bg-card hover:text-foreground`}
      activeProps={{ className: `${itemClass} bg-primary/15 text-foreground` }}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function LiveIndicator() {
  const { connected } = useLive();
  return (
    <span
      className="hidden items-center gap-1.5 sm:flex"
      title={connected ? "Canlı akış bağlı" : "Canlı akış bağlanıyor"}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${connected ? "animate-pulse bg-accent" : "bg-muted-foreground/40"}`}
      />
      {connected ? "canlı" : "bağlanıyor"}
    </span>
  );
}

export function Shell({
  session,
  onLogout,
  children,
}: {
  session: Session;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const left = Math.max(0, session.startedAt + session.max_seconds * 1000 - now);
  const mm = Math.floor(left / 60_000);
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, "0");

  async function logout() {
    try {
      await api("POST", "/auth/logout");
    } catch {
      // Sunucu oturumu zaten düşürmüş olabilir; her durumda çıkış yapılır.
    }
    setBind(null);
    onLogout();
  }

  return (
    <SessionContext.Provider value={session}>
      <LiveProvider>
        <div className="relative z-10 flex min-h-screen animate-fade-in-up [color-scheme:dark]">
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card/60 px-4 py-6 backdrop-blur md:flex">
            <div className="px-2">
              <span className="glow-text font-display text-5xl leading-none font-bold tracking-tighter">
                667
              </span>
              <p className="mt-1 text-[10px] tracking-[0.4em] text-muted-foreground uppercase">
                panel
              </p>
            </div>
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((item) => (
                <NavEntry key={item.label} item={item} />
              ))}
            </nav>
            <Clock className="mt-auto px-2" />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/60 px-4 py-3 backdrop-blur sm:px-6">
              <span className="glow-text font-display text-2xl font-bold tracking-tighter md:hidden">
                667
              </span>
              <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                <LiveIndicator />
                <span
                  className="hidden font-mono tabular-nums sm:inline"
                  title="Oturumun kalan süresi"
                >
                  {mm}:{ss}
                </span>
                <span className="rounded-full border border-border bg-card/70 px-3 py-1 tracking-widest">
                  {session.username} · {session.level}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  aria-label="Çıkış yap"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/60 text-foreground/80 transition-colors hover:border-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </header>

            <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 md:hidden">
              {NAV.map((item) => (
                <NavEntry key={item.label} item={item} />
              ))}
            </nav>

            <main className="flex-1 p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </LiveProvider>
    </SessionContext.Provider>
  );
}
