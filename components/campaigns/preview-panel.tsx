"use client";

import CampaignPreview, { type PreviewTab } from "@/components/campaign-preview";
import type { CampaignDraft, StepId } from "@/lib/campaigns/wizard";
import { DEFAULT_FOLLOW_BUTTON, DEFAULT_LINK_LABEL } from "@/lib/campaigns/wizard";

/** The phone screen that best illustrates what a step is configuring. */
export function previewTabForStep(step: StepId): PreviewTab {
  switch (step) {
    case "setup":
      return "post";
    case "trigger":
      return "comments";
    default:
      return "dm";
  }
}

interface PreviewPanelProps {
  draft: CampaignDraft;
  username: string;
  avatarUrl: string | null;
  tab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
}

/** Live phone preview driven by the draft. */
export default function PreviewPanel({
  draft,
  username,
  avatarUrl,
  tab,
  onTabChange,
}: PreviewPanelProps) {
  const link = draft.trackedDestinationUrl.trim();
  return (
    <CampaignPreview
      tab={tab}
      onTabChange={onTabChange}
      username={username}
      avatarUrl={avatarUrl}
      postThumb={draft.postThumb}
      caption={draft.postCaption}
      sampleComment={draft.keywords[0] ?? ""}
      dmTriggerEnabled={draft.dmTriggerEnabled}
      publicReplyEnabled={draft.publicReplyEnabled}
      publicReplyMessage={draft.publicReplyMessages.find((m) => m.trim()) ?? ""}
      openingDmEnabled={draft.openingDmEnabled}
      openingDmMessage={draft.openingDmMessage}
      openingDmButtonLabel={draft.openingDmButtonLabel}
      revealMessage={draft.dmMessage}
      hasLink={Boolean(link)}
      linkButtonLabel={draft.linkButtonLabel || DEFAULT_LINK_LABEL}
      linkUrl={link || undefined}
      hasSecondLink={Boolean(draft.secondaryDestinationUrl.trim())}
      secondLinkButtonLabel={draft.secondaryButtonLabel || DEFAULT_LINK_LABEL}
      requireFollow={draft.requireFollow}
      followPromptMessage={draft.followPromptMessage}
      followPromptButtonLabel={draft.followPromptButtonLabel || DEFAULT_FOLLOW_BUTTON}
      followUpEnabled={draft.followUpEnabled}
      followUpMessage={draft.followUpMessage}
      followUpDelayMinutes={draft.followUpDelayMinutes}
    />
  );
}
