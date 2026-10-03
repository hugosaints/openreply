"use client";

/**
 * Campaigns list — KPI strip, search/filter/sort toolbar, modern campaign cards,
 * and server-driven backend pagination.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import AccountSelect from "@/components/account-select";
import KpiStrip, { type KpiItem } from "@/components/dashboard/kpi-strip";
import Segmented from "@/components/ui/segmented";
import CampaignCard, { type CampaignListItem } from "@/components/campaigns/campaign-card";
import ConfirmDialog from "@/components/campaigns/confirm-dialog";
import ReelLightbox, { type PlayingReel } from "@/components/campaigns/reel-lightbox";
import { inputClass } from "@/components/campaigns/fields";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconSearch,
  IconSparkle,
  IconUpload,
} from "@/components/campaigns/icons";
import { useCampaignAccounts } from "@/components/campaigns/use-campaign-data";
import { readCache, writeCache } from "@/lib/client-cache";
import {
  aggregateCampaigns,
  formatCompact,
  formatPercent,
  statusCounts,
  type CampaignSort,
  type CampaignStatusFilter,
  type CampaignTotals,
} from "@/lib/campaigns/summary";
import { CAMPAIGN_TEMPLATES } from "@/lib/templates/campaign-templates";

const LIST_TEMPLATES = CAMPAIGN_TEMPLATES.slice(0, 6);

interface BackendPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }
  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function CampaignsPage() {
  const { t } = useI18n();
  const { accounts } = useCampaignAccounts();
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Pagination state (backend driven)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<BackendPagination | null>(null);
  const [serverTotals, setServerTotals] = useState<CampaignTotals | null>(null);
  const [serverCounts, setServerCounts] = useState<Record<CampaignStatusFilter, number> | null>(null);

  // Filter & search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<CampaignStatusFilter>("all");
  const [sort, setSort] = useState<CampaignSort>("recent");

  // Media
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState<PlayingReel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Fetch paginated campaigns from backend
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setIsFetching(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (selectedAccountId !== "all") params.set("instagramAccountId", selectedAccountId);
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        if (status !== "all") params.set("status", status);
        if (sort !== "recent") params.set("sort", sort);

        const res = await fetch(`/api/automations?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setCampaigns(data.data);
          if (data.pagination) setPagination(data.pagination);
          if (data.summary) setServerTotals(data.summary);
          if (data.counts) setServerCounts(data.counts);
          setLoadError(false);
        } else {
          setLoadError(true);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsFetching(false);
        }
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, limit, selectedAccountId, debouncedSearch, status, sort, reloadKey]);

  // Fresh post thumbnails + reel video URLs for the accounts in view
  useEffect(() => {
    if (campaigns.length === 0) return;
    let cancelled = false;
    const accountIds = Array.from(new Set(campaigns.map((c) => c.instagramAccountId))).sort();
    const cacheKey = `ig-media:${accountIds.join(",")}`;

    const cached = readCache<{ thumbs: Record<string, string>; videos: Record<string, string> }>(
      cacheKey,
      15 * 60 * 1000
    );
    /* eslint-disable react-hooks/set-state-in-effect */
    if (cached.data) {
      setThumbnails(cached.data.thumbs);
      setVideos(cached.data.videos);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    Promise.all(
      accountIds.map((accountId) =>
        fetch(`/api/instagram/posts?instagramAccountId=${accountId}&limit=50`)
          .then((res) => res.json())
          .then((payload) =>
            payload.success
              ? (payload.data as {
                  id: string;
                  media_type?: string;
                  media_url?: string;
                  thumbnail_url?: string;
                }[])
              : []
          )
          .catch(() => [])
      )
    ).then((lists) => {
      if (cancelled) return;
      const thumbs: Record<string, string> = {};
      const vids: Record<string, string> = {};
      for (const list of lists) {
        for (const media of list) {
          const url = media.thumbnail_url ?? media.media_url;
          if (url) thumbs[media.id] = url;
          if (media.media_type === "VIDEO" && media.media_url) vids[media.id] = media.media_url;
        }
      }
      setThumbnails(thumbs);
      setVideos(vids);
      writeCache(cacheKey, { thumbs, videos: vids });
    });

    return () => {
      cancelled = true;
    };
  }, [campaigns]);

  function handleAccountChange(accountId: string) {
    setSelectedAccountId(accountId);
    setPage(1);
  }

  function handleStatusChange(nextStatus: CampaignStatusFilter) {
    setStatus(nextStatus);
    setPage(1);
  }

  function handleSortChange(nextSort: CampaignSort) {
    setSort(nextSort);
    setPage(1);
  }

  async function toggleActive(campaign: CampaignListItem) {
    const next = !campaign.isActive;
    setActionError(null);
    setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, isActive: next } : c)));
    const rollback = () =>
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, isActive: campaign.isActive } : c))
      );
    try {
      const res = await fetch(`/api/automations?id=${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReloadKey((n) => n + 1);
    } catch {
      rollback();
      setActionError(t("Could not update the campaign. Try again."));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/automations?id=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReloadKey((n) => n + 1);
    } catch {
      setActionError(t("Could not delete the campaign. Try again."));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function duplicate(campaign: CampaignListItem) {
    setActionError(null);
    try {
      const res = await fetch(`/api/automations/duplicate?id=${campaign.id}`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReloadKey((n) => n + 1);
    } catch {
      setActionError(t("Could not duplicate the campaign. Try again."));
    }
  }

  const closePlayer = useCallback(() => setPlaying(null), []);
  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  const localTotals = useMemo(() => aggregateCampaigns(campaigns), [campaigns]);
  const localCounts = useMemo(() => statusCounts(campaigns), [campaigns]);

  const totalCampaigns = serverTotals?.total ?? localTotals.total;
  const activeCount = serverTotals?.active ?? localTotals.active;
  const pausedCount = serverTotals?.paused ?? localTotals.paused;
  const sentCount = serverTotals?.sent ?? localTotals.sent;
  const clickCount = serverTotals?.clicks ?? localTotals.clicks;
  const ctrValue = serverTotals?.ctr ?? localTotals.ctr;

  const countAll = serverCounts?.all ?? localCounts.all;
  const countActive = serverCounts?.active ?? localCounts.active;
  const countPaused = serverCounts?.paused ?? localCounts.paused;

  const kpis: KpiItem[] = [
    {
      id: "active",
      label: t("Active campaigns"),
      value: `${activeCount}/${totalCampaigns}`,
      caption: pausedCount > 0 ? t("{count} paused", { count: pausedCount }) : undefined,
    },
    { id: "sends", label: t("Sends"), value: formatCompact(sentCount) },
    { id: "clicks", label: t("Clicks"), value: formatCompact(clickCount) },
    { id: "ctr", label: t("Average CTR"), value: formatPercent(ctrValue) },
  ];

  const templateTitle = (slug: string, fallback: string) => {
    switch (slug) {
      case "dtc-product-link":
        return t("DTC Product Link Drop");
      case "real-estate-lead-form":
        return t("Real Estate Lead Form");
      case "fitness-plan":
        return t("Fitness Plan Download");
      case "course-webinar":
        return t("Course Webinar Invite");
      case "beauty-price-list":
        return t("Beauty Service Price List");
      case "restaurant-menu":
        return t("Restaurant Menu And Reservation");
      default:
        return fallback;
    }
  };

  const totalFiltered = pagination?.total ?? campaigns.length;
  const isFiltered = debouncedSearch.trim().length > 0 || status !== "all";

  const subtitle =
    totalCampaigns === 0
      ? t("Turn comments into conversations.")
      : isFiltered && totalFiltered !== totalCampaigns
        ? t("{count} of {total} campaigns", { count: totalFiltered, total: totalCampaigns })
        : t(totalCampaigns === 1 ? "{count} campaign" : "{count} campaigns", {
            count: totalCampaigns,
          });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {t("Campaigns")}
          </h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {accounts.length > 1 && (
            <AccountSelect
              accounts={accounts}
              value={selectedAccountId}
              onChange={handleAccountChange}
            />
          )}
          <Link
            href="/campaigns/import"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover sm:flex-none"
          >
            <IconUpload />
            {t("Import")}
          </Link>
          <Link
            href="/campaigns/new"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover sm:flex-none"
          >
            <IconPlus />
            {t("New Campaign")}
          </Link>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error-soft px-4 py-3 text-sm text-error">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <KpiStrip items={kpis} loading />
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel h-44 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : loadError && totalCampaigns === 0 ? (
        <div className="panel p-10 text-center rounded-2xl">
          <p className="text-sm text-muted">{t("Could not load your campaigns.")}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setReloadKey((n) => n + 1);
            }}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            {t("Try again")}
          </button>
        </div>
      ) : totalCampaigns === 0 && !isFiltered ? (
        <div className="space-y-6">
          <div className="panel px-6 py-12 text-center sm:py-14 rounded-2xl">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
              <IconSparkle className="h-6 w-6" />
            </span>
            <h2 className="mt-4 font-heading text-lg font-semibold text-foreground">
              {t("No campaigns yet")}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {t("Create your first comment-to-DM campaign to turn a post or reel into a measurable conversation flow.")}
            </p>
            <Link
              href="/campaigns/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              <IconPlus />
              {t("Create Campaign")}
            </Link>
          </div>

          <section aria-labelledby="start-from-template">
            <h2 id="start-from-template" className="font-heading text-base font-semibold text-foreground">
              {t("Start from a template")}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {t("Keywords and message are prefilled — just pick a post and add your link.")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LIST_TEMPLATES.map((template) => (
                <Link
                  key={template.slug}
                  href={`/campaigns/new?template=${template.slug}`}
                  className="panel group p-4 rounded-xl transition-colors hover:border-accent-muted hover:bg-accent-soft/40"
                >
                  <p className="font-medium text-foreground">
                    {templateTitle(template.slug, template.title)}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {template.keywords.slice(0, 3).map((word) => (
                      <span
                        key={word}
                        className="rounded-md bg-surface-hover px-2 py-0.5 text-xs font-medium text-muted group-hover:bg-surface"
                      >
                        {word}
                      </span>
                    ))}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <>
          <KpiStrip items={kpis} />

          {/* Toolbar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-subtle">
                <IconSearch />
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search campaigns by name, keyword, or message…")}
                aria-label={t("Search campaigns by name, keyword, or message…")}
                className={`${inputClass()} pl-9`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Segmented<CampaignStatusFilter>
                ariaLabel={t("Filter by status")}
                value={status}
                onChange={handleStatusChange}
                options={[
                  { value: "all", label: `${t("All")} · ${countAll}` },
                  { value: "active", label: `${t("Active")} · ${countActive}` },
                  { value: "paused", label: `${t("Paused")} · ${countPaused}` },
                ]}
              />
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value as CampaignSort)}
                aria-label={t("Sort campaigns")}
                className={`${inputClass()} w-auto`}
              >
                <option value="recent">{t("Most recent")}</option>
                <option value="sent">{t("Most sends")}</option>
                <option value="clicks">{t("Most clicks")}</option>
                <option value="name">{t("Name (A–Z)")}</option>
              </select>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="panel p-10 text-center text-sm text-muted rounded-2xl">
              {t("No campaigns match your search.")}
            </div>
          ) : (
            <div className={`space-y-4 transition-opacity duration-150 ${isFetching ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  thumbUrl={campaign.postId ? thumbnails[campaign.postId] : undefined}
                  videoUrl={campaign.postId ? videos[campaign.postId] : undefined}
                  onPlay={(url, postUrl) => setPlaying({ url, postUrl })}
                  onToggle={(c) => void toggleActive(c)}
                  onDuplicate={(c) => void duplicate(c)}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}

          {/* Server-driven Pagination */}
          {pagination && pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 pb-2 border-t border-border/80">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-xs text-muted">
                  {t("Showing {start}–{end} of {total}", {
                    start: (pagination.page - 1) * pagination.limit + 1,
                    end: Math.min(pagination.page * pagination.limit, pagination.total),
                    total: pagination.total,
                  })}
                </p>
                <span className="text-subtle text-xs">·</span>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    aria-label={t("Items per page")}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-border-hover focus:border-accent focus:outline-none"
                  >
                    <option value={5}>5 {t("per page")}</option>
                    <option value={10}>10 {t("per page")}</option>
                    <option value={20}>20 {t("per page")}</option>
                    <option value={50}>50 {t("per page")}</option>
                  </select>
                </div>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover hover:border-border-hover disabled:opacity-30 disabled:pointer-events-none"
                    aria-label={t("Previous")}
                  >
                    <IconChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("Previous")}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers(page, pagination.totalPages).map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-xs text-subtle">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                            p === page
                              ? "bg-accent text-white shadow-xs font-semibold"
                              : "text-muted hover:bg-surface-hover hover:text-foreground"
                          }`}
                          aria-current={p === page ? "page" : undefined}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover hover:border-border-hover disabled:opacity-30 disabled:pointer-events-none"
                    aria-label={t("Next")}
                  >
                    <span className="hidden sm:inline">{t("Next")}</span>
                    <IconChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <ReelLightbox reel={playing} onClose={closePlayer} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("Delete this campaign?")}
        description={t("“{name}” and its tracked links will be removed. This cannot be undone.", {
          name: deleteTarget?.name ?? "",
        })}
        confirmLabel={t("Delete")}
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={closeDelete}
      />
    </div>
  );
}
