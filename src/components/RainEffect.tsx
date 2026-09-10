import { useEffect, useRef } from "react";

type Drop = {
  x: number;
  y: number;
  len: number;
  speed: number;
  opacity: number;
};

/**
 * Mor yağmur. `dim` panelde içeriğin önüne geçmesin diye yağmuru kısar.
 * "Hareketi azalt" açıksa ya da sekme gizliyse animasyon durur (tek kare çizili kalır).
 */
export function RainEffect({ dim = false }: { dim?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let drops: Drop[] = [];
    let frame = 0;

    const makeDrops = () => {
      const count = Math.floor((width * height) / 9000);
      drops = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        len: 10 + Math.random() * 22,
        speed: 2.3 + Math.random() * 3.6,
        opacity: 0.12 + Math.random() * 0.45,
      }));
    };

    const paint = (advance: boolean) => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      for (const d of drops) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(178, 132, 255, ${d.opacity})`;
        ctx.lineWidth = 1.1;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 1.2, d.y + d.len);
        ctx.stroke();

        if (!advance) continue;
        d.y += d.speed;
        d.x -= 0.15;
        if (d.y > height) {
          d.y = -d.len;
          d.x = Math.random() * width;
        }
      }
    };

    const draw = () => {
      paint(true);
      frame = requestAnimationFrame(draw);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeDrops();
      paint(false);
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", start);
    reducedMotion.addEventListener("change", start);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", start);
      reducedMotion.removeEventListener("change", start);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none transition-opacity duration-700 ${dim ? "opacity-40" : "opacity-100"}`}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 animate-rain-fade-in"
      />
    </div>
  );
}
