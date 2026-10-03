"use client";

/**
 * Instagram Overview Page
 *
 * Organised in four tabs so every figure the connected provider exposes has a
 * home without crowding the page:
 *
 * - Summary  — headline KPIs over the selected posts, follower history, rankings.
 * - Account  — whole-account insights, daily activity, previous-period comparison.
 * - Audience — follower / engaged-audience demographics.
 * - Content  — best posting times, frequency, lifespan and the per-post table.
 *
 * Post-level numbers come from /api/instagram/overview; account-level Zernio
 * analytics load separately from /api/instagram/overview/insights so changing
 * the period never refetches every post.
 */

import type { OverviewResponse } from "@/app/api/instagram/overview/route";
import type { OverviewInsightsResponse } from "@/app/api/instagram/overview/insights/route";
import AccountSelect from "@/components/account-select";
import KpiStrip, { type KpiItem } from "@/components/dashboard/kpi-strip";
import RankingPanel, { type RankingColumn } from "@/components/dashboard/ranking-panel";
import AccountInsightsPanel from "@/components/overview/account-insights-panel";
import AudiencePanel from "@/components/overview/audience-panel";
import { formatDateTime, formatNumber } from "@/components/overview/format";
import PostsTable, { useFormatLabel } from "@/components/overview/posts-table";
import TimingPanel from "@/components/overview/timing-panel";
import Segmented from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n/provider";
import { translateServerMessage } from "@/lib/i18n/server-messages";
import {
  averagePerPost,
  contentFormat,
  contentMix,
  followerChange,
  sliceFollowerHistory,
  topPosts,
  weekdayStats,
  type PostMetric,
} from "@/lib/reports/overview-insights";
import type { ZernioInsightPeriod, ZernioOverviewExtras } from "@/lib/zernio/analytics";
import { IconAlertTriangle, IconBrandInstagram, IconPlugConnectedX } from "@tabler/icons-react";
import { useEffect, useState } from "react";

type CountOption = "25" | "50" | "100" | "all";
type OverviewTab = "summary" | "account" | "audience" | "content";

export default function OverviewPage() {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const formatLabel = useFormatLabel();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [count, setCount] = useState<CountOption>("50");
  const [tab, setTab] = useState<OverviewTab>("summary");

  const [days, setDays] = useState<ZernioInsightPeriod>(30);
  const [extras, setExtras] = useState<ZernioOverviewExtras | null>(null);
  const [extrasLoading, setExtrasLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ count });
    if (selectedAccountId !== "all") params.set("instagramAccountId", selectedAccountId);

    fetch(`/api/instagram/overview?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
          setError(null);
        } else {
          setError(res.error ?? "Failed to load overview");
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError("Failed to load overview");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedAccountId, count]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ days: String(days) });
    if (selectedAccountId !== "all") params.set("instagramAccountId", selectedAccountId);

    fetch(`/api/instagram/overview/insights?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((res: { success: boolean; data?: OverviewInsightsResponse }) => {
        setExtras(res.success ? (res.data?.extras ?? null) : null);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setExtras(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setExtrasLoading(false);
      });

    return () => controller.abort();
  }, [selectedAccountId, days]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setExtrasLoading(true);
    setSelectedAccountId(accountId);
  }

  function handleCountChange(next: CountOption) {
    if (next === count) return;
    setLoading(true);
    setCount(next);
  }

  function handleDaysChange(next: ZernioInsightPeriod) {
    if (next === days) return;
    setExtrasLoading(true);
    setDays(next);
  }

  // Hard failure with nothing to show yet.
  if (error && !data && !loading) {
    const notConnected = error.includes("connect");
    return (
      <div className="panel flex flex-col items-center px-6 py-16 text-center">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            notConnected ? "bg-accent-soft text-accent" : "bg-error-soft text-error"
          }`}
        >
          {notConnected ? <IconBrandInstagram size={24} stroke={1.5} /> : <IconPlugConnectedX size={24} stroke={1.5} />}
        </span>
        <h1 className="mt-4 font-heading text-lg font-semibold text-foreground">
          {notConnected ? t("Connect Instagram") : t("Failed to load overview")}
        </h1>
        <p className="mt-1 max-w-md text-sm text-muted">
          {error === "Failed to load overview" ? t("Please try again in a moment.") : translateServerMessage(i18n, error)}
        </p>
        {notConnected && (
          <a
            href="/api/instagram/connect"
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
          >
            <IconBrandInstagram size={16} stroke={1.75} />
            {t("Connect Instagram")}
          </a>
        )}
      </div>
    );
  }

  const initialLoad = loading && !data;
  const posts = data?.posts ?? [];
  const totals = data?.totals;
  const insights = data?.insightsAvailable ?? true;
  const hasZernio = data?.provider === "ZERNIO";
  const profile = extras?.profile ?? null;

  // The account tabs only exist when the provider exposes account analytics.
  const tabOptions: { value: OverviewTab; label: string }[] = [
    { value: "summary", label: t("Summary") },
    ...(hasZernio
      ? [
          { value: "account" as const, label: t("Account") },
          { value: "audience" as const, label: t("Audience") },
        ]
      : []),
    { value: "content", label: t("Content") },
  ];
  const activeTab: OverviewTab = tabOptions.some((o) => o.value === tab) ? tab : "summary";
  const showsPosts = activeTab === "summary" || activeTab === "content";

  // KPI strip ------------------------------------------------------------
  const followers30 = sliceFollowerHistory(data?.followerHistory ?? [], 30);
  const change30 = followerChange(followers30);
  const followerCount = data?.followers ?? profile?.followers ?? null;

  const metricItem = (id: PostMetric, label: string, total: number | undefined, needsInsights: boolean): KpiItem => {
    if (needsInsights && !insights) {
      return { id, label, value: "—", muted: true, caption: t("Needs insights permission") };
    }
    const avg = averagePerPost(posts, id);
    return {
      id,
      label,
      value: formatNumber(total ?? 0, locale),
      caption: avg === null ? undefined : t("{value} avg per post", { value: formatNumber(Math.round(avg), locale) }),
    };
  };

  const followersCaption = change30
    ? t("{value} in {count} days", {
        value: `${change30.net > 0 ? "+" : ""}${change30.net.toLocaleString(locale)}`,
        count: change30.days,
      })
    : profile?.followersUpdatedAt
      ? t("Updated {time}", { time: formatDateTime(profile.followersUpdatedAt, locale) })
      : t("Account total");

  const kpiItems: KpiItem[] = [
    {
      id: "followers",
      label: t("Followers"),
      value: followerCount === null ? "—" : formatNumber(followerCount, locale),
      muted: followerCount === null,
      trend: change30 && change30.pct !== null ? { changePct: change30.pct, current: change30.net } : undefined,
      caption: followersCaption,
    },
    metricItem("views", t("Views"), totals?.views, true),
    metricItem("reach", t("Reach"), totals?.reach, true),
    metricItem("interactions", t("Interactions"), totals?.interactions, false),
    metricItem("likes", t("Likes"), totals?.likes, false),
    metricItem("comments", t("Comments"), totals?.comments, false),
    metricItem("saved", t("Saved"), totals?.saved, true),
    metricItem("shares", t("Shares"), totals?.shares, true),
  ];

  // Rankings -------------------------------------------------------------
  const postRows = (metric: PostMetric) =>
    topPosts(posts, metric).map(({ post, value }) => ({
      label: post.caption || t("{type} post", { type: formatLabel(contentFormat(post.mediaType)) }),
      count: value,
      href: post.permalink,
    }));
  const mix = contentMix(posts);
  const weekdays = weekdayStats(posts);
  const weekdayName = (index: string) =>
    // 2024-01-07 was a Sunday, matching Date#getDay() = 0.
    new Date(2024, 0, 7 + Number(index)).toLocaleDateString(locale, { weekday: "long" });

  const rankingColumns: RankingColumn[] = [
    {
      id: "top-posts",
      title: t("Top Posts"),
      empty: t("No posts found"),
      tabs: [
        { value: "interactions", label: t("Interactions"), rows: postRows("interactions") },
        insights
          ? { value: "views", label: t("Views"), rows: postRows("views") }
          : { value: "likes", label: t("Likes"), rows: postRows("likes") },
        { value: "comments", label: t("Comments"), rows: postRows("comments") },
      ],
    },
    {
      id: "formats",
      title: t("Content Formats"),
      empty: t("No posts found"),
      formatLabel,
      tabs: [
        { value: "avg", label: t("Avg. interactions"), rows: mix.avgInteractions },
        { value: "posts", label: t("Posts"), rows: mix.posts },
      ],
    },
    {
      id: "weekdays",
      title: t("Best Days to Post"),
      empty: t("No posts found"),
      formatLabel: weekdayName,
      tabs: [
        { value: "avg", label: t("Avg. interactions"), rows: weekdays.avgInteractions },
        { value: "posts", label: t("Posts"), rows: weekdays.posts },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {profile?.profilePicture && (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived Instagram CDN URLs
            <img
              src={profile.profilePicture}
              alt=""
              referrerPolicy="no-referrer"
              className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">{t("Overview")}</h1>
            {initialLoad ? (
              <div className="mt-2 h-4 w-72 animate-pulse rounded bg-surface-hover" />
            ) : (
              data && (
                <p className="mt-1 text-sm text-muted">
                  {data.provider !== "ZERNIO" && data.requestedCount === "all" ? t("All-time") : t("Recent")} —{" "}
                  {t(data.totals.posts === 1 ? "{count} post" : "{count} posts", { count: data.totals.posts })}{" "}
                  {t("from @")}
                  {profile?.profileUrl ? (
                    <a
                      href={profile.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:text-accent hover:underline"
                    >
                      {data.account.username}
                    </a>
                  ) : (
                    <span className="font-medium text-foreground">{data.account.username}</span>
                  )}
                  {data.truncated ? t(" (capped at {count})", { count: data.totals.posts }) : ""}
                </p>
              )
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {showsPosts && (
            <Segmented
              id="overview-count"
              ariaLabel={t("Range")}
              value={count}
              onChange={handleCountChange}
              options={[
                { value: "25", label: t("Last 25") },
                { value: "50", label: t("Last 50") },
                { value: "100", label: t("Last 100") },
                { value: "all", label: t("All time") },
              ]}
            />
          )}
          {data && data.accounts.length > 1 && (
            <AccountSelect
              accounts={data.accounts.map((a) => ({ id: a.id, username: a.username, instagramId: a.id }))}
              value={selectedAccountId}
              onChange={handleAccountChange}
            />
          )}
        </div>
      </div>

      {data && (
        <Segmented id="overview-tabs" ariaLabel={t("Overview sections")} value={activeTab} onChange={setTab} options={tabOptions} />
      )}

      {error && data && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm">
          <IconAlertTriangle size={18} stroke={1.75} className="mt-px shrink-0 text-error" />
          <p className="text-foreground">{translateServerMessage(i18n, error)}</p>
        </div>
      )}

      {data && !insights && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm">
            <IconAlertTriangle size={18} stroke={1.75} className="mt-px shrink-0 text-warning" />
            <div>
              <p className="font-medium text-foreground">
                {t("Views, reach, saved and shares need the insights permission.")}
              </p>
              <p className="mt-0.5 text-muted">
                {t("Reconnect your account to grant it — likes and comments are shown in the meantime.")}
              </p>
            </div>
          </div>
          <a
            href="/api/instagram/connect"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-surface px-3 text-sm font-medium text-foreground ring-1 ring-border hover:bg-surface-hover"
          >
            <IconBrandInstagram size={16} stroke={1.75} />
            {t("Reconnect Instagram")}
          </a>
        </div>
      )}

      {activeTab === "summary" && (
        <>
          <KpiStrip items={kpiItems} loading={loading} />

          <RankingPanel columns={rankingColumns} loading={loading} />
        </>
      )}

      {activeTab === "account" && (
        <AccountInsightsPanel extras={extras} loading={extrasLoading} days={days} onDaysChange={handleDaysChange} />
      )}

      {activeTab === "audience" && <AudiencePanel extras={extras} loading={extrasLoading} />}

      {activeTab === "content" && (
        <>
          {hasZernio && <TimingPanel extras={extras} loading={extrasLoading} />}
          <PostsTable posts={posts} loading={loading} />
        </>
      )}
    </div>
  );
}
