"use client";

/**
 * Dashboard Home Page
 *
 * KPI strip (week over week), DM/click analysis chart, ranking panel and
 * recent activity — laid out after the reference admin theme.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useRef, useState } from "react";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import KpiStrip, { type KpiItem } from "@/components/dashboard/kpi-strip";
import PerformanceChart from "@/components/dashboard/performance-chart";
import RankingPanel, { type RankingColumn } from "@/components/dashboard/ranking-panel";
import RecentActivity, { type RecentLog } from "@/components/dashboard/recent-activity";
import type { DashboardKpis, DashboardRankings } from "@/lib/dashboard/analytics";
import type { SeriesPoint, SeriesRange } from "@/lib/dashboard/series";

// Mirrors DIRECT_REFERRER in lib/dashboard/analytics.ts (server-only module).
const DIRECT_REFERRER = "__direct__";

interface DashboardStats {
  userName: string | null;
  contactsCount: number;
  totalAutomations: number;
  activeAutomations: number;
  instagramAccounts: AccountOption[];
  series: SeriesPoint[];
  range: SeriesRange;
  recentLogs: RecentLog[];
  kpis: DashboardKpis | null;
  rankings: DashboardRankings | null;
}

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("all");

  const [range, setRange] = useState<SeriesRange>("daily");
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  // Read by the stats effect so an account switch keeps the chosen range
  // without re-running the full stats request on every range toggle.
  const rangeRef = useRef<SeriesRange>("daily");
  const seriesRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ include: "analytics", range: rangeRef.current });
    if (selectedAccountId !== "all") params.set("instagramAccountId", selectedAccountId);

    fetch(`/api/dashboard/stats?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
          setSeries(data.data.series);
        }
      })
      .catch((error) => {
        if (error?.name !== "AbortError") console.error(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedAccountId]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  function handleRangeChange(next: SeriesRange) {
    if (next === range) return;
    setRange(next);
    rangeRef.current = next;
    setChartLoading(true);

    seriesRequest.current?.abort();
    const controller = new AbortController();
    seriesRequest.current = controller;
    const params = new URLSearchParams({ range: next });
    if (selectedAccountId !== "all") params.set("instagramAccountId", selectedAccountId);

    fetch(`/api/dashboard/series?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSeries(res.data.series);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") console.error(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChartLoading(false);
      });
  }

  const fmt = (n: number) => n.toLocaleString(locale);
  const kpis = stats?.kpis;
  const kpiItems: KpiItem[] = [
    { id: "dms", label: t("DMs sent"), value: fmt(kpis?.dms.current ?? 0), trend: kpis?.dms },
    { id: "clicks", label: t("Link clicks"), value: fmt(kpis?.clicks.current ?? 0), trend: kpis?.clicks },
    {
      id: "ctr",
      label: t("Click-through rate"),
      value: `${(kpis?.ctr.current ?? 0).toLocaleString(locale, { maximumFractionDigits: 1 })}%`,
      trend: kpis?.ctr,
    },
    { id: "contacts", label: t("Unique contacts"), value: fmt(kpis?.contacts.current ?? 0), trend: kpis?.contacts },
  ];

  const rankings = stats?.rankings;
  const sourceLabels: Record<string, string> = {
    SENT: t("Sent"),
    SKIPPED: t("Skipped"),
    FAILED: t("Failed"),
    [DIRECT_REFERRER]: t("Direct"),
  };
  const rankingColumns: RankingColumn[] = [
    {
      id: "keywords",
      title: t("Top Keywords"),
      empty: t("No keyword matches yet"),
      tabs: [
        { value: "week", label: t("Last 7 days"), rows: rankings?.keywords.week ?? [] },
        { value: "month", label: t("Last 30 days"), rows: rankings?.keywords.month ?? [] },
        { value: "all", label: t("All time"), rows: rankings?.keywords.all ?? [] },
      ],
    },
    {
      id: "campaigns",
      title: t("Top Campaigns"),
      subtitle: t("Last 30 days"),
      empty: t("No campaign activity yet"),
      tabs: [
        { value: "dms", label: t("DMs sent"), rows: rankings?.campaigns.dms ?? [] },
        { value: "clicks", label: t("Clicks"), rows: rankings?.campaigns.clicks ?? [] },
      ],
    },
    {
      id: "sources",
      title: t("Results & Sources"),
      subtitle: t("Last 30 days"),
      empty: t("No data yet"),
      formatLabel: (label) => sourceLabels[label] ?? label,
      tabs: [
        { value: "outcomes", label: t("Outcomes"), rows: rankings?.sources.outcomes ?? [] },
        { value: "links", label: t("Links"), rows: rankings?.sources.links ?? [] },
        { value: "referrers", label: t("Referrers"), rows: rankings?.sources.referrers ?? [] },
      ],
    },
  ];

  const connectedCount = stats?.instagramAccounts.length ?? 0;
  const initialLoad = loading && !stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {initialLoad ? (
            <>
              <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-hover" />
              <div className="mt-2 h-4 w-72 animate-pulse rounded bg-surface-hover" />
            </>
          ) : (
            <>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                {t("Hello, {name}!", { name: stats?.userName ?? t("there") })}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {t(connectedCount === 1 ? "{count} connected account" : "{count} connected accounts", { count: connectedCount })}
                {" · "}
                {t(stats?.activeAutomations === 1 ? "{count} active campaign" : "{count} active campaigns", {
                  count: stats?.activeAutomations ?? 0,
                })}
                {" · "}
                {t(stats?.contactsCount === 1 ? "{count} contact" : "{count} contacts", { count: stats?.contactsCount ?? 0 })}
              </p>
            </>
          )}
        </div>
        {stats && stats.instagramAccounts.length > 1 && (
          <AccountSelect
            accounts={stats.instagramAccounts}
            value={selectedAccountId}
            onChange={handleAccountChange}
          />
        )}
      </div>

      <KpiStrip items={kpiItems} caption={t("Compared to last week")} loading={loading} />

      <PerformanceChart
        data={series}
        range={range}
        onRangeChange={handleRangeChange}
        loading={loading || chartLoading}
      />

      <RankingPanel columns={rankingColumns} loading={loading} />

      {initialLoad ? (
        <div className="panel h-64 animate-pulse bg-surface-hover/40" />
      ) : (
        <RecentActivity logs={stats?.recentLogs ?? []} showAccount={connectedCount > 1} />
      )}
    </div>
  );
}
