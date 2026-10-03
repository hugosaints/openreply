/**
 * Campaign list/detail helpers — pure functions over data the API already
 * returns (`GET /api/automations`). No React, no DOM.
 */

export interface CampaignAnalytics {
  sent: number;
  skipped: number;
  failed: number;
  clicks: number;
  ctr: number;
  topKeywords: { keyword: string; count: number }[];
}

export interface CampaignSummaryInput {
  id: string;
  name: string;
  isActive: boolean;
  keywords: string[];
  dmMessage: string;
  createdAt?: string;
  analytics?: CampaignAnalytics;
}

export type CampaignStatusFilter = "all" | "active" | "paused";
export type CampaignSort = "recent" | "sent" | "clicks" | "name";

export interface CampaignTotals {
  total: number;
  active: number;
  paused: number;
  sent: number;
  skipped: number;
  failed: number;
  clicks: number;
  /** Click-through rate across every campaign, as a percentage with 1 decimal. */
  ctr: number;
}

export function aggregateCampaigns(list: readonly CampaignSummaryInput[]): CampaignTotals {
  const totals: CampaignTotals = {
    total: list.length,
    active: 0,
    paused: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    clicks: 0,
    ctr: 0,
  };
  for (const c of list) {
    if (c.isActive) totals.active++;
    else totals.paused++;
    totals.sent += c.analytics?.sent ?? 0;
    totals.skipped += c.analytics?.skipped ?? 0;
    totals.failed += c.analytics?.failed ?? 0;
    totals.clicks += c.analytics?.clicks ?? 0;
  }
  totals.ctr = totals.sent > 0 ? Math.round((totals.clicks / totals.sent) * 1000) / 10 : 0;
  return totals;
}

export function statusCounts(list: readonly CampaignSummaryInput[]): Record<CampaignStatusFilter, number> {
  const active = list.filter((c) => c.isActive).length;
  return { all: list.length, active, paused: list.length - active };
}

export function filterCampaigns<T extends CampaignSummaryInput>(
  list: readonly T[],
  options: { query: string; status: CampaignStatusFilter }
): T[] {
  const query = options.query.trim().toLowerCase();
  return list.filter((c) => {
    if (options.status === "active" && !c.isActive) return false;
    if (options.status === "paused" && c.isActive) return false;
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      c.keywords.some((k) => k.toLowerCase().includes(query)) ||
      c.dmMessage.toLowerCase().includes(query)
    );
  });
}

export function sortCampaigns<T extends CampaignSummaryInput>(
  list: readonly T[],
  sort: CampaignSort
): T[] {
  const copy = [...list];
  const created = (c: T) => (c.createdAt ? Date.parse(c.createdAt) || 0 : 0);
  switch (sort) {
    case "sent":
      return copy.sort((a, b) => (b.analytics?.sent ?? 0) - (a.analytics?.sent ?? 0));
    case "clicks":
      return copy.sort((a, b) => (b.analytics?.clicks ?? 0) - (a.analytics?.clicks ?? 0));
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return copy.sort((a, b) => created(b) - created(a));
  }
}

/** Format a ratio/percentage the same way everywhere (e.g. `12.5%`). */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 10) / 10}%`;
}

/** Compact number formatting (1.2k, 3.4M) for KPI tiles. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (abs >= 10_000) return `${Math.round(value / 1000)}k`;
  if (abs >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(Math.round(value));
}
