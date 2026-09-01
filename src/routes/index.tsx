import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { RainEffect } from "@/components/RainEffect";
import { MusicToggle } from "@/components/MusicToggle";
import { getDiscordMemberCount } from "@/lib/discord.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "discord.gg/667" },
      {
        name: "description",
        content: "667 clan ",
      },
      { property: "og:title", content: "discord.gg/667" },

      {
        property: "og:description",
        content: "667 clan",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CARD_PARAMS =
  "theme=custom&colorB1=000000&colorB2=000000&colorB3=000000&colorT1=471675&colorT2=FFFFFF&width=315&font=vampyre&nameColor1=471675";

const PROFILES = [
  {
    id: "275774468658298883",
    name: "revo667",
    params: CARD_PARAMS,
  },
  {
    id: "865277133186400317",
    name: "furkwan667",
    params: CARD_PARAMS,
  },
  {
    id: "697131524016832533",
    name: "esah667",
    params: CARD_PARAMS,
  },
];

const CARD_REFRESH_MS = 60_000;

function ProfileCard({
  profile,
  bucket,
  onUnavailable,
}: {
  profile: (typeof PROFILES)[number];
  bucket: number;
  onUnavailable: (id: string) => void;
}) {
  const url = `https://dsc-readme.tsuni.dev/api/user/${profile.id}?${profile.params}&cb=${bucket}`;
  const [src, setSrc] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const preload = new Image();
    preload.onload = () => {
      if (cancelled) return;
      loadedOnce.current = true;
      setSrc(url);
    };
    preload.onerror = () => {
      if (!cancelled && !loadedOnce.current) onUnavailable(profile.id);
    };
    preload.src = url;
    return () => {
      cancelled = true;
    };
  }, [url, profile.id, onUnavailable]);

  if (!src) return null;

  return (
    <a
      href={`https://discord.com/users/${profile.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-lg opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-[1.04]"
    >
      <img
        src={src}
        alt={`${profile.name} Discord profili`}
        className="block h-auto w-[215px] sm:w-[245px]"
      />
    </a>
  );
}

function ProfileCards() {
  const [bucket, setBucket] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState<string[]>([]);

  useEffect(() => {
    const tick = () => setBucket(Math.floor(Date.now() / CARD_REFRESH_MS));
    tick();
    const interval = setInterval(tick, CARD_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const markUnavailable = useCallback((id: string) => {
    setUnavailable((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  if (bucket === null) return null;

  const visible = PROFILES.filter((profile) => !unavailable.includes(profile.id));

  if (!visible.length) return null;

  return (
    <div className="mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-3">
      {visible.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          bucket={bucket}
          onUnavailable={markUnavailable}
        />
      ))}
    </div>
  );
}

function MemberCount() {
  const fetchMembers = useServerFn(getDiscordMemberCount);
  const { data, isPending } = useQuery({
    queryKey: ["discord-member-count"],
    queryFn: () => fetchMembers(),
    staleTime: 5 * 60 * 1000,
  });

  if (!data && !isPending) return null;

  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/50 px-3 py-1.5 text-xs tracking-widest text-muted-foreground backdrop-blur-sm">
      <Users className="h-3.5 w-3.5" />
      <span>
        {isPending ? (
          "..."
        ) : (
          <>
            {data.total.toLocaleString()} members
            <span className="mx-1.5 opacity-40">·</span>
            <span className="text-emerald-400">{data.online.toLocaleString()} online</span>
          </>
        )}
      </span>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 50);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  };

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    const ms = String(date.getMilliseconds()).padStart(3, "0");
    return `${h}.${m}.${s}.${ms}`;
  };

  return (
    <div className="pointer-events-none fixed top-6 left-6 z-20 flex flex-col gap-0.5 font-mono text-xs tracking-widest text-muted-foreground/80 animate-fade-in-up">
      <span className="uppercase tracking-[0.2em]">{now ? formatDate(now) : "00.00.0000"}</span>
      <span className="text-[10px] tabular-nums tracking-wider">
        {now ? formatTime(now) : "0.00.00.000"}
      </span>
    </div>
  );
}

function Index() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--halo)_0%,_transparent_60%)]" />
      <RainEffect />
      <Clock />

      <section className="relative z-10 flex flex-col items-center text-center animate-fade-in-up">
        <h1 className="glow-text animate-glow-pulse cursor-default select-none font-display font-bold text-[18vw] leading-none tracking-tighter text-foreground transition-transform duration-300 ease-out hover:glow-text-hover hover:scale-[1.02] sm:text-[10rem]">
          667
        </h1>
        <a
          href="https://discord.gg/667"
          target="_blank"
          rel="noopener noreferrer"
          className="story-link mt-3 text-xs tracking-[0.5em] text-muted-foreground uppercase transition-colors duration-300 hover:text-primary sm:text-sm"
        >
          discord.gg/667
        </a>
        <MemberCount />
        <ProfileCards />
      </section>

      <footer className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 animate-fade-in-up">
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground/40 font-light">
          2026 — revo667.com
        </span>
      </footer>

      <MusicToggle src="/music/sagliyom kazanc ve yok kriteri.mp3" />
    </main>
  );
}
