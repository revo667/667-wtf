import { useEffect, useRef, type CSSProperties } from "react";
import { pointer, trackPointer } from "@/lib/pointer";

type Beam = {
  left: number;
  width: number;
  color: string;
  follow: number;
  sway: number;
  delay: number;
};

const BEAMS: Beam[] = [
  { left: 0.5, width: 62, color: "oklch(0.98 0 0 / 15%)", follow: 0.07, sway: 15, delay: 0 },
  { left: 0.14, width: 58, color: "oklch(0.86 0.01 260 / 11%)", follow: 0.04, sway: 21, delay: -7 },
  {
    left: 0.86,
    width: 58,
    color: "oklch(0.86 0.01 260 / 11%)",
    follow: 0.045,
    sway: 19,
    delay: -12,
  },
  { left: 0.32, width: 44, color: "oklch(0.92 0 0 / 7%)", follow: 0.028, sway: 25, delay: -3 },
  { left: 0.68, width: 44, color: "oklch(0.92 0 0 / 7%)", follow: 0.032, sway: 23, delay: -9 },
];

const MAX_TILT = 38;
const NEAR_RADIUS = 340;
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };

const beamOuter = (b: Beam): CSSProperties => ({
  position: "absolute",
  top: "-10vh",
  left: `${b.left * 100}%`,
  width: `${b.width}vw`,
  height: "135vh",
  transformOrigin: "50% 0%",
  transform: "translateX(-50%) rotate(var(--a, 0deg))",
});

const beamInner = (b: Beam): CSSProperties => ({
  position: "absolute",
  inset: 0,
  transformOrigin: "50% 0%",
  background: `conic-gradient(from 168deg at 50% 0%, transparent 0deg, ${b.color} 12deg, transparent 24deg)`,
  maskImage: "radial-gradient(ellipse 55% 78% at 50% 0%, black 12%, transparent 76%)",
  WebkitMaskImage: "radial-gradient(ellipse 55% 78% at 50% 0%, black 12%, transparent 76%)",
  filter: "blur(16px)",
  animation: `beam-sway ${b.sway}s ease-in-out ${b.delay}s infinite`,
});

const blob = (style: CSSProperties, color: string, animation: string): CSSProperties => ({
  position: "absolute",
  width: "58vmax",
  height: "58vmax",
  borderRadius: "9999px",
  background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
  animation,
  ...style,
});

function distanceToRect(x: number, y: number, r: DOMRect) {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

export function Atmosphere() {
  const rootRef = useRef<HTMLDivElement>(null);
  const beamRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackPointer();
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const angles = BEAMS.map(() => 0);
    const sparks: Spark[] = [];
    let width = 0;
    let height = 0;
    let lastSeen = -1;
    let canvasDirty = false;
    let frame = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawSparks = () => {
      if (!sparks.length) {
        if (canvasDirty) {
          ctx.clearRect(0, 0, width, height);
          canvasDirty = false;
        }
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        s.life -= 1;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.97;
        s.vy = s.vy * 0.97 + 0.012;
        const k = s.life / s.max;
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.95 * k})`);
        glow.addColorStop(0.35, `rgba(200, 206, 218, ${0.45 * k})`);
        glow.addColorStop(1, "rgba(160, 166, 180, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      canvasDirty = true;
    };

    const lightCards = () => {
      const x = pointer.x;
      const y = pointer.y;
      for (const el of document.querySelectorAll<HTMLElement>("[data-spotlight]")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.bottom < 0 || r.top > height) continue;
        const near = pointer.active ? Math.max(0, 1 - distanceToRect(x, y, r) / NEAR_RADIUS) : 0;
        el.style.setProperty("--mx", `${x - r.left}px`);
        el.style.setProperty("--my", `${y - r.top}px`);
        el.style.setProperty("--near", near.toFixed(3));
      }
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const calm = still.matches;
      const ease = calm ? 1 : 0.14;

      if (pointer.active) {
        pointer.sx += (pointer.x - pointer.sx) * ease;
        pointer.sy += (pointer.y - pointer.sy) * ease;
      }

      root.style.setProperty("--px", `${pointer.x}px`);
      root.style.setProperty("--py", `${pointer.y}px`);
      root.style.setProperty("--sx", `${pointer.sx}px`);
      root.style.setProperty("--sy", `${pointer.sy}px`);
      root.style.setProperty("--lit", pointer.active ? "1" : "0");

      BEAMS.forEach((b, i) => {
        const el = beamRefs.current[i];
        if (!el) return;
        let target = 0;
        if (pointer.active) {
          const ox = b.left * width;
          const oy = -0.1 * height;
          const deg = (-Math.atan2(pointer.sx - ox, pointer.sy - oy) * 180) / Math.PI;
          target = Math.max(-MAX_TILT, Math.min(MAX_TILT, deg));
        }
        const current = angles[i] ?? 0;
        const next = calm ? target : current + (target - current) * b.follow;
        angles[i] = next;
        el.style.setProperty("--a", `${next.toFixed(2)}deg`);
      });

      if (pointer.movedAt !== lastSeen) {
        lastSeen = pointer.movedAt;
        lightCards();
      }

      drawSparks();
    };

    const onDown = (e: PointerEvent) => {
      const host = ripplesRef.current;
      if (!host || still.matches) return;
      const ring = document.createElement("span");
      ring.className = "light-ripple";
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      ring.addEventListener("animationend", () => ring.remove());
      host.appendChild(ring);
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 1.4 + Math.random() * 2.2;
        const max = 30 + Math.random() * 30;
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: max,
          max,
          r: 0.7 + Math.random() * 1.3,
        });
      }
    };

    const onScroll = () => lightCards();

    resize();
    frame = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("transitionend", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("transitionend", onScroll);
    };
  }, []);

  return (
    <>
      <div
        ref={rootRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden animate-rain-fade-in [animation-duration:2.4s]"
      >
        {BEAMS.map((b, i) => (
          <div
            key={b.left}
            ref={(el) => {
              beamRefs.current[i] = el;
            }}
            style={beamOuter(b)}
          >
            <div style={beamInner(b)} />
          </div>
        ))}
        <div
          style={blob(
            { top: "-22vmax", left: "-18vmax" },
            "oklch(0.6 0 0 / 7%)",
            "drift-a 26s ease-in-out infinite",
          )}
        />
        <div
          style={blob(
            { bottom: "-26vmax", right: "-18vmax" },
            "oklch(0.7 0.01 260 / 5%)",
            "drift-b 32s ease-in-out infinite",
          )}
        />
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: "var(--lit, 0)",
            background:
              "radial-gradient(260px circle at var(--sx) var(--sy), oklch(0.9 0.005 260 / 8%), transparent 65%), radial-gradient(70px circle at var(--px) var(--py), oklch(0.95 0.04 300 / 7%), transparent 70%)",
          }}
        />
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[45] h-full w-full"
      />
      <div
        ref={ripplesRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[45]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[50] opacity-[0.07] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
    </>
  );
}
