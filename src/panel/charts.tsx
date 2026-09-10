import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compact, dayLabel } from "./format";
import type { DayRow } from "./types";

// Renkler validate_palette.js ile koyu kart zemininde (#080309) doğrulandı:
// ikisi de lightness bandında, kontrast >= 3:1, renk körlüğü ayrımı ΔE 20.
export const SERIES = "#a077eb";
export const NEGATIVE = "#e66767";
const GRID = "rgba(236, 234, 241, 0.07)";
const AXIS = "rgba(236, 234, 241, 0.18)";
const MUTED = "#847b95";
const TICK = { fill: MUTED, fontSize: 11 };

type TipRow = { key: string; name: string; color: string; format: (v: number) => string };
type TipProps = {
  active?: boolean | undefined;
  payload?: ReadonlyArray<{ payload?: unknown }> | undefined;
  label?: unknown;
};

function Tip({ active, payload, label, rows }: TipProps & { rows: TipRow[] }) {
  const point = payload?.[0]?.payload as Record<string, number> | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 text-muted-foreground">{dayLabel(Number(label))}</p>
      {rows.map((r) => (
        <p key={r.key} className="flex items-center gap-2 text-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
          {r.name}
          <span className="ml-auto pl-4 tabular-nums">{r.format(Math.abs(point[r.key] ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

const axes = (
  <>
    <CartesianGrid vertical={false} stroke={GRID} />
    <XAxis
      dataKey="day"
      tickFormatter={dayLabel}
      tickLine={false}
      axisLine={{ stroke: AXIS }}
      tick={TICK}
      minTickGap={28}
    />
    <YAxis
      tickLine={false}
      axisLine={false}
      tick={TICK}
      width={44}
      allowDecimals={false}
      tickFormatter={(v: number) => compact(Math.abs(v))}
    />
  </>
);

/** Tek seri günlük sütun grafiği. Tek seri olduğu için legend yok; başlık neyin çizildiğini söyler. */
export function DailyColumns({
  data,
  name,
  format,
  height = 200,
}: {
  data: { day: number; value: number }[];
  name: string;
  format: (v: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
        {axes}
        <Tooltip
          cursor={{ fill: "rgba(160, 119, 235, 0.08)" }}
          content={(p: TipProps) => (
            <Tip {...p} rows={[{ key: "value", name, color: SERIES, format }]} />
          )}
        />
        <Bar
          dataKey="value"
          fill={SERIES}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Katılım (üstte) ve ayrılma (altta) — sıfır çizgisi etrafında iki yönlü sütunlar. */
export function JoinLeave({ data, height = 200 }: { data: DayRow[]; height?: number }) {
  const rows = data.map((d) => ({ day: d.day, joins: d.joins, leaves: -d.leaves }));
  const fmt = (v: number) => String(v);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={rows}
        stackOffset="sign"
        margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        barCategoryGap={2}
      >
        {axes}
        <ReferenceLine y={0} stroke={AXIS} />
        <Tooltip
          cursor={{ fill: "rgba(160, 119, 235, 0.08)" }}
          content={(p: TipProps) => (
            <Tip
              {...p}
              rows={[
                { key: "joins", name: "Katılım", color: SERIES, format: fmt },
                { key: "leaves", name: "Ayrılma", color: NEGATIVE, format: fmt },
              ]}
            />
          )}
        />
        <Bar
          dataKey="joins"
          stackId="a"
          fill={SERIES}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        />
        <Bar
          dataKey="leaves"
          stackId="a"
          fill={NEGATIVE}
          radius={[0, 0, 4, 4]}
          maxBarSize={24}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
