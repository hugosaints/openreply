/**
 * Zernio analytics readers for the Overview page.
 *
 * Everything Zernio exposes for an Instagram account — beyond the per-post
 * numbers the Overview already summed — is mapped here into one typed payload:
 * profile + follower stats, account-level insights (all surfaces, not only
 * feed posts), per-day activity with the previous period, audience
 * demographics, best posting times, frequency-vs-engagement and content decay.
 *
 * Each section is fetched independently and degrades to `null` so one missing
 * add-on, one unsynced metric or one transient 5xx never blanks the page.
 * See https://docs.zernio.com/analytics for the source endpoints.
 */

import { zernioRequest } from "@/lib/zernio/client";
import type { ZernioContext } from "@/lib/instagram/context";

export const ZERNIO_INSIGHT_PERIODS = [7, 30, 90] as const;
export type ZernioInsightPeriod = (typeof ZERNIO_INSIGHT_PERIODS)[number];

export type ZernioSection =
  | "profile"
  | "insights"
  | "daily"
  | "audience"
  | "bestTimes"
  | "frequency"
  | "decay";

export type ZernioSectionIssue = {
  section: ZernioSection;
  /** `addon_required` = Zernio answered 402 (Analytics add-on missing). */
  reason: "addon_required" | "unavailable";
};

/** Account-level metrics Instagram reports for the whole account. */
export const ACCOUNT_INSIGHT_METRICS = [
  "reach",
  "views",
  "accounts_engaged",
  "total_interactions",
  "likes",
  "comments",
  "saves",
  "shares",
  "replies",
  "reposts",
  "follows_and_unfollows",
  "profile_links_taps",
] as const;
export type AccountInsightMetric = (typeof ACCOUNT_INSIGHT_METRICS)[number];

export interface BreakdownEntry {
  dimension: string;
  value: number;
}

export interface Demographics {
  age: BreakdownEntry[];
  gender: BreakdownEntry[];
  country: BreakdownEntry[];
  city: BreakdownEntry[];
}

export interface ZernioProfile {
  username: string | null;
  displayName: string | null;
  profilePicture: string | null;
  profileUrl: string | null;
  followers: number | null;
  /** When Zernio last refreshed the follower count (it refreshes daily). */
  followersUpdatedAt: string | null;
  growth: number | null;
  growthPct: number | null;
}

export interface ZernioAccountInsights {
  totals: Partial<Record<AccountInsightMetric, number>>;
  /** Requested metrics Instagram did not serve — shown as unavailable, never 0. */
  unavailableMetrics: string[];
  reachSeries: { date: string; value: number }[];
  reachByFormat: BreakdownEntry[];
  interactionsByFormat: BreakdownEntry[];
  dataDelay: string | null;
}

export interface DailyMetrics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
}

export interface DailyPoint extends DailyMetrics {
  date: string;
  postCount: number;
  /** likes + comments + shares + saves received that day. */
  engagement: number;
}

export interface ZernioDailyActivity {
  series: DailyPoint[];
  totals: DailyMetrics & { engagement: number; postCount: number };
  previousTotals: (DailyMetrics & { engagement: number; postCount: number }) | null;
}

export interface BestTimeSlot {
  /** 0 = Monday … 6 = Sunday, hour in UTC (Zernio's own convention). */
  dayOfWeek: number;
  hour: number;
  avgEngagement: number;
  postCount: number;
}

export interface FrequencyBucket {
  postsPerWeek: number;
  avgEngagementRate: number;
  avgEngagement: number;
  weeks: number;
}

export interface DecayBucket {
  order: number;
  label: string;
  pctOfFinal: number;
  postCount: number;
}

export interface ZernioOverviewExtras {
  period: { days: ZernioInsightPeriod; since: string; until: string };
  profile: ZernioProfile | null;
  insights: ZernioAccountInsights | null;
  daily: ZernioDailyActivity | null;
  audience: { followers: Demographics | null; engaged: Demographics | null } | null;
  bestTimes: BestTimeSlot[] | null;
  frequency: FrequencyBucket[] | null;
  decay: DecayBucket[] | null;
  issues: ZernioSectionIssue[];
}

const DAY_MS = 86_400_000;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function maybeNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function entries(value: unknown): BreakdownEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (e): e is { dimension: string; value: number } =>
        typeof e?.dimension === "string" && typeof e?.value === "number"
    )
    .map((e) => ({ dimension: e.dimension, value: e.value }));
}

function query(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined) q.set(key, String(value));
  return q.toString();
}

function request<T>(context: ZernioContext, path: string) {
  return zernioRequest<T>({ apiKey: context.apiKey, path });
}

export async function getZernioProfile(
  context: ZernioContext
): Promise<ZernioProfile> {
  const result = await request<{
    accounts?: {
      _id: string;
      username?: string;
      displayName?: string;
      profilePicture?: string | null;
      currentFollowers?: number | null;
      lastUpdated?: string;
      growth?: number | null;
      growthPercentage?: number | null;
    }[];
  }>(
    context,
    `/accounts/follower-stats?${query({ accountIds: context.accountId })}`
  );
  const account = result.accounts?.find((a) => a._id === context.accountId);
  if (!account) throw new Error("Zernio account not found");
  const username = str(account.username);
  return {
    username,
    displayName: str(account.displayName),
    profilePicture: str(account.profilePicture),
    profileUrl: username ? `https://www.instagram.com/${username}/` : null,
    followers: maybeNum(account.currentFollowers),
    followersUpdatedAt: str(account.lastUpdated),
    growth: maybeNum(account.growth),
    growthPct: maybeNum(account.growthPercentage),
  };
}

type InsightsEnvelope = {
  metrics?: Record<
    string,
    {
      total?: number;
      values?: { date: string; value: number }[];
      breakdowns?: unknown;
    }
  >;
  unavailableMetrics?: { metric: string }[];
  dataDelay?: string;
};

export async function getZernioAccountInsights(
  context: ZernioContext,
  since: string,
  until: string
): Promise<ZernioAccountInsights> {
  const base = { accountId: context.accountId, fromDate: since, toDate: until };
  const path = (extra: Record<string, string>) =>
    `/analytics/instagram/account-insights?${query({ ...base, ...extra })}`;

  const [totals, series, byFormat] = await Promise.all([
    request<InsightsEnvelope>(
      context,
      path({
        metrics: ACCOUNT_INSIGHT_METRICS.join(","),
        metricType: "total_value",
      })
    ),
    request<InsightsEnvelope>(
      context,
      path({ metrics: "reach", metricType: "time_series" })
    ).catch(() => null),
    request<InsightsEnvelope>(
      context,
      path({
        metrics: "reach,total_interactions",
        metricType: "total_value",
        breakdown: "media_product_type",
      })
    ).catch(() => null),
  ]);

  const out: Partial<Record<AccountInsightMetric, number>> = {};
  for (const metric of ACCOUNT_INSIGHT_METRICS) {
    const total = totals.metrics?.[metric]?.total;
    if (typeof total === "number") out[metric] = total;
  }

  return {
    totals: out,
    unavailableMetrics: (totals.unavailableMetrics ?? []).map((m) => m.metric),
    reachSeries: (series?.metrics?.reach?.values ?? []).map((p) => ({
      date: p.date,
      value: num(p.value),
    })),
    reachByFormat: entries(byFormat?.metrics?.reach?.breakdowns),
    interactionsByFormat: entries(
      byFormat?.metrics?.total_interactions?.breakdowns
    ),
    dataDelay: str(totals.dataDelay),
  };
}

type RawDailyMetrics = Partial<Record<keyof DailyMetrics, number>>;

function toMetrics(raw: RawDailyMetrics | undefined): DailyMetrics {
  return {
    impressions: num(raw?.impressions),
    reach: num(raw?.reach),
    likes: num(raw?.likes),
    comments: num(raw?.comments),
    shares: num(raw?.shares),
    saves: num(raw?.saves),
    clicks: num(raw?.clicks),
    views: num(raw?.views),
  };
}

function engagementOf(m: DailyMetrics): number {
  return m.likes + m.comments + m.shares + m.saves;
}

async function getDailyWindow(
  context: ZernioContext,
  since: string,
  until: string
) {
  const result = await request<{
    dailyData?: {
      date: string;
      postCount?: number;
      metrics?: RawDailyMetrics;
    }[];
  }>(
    context,
    `/analytics/daily-metrics?${query({
      platform: "instagram",
      accountId: context.accountId,
      fromDate: since,
      toDate: until,
      // Engagement is bucketed on the day it arrived, so the chart reads as
      // activity over time instead of spiking on each publish date.
      attribution: "received",
    })}`
  );
  const byDate = new Map(
    (result.dailyData ?? []).map((d) => [d.date.slice(0, 10), d])
  );
  const series: DailyPoint[] = [];
  const totals = { ...toMetrics(undefined), engagement: 0, postCount: 0 };
  const start = Date.parse(`${since}T00:00:00Z`);
  const end = Date.parse(`${until}T00:00:00Z`);
  for (let t = start; t <= end; t += DAY_MS) {
    const date = isoDay(new Date(t));
    const row = byDate.get(date);
    const metrics = toMetrics(row?.metrics);
    const point: DailyPoint = {
      date,
      ...metrics,
      postCount: num(row?.postCount),
      engagement: engagementOf(metrics),
    };
    series.push(point);
    for (const key of Object.keys(metrics) as (keyof DailyMetrics)[])
      totals[key] += metrics[key];
    totals.engagement += point.engagement;
    totals.postCount += point.postCount;
  }
  return { series, totals };
}

export async function getZernioDailyActivity(
  context: ZernioContext,
  days: ZernioInsightPeriod,
  until: Date
): Promise<ZernioDailyActivity> {
  const since = new Date(until.getTime() - (days - 1) * DAY_MS);
  const prevUntil = new Date(since.getTime() - DAY_MS);
  const prevSince = new Date(prevUntil.getTime() - (days - 1) * DAY_MS);
  const [current, previous] = await Promise.all([
    getDailyWindow(context, isoDay(since), isoDay(until)),
    getDailyWindow(context, isoDay(prevSince), isoDay(prevUntil)).catch(
      () => null
    ),
  ]);
  return {
    series: current.series,
    totals: current.totals,
    previousTotals: previous?.totals ?? null,
  };
}

function toDemographics(raw: unknown): Demographics | null {
  const data = (raw as { demographics?: Record<string, unknown> } | null)
    ?.demographics;
  if (!data) return null;
  const demographics: Demographics = {
    age: entries(data.age),
    gender: entries(data.gender),
    country: entries(data.country),
    city: entries(data.city),
  };
  const empty = Object.values(demographics).every((list) => !list.length);
  return empty ? null : demographics;
}

export async function getZernioAudience(context: ZernioContext) {
  const path = (metric: string) =>
    `/analytics/instagram/demographics?${query({
      accountId: context.accountId,
      metric,
      breakdown: "age,gender,country,city",
    })}`;
  const [followers, engaged] = await Promise.allSettled([
    request<unknown>(context, path("follower_demographics")),
    request<unknown>(context, path("engaged_audience_demographics")),
  ]);
  // Demographics need 100+ followers; an account below that gets a 4xx. Only
  // report the section as failed when neither audience could be read.
  if (followers.status === "rejected" && engaged.status === "rejected")
    throw followers.reason;
  return {
    followers:
      followers.status === "fulfilled" ? toDemographics(followers.value) : null,
    engaged:
      engaged.status === "fulfilled" ? toDemographics(engaged.value) : null,
  };
}

export async function getZernioBestTimes(
  context: ZernioContext
): Promise<BestTimeSlot[]> {
  const result = await request<{
    slots?: {
      day_of_week: number;
      hour: number;
      avg_engagement: number;
      post_count: number;
    }[];
  }>(
    context,
    `/analytics/best-time?${query({ platform: "instagram", accountId: context.accountId })}`
  );
  return (result.slots ?? []).map((s) => ({
    dayOfWeek: num(s.day_of_week),
    hour: num(s.hour),
    avgEngagement: num(s.avg_engagement),
    postCount: num(s.post_count),
  }));
}

export async function getZernioFrequency(
  context: ZernioContext
): Promise<FrequencyBucket[]> {
  const result = await request<{
    frequency?: {
      posts_per_week: number;
      avg_engagement_rate: number;
      avg_engagement: number;
      weeks_count: number;
    }[];
  }>(
    context,
    `/analytics/posting-frequency?${query({ platform: "instagram", accountId: context.accountId })}`
  );
  return (result.frequency ?? [])
    .map((f) => ({
      postsPerWeek: num(f.posts_per_week),
      avgEngagementRate: num(f.avg_engagement_rate),
      avgEngagement: num(f.avg_engagement),
      weeks: num(f.weeks_count),
    }))
    .sort((a, b) => a.postsPerWeek - b.postsPerWeek);
}

export async function getZernioDecay(
  context: ZernioContext
): Promise<DecayBucket[]> {
  const result = await request<{
    buckets?: {
      bucket_order: number;
      bucket_label: string;
      avg_pct_of_final: number;
      post_count: number;
    }[];
  }>(
    context,
    `/analytics/content-decay?${query({ platform: "instagram", accountId: context.accountId })}`
  );
  return (result.buckets ?? [])
    .map((b) => ({
      order: num(b.bucket_order),
      label: b.bucket_label,
      pctOfFinal: num(b.avg_pct_of_final),
      postCount: num(b.post_count),
    }))
    .sort((a, b) => a.order - b.order);
}

function issueFor(section: ZernioSection, reason: unknown): ZernioSectionIssue {
  const code = (reason as { code?: unknown } | null)?.code;
  return {
    section,
    reason: code === 402 ? "addon_required" : "unavailable",
  };
}

/** Load every Zernio analytics section for one Instagram account. */
export async function loadZernioOverviewExtras(
  context: ZernioContext,
  days: ZernioInsightPeriod = 30,
  now = new Date()
): Promise<ZernioOverviewExtras> {
  const until = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const since = new Date(until.getTime() - (days - 1) * DAY_MS);

  const sections = await Promise.allSettled([
    getZernioProfile(context),
    getZernioAccountInsights(context, isoDay(since), isoDay(until)),
    getZernioDailyActivity(context, days, until),
    getZernioAudience(context),
    getZernioBestTimes(context),
    getZernioFrequency(context),
    getZernioDecay(context),
  ]);

  const names: ZernioSection[] = [
    "profile",
    "insights",
    "daily",
    "audience",
    "bestTimes",
    "frequency",
    "decay",
  ];
  const issues: ZernioSectionIssue[] = [];
  const pick = <T>(index: number): T | null => {
    const result = sections[index];
    if (result.status === "fulfilled") return result.value as T;
    issues.push(issueFor(names[index], result.reason));
    return null;
  };

  const extras: ZernioOverviewExtras = {
    period: { days, since: isoDay(since), until: isoDay(until) },
    profile: pick<ZernioProfile>(0),
    insights: pick<ZernioAccountInsights>(1),
    daily: pick<ZernioDailyActivity>(2),
    audience: pick<ZernioOverviewExtras["audience"]>(3),
    bestTimes: pick<BestTimeSlot[]>(4),
    frequency: pick<FrequencyBucket[]>(5),
    decay: pick<DecayBucket[]>(6),
    issues,
  };
  return extras;
}

/* -------------------------------------------------------------------------- */
/* Per-post analytics                                                          */
/* -------------------------------------------------------------------------- */

export interface ZernioPostAnalytics {
  platformPostId: string;
  impressions: number | null;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  clicks: number | null;
  follows: number | null;
  reposts: number | null;
  profileViews: number | null;
  engagementRate: number | null;
  reelsAvgWatchMs: number | null;
  reelsTotalWatchMs: number | null;
  reelsSkipRate: number | null;
  videoDurationSeconds: number | null;
  isAiGenerated: boolean | null;
  isSharedToFeed: boolean | null;
  mediaAudioType: string | null;
  mediaProductType: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  lastUpdated: string | null;
  synced: boolean;
}

type RawPostAnalytics = Record<string, unknown>;

/**
 * Every synced Instagram post with its full analytics block in one paginated
 * call, instead of one request per post. Keyed by the Instagram media id.
 */
export async function getZernioPostAnalytics(
  context: ZernioContext,
  max = 100
): Promise<Map<string, ZernioPostAnalytics>> {
  const out = new Map<string, ZernioPostAnalytics>();
  // 366 days is the documented ceiling for a single range.
  const fromDate = isoDay(new Date(Date.now() - 365 * DAY_MS));
  const limit = Math.min(max, 100);

  for (let page = 1; page <= Math.ceil(max / limit); page++) {
    const result = await request<{
      posts?: {
        analytics?: RawPostAnalytics;
        platforms?: {
          platform?: string;
          platformPostId?: string | null;
          accountId?: string;
          analytics?: RawPostAnalytics;
          syncStatus?: string;
        }[];
        thumbnailUrl?: string | null;
        mediaType?: string | null;
        mediaProductType?: string | null;
        isAiGenerated?: boolean;
        isSharedToFeed?: boolean;
        mediaItems?: { mediaAudioType?: string }[];
        mediaAudioType?: string;
      }[];
      pagination?: { pages?: number };
    }>(
      context,
      `/analytics?${query({
        platform: "instagram",
        accountId: context.accountId,
        fromDate,
        limit,
        page,
        sortBy: "date",
        order: "desc",
      })}`
    );

    for (const post of result.posts ?? []) {
      const entry = post.platforms?.find(
        (p) => p.accountId === context.accountId && p.platformPostId
      );
      if (!entry?.platformPostId) continue;
      const a = entry.analytics ?? post.analytics ?? {};
      const lastUpdated = str(a.lastUpdated);
      out.set(entry.platformPostId, {
        platformPostId: entry.platformPostId,
        impressions: maybeNum(a.impressions),
        reach: maybeNum(a.reach),
        views: maybeNum(a.views),
        likes: maybeNum(a.likes),
        comments: maybeNum(a.comments),
        saves: maybeNum(a.saves),
        shares: maybeNum(a.shares),
        clicks: maybeNum(a.clicks),
        follows: maybeNum(a.follows),
        reposts: maybeNum(a.reposts),
        profileViews: maybeNum(a.profileViews),
        engagementRate: maybeNum(a.engagementRate),
        reelsAvgWatchMs: maybeNum(a.igReelsAvgWatchTime),
        reelsTotalWatchMs: maybeNum(a.igReelsVideoViewTotalTime),
        reelsSkipRate: maybeNum(a.reelsSkipRate),
        videoDurationSeconds: maybeNum(a.videoDurationSeconds),
        isAiGenerated:
          typeof post.isAiGenerated === "boolean" ? post.isAiGenerated : null,
        isSharedToFeed:
          typeof post.isSharedToFeed === "boolean" ? post.isSharedToFeed : null,
        mediaAudioType:
          str(post.mediaAudioType) ?? str(post.mediaItems?.[0]?.mediaAudioType),
        mediaProductType: str(post.mediaProductType),
        mediaType: str(post.mediaType),
        thumbnailUrl: str(post.thumbnailUrl),
        lastUpdated,
        synced: entry.syncStatus ? entry.syncStatus === "synced" : Boolean(lastUpdated),
      });
    }
    if (!result.pagination?.pages || page >= result.pagination.pages) break;
  }
  return out;
}
