"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { IconCheck, IconEdit } from "@/components/campaigns/icons";
import {
  STEP_IDS,
  validateStep,
  type CampaignDraft,
  type StepId,
} from "@/lib/campaigns/wizard";

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          <IconEdit className="h-3.5 w-3.5" />
          {t("Edit")}
        </button>
      </header>
      <dl className="divide-y divide-border">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-subtle">{children}</span>;
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
      {children}
    </span>
  );
}

function Clamp({ text }: { text: string }) {
  return <p className="line-clamp-3 whitespace-pre-wrap">{text}</p>;
}

interface ReviewStepProps {
  draft: CampaignDraft;
  username: string;
  onGoToStep: (step: StepId) => void;
}

export default function ReviewStep({ draft, username, onGoToStep }: ReviewStepProps) {
  const { t } = useI18n();
  const problems = STEP_IDS.filter(
    (step) => step !== "review" && Object.keys(validateStep(draft, step)).length > 0
  );
  const stepName: Record<StepId, string> = {
    setup: t("Setup"),
    trigger: t("Trigger"),
    engagement: t("Engagement"),
    delivery: t("Delivery"),
    review: t("Review"),
  };

  const replies = draft.publicReplyEnabled
    ? draft.publicReplyMessages.map((m) => m.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-5">
      {problems.length === 0 ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success text-white">
            <IconCheck className="h-3.5 w-3.5" />
          </span>
          {t("Everything looks good. You can publish this campaign.")}
        </div>
      ) : (
        <div role="alert" className="rounded-xl border border-error/30 bg-error-soft px-4 py-3 text-sm text-error">
          <p className="font-medium">{t("Some steps need your attention before publishing:")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {problems.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => onGoToStep(step)}
                className="rounded-md border border-error/30 bg-surface px-2.5 py-1 text-xs font-medium text-error transition-colors hover:bg-error-soft"
              >
                {stepName[step]}
              </button>
            ))}
          </div>
        </div>
      )}

      <ReviewCard title={t("Setup")} onEdit={() => onGoToStep("setup")}>
        <Row label={t("Name")}>
          {draft.name.trim() || <Muted>{t("Campaign for @{username}", { username })}</Muted>}
        </Row>
        <Row label={t("Account")}>@{username}</Row>
        <Row label={t("Posts")}>
          {draft.triggerScope === "any" && t("Any post or reel")}
          {draft.triggerScope === "next" && t("Next post or reel")}
          {draft.triggerScope === "specific" &&
            (draft.postId ? (
              <span className="flex items-center gap-3">
                {draft.postThumb && (
                  <img
                    src={draft.postThumb}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-md border border-border object-cover"
                  />
                )}
                <span className="min-w-0 truncate">
                  {draft.postCaption || draft.postUrl || t("Selected post")}
                </span>
              </span>
            ) : (
              <Muted>{t("No post selected")}</Muted>
            ))}
        </Row>
      </ReviewCard>

      <ReviewCard title={t("Trigger")} onEdit={() => onGoToStep("trigger")}>
        <Row label={t("Comment contains")}>
          {draft.matchMode === "any" ? (
            t("Any word")
          ) : draft.keywords.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {draft.keywords.map((word) => (
                <Chip key={word}>{word}</Chip>
              ))}
            </span>
          ) : (
            <Muted>{t("No keywords")}</Muted>
          )}
        </Row>
        {draft.matchMode === "specific" && (
          <Row label={t("Whole words only")}>{draft.wholeWordMatch ? t("Yes") : t("No")}</Row>
        )}
        <Row label={t("Reply to DMs")}>{draft.dmTriggerEnabled ? t("Yes") : t("No")}</Row>
        <Row label={t("Public reply")}>
          {replies.length > 0 ? (
            <ul className="space-y-1">
              {replies.map((reply, i) => (
                <li key={i}>“{reply}”</li>
              ))}
            </ul>
          ) : (
            <Muted>{t("Off")}</Muted>
          )}
        </Row>
      </ReviewCard>

      <ReviewCard title={t("Engagement")} onEdit={() => onGoToStep("engagement")}>
        <Row label={t("Opening message")}>
          {draft.openingDmEnabled ? (
            <>
              <Clamp text={draft.openingDmMessage} />
              <p className="mt-1.5">
                <Chip>{draft.openingDmButtonLabel}</Chip>
              </p>
            </>
          ) : (
            <Muted>{t("Off")}</Muted>
          )}
        </Row>
        <Row label={t("Follow requirement")}>
          {draft.requireFollow ? t("Required before the link") : <Muted>{t("Off")}</Muted>}
        </Row>
      </ReviewCard>

      <ReviewCard title={t("Delivery")} onEdit={() => onGoToStep("delivery")}>
        <Row label={t("DM message")}>
          {draft.dmMessage.trim() ? <Clamp text={draft.dmMessage} /> : <Muted>{t("No message")}</Muted>}
        </Row>
        <Row label={t("Links")}>
          {draft.trackedDestinationUrl.trim() ? (
            <ul className="space-y-1">
              <li className="flex flex-wrap items-center gap-2">
                <Chip>{draft.linkButtonLabel}</Chip>
                <span className="min-w-0 truncate text-muted">{draft.trackedDestinationUrl}</span>
              </li>
              {draft.secondaryDestinationUrl.trim() && (
                <li className="flex flex-wrap items-center gap-2">
                  <Chip>{draft.secondaryButtonLabel}</Chip>
                  <span className="min-w-0 truncate text-muted">{draft.secondaryDestinationUrl}</span>
                </li>
              )}
            </ul>
          ) : (
            <Muted>{t("No link")}</Muted>
          )}
        </Row>
        <Row label={t("Follow-up")}>
          {draft.followUpEnabled ? (
            <>
              <Clamp text={draft.followUpMessage} />
              <p className="mt-1 text-xs text-subtle">
                {draft.followUpDelayMinutes > 0
                  ? t("Sent {minutes} min after they tap through.", { minutes: draft.followUpDelayMinutes })
                  : t("Sent right after they tap through.")}
              </p>
            </>
          ) : (
            <Muted>{t("Off")}</Muted>
          )}
        </Row>
      </ReviewCard>
    </div>
  );
}
