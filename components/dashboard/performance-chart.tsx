"use client";

import Segmented from "@/components/ui/segmented";
import type { SeriesPoint, SeriesRange } from "@/lib/dashboard/series";
import { useI18n } from "@/lib/i18n/provider";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Recharts writes colors as SVG attributes, where CSS variables don't
// resolve — keep these in sync with --color-accent / --color-accent-muted
// and the border/subtle tokens in globals.css.
const PRIMARY = "#4f46e5";
const SECONDARY = "#a5a8f6";
const GRID = "#eceef3";
const AXIS_TEXT = "#5b6b79";

interface PerformanceChartProps {
  data: SeriesPoint[];
  range: SeriesRange;
  onRangeChange: (range: SeriesRange) => void;
  loading?: boolean;
}

function compact(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}) {
  const { t, locale } = useI18n();
  if (!active || !payload?.length) return null;
  const names: Record<string, string> = { dms: t("DMs sent"), clicks: t("Clicks") };
  // Show the primary series first, like the legend.
  const rows = ["dms", "clicks"]
    .map((key) => payload.find((p) => p.dataKey === key))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  return (
    <div className="popover min-w-[150px] px-3 py-2.5 text-xs">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      {rows.map((row) => (
        <p key={row.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted">
            <i className="h-2 w-2 rounded-full" style={{ background: row.color }} />
            {names[row.dataKey] ?? row.dataKey}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {Number(row.value).toLocaleString(locale)}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function PerformanceChart({ data, range, onRangeChange, loading = false }: PerformanceChartProps) {
  const { t, locale } = useI18n();
  const empty = data.every((d) => d.dms === 0 && d.clicks === 0);

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="performance-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="performance-title" className="font-heading text-xl font-semibold text-foreground">
            {t("Analysis")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t("Track replies sent and link clicks to see how your campaigns convert.")}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Segmented
            id="performance-range"
            ariaLabel={t("Range")}
            value={range}
            onChange={onRangeChange}
            options={[
              { value: "daily", label: t("Daily") },
              { value: "monthly", label: t("Monthly") },
              { value: "yearly", label: t("Yearly") },
            ]}
          />
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: SECONDARY }} />
              {t("Clicks")}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: PRIMARY }} />
              {t("DMs sent")}
            </span>
          </div>
        </div>
      </div>

      <div
        className={`relative mt-4 h-[280px] transition-opacity duration-200 sm:h-[300px] ${loading ? "opacity-50" : ""}`}
        aria-busy={loading}
      >
        {empty && !loading && (
          <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-muted">
            {t("No activity in this period yet")}
          </p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="perfPrimaryFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.16} />
                <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="date"
              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={16}
            />
            <YAxis
              allowDecimals={false}
              tickFormatter={(v: number) => compact(v, locale)}
              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={52}
              label={{
                value: t("Volume"),
                angle: -90,
                position: "insideLeft",
                offset: 4,
                style: { fill: AXIS_TEXT, fontSize: 12, textAnchor: "middle" },
              }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID, strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke={SECONDARY}
              strokeWidth={2}
              fill="transparent"
              dot={false}
              activeDot={{ r: 4, fill: SECONDARY, stroke: "#ffffff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="dms"
              stroke={PRIMARY}
              strokeWidth={2}
              fill="url(#perfPrimaryFill)"
              dot={false}
              activeDot={{ r: 4, fill: PRIMARY, stroke: "#ffffff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
