import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import {
  calculateChangePct,
  calculateCtr,
  normalizeReferrer,
  rankRows,
  summarizeDmStatuses,
  type RankRow,
} from "@/lib/tracking/analytics";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANK_LIMIT = 6;

/** Sentinel label for clicks with no Referer header; translated on the client. */
export const DIRECT_REFERRER = "__direct__";

export interface KpiTrend {
  current: number;
  previous: number;
  /** null = no baseline last period (show "new"). */
  changePct: number | null;
}

export interface DashboardKpis {
  dms: KpiTrend;
  clicks: KpiTrend;
  ctr: KpiTrend;
  contacts: KpiTrend;
}

export interface DashboardRankings {
  keywords: { week: RankRow[]; month: RankRow[]; all: RankRow[] };
  campaigns: { dms: RankRow[]; clicks: RankRow[] };
  /** outcomes labels are status codes: SENT | SKIPPED | FAILED. */
  sources: { outcomes: RankRow[]; links: RankRow[]; referrers: RankRow[] };
}

function trend(current: number, previous: number): KpiTrend {
  return { current, previous, changePct: calculateChangePct(current, previous) };
}

/**
 * Rolling last-7-days vs the 7 days before ("Compared to last week").
 * One aggregate query per table using FILTER, so both windows cost one trip.
 */
export async function getDashboardKpis({
  workspaceId,
  instagramAccountId,
  now = new Date(),
}: {
  workspaceId: string;
  instagramAccountId: string | null;
  now?: Date;
}): Promise<DashboardKpis> {
  const curStart = new Date(now.getTime() - 7 * DAY_MS);
  const prevStart = new Date(now.getTime() - 14 * DAY_MS);
  const account = instagramAccountId
    ? Prisma.sql`AND "instagramAccountId" = ${instagramAccountId}`
    : Prisma.empty;

  const [[dm], [click]] = await Promise.all([
    prisma.$queryRaw<{ dms_cur: number; dms_prev: number; contacts_cur: number; contacts_prev: number }[]>`
      SELECT
        COUNT(*) FILTER (WHERE "status" = 'SENT' AND "createdAt" >= ${curStart})::int AS dms_cur,
        COUNT(*) FILTER (WHERE "status" = 'SENT' AND "createdAt" < ${curStart})::int AS dms_prev,
        COUNT(DISTINCT "commenterId") FILTER (WHERE "createdAt" >= ${curStart})::int AS contacts_cur,
        COUNT(DISTINCT "commenterId") FILTER (WHERE "createdAt" < ${curStart})::int AS contacts_prev
      FROM "DmLog"
      WHERE "workspaceId" = ${workspaceId}
        AND "createdAt" >= ${prevStart} AND "createdAt" < ${now}
        ${account}`,
    prisma.$queryRaw<{ cur: number; prev: number }[]>`
      SELECT
        COUNT(*) FILTER (WHERE "createdAt" >= ${curStart})::int AS cur,
        COUNT(*) FILTER (WHERE "createdAt" < ${curStart})::int AS prev
      FROM "LinkClick"
      WHERE "workspaceId" = ${workspaceId}
        AND "createdAt" >= ${prevStart} AND "createdAt" < ${now}
        ${account}`,
  ]);

  const dmsCur = Number(dm?.dms_cur ?? 0);
  const dmsPrev = Number(dm?.dms_prev ?? 0);
  const clicksCur = Number(click?.cur ?? 0);
  const clicksPrev = Number(click?.prev ?? 0);

  return {
    dms: trend(dmsCur, dmsPrev),
    clicks: trend(clicksCur, clicksPrev),
    ctr: trend(calculateCtr(clicksCur, dmsCur), calculateCtr(clicksPrev, dmsPrev)),
    contacts: trend(Number(dm?.contacts_cur ?? 0), Number(dm?.contacts_prev ?? 0)),
  };
}

function linkLabel(link: { label: string | null; destinationUrl: string }) {
  if (link.label?.trim()) return link.label.trim();
  try {
    const url = new URL(link.destinationUrl);
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${url.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return link.destinationUrl;
  }
}

/**
 * Data for the three ranking columns. Campaign and source rankings cover the
 * last 30 days; keywords offer 7d / 30d / all-time tabs.
 */
export async function getDashboardRankings({
  workspaceId,
  instagramAccountId,
  now = new Date(),
}: {
  workspaceId: string;
  instagramAccountId: string | null;
  now?: Date;
}): Promise<DashboardRankings> {
  const weekStart = new Date(now.getTime() - 7 * DAY_MS);
  const monthStart = new Date(now.getTime() - 30 * DAY_MS);
  const base = { workspaceId, ...(instagramAccountId ? { instagramAccountId } : {}) };
  const keywordWhere = { ...base, matchedKeyword: { not: null } };

  const [
    kwWeek,
    kwMonth,
    kwAll,
    campaignDms,
    campaignClicks,
    statusRows,
    linkClicks,
    referrerRows,
  ] = await Promise.all([
    prisma.dmLog.groupBy({
      by: ["matchedKeyword"],
      where: { ...keywordWhere, createdAt: { gte: weekStart } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: RANK_LIMIT,
    }),
    prisma.dmLog.groupBy({
      by: ["matchedKeyword"],
      where: { ...keywordWhere, createdAt: { gte: monthStart } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: RANK_LIMIT,
    }),
    prisma.dmLog.groupBy({
      by: ["matchedKeyword"],
      where: keywordWhere,
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: RANK_LIMIT,
    }),
    prisma.dmLog.groupBy({
      by: ["automationId"],
      where: { ...base, status: "SENT", createdAt: { gte: monthStart } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: RANK_LIMIT,
    }),
    prisma.linkClick.groupBy({
      by: ["automationId"],
      where: { ...base, createdAt: { gte: monthStart } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: RANK_LIMIT,
    }),
    prisma.dmLog.groupBy({
      by: ["status"],
      where: { ...base, createdAt: { gte: monthStart } },
      _count: { _all: true },
    }),
    prisma.linkClick.groupBy({
      by: ["trackedLinkId"],
      where: { ...base, createdAt: { gte: monthStart } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: RANK_LIMIT,
    }),
    // Raw referrers fan out (paths, query strings), so pull a wider slice and
    // merge by normalized host below.
    prisma.linkClick.groupBy({
      by: ["referrer"],
      where: { ...base, createdAt: { gte: monthStart } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 100,
    }),
  ]);

  const automationIds = [...new Set([...campaignDms, ...campaignClicks].map((r) => r.automationId))];
  const [automations, links] = await Promise.all([
    automationIds.length
      ? prisma.automation.findMany({ where: { id: { in: automationIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    linkClicks.length
      ? prisma.trackedLink.findMany({
          where: { id: { in: linkClicks.map((l) => l.trackedLinkId) } },
          select: { id: true, label: true, destinationUrl: true },
        })
      : Promise.resolve([]),
  ]);
  const automationName = new Map(automations.map((a) => [a.id, a.name]));
  const linkById = new Map(links.map((l) => [l.id, l]));

  const keywordRows = (rows: typeof kwAll) =>
    rankRows(
      rows.map((r) => ({ label: r.matchedKeyword as string, count: r._count._all })),
      RANK_LIMIT,
    );

  const outcomes = summarizeDmStatuses(
    statusRows.map((r) => ({ status: r.status, _count: r._count._all })),
  );

  return {
    keywords: {
      week: keywordRows(kwWeek),
      month: keywordRows(kwMonth),
      all: keywordRows(kwAll),
    },
    campaigns: {
      dms: rankRows(
        campaignDms.map((r) => ({ label: automationName.get(r.automationId) ?? "—", count: r._count._all })),
        RANK_LIMIT,
      ),
      clicks: rankRows(
        campaignClicks.map((r) => ({ label: automationName.get(r.automationId) ?? "—", count: r._count._all })),
        RANK_LIMIT,
      ),
    },
    sources: {
      // Fixed order reads better than sorted for a status breakdown.
      outcomes: [
        { label: "SENT", count: outcomes.sent },
        { label: "SKIPPED", count: outcomes.skipped },
        { label: "FAILED", count: outcomes.failed },
      ].filter((r) => r.count > 0),
      links: rankRows(
        linkClicks.map((r) => {
          const link = linkById.get(r.trackedLinkId);
          return { label: link ? linkLabel(link) : "—", count: r._count._all };
        }),
        RANK_LIMIT,
      ),
      referrers: rankRows(
        referrerRows.map((r) => ({
          label: normalizeReferrer(r.referrer) ?? DIRECT_REFERRER,
          count: r._count._all,
        })),
        RANK_LIMIT,
      ),
    },
  };
}
