const numberFmt = new Intl.NumberFormat("tr-TR");
const compactFmt = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const relativeFmt = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

export const num = (n: number) => numberFmt.format(n);
export const compact = (n: number) => compactFmt.format(n);

/** Unix gün numarası → "12 Eyl" */
export const dayLabel = (day: number) =>
  new Date(day * 86_400_000).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export const dateTime = (ms: number) =>
  new Date(ms).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export const date = (ms: number) =>
  new Date(ms).toLocaleDateString("tr-TR", { dateStyle: "medium" });

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "3 saat önce", "dün" ... */
export function ago(ms: number | null | undefined): string {
  if (!ms) return "—";
  const sec = Math.round((ms - Date.now()) / 1000);
  for (const [unit, size] of STEPS) {
    if (Math.abs(sec) >= size) return relativeFmt.format(Math.round(sec / size), unit);
  }
  return relativeFmt.format(sec, "second");
}

/** Saniye → "3 sa 12 dk" */
export function hours(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
}

/** Discord rol rengi (0 = renksiz) → CSS rengi */
export const roleHex = (color: number | null | undefined) =>
  color ? `#${color.toString(16).padStart(6, "0")}` : undefined;
