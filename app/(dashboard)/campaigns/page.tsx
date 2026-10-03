"use client";

/**
 * Campaigns list — KPI strip, search/filter/sort toolbar and one card per
 * campaign. Data comes from the existing `GET /api/automations`.
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
import { IconPlus, IconSearch, IconSparkle, IconUpload } from "@/components/campaigns/icons";
import { useCampaignAccounts } from "@/components/campaigns/use-campaign-data";
import { readCache, writeCache } from "@/lib/client-cache";
import {
  aggregateCampaigns,
  filterCampaigns,
  formatCompact,
  formatPercent,
  sortCampaigns,
  statusCounts,
  type CampaignSort,
  type CampaignStatusFilter,
} from "@/lib/campaigns/summary";
import { CAMPAIGN_TEMPLATES } from "@/lib/templates/campaign-templates";

const LIST_TEMPLATES = CAMPAIGN_TEMPLATES.slice(0, 6);

export default function CampaignsPage() {
  const { t } = useI18n();
  const { accounts } = useCampaignAccounts();
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // postId → current thumbnail / reel video URL, fetched live (Instagram URLs
  // expire, so they are never stored on the campaign).
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState<PlayingReel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CampaignStatusFilter>("all");
  const [sort, setSort] = useState<CampaignSort>("recent");

  // Fetch the list. The timer defers the first state update out of the effect
  // body (and gives a rapid account switch a chance to supersede the request).
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (selectedAccountId !== "all") params.set("instagramAccountId", selectedAccountId);
        const res = await fetch(`/api/automations${params.size ? `?${params}` : ""}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setCampaigns(data.data);
          setLoadError(false);
        } else {
          setLoadError(true);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedAccountId, reloadKey]);

  // Fresh post thumbnails + reel video URLs for the accounts in view.
  // Cache-first so they show instantly on a return visit.
  useEffect(() => {
    if (campaigns.length === 0) return;
    let cancelled = false;
    const accountIds = Array.from(new Set(campaigns.map((c) => c.instagramAccountId))).sort();
    const cacheKey = `ig-media:${accountIds.join(",")}`;

    const cached = readCache<{ thumbs: Record<string, string>; videos: Record<string, string> }>(
      cacheKey,
      15 * 60 * 1000
    );
    // Hydrating state from cache is a legitimate effect use here.
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
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  // Optimistic: flip immediately, roll back if the request fails.
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
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    } catch {
      setActionError(t("Could not delete the campaign. Try again."));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // The copy is made server-side from the stored campaign, so settings this
  // list never loads (the DM trigger, the follow-up, the link button label)
  // still come along.
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

  const totals = useMemo(() => aggregateCampaigns(campaigns), [campaigns]);
  const counts = useMemo(() => statusCounts(campaigns), [campaigns]);
  const visible = useMemo(
    () => sortCampaigns(filterCampaigns(campaigns, { query: search, status }), sort),
    [campaigns, search, status, sort]
  );

  const kpis: KpiItem[] = [
    {
      id: "active",
      label: t("Active campaigns"),
      value: `${totals.active}/${totals.total}`,
      caption: totals.paused > 0 ? t("{count} paused", { count: totals.paused }) : undefined,
    },
    { id: "sends", label: t("Sends"), value: formatCompact(totals.sent) },
    { id: "clicks", label: t("Clicks"), value: formatCompact(totals.clicks) },
    { id: "ctr", label: t("Average CTR"), value: formatPercent(totals.ctr) },
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

  const subtitle =
    campaigns.length === 0
      ? t("Turn comments into conversations.")
      : visible.length !== campaigns.length
        ? t("{count} of {total} campaigns", { count: visible.length, total: campaigns.length })
        : t(campaigns.length === 1 ? "{count} campaign" : "{count} campaigns", {
            count: campaigns.length,
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
            <div key={i} className="panel h-44 animate-pulse" />
          ))}
        </div>
      ) : loadError && campaigns.length === 0 ? (
        <div className="panel p-10 text-center">
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
      ) : campaigns.length === 0 ? (
        <div className="space-y-6">
          <div className="panel px-6 py-12 text-center sm:py-14">
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
                  className="panel group p-4 transition-colors hover:border-accent-muted hover:bg-accent-soft/40"
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
                onChange={setStatus}
                options={[
                  { value: "all", label: `${t("All")} · ${counts.all}` },
                  { value: "active", label: `${t("Active")} · ${counts.active}` },
                  { value: "paused", label: `${t("Paused")} · ${counts.paused}` },
                ]}
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as CampaignSort)}
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

          {visible.length === 0 ? (
            <div className="panel p-10 text-center text-sm text-muted">
              {t("No campaigns match your search.")}
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((campaign) => (
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
