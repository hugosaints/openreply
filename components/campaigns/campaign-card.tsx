"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { useDismiss } from "@/components/shell/use-dismiss";
import StatusPill, { Pill } from "@/components/campaigns/status-pill";
import { Toggle } from "@/components/campaigns/fields";
import {
  IconClock,
  IconCopy,
  IconDots,
  IconEdit,
  IconGrid,
  IconPlay,
  IconTrash,
} from "@/components/campaigns/icons";
import { formatCompact, formatPercent, type CampaignSummaryInput } from "@/lib/campaigns/summary";

export interface CampaignListItem extends CampaignSummaryInput {
  postId: string | null;
  postUrl: string | null;
  pendingNextReel: boolean;
  matchAnyPost: boolean;
  matchAnyWord: boolean;
  requireFollow: boolean;
  instagramAccountId: string;
  instagramAccount: { username: string };
  trackedLinks: { id: string; trackedUrl: string; _count: { clicks: number } }[];
  analytics: NonNullable<CampaignSummaryInput["analytics"]>;
}

interface CampaignCardProps {
  campaign: CampaignListItem;
  thumbUrl?: string;
  videoUrl?: string;
  onPlay: (url: string, postUrl: string | null) => void;
  onToggle: (campaign: CampaignListItem) => void;
  onDuplicate: (campaign: CampaignListItem) => void;
  onDelete: (campaign: CampaignListItem) => void;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5 sm:px-4">
      <dt className="truncate text-xs text-subtle">{label}</dt>
      <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

const MAX_CHIPS = 5;

export default function CampaignCard({
  campaign,
  thumbUrl,
  videoUrl,
  onPlay,
  onToggle,
  onDuplicate,
  onDelete,
}: CampaignCardProps) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(menuRef, menuOpen, () => setMenuOpen(false));

  const { analytics } = campaign;
  const words = campaign.keywords.slice(0, MAX_CHIPS);
  const hiddenWords = campaign.keywords.length - words.length;
  const scopeLabel = campaign.matchAnyPost
    ? t("Any post or reel")
    : campaign.pendingNextReel
      ? t("Next post or reel")
      : t("A specific post or reel");

  async function copyPostUrl() {
    if (!campaign.postUrl) return;
    try {
      await navigator.clipboard.writeText(campaign.postUrl);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
        setMenuOpen(false);
      }, 1100);
    } catch {
      setMenuOpen(false);
    }
  }

  const thumbnail = thumbUrl ? (
    <img
      src={thumbUrl}
      alt=""
      className="h-14 w-14 rounded-lg border border-border object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  ) : (
    <span className="grid h-14 w-14 place-items-center rounded-lg border border-border bg-surface-hover text-subtle">
      {campaign.pendingNextReel ? <IconClock className="h-5 w-5" /> : <IconGrid className="h-5 w-5" />}
    </span>
  );

  return (
    <article className="panel relative p-4 transition-colors hover:border-border-hover sm:p-5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        {/* Thumbnail (plays the reel when available) */}
        <div className="relative z-10 shrink-0">
          {videoUrl && thumbUrl ? (
            <button
              type="button"
              onClick={() => onPlay(videoUrl, campaign.postUrl)}
              aria-label={t("Play reel preview")}
              className="group relative block rounded-lg"
            >
              {thumbnail}
              <span className="absolute inset-0 grid place-items-center rounded-lg bg-foreground/0 text-white opacity-0 transition group-hover:bg-foreground/40 group-hover:opacity-100">
                <IconPlay className="h-5 w-5" />
              </span>
            </button>
          ) : (
            thumbnail
          )}
        </div>

        <div className="min-w-[12rem] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 max-w-full truncate font-heading text-base font-semibold text-foreground">
              {/* Stretched link: the whole card opens the detail page while the
                  controls above it (z-10) stay independently clickable. */}
              <Link
                href={`/campaigns/${campaign.id}`}
                className="after:absolute after:inset-0 after:content-['']"
              >
                {campaign.name}
              </Link>
            </h3>
            <StatusPill active={campaign.isActive} />
            {campaign.pendingNextReel && <Pill tone="warning">{t("Waiting for next reel")}</Pill>}
            {campaign.requireFollow && <Pill tone="accent">{t("Follow gate")}</Pill>}
            {campaign.trackedLinks.length >= 2 && <Pill tone="accent">{t("2 links")}</Pill>}
          </div>

          <p className="mt-1 truncate text-xs text-subtle">
            @{campaign.instagramAccount.username} · {scopeLabel}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {campaign.matchAnyWord ? (
              <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                {t("Any word")}
              </span>
            ) : (
              <>
                {words.map((word) => (
                  <span
                    key={word}
                    className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent"
                  >
                    {word}
                  </span>
                ))}
                {hiddenWords > 0 && (
                  <span className="rounded-md bg-surface-hover px-2 py-0.5 text-xs font-medium text-muted">
                    +{hiddenWords}
                  </span>
                )}
              </>
            )}
          </div>

          <p className="mt-2.5 truncate text-sm text-muted">
            “{campaign.dmMessage}”
          </p>
        </div>

        {/* Controls */}
        <div className={`relative ml-auto flex items-center gap-2 ${menuOpen ? "z-30" : "z-10"}`}>
          <Toggle on={campaign.isActive} onChange={() => onToggle(campaign)} label={t("Active")} />
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={t("More actions")}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="icon-btn"
            >
              <IconDots />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="popover animate-pop-in absolute right-0 top-full z-20 mt-1.5 w-52 overflow-hidden p-1"
              >
                <Link
                  role="menuitem"
                  href={`/campaigns/${campaign.id}/edit`}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover"
                >
                  <IconEdit className="h-4 w-4 text-muted" />
                  {t("Edit")}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate(campaign);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-hover"
                >
                  <IconCopy className="h-4 w-4 text-muted" />
                  {t("Duplicate")}
                </button>
                {campaign.postUrl && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void copyPostUrl()}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-hover"
                  >
                    <IconCopy className="h-4 w-4 text-muted" />
                    {copied ? t("Copied!") : t("Copy post URL")}
                  </button>
                )}
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(campaign);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-error transition-colors hover:bg-error-soft"
                >
                  <IconTrash className="h-4 w-4" />
                  {t("Delete")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 divide-x divide-border overflow-hidden rounded-lg border border-border sm:grid-cols-4">
        <Metric label={t("Sends")} value={formatCompact(analytics.sent)} />
        <Metric label={t("Clicks")} value={formatCompact(analytics.clicks)} />
        <Metric label={t("CTR")} value={formatPercent(analytics.ctr)} />
        <Metric
          label={t("Failed")}
          value={formatCompact(analytics.failed)}
        />
      </dl>
    </article>
  );
}
