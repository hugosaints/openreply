const SKIPPED_PREFIX = "SKIPPED_";

export interface StatusCountRow {
  status: string;
  _count: number | { status?: number; _all?: number };
}

export interface KeywordCountRow {
  matchedKeyword: string | null;
  _count: number | { matchedKeyword?: number; _all?: number };
}

function getCount(value: StatusCountRow["_count"] | KeywordCountRow["_count"]) {
  if (typeof value === "number") return value;
  if ("status" in value && typeof value.status === "number") {
    return value.status;
  }
  if ("matchedKeyword" in value && typeof value.matchedKeyword === "number") {
    return value.matchedKeyword;
  }
  return value._all ?? 0;
}

export function calculateCtr(clicks: number, sent: number) {
  if (sent <= 0) return 0;
  // Raw clicks can exceed sends (repeat clicks, link-preview bots hitting the
  // tracked URL), which makes a "rate" over 100% — cap it so CTR stays sane.
  return Math.min(100, Number(((clicks / sent) * 100).toFixed(1)));
}

export function summarizeDmStatuses(rows: StatusCountRow[]) {
  return rows.reduce(
    (summary, row) => {
      const count = getCount(row._count);
      if (row.status === "SENT") summary.sent += count;
      if (row.status === "FAILED") summary.failed += count;
      if (row.status.startsWith(SKIPPED_PREFIX)) summary.skipped += count;
      return summary;
    },
    { sent: 0, skipped: 0, failed: 0 }
  );
}

export function normalizeTopKeywords(rows: KeywordCountRow[], limit = 5) {
  return rows
    .filter((row) => row.matchedKeyword)
    .map((row) => ({
      keyword: row.matchedKeyword as string,
      count: getCount(row._count),
    }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword))
    .slice(0, limit);
}

/**
 * Percentage change from `previous` to `current`, one decimal.
 * Returns null when there is no baseline (previous = 0) so the UI can show
 * "new" instead of a meaningless +∞%.
 */
export function calculateChangePct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/**
 * Reduce a raw Referer header to a readable source. Empty → null (direct).
 * Instagram's in-app browser and link shims collapse to "instagram.com".
 */
export function normalizeReferrer(referrer: string | null | undefined): string | null {
  const raw = referrer?.trim();
  if (!raw) return null;
  let host: string;
  try {
    host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
  } catch {
    return null;
  }
  host = host.toLowerCase().replace(/^www\./, "").replace(/^(l|lm|m)\./, "");
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram.com";
  if (host === "facebook.com" || host.endsWith(".facebook.com")) return "facebook.com";
  return host || null;
}

export interface RankRow {
  label: string;
  count: number;
}

/** Merge rows with the same label, sort desc (ties by label), keep top `limit`. */
export function rankRows(rows: RankRow[], limit = 6): RankRow[] {
  const merged = new Map<string, number>();
  for (const row of rows) merged.set(row.label, (merged.get(row.label) ?? 0) + row.count);
  return [...merged.entries()]
    .map(([label, count]) => ({ label, count }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/** "YYYY-MM-DD" for a Date in the process' local time zone. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM" for a Date in the process' local time zone. */
export function localMonthKey(date: Date): string {
  return localDayKey(date).slice(0, 7);
}
