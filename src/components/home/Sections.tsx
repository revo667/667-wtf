import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Users } from "lucide-react";
import { getDiscordMemberCount } from "@/lib/discord.functions";
import { MEMBERS } from "@/lib/members";
import { PROJECTS, type Project } from "@/lib/projects";
import { MemberCard } from "./MemberCard";
import { DiscordIcon } from "./icons";

export const STAR_SIZE = "min(50vh, 520px, 84vw)";

const DISCORD_INVITE = "https://discord.gg/667";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function Heading({ children, at = 0 }: { children: ReactNode; at?: number }) {
  return (
    <h2
      data-spotlight
      className="reveal spot-text -mx-[0.15em] -mb-[0.25em] w-fit px-[0.15em] pb-[0.25em] font-display text-5xl leading-none font-medium tracking-tight italic sm:text-6xl"
      style={delay(at)}
    >
      {children}
    </h2>
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
    <div
      data-spotlight
      className="spotlight-card inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 font-mono text-[11px] tracking-widest text-muted-foreground backdrop-blur-sm"
    >
      <Users className="h-3.5 w-3.5" />
      {data ? (
        <span>
          {data.total.toLocaleString("en-US")} members
          <span className="mx-1.5 opacity-40">·</span>
          <span className="text-emerald-400">{data.online.toLocaleString("en-US")} online</span>
        </span>
      ) : (
        <span>…</span>
      )}
    </div>
  );
}

export function Hero({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-x-0 flex flex-col items-center px-6 text-center"
        style={{ top: `calc(50% - 82px + ${STAR_SIZE} * 0.34)` }}
      >
        <h1
          data-spotlight
          className="reveal spot-text glow-text animate-glow-pulse -mx-[0.15em] px-[0.15em] pb-[0.08em] font-display text-7xl leading-none font-semibold tracking-tighter sm:text-8xl"
          style={delay(200)}
        >
          667
        </h1>
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          lang="en"
          className="reveal story-link mt-3 font-mono text-xs tracking-[0.5em] text-muted-foreground uppercase transition-colors hover:text-foreground"
          style={delay(320)}
        >
          discord.gg/667
        </a>
        <div className="reveal mt-5" style={delay(440)}>
          <MemberCount />
        </div>
      </div>
      <button
        type="button"
        onClick={onNext}
        className="group absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-muted-foreground/70 uppercase transition-colors hover:text-foreground"
      >
        <span className="hidden sm:inline">Scroll</span>
        <span className="sm:hidden">Swipe</span>
        <span className="relative block h-8 w-px overflow-hidden bg-muted-foreground/20">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-scroll-cue bg-accent" />
        </span>
      </button>
    </div>
  );
}

function linkProps(p: Project) {
  return p.external ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function ProjectTile({ p, big, at }: { p: Project; big: boolean; at: number }) {
  return (
    <a
      href={p.href}
      {...linkProps(p)}
      data-spotlight
      className={`reveal spotlight-card group relative isolate overflow-hidden rounded-xl border border-white/10 bg-card transition-colors duration-500 hover:border-accent/50 focus-visible:border-accent ${
        big ? "col-span-2 row-span-2" : ""
      }`}
      style={delay(at)}
    >
      <img
        src={p.image}
        alt=""
        loading="lazy"
        className={`absolute inset-0 -z-10 h-full w-full object-cover object-top transition duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-90 ${
          big ? "opacity-75" : "opacity-45"
        }`}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/70 to-black/10" />
      <div className="flex h-full flex-col justify-end p-4 lg:p-5">
        <span className="font-mono text-[10px] tracking-[0.2em] text-accent uppercase">
          {p.platforms}
        </span>
        <span
          className={`mt-1 flex items-center gap-1.5 font-medium text-white ${
            big ? "text-2xl lg:text-3xl" : "text-base"
          }`}
        >
          {p.name}
          <ArrowUpRight
            className={`shrink-0 text-white/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white ${
              big ? "h-5 w-5" : "h-4 w-4"
            }`}
          />
        </span>
        <p
          className={`mt-1 text-white/60 ${big ? "max-w-sm text-sm" : "line-clamp-2 text-xs leading-relaxed"}`}
        >
          {p.description}
        </p>
      </div>
    </a>
  );
}

export function Projects() {
  return (
    <div className="flex h-full w-full items-center justify-center px-5 pt-36 pb-10 sm:px-10 md:pt-40">
      <div className="w-full max-w-5xl">
        <div className="mb-6">
          <Heading>Projects</Heading>
        </div>

        <div className="hidden h-[min(56vh,500px)] grid-cols-4 grid-rows-2 gap-3 md:grid">
          {PROJECTS.map((p, i) => (
            <ProjectTile key={p.name} p={p} big={i === 0} at={120 + i * 70} />
          ))}
        </div>

        <ul className="divide-y divide-white/10 border-y border-white/10 md:hidden">
          {PROJECTS.map((p, i) => (
            <li key={p.name} className="reveal" style={delay(100 + i * 60)}>
              <a
                href={p.href}
                {...linkProps(p)}
                data-spotlight
                className="spotlight-card group -mx-2 flex items-center gap-4 rounded-lg px-2 py-3"
              >
                <img
                  src={p.image}
                  alt=""
                  loading="lazy"
                  className="size-14 shrink-0 rounded-lg border border-white/10 object-cover object-top"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-white">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.description}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40 group-hover:text-white" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FitToScreen({
  children,
  reserve,
}: {
  children: ReactNode;
  reserve: { mobile: number; desktop: number };
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const o = outer.current;
    const el = inner.current;
    if (!o || !el) return;
    const apply = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h) return;
      const vw = window.innerWidth;
      const byWidth = w > vw ? (vw - 32) / w : 1;
      const reserveY = vw < 1024 ? reserve.mobile : reserve.desktop;
      const scale = Math.min(1, byWidth, (window.innerHeight - reserveY) / h);
      el.style.transform = `scale(${scale})`;
      o.style.width = `${w * scale}px`;
      o.style.height = `${h * scale}px`;
    };
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    apply();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [reserve.mobile, reserve.desktop]);

  return (
    <div ref={outer} className="relative">
      <div ref={inner} className="absolute top-0 left-0 w-max origin-top-left">
        {children}
      </div>
    </div>
  );
}

const RESERVE = { mobile: 290, desktop: 320 };

export function Members() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center pt-36 pb-8 sm:pt-28">
      <Heading>667</Heading>
      <div className="mt-7">
        <FitToScreen reserve={RESERVE}>
          <div className="flex w-screen snap-x snap-mandatory gap-4 overflow-x-auto px-[7vw] pb-2 [scrollbar-width:none] lg:w-max lg:items-stretch lg:gap-6 lg:overflow-visible lg:px-0">
            {MEMBERS.map((member, i) => (
              <div key={member.handle} className="reveal flex" style={delay(140 + i * 120)}>
                <MemberCard member={member} />
              </div>
            ))}
          </div>
        </FitToScreen>
      </div>
      <a
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        data-spotlight
        className="reveal spotlight-card mt-7 hidden items-center gap-2.5 rounded-full border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm text-foreground transition-colors hover:border-accent hover:bg-accent/25 sm:inline-flex"
        style={delay(420)}
      >
        <DiscordIcon className="h-4 w-4" />
        Join the server
      </a>
    </div>
  );
}
