"use client";

import BarList, { type BarListRow } from "@/components/overview/bar-list";
import { formatNumber, formatPercent } from "@/components/overview/format";
import { Panel, SectionState } from "@/components/overview/section";
import KpiStrip, { type KpiItem } from "@/components/dashboard/kpi-strip";
import Segmented from "@/components/ui/segmented";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { percentChange } from "@/lib/reports/overview-insights";
import {
  ZERNIO_INSIGHT_PERIODS,
  type AccountInsightMetric,
  type BreakdownEntry,
  type DailyMetrics,
  type ZernioInsightPeriod,
  type ZernioOverviewExtras,
  type ZernioSection,
} from "@/lib/zernio/analytics";
import { IconInfoCircle } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Recharts writes colors as SVG attributes, where CSS variables don't resolve —
// keep in sync with the accent/border/muted tokens in globals.css.
const SERIES_COLOR = "#4f46e5";
const GRID_COLOR = "#eceef3";
const AXIS_TEXT = "#5b6b79";

type ChartMetric = "reach" | "views" | "engagement";

interface Props {
  extras: ZernioOverviewExtras | null;
  loading: boolean;
  days: ZernioInsightPeriod;
  onDaysChange: (days: ZernioInsightPeriod) => void;
}

function compact(n: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function formatDay(iso: string, locale: Locale) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Map Instagram's media_product_type buckets onto the formats people think in. */
function useBreakdownLabel() {
  const { t } = useI18n();
  return (dimension: string) => {
    switch (dimension.toUpperCase()) {
      case "REEL":
      case "REELS":
        return t("Reels");
      case "CAROUSEL_CONTAINER":
      case "CAROUSEL_ALBUM":
      case "CAROUSEL":
        return t("Carousel");
      case "STORY":
        return t("Story");
      case "AD":
        return t("Ads");
      case "POST":
      case "FEED":
      case "IMAGE":
        return t("Post");
      case "VIDEO":
        return t("Video");
      default:
        return dimension;
    }
  };
}

function ChartTooltip({
  active,
  payload,
  label,
  metricLabel,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  metricLabel: string;
}) {
  const { locale } = useI18n();
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="popover px-3 py-2.5 text-xs">
      <p className="text-muted">{formatDay(label, locale)}</p>
      <p className="mt-1 font-semibold tabular-nums text-foreground">
        {Number(payload[0].value).toLocaleString(locale)} {metricLabel}
      </p>
    </div>
  );
}

function ActivityChart({ extras }: { extras: ZernioOverviewExtras }) {
  const { t, locale } = useI18n();

  const rows = useMemo(() => {
    const byDate = new Map<string, { date: string; reach: number | null; views: number | null; engagement: number | null }>();
    const ensure = (date: string) => {
      const row = byDate.get(date) ?? { date, reach: null, views: null, engagement: null };
      byDate.set(date, row);
      return row;
    };
    for (const p of extras.insights?.reachSeries ?? []) ensure(p.date).reach = p.value;
    for (const p of extras.daily?.series ?? []) {
      const row = ensure(p.date);
      row.views = p.views;
      row.engagement = p.engagement;
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [extras]);

  const options = ([
    { value: "reach", label: t("Account reach"), has: rows.some((r) => r.reach !== null) },
    { value: "views", label: t("Views"), has: rows.some((r) => r.views !== null) },
    { value: "engagement", label: t("Interactions"), has: rows.some((r) => r.engagement !== null) },
  ] as const).filter((o) => o.has);

  const [metric, setMetric] = useState<ChartMetric>(options[0]?.value ?? "reach");
  const active = options.find((o) => o.value === metric) ?? options[0];

  if (!active) return <SectionState issue={extras.issues.find((i) => i.section === "daily")} />;

  const empty = rows.every((r) => !r[active.value]);
  const gradientId = `activityFill-${active.value}`;

  return (
    <Panel
      id="overview-activity"
      title={t("Daily activity")}
      subtitle={t("Day-by-day performance across the selected period")}
      action={
        options.length > 1 ? (
          <Segmented
            id="overview-activity-metric"
            ariaLabel={t("Metric")}
            value={active.value}
            onChange={setMetric}
            options={options.map((o) => ({ value: o.value, label: o.label }))}
          />
        ) : undefined
      }
    >
      <div className="relative h-[260px] sm:h-[280px]">
        {empty && (
          <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-muted">
            {t("No activity in this period yet")}
          </p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
              allowDecimals={false}
              tickFormatter={(value) => compact(value, locale)}
              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<ChartTooltip metricLabel={active.label} />} cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey={active.value}
              stroke={SERIES_COLOR}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              connectNulls
              dot={false}
              activeDot={{ r: 4, fill: SERIES_COLOR, stroke: "#ffffff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function toRows(entries: BreakdownEntry[], label: (dimension: string) => string): BarListRow[] {
  return entries
    .map((e) => ({ label: label(e.dimension), value: e.value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

export default function AccountInsightsPanel({ extras, loading, days, onDaysChange }: Props) {
  const { t, locale } = useI18n();
  const breakdownLabel = useBreakdownLabel();
  const issue = (section: ZernioSection) => extras?.issues.find((i) => i.section === section);

  const periodControl = (
    <Segmented
      id="overview-days"
      ariaLabel={t("Period")}
      value={String(days) as `${ZernioInsightPeriod}`}
      onChange={(v) => onDaysChange(Number(v) as ZernioInsightPeriod)}
      options={ZERNIO_INSIGHT_PERIODS.map((d) => ({ value: String(d) as `${ZernioInsightPeriod}`, label: t("{count} days", { count: d }) }))}
    />
  );

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-heading text-lg font-semibold text-foreground">{t("Account performance")}</h2>
        <p className="mt-0.5 text-sm text-muted">
          {t("Whole account across feed, Reels, Stories and ads — not only the posts listed below.")}
        </p>
      </div>
      {periodControl}
    </div>
  );

  if (loading && !extras) {
    return (
      <div className="space-y-6">
        {header}
        <SectionState loading />
        <SectionState loading />
      </div>
    );
  }

  if (!extras || (!extras.insights && !extras.daily)) {
    return (
      <div className="space-y-6">
        {header}
        <SectionState issue={issue("insights") ?? issue("daily")} />
      </div>
    );
  }

  const insights = extras.insights;
  const unavailable = new Set(insights?.unavailableMetrics ?? []);

  const accountMetric = (id: AccountInsightMetric, label: string): KpiItem => {
    const value = insights?.totals[id];
    if (value === undefined) {
      return {
        id: `account-${id}`,
        label,
        value: "—",
        muted: true,
        caption: unavailable.has(id) ? t("Not reported by Instagram") : t("No data in this period"),
      };
    }
    return { id: `account-${id}`, label, value: formatNumber(value, locale) };
  };

  const accountKpis: KpiItem[] = [
    accountMetric("reach", t("Reach")),
    accountMetric("views", t("Views")),
    accountMetric("accounts_engaged", t("Accounts engaged")),
    accountMetric("total_interactions", t("Interactions")),
    accountMetric("likes", t("Likes")),
    accountMetric("comments", t("Comments")),
    accountMetric("saves", t("Saved")),
    accountMetric("shares", t("Shares")),
    accountMetric("replies", t("Story replies")),
    accountMetric("reposts", t("Reposts")),
    accountMetric("follows_and_unfollows", t("Follows and unfollows")),
    accountMetric("profile_links_taps", t("Profile link taps")),
  ];

  const daily = extras.daily;
  const previous = daily?.previousTotals ?? null;
  const rate = (m: (DailyMetrics & { engagement: number }) | null) => {
    if (!m) return null;
    const base = m.impressions || m.reach || m.views;
    return base > 0 ? (m.engagement / base) * 100 : null;
  };

  const received = (id: string, label: string, key: keyof DailyMetrics | "engagement"): KpiItem => {
    const current = daily!.totals[key];
    const before = previous ? previous[key] : null;
    const pct = percentChange(current, before);
    return {
      id: `received-${id}`,
      label,
      value: formatNumber(current, locale),
      trend: pct === null && !(current > 0 && before === 0) ? undefined : { changePct: pct, current },
    };
  };

  const currentRate = rate(daily?.totals ?? null);
  const previousRate = rate(previous);
  const receivedKpis: KpiItem[] = daily
    ? [
        received("impressions", t("Impressions"), "impressions"),
        received("views", t("Views"), "views"),
        received("reach", t("Reach"), "reach"),
        received("interactions", t("Interactions"), "engagement"),
        {
          id: "received-rate",
          label: t("Engagement rate"),
          value: currentRate === null ? "—" : formatPercent(currentRate, locale, 2),
          muted: currentRate === null,
          trend:
            currentRate !== null && previousRate !== null
              ? { changePct: percentChange(currentRate, previousRate), current: currentRate }
              : undefined,
        },
        received("likes", t("Likes"), "likes"),
        received("comments", t("Comments"), "comments"),
        received("shares", t("Shares"), "shares"),
        received("saved", t("Saved"), "saves"),
      ]
    : [];

  return (
    <div className="space-y-6">
      {header}

      {insights?.dataDelay && (
        <div className="flex items-start gap-3 rounded-xl border border-accent/15 bg-accent-soft px-4 py-3 text-sm">
          <IconInfoCircle size={18} stroke={1.75} className="mt-px shrink-0 text-accent" />
          <p className="text-foreground">{t("Instagram account insights can be delayed by up to 48 hours.")}</p>
        </div>
      )}

      {insights ? (
        <KpiStrip items={accountKpis} loading={loading} />
      ) : (
        <SectionState issue={issue("insights")} />
      )}

      <ActivityChart extras={extras} />

      {daily && (
        <section className="space-y-3" aria-labelledby="overview-received-title">
          <div>
            <h3 id="overview-received-title" className="font-heading text-[15px] font-semibold text-foreground">
              {t("Engagement received")}
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {t("Activity received across all posts, compared with the previous {count} days.", { count: days })}
            </p>
          </div>
          <KpiStrip items={receivedKpis} loading={loading} columnsClassName="grid-cols-2 lg:grid-cols-3" />
        </section>
      )}

      {insights && (insights.reachByFormat.length > 0 || insights.interactionsByFormat.length > 0) && (
        <section className="panel-split grid-cols-1 lg:grid-cols-2">
          <div className="p-5">
            <h3 className="font-heading text-[15px] font-semibold text-foreground">{t("Reach by format")}</h3>
            <p className="mt-0.5 text-xs text-muted">{t("Where your audience found you.")}</p>
            <div className="mt-4">
              <BarList rows={toRows(insights.reachByFormat, breakdownLabel)} empty={t("No data in this period")} />
            </div>
          </div>
          <div className="border-t p-5 lg:border-l lg:border-t-0">
            <h3 className="font-heading text-[15px] font-semibold text-foreground">{t("Interactions by format")}</h3>
            <p className="mt-0.5 text-xs text-muted">{t("Which formats drive engagement.")}</p>
            <div className="mt-4">
              <BarList rows={toRows(insights.interactionsByFormat, breakdownLabel)} empty={t("No data in this period")} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
