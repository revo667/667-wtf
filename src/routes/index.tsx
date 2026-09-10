import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users } from "lucide-react";
import { Clock } from "@/components/Clock";
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

const DISCORD_CARDS = [
  {
    name: "revo667",
    url: "https://www.revo667.com/api/discord-card",
    profile: "https://discord.com/users/275774468658298883",
  },
  {
    name: "esah667",
    url: "https://dsc-readme.tsuni.dev/api/user/697131524016832533?theme=custom&colorB1=000000&colorB2=000000&colorB3=000000&colorT1=471675&colorT2=FFFFFF&width=315&font=vampyre&nameColor1=471675",
    profile: "https://discord.com/users/697131524016832533",
  },
  {
    name: "elwin667",
    url: "https://dsc-readme.tsuni.dev/api/user/627411063666900992?theme=custom&colorB1=000000&colorB2=000000&colorB3=000000&colorT1=471675&colorT2=FFFFFF&width=315&font=vampyre&nameColor1=471675",
    profile: "https://discord.com/users/627411063666900992",
  },
];

function ProfileCards() {
  return (
    <div className="mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-3">
      {DISCORD_CARDS.map((card) => (
        <a
          key={card.name}
          href={card.profile}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-[1.04]"
        >
          <img
            src={card.url}
            alt={`${card.name} Discord profili`}
            className="block h-auto w-[215px] sm:w-[245px]"
          />
        </a>
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
          // Sayfa dili tr; bu olmadan uppercase "i"yi "İ" yapar.
          lang="en"
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
