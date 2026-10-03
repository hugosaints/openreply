"use client";

/**
 * Campaign detail — KPIs, rankings, the exact tracked links, a step-by-step
 * flow summary and the phone preview. Reads the existing `GET /api/automations`.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { translateServerMessage } from "@/lib/i18n/server-messages";
import KpiStrip, { type KpiItem } from "@/components/dashboard/kpi-strip";
import Segmented from "@/components/ui/segmented";
import CampaignPreview, { type PreviewTab } from "@/components/campaign-preview";
import StatusPill, { Pill } from "@/components/campaigns/status-pill";
import { FlowSummary, RankList, TrackedLinks, type TrackedLinkRow } from "@/components/campaigns/detail-parts";
import { saveCampaign } from "@/components/campaigns/save-campaign";
import { useAccountAvatar } from "@/components/campaigns/use-campaign-data";
import {
  IconArrowLeft,
  IconCopy,
  IconEdit,
  IconPause,
  IconPlay,
} from "@/components/campaigns/icons";
import { formatCompact, formatPercent, type CampaignAnalytics } from "@/lib/campaigns/summary";
import { DEFAULT_FOLLOW_BUTTON, DEFAULT_LINK_LABEL, type LoadedCampaign } from "@/lib/campaigns/wizard";

interface DetailCampaign extends LoadedCampaign {
  instagramAccount: { username: string };
  trackedLinks?: {
    id: string;
    label: string | null;
    destinationUrl: string;
    trackedUrl: string;
    _count: { clicks: number };
  }[];
  analytics: CampaignAnalytics;
}

type Tab = "overview" | "flow" | "preview";

export default function CampaignDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [campaign, setCampaign] = useState<DetailCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [postThumb, setPostThumb] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("dm");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/automations", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        const found = payload.success
          ? (payload.data as DetailCampaign[]).find((c) => c.id === id)
          : undefined;
        setCampaign(found ?? null);
      })
      .catch(() => {
        if (!cancelled) setCampaign(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const accountId = campaign?.instagramAccountId ?? "";
  const avatarUrl = useAccountAvatar(accountId);
  const postId = campaign?.postId ?? null;

  useEffect(() => {
    if (!accountId || !postId) return;
    let cancelled = false;
    fetch(`/api/instagram/posts?instagramAccountId=${accountId}&limit=50`)
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled || !payload.success) return;
        const hit = (
          payload.data as { id: string; thumbnail_url?: string; media_url?: string }[]
        ).find((post) => post.id === postId);
        setPostThumb(hit?.thumbnail_url ?? hit?.media_url ?? null);
      })
      .catch(() => {
        if (!cancelled) setPostThumb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, postId]);

  async function toggleActive() {
    if (!campaign) return;
    setBusy(true);
    setError(null);
    const next = !campaign.isActive;
    const result = await saveCampaign({
      mode: "edit",
      id: campaign.id,
      payload: { isActive: next },
      translate: (message) => translateServerMessage({ t }, message),
      fallbackMessage: t("Could not update the campaign. Try again."),
    });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setCampaign({ ...campaign, isActive: next });
  }

  async function duplicate() {
    if (!campaign) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/automations/duplicate?id=${campaign.id}`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      router.push("/campaigns");
      router.refresh();
    } catch {
      setBusy(false);
      setError(t("Could not duplicate the campaign. Try again."));
    }
  }

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-hover" />
        <KpiStrip
          items={[
            { id: "a", label: "", value: "" },
            { id: "b", label: "", value: "" },
            { id: "c", label: "", value: "" },
            { id: "d", label: "", value: "" },
          ]}
          loading
        />
        <div className="panel h-64 animate-pulse" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-sm text-muted">{t("Campaign not found.")}</p>
        <Link
          href="/campaigns"
          className="mt-4 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          {t("Back to campaigns")}
        </Link>
      </div>
    );
  }

  const { analytics } = campaign;
  const links = campaign.trackedLinks ?? [];
  const publicReplies = campaign.publicReplyMessages?.length
    ? campaign.publicReplyMessages
    : campaign.publicReplyMessage
      ? [campaign.publicReplyMessage]
      : [];
  const hasLink = links.some((link) => link.destinationUrl);
  const hasSecondLink = Boolean(links[1]?.destinationUrl);

  const scopeLabel = campaign.matchAnyPost
    ? t("Any post or reel")
    : campaign.pendingNextReel
      ? t("Next post or reel")
      : t("A specific post or reel");

  const kpis: KpiItem[] = [
    { id: "sends", label: t("Sends"), value: formatCompact(analytics.sent) },
    { id: "clicks", label: t("Clicks"), value: formatCompact(analytics.clicks) },
    { id: "ctr", label: t("CTR"), value: formatPercent(analytics.ctr) },
    { id: "skipped", label: t("Skipped"), value: formatCompact(analytics.skipped) },
    { id: "failed", label: t("Failed"), value: formatCompact(analytics.failed) },
  ];

  const trackedRows: TrackedLinkRow[] = links
    .filter((link) => link.destinationUrl)
    .map((link) => ({
      id: link.id,
      label: link.label,
      destinationUrl: link.destinationUrl,
      trackedUrl: link.trackedUrl ?? link.destinationUrl,
      clicks: link._count?.clicks ?? 0,
    }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            {t("Back to campaigns")}
          </Link>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="truncate font-heading text-2xl font-semibold tracking-tight text-foreground">
              {campaign.name}
            </h1>
            <StatusPill active={campaign.isActive} />
            {campaign.pendingNextReel && <Pill tone="warning">{t("Waiting for next reel")}</Pill>}
          </div>
          <p className="mt-1 text-sm text-muted">
            @{campaign.instagramAccount.username} · {scopeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void duplicate()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            <IconCopy />
            {t("Duplicate")}
          </button>
          <button
            type="button"
            onClick={() => void toggleActive()}
            disabled={busy}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              campaign.isActive
                ? "border-error/30 text-error hover:bg-error-soft"
                : "border-success/30 text-success hover:bg-success-soft"
            }`}
          >
            {campaign.isActive ? <IconPause className="h-3.5 w-3.5" /> : <IconPlay className="h-3.5 w-3.5" />}
            {campaign.isActive ? t("Stop") : t("Resume")}
          </button>
          <Link
            href={`/campaigns/${campaign.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <IconEdit />
            {t("Edit")}
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error-soft px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <KpiStrip items={kpis} columnsClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />

      <Segmented<Tab>
        id="campaign-tabs"
        ariaLabel={t("Campaign sections")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: t("Overview") },
          { value: "flow", label: t("Flow") },
          { value: "preview", label: t("Preview") },
        ]}
      />

      <div role="tabpanel" aria-labelledby={`campaign-tabs-${tab}`}>
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <RankList
                title={t("Top keywords")}
                items={analytics.topKeywords.map((k) => ({ label: k.keyword, count: k.count }))}
                empty={t("No keyword matches yet.")}
              />
              <RankList
                title={t("Clicks per link")}
                items={trackedRows.map((row) => ({
                  label: row.label || row.destinationUrl,
                  count: row.clicks,
                }))}
                empty={t("This campaign has no tracked link.")}
              />
            </div>
            <TrackedLinks links={trackedRows} />
          </div>
        )}

        {tab === "flow" && <FlowSummary campaign={campaign} />}

        {tab === "preview" && (
          <div className="flex justify-center">
            <CampaignPreview
              tab={previewTab}
              onTabChange={setPreviewTab}
              username={campaign.instagramAccount.username}
              avatarUrl={avatarUrl}
              postThumb={postThumb}
              caption=""
              sampleComment={campaign.matchAnyWord ? t("nice!") : (campaign.keywords[0] ?? "LINK")}
              dmTriggerEnabled={campaign.dmTriggerEnabled}
              publicReplyEnabled={campaign.publicReplyEnabled}
              publicReplyMessage={publicReplies[0] ?? ""}
              openingDmEnabled={campaign.openingDmEnabled}
              openingDmMessage={campaign.openingDmMessage ?? ""}
              openingDmButtonLabel={campaign.openingDmButtonLabel ?? ""}
              revealMessage={campaign.dmMessage}
              hasLink={hasLink}
              linkButtonLabel={campaign.linkButtonLabel ?? DEFAULT_LINK_LABEL}
              linkUrl={links[0]?.trackedUrl ?? links[0]?.destinationUrl}
              hasSecondLink={hasSecondLink}
              secondLinkButtonLabel={links[1]?.label ?? DEFAULT_LINK_LABEL}
              requireFollow={campaign.requireFollow}
              followPromptMessage={campaign.followPromptMessage ?? ""}
              followPromptButtonLabel={campaign.followPromptButtonLabel ?? DEFAULT_FOLLOW_BUTTON}
              followUpEnabled={campaign.followUpEnabled ?? false}
              followUpMessage={campaign.followUpMessage ?? ""}
              followUpDelayMinutes={campaign.followUpDelayMinutes ?? 0}
            />
          </div>
        )}
      </div>
    </div>
  );
}
