"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { useDismiss } from "@/components/shell/use-dismiss";
import StatusPill, { Pill } from "@/components/campaigns/status-pill";
import { Toggle } from "@/components/campaigns/fields";
import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconCopy,
  IconCursorClick,
  IconDots,
  IconEdit,
  IconGrid,
  IconInstagram,
  IconLink,
  IconMessage,
  IconPlay,
  IconSend,
  IconTrash,
  IconTrendingUp,
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

const MAX_CHIPS = 5;

function renderHighlightedDm(message: string) {
  if (!message.includes("{link}")) {
    return `“${message}”`;
  }
  const parts = message.split("{link}");
  return (
    <>
      “{parts[0]}
      <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-accent not-italic border border-accent/25">
        <IconLink className="h-3 w-3" />
        {`{link}`}
      </span>
      {parts.slice(1).join("{link}")}”
    </>
  );
}

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

  const thumbnailNode = thumbUrl ? (
    <img
      src={thumbUrl}
      alt=""
      className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  ) : (
    <span className="grid h-full w-full place-items-center bg-surface-hover text-subtle">
      {campaign.pendingNextReel ? (
        <IconClock className="h-6 w-6 text-warning" />
      ) : (
        <IconInstagram className="h-6 w-6 text-muted" />
      )}
    </span>
  );

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-xs transition-all duration-200 hover:border-accent/40 hover:shadow-md p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Media Thumbnail */}
        <div className="relative z-10 shrink-0">
          {videoUrl && thumbUrl ? (
            <button
              type="button"
              onClick={() => onPlay(videoUrl, campaign.postUrl)}
              aria-label={t("Play reel preview")}
              className="group/thumb relative block h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-xl border border-border/80 bg-surface-hover shadow-xs transition hover:border-accent"
            >
              {thumbnailNode}
              <div className="absolute inset-0 grid place-items-center bg-black/25 transition group-hover/thumb:bg-black/40">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-foreground shadow-sm transition-transform group-hover/thumb:scale-110">
                  <IconPlay className="h-3.5 w-3.5 fill-current ml-0.5" />
                </span>
              </div>
            </button>
          ) : (
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-xl border border-border/80 bg-surface-hover shadow-xs">
              {thumbnailNode}
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="min-w-0 flex-1 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h3 className="min-w-0 truncate font-heading text-base font-semibold text-foreground tracking-tight hover:text-accent transition-colors">
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="hover:underline decoration-accent/40 underline-offset-2"
                >
                  {campaign.name}
                </Link>
              </h3>

              <div className="relative z-10 flex flex-wrap items-center gap-1.5">
                <StatusPill active={campaign.isActive} />
                {campaign.pendingNextReel && (
                  <Pill tone="warning" dot>
                    {t("Waiting for next reel")}
                  </Pill>
                )}
                {campaign.requireFollow && (
                  <Pill tone="accent">
                    {t("Follow gate")}
                  </Pill>
                )}
                {campaign.trackedLinks.length >= 2 && (
                  <Pill tone="neutral">
                    {campaign.trackedLinks.length} {t("links")}
                  </Pill>
                )}
              </div>
            </div>

            {/* Quick Actions & Controls */}
            <div className={`relative z-10 ml-auto flex items-center gap-2 ${menuOpen ? "z-30" : ""}`}>
              <Toggle
                on={campaign.isActive}
                onChange={() => onToggle(campaign)}
                label={campaign.isActive ? t("Active") : t("Paused")}
              />

              <Link
                href={`/campaigns/${campaign.id}/edit`}
                aria-label={t("Edit campaign")}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover hover:border-border-hover"
              >
                <IconEdit className="h-3.5 w-3.5 text-muted" />
                <span>{t("Edit")}</span>
              </Link>

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
                    className="popover animate-pop-in absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden p-1 shadow-lg"
                  >
                    <Link
                      role="menuitem"
                      href={`/campaigns/${campaign.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover"
                    >
                      <IconGrid className="h-4 w-4 text-muted" />
                      {t("View details")}
                    </Link>
                    <Link
                      role="menuitem"
                      href={`/campaigns/${campaign.id}/edit`}
                      className="flex sm:hidden items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover"
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

          {/* Account and Target Scope */}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-subtle truncate">
            <span className="font-medium text-foreground/80">@{campaign.instagramAccount.username}</span>
            <span>·</span>
            <span>{scopeLabel}</span>
          </p>

          {/* Trigger Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-subtle">{t("Trigger")}:</span>
            {campaign.matchAnyWord ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                <IconMessage className="h-3 w-3" />
                {t("Any word")}
              </span>
            ) : (
              <>
                {words.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-0.5 rounded-md bg-accent-soft/80 px-2 py-0.5 text-xs font-mono font-medium text-accent border border-accent/20"
                  >
                    <span className="text-[10px] text-accent/60">#</span>
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

          {/* DM Message Preview Bubble */}
          <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-border/70 bg-surface-hover/40 px-3.5 py-2 text-xs text-foreground/90">
            <div className="mt-0.5 shrink-0 text-accent">
              <IconMessage className="h-3.5 w-3.5" />
            </div>
            <p className="line-clamp-2 leading-relaxed">
              <span className="font-semibold text-subtle mr-1.5">{t("Direct message")}:</span>
              <span className="italic text-foreground/80">{renderHighlightedDm(campaign.dmMessage)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Modern Metrics Footer */}
      <div className="mt-4 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 border-t border-border/70 bg-surface-hover/30 px-4 py-3 sm:px-5 sm:py-3 rounded-b-2xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {/* Sends */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <IconSend className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-subtle truncate">{t("Sends")}</p>
              <p className="font-heading text-sm font-semibold tabular-nums text-foreground">
                {formatCompact(analytics.sent)}
              </p>
            </div>
          </div>

          {/* Clicks */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <IconCursorClick className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-subtle truncate">{t("Clicks")}</p>
              <p className="font-heading text-sm font-semibold tabular-nums text-foreground">
                {formatCompact(analytics.clicks)}
              </p>
            </div>
          </div>

          {/* CTR */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IconTrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-subtle truncate">{t("CTR")}</p>
              <p className="font-heading text-sm font-semibold tabular-nums text-foreground">
                {formatPercent(analytics.ctr)}
              </p>
            </div>
          </div>

          {/* Failed / Delivery Status */}
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                analytics.failed > 0
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-surface-hover text-subtle"
              }`}
            >
              {analytics.failed > 0 ? (
                <IconAlertCircle className="h-4 w-4" />
              ) : (
                <IconCheck className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-subtle truncate">{t("Failed")}</p>
              <p
                className={`font-heading text-sm font-semibold tabular-nums ${
                  analytics.failed > 0 ? "text-error" : "text-foreground"
                }`}
              >
                {formatCompact(analytics.failed)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
