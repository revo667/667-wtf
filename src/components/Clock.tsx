import { useEffect, useState } from "react";

const formatDate = (date: Date) => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}.${m}.${date.getFullYear()}`;
};

const formatTime = (date: Date) => {
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${date.getHours()}.${m}.${s}.${ms}`;
};

/** Sol üstteki tarih ve milisaniyeli saat. `className` konumu belirler. */
export function Clock({ className = "fixed top-6 left-6 z-20" }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`pointer-events-none flex flex-col gap-0.5 font-mono text-xs tracking-widest text-muted-foreground/80 animate-fade-in-up ${className}`}
    >
      <span className="uppercase tracking-[0.2em]">{now ? formatDate(now) : "00.00.0000"}</span>
      <span className="text-[10px] tabular-nums tracking-wider">
        {now ? formatTime(now) : "0.00.00.000"}
      </span>
    </div>
  );
}
