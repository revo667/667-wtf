import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Clock } from "@/components/Clock";
import { Atmosphere } from "@/components/Atmosphere";
import { RainEffect } from "@/components/RainEffect";
import { MusicToggle } from "@/components/MusicToggle";
import Star3D from "@/components/Star3D";
import { SectionIndex } from "@/components/home/SectionIndex";
import { Hero, Members, Projects, STAR_SIZE } from "@/components/home/Sections";

const TITLE = "667";
const DESCRIPTION =
  "667 is a Discord community and the home of 667 LoL Skin, 667 Tool, 667 Utility and Universe.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://667.wtf/" },
      { property: "og:image", content: "https://667.wtf/logo-667.png" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://667.wtf/" }],
  }),
  component: Index,
});

const SECTIONS: { id: string; label: string; render: (go: (i: number) => void) => ReactNode }[] = [
  { id: "", label: "Home", render: (go) => <Hero onNext={() => go(1)} /> },
  { id: "667", label: "667", render: () => <Members /> },
  { id: "projects", label: "Projects", render: () => <Projects /> },
];

const LAST = SECTIONS.length - 1;
const LOCK_MS = 900;
const SWIPE_PX = 50;

function sectionFromHash(hash: string): number {
  const id = hash.replace(/^#/, "");
  const index = SECTIONS.findIndex((s) => s.id === id);
  return id && index > 0 ? index : 0;
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function Index() {
  const [active, setActive] = useState(0);
  const [instant, setInstant] = useState(true);
  const activeRef = useRef(0);
  const lockedUntil = useRef(0);

  const go = useCallback((target: number) => {
    const next = Math.max(0, Math.min(LAST, target));
    if (next === activeRef.current) return;
    activeRef.current = next;
    lockedUntil.current = performance.now() + LOCK_MS;
    setActive(next);
    const id = SECTIONS[next]?.id;
    history.replaceState(null, "", id ? `#${id}` : location.pathname + location.search);
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (performance.now() < lockedUntil.current) return;
      go(activeRef.current + dir);
    },
    [go],
  );

  useEffect(() => {
    const initial = sectionFromHash(location.hash);
    activeRef.current = initial;
    setActive(initial);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));

    const onHash = () => go(sectionFromHash(location.hash));

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) < 12) return;
      step(e.deltaY > 0 ? 1 : -1);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey || isTyping(e.target)) return;
      if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !e.shiftKey)) {
        e.preventDefault();
        step(1);
      } else if (["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey)) {
        e.preventDefault();
        step(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(LAST);
      }
    };

    let start: { x: number; y: number } | null = null;
    let horizontal: boolean | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches.length === 1 ? e.touches[0] : undefined;
      start = t ? { x: t.clientX, y: t.clientY } : null;
      horizontal = null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!start || !t) return;
      if (horizontal === null) {
        const dx = Math.abs(t.clientX - start.x);
        const dy = Math.abs(t.clientY - start.y);
        if (dx < 6 && dy < 6) return;
        horizontal = dx > dy;
      }
      if (!horizontal && e.cancelable) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!start || !t || horizontal) {
        start = null;
        return;
      }
      const dy = start.y - t.clientY;
      start = null;
      if (Math.abs(dy) >= SWIPE_PX) step(dy > 0 ? 1 : -1);
    };

    window.addEventListener("hashchange", onHash);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [go, step]);

  return (
    <main
      lang="en"
      className="theme-silver fixed inset-0 overflow-hidden overscroll-none bg-background select-none"
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--halo)_0%,_transparent_60%)]" />
      <Atmosphere />
      <RainEffect lit tone="silver" />
      <Clock />
      <Star3D active={active} size={STAR_SIZE} smallSize={84} />
      <SectionIndex labels={SECTIONS.map((s) => s.label)} active={active} onSelect={go} />

      <div
        className={`relative z-10 h-full ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:duration-0 ${
          instant ? "" : "transition-transform duration-[900ms]"
        }`}
        style={{ transform: `translate3d(0, ${-active * 100}%, 0)` }}
      >
        {SECTIONS.map((section, i) => (
          <section
            key={section.label}
            aria-label={section.label}
            data-active={i === active}
            inert={i !== active}
            className="h-full w-full"
          >
            {section.render(go)}
          </section>
        ))}
      </div>

      <footer className="pointer-events-none fixed bottom-6 left-6 z-20 hidden font-mono text-[10px] tracking-[0.3em] text-muted-foreground/50 sm:block">
        © 2026 667.wtf
      </footer>

      <MusicToggle src="/music/sagliyom kazanc ve yok kriteri.mp3" />
    </main>
  );
}
