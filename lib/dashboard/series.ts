import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import type { Locale } from "@/lib/i18n";
import { localDayKey, localMonthKey } from "@/lib/tracking/analytics";

export type SeriesRange = "daily" | "monthly" | "yearly";

export interface SeriesPoint {
  /** Bucket key: YYYY-MM-DD (daily/monthly ranges) or YYYY-MM (yearly). */
  key: string;
  /** Localized axis label. */
  date: string;
  dms: number;
  clicks: number;
}

export function parseSeriesRange(value: string | null): SeriesRange {
  return value === "monthly" || value === "yearly" ? value : "daily";
}

interface Bucket {
  key: string;
  label: string;
}

function buildBuckets(range: SeriesRange, now: Date, locale: Locale) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets: Bucket[] = [];
  let start: Date;
  let end: Date;

  if (range === "yearly") {
    start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      buckets.push({ key: localMonthKey(d), label: d.toLocaleDateString(locale, { month: "short" }) });
    }
  } else {
    const days = range === "daily" ? 7 : 30;
    start = new Date(todayStart);
    start.setDate(start.getDate() - (days - 1));
    end = new Date(todayStart);
    end.setDate(end.getDate() + 1);
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      buckets.push({
        key: localDayKey(d),
        label:
          range === "daily"
            ? d.toLocaleDateString(locale, { weekday: "short" })
            : d.toLocaleDateString(locale, { month: "short", day: "numeric" }),
      });
    }
  }

  return { buckets, start, end };
}

/**
 * Sent DMs and link clicks per bucket for the dashboard chart.
 *
 * Two grouped queries over the whole window instead of one count per bucket
 * per metric (previously up to 60 sequential round trips on a 3-connection
 * pool). Buckets are cut in the server's local time zone, matching how the
 * window boundaries are computed.
 */
export async function getDashboardSeries({
  workspaceId,
  instagramAccountId,
  range,
  locale,
  now = new Date(),
}: {
  workspaceId: string;
  instagramAccountId: string | null;
  range: SeriesRange;
  locale: Locale;
  now?: Date;
}): Promise<SeriesPoint[]> {
  const { buckets, start, end } = buildBuckets(range, now, locale);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const fmt = range === "yearly" ? "YYYY-MM" : "YYYY-MM-DD";
  const account = instagramAccountId
    ? Prisma.sql`AND "instagramAccountId" = ${instagramAccountId}`
    : Prisma.empty;

  // createdAt is a UTC `timestamp without time zone`; shift it into the
  // server zone before formatting the bucket key.
  const [dmRows, clickRows] = await Promise.all([
    prisma.$queryRaw<{ key: string; count: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, ${fmt}) AS key,
             COUNT(*)::int AS count
      FROM "DmLog"
      WHERE "workspaceId" = ${workspaceId}
        AND "status" = 'SENT'
        AND "createdAt" >= ${start} AND "createdAt" < ${end}
        ${account}
      GROUP BY 1`,
    prisma.$queryRaw<{ key: string; count: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, ${fmt}) AS key,
             COUNT(*)::int AS count
      FROM "LinkClick"
      WHERE "workspaceId" = ${workspaceId}
        AND "createdAt" >= ${start} AND "createdAt" < ${end}
        ${account}
      GROUP BY 1`,
  ]);

  const dms = new Map(dmRows.map((r) => [r.key, Number(r.count)]));
  const clicks = new Map(clickRows.map((r) => [r.key, Number(r.count)]));

  return buckets.map((b) => ({
    key: b.key,
    date: b.label,
    dms: dms.get(b.key) ?? 0,
    clicks: clicks.get(b.key) ?? 0,
  }));
}
