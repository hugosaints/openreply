"use client";

/**
 * Followers Over Time
 *
 * Single-series area chart over stored daily snapshots. Deliberately separate
 * from the Overview stat tiles: those sum the selected posts, while this is an
 * account-level total that ignores the post range.
 *
 * History depth is limited by what has been snapshotted — Instagram only serves
 * ~30 days of account insights, so earlier days exist only if this instance was
 * already running then.
 */

import TrendChip from "@/components/dashboard/trend-chip";
import Segmented from "@/components/ui/segmented";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { followerChange, sliceFollowerHistory } from "@/lib/reports/overview-insights";
import { IconChartLine, IconTable, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface FollowerChartPoint {
  date: string;
  followers: number;
  delta: number | null;
}

// Recharts writes colors as SVG attributes, where CSS variables don't resolve —
// keep in sync with --color-accent and the border/muted tokens in globals.css.
const SERIES_COLOR = "#4f46e5";
const GRID_COLOR = "#eceef3";
const AXIS_TEXT = "#5b6b79";

type Period = "7" | "30" | "90" | "all";

function formatCompact(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function formatDay(iso: string, locale: Locale): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatSigned(n: number, locale: Locale): string {
  return `${n > 0 ? "+" : ""}${n.toLocaleString(locale)}`;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: FollowerChartPoint }>;
}) {
  const { t, locale } = useI18n();
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="popover px-3 py-2.5 text-xs">
      <p className="text-muted">{formatDay(point.date, locale)}</p>
      <p className="mt-1 font-semibold tabular-nums text-foreground">
        {point.followers.toLocaleString(locale)} {t("followers")}
      </p>
      {point.delta !== null && point.delta !== 0 && (
        <p className={point.delta > 0 ? "text-success" : "text-error"}>
          {formatSigned(point.delta, locale)} {t("that day")}
        </p>
      )}
    </div>
  );
}

export default function FollowerChart({
  data,
  followers,
}: {
  data: FollowerChartPoint[];
  followers: number | null;
}) {
  const { t, locale } = useI18n();
  const [showTable, setShowTable] = useState(false);
  const [period, setPeriod] = useState<Period>("30");

  const visible = sliceFollowerHistory(data, period === "all" ? null : Number(period));
  const current = followers ?? data.at(-1)?.followers ?? null;
  // Net change across the visible window, shown once in the header rather
  // than labelling every point.
  const change = followerChange(visible);

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="followers-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="followers-title" className="font-heading text-xl font-semibold text-foreground">
            {t("Followers over time")}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span>
              {current === null
                ? t("Follower count unavailable")
                : t("{count} now", { count: current.toLocaleString(locale) })}
            </span>
            {change && (
              <>
                <span aria-hidden="true">·</span>
                <span className={change.net >= 0 ? "text-success" : "text-error"}>
                  {formatSigned(change.net, locale)}
                </span>
                <span>{t("over {count} days", { count: change.days })}</span>
                {change.pct !== null && <TrendChip changePct={change.pct} current={change.net} />}
              </>
            )}
          </div>
        </div>

        {data.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="followers-view-toggle"
              onClick={() => setShowTable((v) => !v)}
              className="icon-btn"
              aria-pressed={showTable}
              aria-label={showTable ? t("Show chart") : t("Show table")}
              title={showTable ? t("Show chart") : t("Show table")}
            >
              {showTable ? <IconChartLine size={18} stroke={1.5} /> : <IconTable size={18} stroke={1.5} />}
            </button>
            <Segmented
              id="followers-window"
              ariaLabel={t("Range")}
              value={period}
              onChange={setPeriod}
              options={[
                { value: "7", label: t("7 days") },
                { value: "30", label: t("30 days") },
                { value: "90", label: t("90 days") },
                { value: "all", label: t("All") },
              ]}
            />
          </div>
        )}
      </div>

      {data.length < 2 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconUsers size={22} stroke={1.5} />
          </span>
          <p className="mt-3 text-sm font-medium text-foreground">{t("Collecting follower history")}</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            {data.length === 0 ? t("No snapshots recorded yet.") : t("One day recorded so far.")}{" "}
            {t("A point is added daily — the chart appears once there are at least two.")}
          </p>
        </div>
      ) : visible.length < 2 ? (
        <p className="mt-6 flex h-[260px] items-center justify-center text-sm text-muted">
          {t("No activity in this period yet")}
        </p>
      ) : showTable ? (
        <div className="mt-5 max-h-[300px] overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="border-b border-border bg-surface-hover text-left text-xs font-medium text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">{t("Date")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("Followers")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("Change")}</th>
              </tr>
            </thead>
            <tbody>
              {[...visible].reverse().map((p) => (
                <tr key={p.date} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-foreground">{formatDay(p.date, locale)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                    {p.followers.toLocaleString(locale)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums ${
                      p.delta === null || p.delta === 0 ? "text-subtle" : p.delta > 0 ? "text-success" : "text-error"
                    }`}
                  >
                    {p.delta === null ? "—" : formatSigned(p.delta, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 h-[260px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visible} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="followersFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatDay(value, locale)}
                tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(value) => formatCompact(value, locale)}
                tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={52}
                // Followers rarely start near zero, so a zero baseline would
                // flatten the line into a straight edge.
                domain={["dataMin - 5", "dataMax + 5"]}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="followers"
                stroke={SERIES_COLOR}
                strokeWidth={2}
                fill="url(#followersFill)"
                dot={false}
                activeDot={{ r: 4, fill: SERIES_COLOR, stroke: "#ffffff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
