"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { IconCheck, IconCopy } from "@/components/campaigns/icons";
import { DEFAULT_FOLLOW_BUTTON, DEFAULT_LINK_LABEL, type LoadedCampaign } from "@/lib/campaigns/wizard";

/* ------------------------------- ranking ------------------------------- */

export interface RankItem {
  label: string;
  count: number;
}

/** Horizontal bar list used for keyword / link rankings. */
export function RankList({
  title,
  subtitle,
  items,
  empty,
}: {
  title: string;
  subtitle?: string;
  items: RankItem[];
  empty: string;
}) {
  const { locale } = useI18n();
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <section className="panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-[15px] font-semibold text-foreground">{title}</h2>
        {subtitle && <span className="shrink-0 text-xs text-subtle">{subtitle}</span>}
      </div>
      {items.length === 0 ? (
        <p className="flex min-h-[140px] items-center justify-center text-center text-sm text-muted">
          {empty}
        </p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {items.map((item, index) => (
            <li key={`${index}-${item.label}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-foreground" title={item.label}>
                  {item.label}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {item.count.toLocaleString(locale)}
                </span>
              </div>
              <div
                role="presentation"
                className="mt-1.5 h-1 rounded-full bg-accent/60 transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max((item.count / max) * 100, 3)}%` }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ----------------------------- tracked links ----------------------------- */

export interface TrackedLinkRow {
  id: string;
  label: string | null;
  destinationUrl: string;
  trackedUrl: string;
  clicks: number;
}

export function TrackedLinks({ links }: { links: TrackedLinkRow[] }) {
  const { t, locale } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copy(link: TrackedLinkRow) {
    try {
      await navigator.clipboard.writeText(link.trackedUrl);
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId((cur) => (cur === link.id ? null : cur)), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <section className="panel p-5">
      <h2 className="font-heading text-[15px] font-semibold text-foreground">{t("The exact link sent")}</h2>
      {links.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t("This campaign has no tracked link.")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {links.map((link) => (
            <li key={link.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="select-all truncate font-mono text-xs text-foreground">{link.trackedUrl}</p>
                <p className="mt-1 truncate text-xs text-subtle">
                  {link.label ? `${link.label} · ` : ""}
                  {t("redirects to")} {link.destinationUrl}
                </p>
              </div>
              <span className="text-xs tabular-nums text-muted">
                {t("{count} clicks", { count: link.clicks.toLocaleString(locale) })}
              </span>
              <button
                type="button"
                onClick={() => void copy(link)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                {copiedId === link.id ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
                {copiedId === link.id ? t("Copied!") : t("Copy link")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------ flow summary ------------------------------ */

function FlowStep({
  index,
  title,
  children,
  last,
}: {
  index: number;
  title: string;
  children?: ReactNode;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && <span aria-hidden="true" className="absolute left-[0.8125rem] top-8 h-[calc(100%-2rem)] w-px bg-border" />}
      <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
        {index}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {children && <div className="mt-2 space-y-2">{children}</div>}
      </div>
    </li>
  );
}

function Quote({ children }: { children: ReactNode }) {
  return (
    <div className="whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-hover/60 px-3 py-2 text-sm text-foreground">
      {children}
    </div>
  );
}

function ButtonChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
      {children}
    </span>
  );
}

/** Step-by-step description of what a campaign does, from its saved config. */
export function FlowSummary({ campaign }: { campaign: LoadedCampaign }) {
  const { t } = useI18n();
  const replies = campaign.publicReplyEnabled
    ? campaign.publicReplyMessages?.length
      ? campaign.publicReplyMessages
      : campaign.publicReplyMessage
        ? [campaign.publicReplyMessage]
        : []
    : [];
  const links = (campaign.trackedLinks ?? []).filter((link) => link.destinationUrl);

  const scope = campaign.matchAnyPost
    ? t("any post or reel")
    : campaign.pendingNextReel
      ? t("your next post or reel")
      : t("the selected post or reel");

  const steps: { key: string; title: string; body?: ReactNode }[] = [
    {
      key: "comment",
      title: t("Someone comments on {scope}", { scope }),
      body: campaign.matchAnyWord ? (
        <p className="text-sm text-muted">{t("Any comment starts the flow.")}</p>
      ) : (
        <p className="flex flex-wrap gap-1.5">
          {campaign.keywords.map((word) => (
            <ButtonChip key={word}>{word}</ButtonChip>
          ))}
        </p>
      ),
    },
  ];

  if (replies.length > 0) {
    steps.push({
      key: "reply",
      title: t("A public reply is posted"),
      body: (
        <>
          {replies.map((reply, i) => (
            <Quote key={i}>{reply}</Quote>
          ))}
        </>
      ),
    });
  }
  if (campaign.openingDmEnabled) {
    steps.push({
      key: "opening",
      title: t("They receive an opening DM"),
      body: (
        <>
          <Quote>{campaign.openingDmMessage}</Quote>
          <ButtonChip>{campaign.openingDmButtonLabel}</ButtonChip>
        </>
      ),
    });
  }
  if (campaign.requireFollow) {
    steps.push({
      key: "follow",
      title: t("They must follow first"),
      body: (
        <>
          {campaign.followPromptMessage ? <Quote>{campaign.followPromptMessage}</Quote> : null}
          <ButtonChip>{campaign.followPromptButtonLabel || t(DEFAULT_FOLLOW_BUTTON)}</ButtonChip>
        </>
      ),
    });
  }
  steps.push({
    key: "dm",
    title: t("They receive the DM"),
    body: (
      <>
        <Quote>{campaign.dmMessage}</Quote>
        {links.length > 0 && (
          <p className="flex flex-wrap gap-1.5">
            <ButtonChip>{campaign.linkButtonLabel || t(DEFAULT_LINK_LABEL)}</ButtonChip>
            {links[1] && <ButtonChip>{links[1].label || t(DEFAULT_LINK_LABEL)}</ButtonChip>}
          </p>
        )}
      </>
    ),
  });
  if (campaign.followUpEnabled && campaign.followUpMessage) {
    steps.push({
      key: "followup",
      title:
        campaign.followUpDelayMinutes && campaign.followUpDelayMinutes > 0
          ? t("A follow-up arrives {minutes} min after the link", { minutes: campaign.followUpDelayMinutes })
          : t("A follow-up arrives right after the link"),
      body: <Quote>{campaign.followUpMessage}</Quote>,
    });
  }

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="font-heading text-[15px] font-semibold text-foreground">{t("How this campaign works")}</h2>
      <ol className="mt-5">
        {steps.map((step, index) => (
          <FlowStep key={step.key} index={index + 1} title={step.title} last={index === steps.length - 1}>
            {step.body}
          </FlowStep>
        ))}
      </ol>
    </section>
  );
}
