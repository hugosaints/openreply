"use client";

/**
 * The four editable steps of a campaign. The wizard shows one at a time; the
 * single-page editor stacks all four. Both share these components so a field
 * can never behave differently between "new" and "edit".
 */

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import PostPicker from "@/components/post-picker";
import type { AccountOption } from "@/components/account-select";
import {
  Field,
  InlineError,
  KeywordChips,
  OptionCards,
  SectionCard,
  TextArea,
  TextField,
  ToggleRow,
  inputClass,
} from "@/components/campaigns/fields";
import {
  IconClock,
  IconGrid,
  IconImage,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@/components/campaigns/icons";
import {
  DEFAULT_FOLLOW_BUTTON,
  DEFAULT_LINK_LABEL,
  MAX_FOLLOW_UP_MINUTES,
  MAX_PUBLIC_REPLIES,
  ensureLinkToken,
  type CampaignDraft,
  type FieldErrors,
  type MatchMode,
  type TriggerScope,
} from "@/lib/campaigns/wizard";

export interface StepProps {
  draft: CampaignDraft;
  patch: (partial: Partial<CampaignDraft>) => void;
  errors: FieldErrors;
}

export interface SetupStepProps extends StepProps {
  accounts: AccountOption[];
  /** postId → name of the campaign already using it (other than this one). */
  usedPosts: Record<string, string>;
}

const MESSAGE_TOKENS = (t: (key: "Personalize with the commenter's name" | "Insert the tracked link") => string) => [
  { token: "{username}", label: t("Personalize with the commenter's name") },
  { token: "{link}", label: t("Insert the tracked link") },
];

/* -------------------------------- Step 1 -------------------------------- */

export function SetupStep({ draft, patch, errors, accounts, usedPosts }: SetupStepProps) {
  const { t } = useI18n();
  const conflict = draft.postId ? usedPosts[draft.postId] : undefined;

  return (
    <>
      <SectionCard
        title={t("Basics")}
        description={t("Name your campaign and choose the Instagram account it runs on.")}
      >
        <TextField
          fieldId="campaign-name"
          label={t("Campaign name")}
          optional
          value={draft.name}
          onChange={(name) => patch({ name })}
          placeholder={t("e.g. YC referral")}
          maxLength={100}
        />
        {accounts.length > 1 && (
          <Field
            label={t("Instagram account")}
            htmlFor="campaign-account"
            error={errors.instagramAccountId ? t(errors.instagramAccountId) : undefined}
          >
            <select
              id="campaign-account"
              value={draft.instagramAccountId}
              onChange={(e) =>
                patch({
                  instagramAccountId: e.target.value,
                  postId: null,
                  postUrl: null,
                  postThumb: null,
                  postCaption: "",
                })
              }
              className={inputClass(Boolean(errors.instagramAccountId))}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  @{account.username}
                </option>
              ))}
            </select>
          </Field>
        )}
        {accounts.length <= 1 && errors.instagramAccountId && (
          <InlineError>{t(errors.instagramAccountId)}</InlineError>
        )}
      </SectionCard>

      <SectionCard
        title={t("When someone comments on")}
        description={t("Choose which posts or reels start this campaign.")}
      >
        <OptionCards<TriggerScope>
          label={t("When someone comments on")}
          value={draft.triggerScope}
          onChange={(triggerScope) => patch({ triggerScope })}
          options={[
            {
              value: "specific",
              title: t("A specific post or reel"),
              description: t("Pick one from your library."),
              icon: <IconImage />,
            },
            {
              value: "any",
              title: t("Any post or reel"),
              description: t("Every comment on your account."),
              icon: <IconGrid />,
            },
            {
              value: "next",
              title: t("Next post or reel"),
              description: t("Attach to the next one you publish."),
              icon: <IconClock />,
            },
          ]}
        />

        {draft.triggerScope === "specific" && (
          <div id="campaign-post" tabIndex={-1} className="focus:outline-none">
            <div
              className={`rounded-xl border p-3 ${
                errors.postId ? "border-error" : "border-border"
              }`}
            >
              <PostPicker
                selectedPostId={draft.postId}
                instagramAccountId={draft.instagramAccountId}
                usedPostIds={usedPosts}
                onSelect={(postId, postUrl, thumb, caption) =>
                  patch({
                    postId,
                    postUrl: postUrl ?? null,
                    postThumb: thumb ?? null,
                    postCaption: caption ?? "",
                  })
                }
              />
            </div>
            <InlineError id="campaign-post-error">
              {errors.postId ? t(errors.postId) : undefined}
            </InlineError>
            {conflict && (
              <p
                role="status"
                className="mt-3 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning"
              >
                {t("This post already has a campaign: {name}. Two campaigns on one post may both reply.", {
                  name: conflict,
                })}
              </p>
            )}
          </div>
        )}
        {draft.triggerScope === "next" && (
          <p className="rounded-lg bg-surface-hover px-3 py-2.5 text-sm text-muted">
            {t("The campaign stays on “waiting” until you publish your next post or reel, then attaches to it automatically.")}
          </p>
        )}
      </SectionCard>
    </>
  );
}

/* -------------------------------- Step 2 -------------------------------- */

export function TriggerStep({ draft, patch, errors }: StepProps) {
  const { t } = useI18n();
  const anyWord = draft.matchMode === "any";

  function setReply(index: number, value: string) {
    patch({
      publicReplyMessages: draft.publicReplyMessages.map((m, i) => (i === index ? value : m)),
    });
  }

  return (
    <>
      <SectionCard
        title={t("And this comment has")}
        description={t("Decide which comments start the conversation.")}
      >
        <OptionCards<MatchMode>
          label={t("And this comment has")}
          value={draft.matchMode}
          onChange={(matchMode) => patch({ matchMode })}
          columns="sm:grid-cols-2"
          options={[
            {
              value: "specific",
              title: t("A specific word or words"),
              description: t("Only comments containing your keywords."),
              icon: <IconSearch />,
            },
            {
              value: "any",
              title: t("Any word"),
              description: t("Every comment gets a reply."),
              icon: <IconGrid />,
            },
          ]}
        />

        {!anyWord && (
          <>
            <KeywordChips
              fieldId="campaign-keywords"
              label={t("Keywords")}
              value={draft.keywords}
              onChange={(keywords) => patch({ keywords })}
              placeholder={t("Type a word and press Enter")}
              error={errors.keywords ? t(errors.keywords) : undefined}
              hint={t("Separate words with commas. Capitals and accents are ignored.")}
            />
            <ToggleRow
              title={t("Match whole words only")}
              description={t("“link” will not match “linked” or “hyperlink”.")}
              on={draft.wholeWordMatch}
              onChange={(wholeWordMatch) => patch({ wholeWordMatch })}
            />
          </>
        )}

        <ToggleRow
          title={anyWord ? t("Also reply when someone DMs anything") : t("Also reply when someone DMs these words")}
          description={
            anyWord
              ? t("Every DM to this account gets the reply below — use with care.")
              : t("A DM containing any of these words gets the same reply, no comment needed.")
          }
          on={draft.dmTriggerEnabled}
          onChange={(dmTriggerEnabled) => patch({ dmTriggerEnabled })}
        />
      </SectionCard>

      <SectionCard
        title={t("Public reply")}
        description={t("Optionally answer under the comment so people know a DM is on its way.")}
      >
        <ToggleRow
          title={t("Reply to their comments under the post")}
          on={draft.publicReplyEnabled}
          onChange={(publicReplyEnabled) => patch({ publicReplyEnabled })}
        >
          <div className="space-y-2">
            {draft.publicReplyMessages.map((message, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={message}
                  onChange={(e) => setReply(index, e.target.value)}
                  placeholder={t("Sent you a DM! 📩")}
                  maxLength={1000}
                  aria-label={t("Public reply {number}", { number: index + 1 })}
                  className={inputClass()}
                />
                {draft.publicReplyMessages.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        publicReplyMessages: draft.publicReplyMessages.filter((_, i) => i !== index),
                      })
                    }
                    aria-label={t("Remove reply")}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-error-soft hover:text-error"
                  >
                    <IconTrash />
                  </button>
                )}
              </div>
            ))}
            {draft.publicReplyMessages.length < MAX_PUBLIC_REPLIES && (
              <button
                type="button"
                onClick={() => patch({ publicReplyMessages: [...draft.publicReplyMessages, ""] })}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                <IconPlus className="h-3.5 w-3.5" />
                {t("Add another reply")}
              </button>
            )}
            <p className="text-xs text-subtle">
              {t("One is picked at random each time, so replies don't look identical.")}
            </p>
          </div>
        </ToggleRow>
      </SectionCard>
    </>
  );
}

/* -------------------------------- Step 3 -------------------------------- */

export function EngagementStep({ draft, patch, errors }: StepProps) {
  const { t } = useI18n();
  const tokens = MESSAGE_TOKENS(t);

  return (
    <>
      <SectionCard
        title={t("Opening message")}
        description={t("A friendly first DM with a button. When they tap it, the rest of your flow is sent.")}
      >
        <ToggleRow
          title={t("Send an opening DM")}
          on={draft.openingDmEnabled}
          onChange={(openingDmEnabled) => patch({ openingDmEnabled })}
        >
          <TextArea
            fieldId="campaign-opening-message"
            label={t("Opening message")}
            value={draft.openingDmMessage}
            onChange={(openingDmMessage) => patch({ openingDmMessage })}
            placeholder={t("Hey there! I'm so happy you're here 😊")}
            rows={3}
            tokens={tokens.slice(0, 1)}
            error={errors.openingDmMessage ? t(errors.openingDmMessage) : undefined}
          />
          <TextField
            fieldId="campaign-opening-button"
            label={t("Button label")}
            value={draft.openingDmButtonLabel}
            onChange={(openingDmButtonLabel) => patch({ openingDmButtonLabel })}
            placeholder={t("Send me the link")}
            maxLength={64}
            error={errors.openingDmButtonLabel ? t(errors.openingDmButtonLabel) : undefined}
          />
        </ToggleRow>
      </SectionCard>

      <SectionCard
        title={t("Follow requirement")}
        description={t("Ask people to follow you before the link is sent.")}
      >
        <ToggleRow
          title={t("Require a follow first")}
          on={draft.requireFollow}
          onChange={(requireFollow) => patch({ requireFollow })}
        >
          <TextArea
            fieldId="campaign-follow-message"
            label={t("Follow request message")}
            optional
            value={draft.followPromptMessage}
            onChange={(followPromptMessage) => patch({ followPromptMessage })}
            placeholder={t("quick favor before i send your link. i don't make any money from this, it's free. if you want to support me, just don't unfollow after, and star the repo on github if it helps you. tap the button once you're following and i'll send it over")}
            rows={3}
            tokens={tokens.slice(0, 1)}
            hint={t("Leave empty to use the default message.")}
          />
          <TextField
            fieldId="campaign-follow-button"
            label={t("Button label")}
            value={draft.followPromptButtonLabel}
            onChange={(followPromptButtonLabel) => patch({ followPromptButtonLabel })}
            placeholder={t(DEFAULT_FOLLOW_BUTTON)}
            maxLength={20}
          />
          <p className="text-xs text-subtle">
            {t("We send the link only after they tap the button and Instagram confirms the follow. If it can't be verified, we send it anyway.")}
          </p>
        </ToggleRow>
      </SectionCard>
    </>
  );
}

/* -------------------------------- Step 4 -------------------------------- */

export function DeliveryStep({ draft, patch, errors }: StepProps) {
  const { t } = useI18n();
  const tokens = MESSAGE_TOKENS(t);
  const [secondOpen, setSecondOpen] = useState(false);
  const showSecond = secondOpen || Boolean(draft.secondaryDestinationUrl);

  return (
    <>
      <SectionCard
        title={t("The message they receive")}
        description={t("This is the DM sent after the comment (and after any opening message or follow).")}
      >
        <TextArea
          fieldId="campaign-dm-message"
          label={t("DM message")}
          value={draft.dmMessage}
          onChange={(dmMessage) => patch({ dmMessage })}
          placeholder={t("Write a message")}
          rows={4}
          tokens={tokens}
          error={errors.dmMessage ? t(errors.dmMessage) : undefined}
        />

        <div className="space-y-4 rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground">{t("Tracked link")}</p>
          <TextField
            fieldId="campaign-link-url"
            type="url"
            label={t("Destination URL")}
            optional
            value={draft.trackedDestinationUrl}
            onChange={(trackedDestinationUrl) => patch({ trackedDestinationUrl })}
            onBlur={() => {
              if (draft.trackedDestinationUrl.trim()) {
                patch({ dmMessage: ensureLinkToken(draft.dmMessage) });
              }
            }}
            placeholder="https://yourlink.com/offer"
            hint={t("We add the link to your message and count every click.")}
            error={errors.trackedDestinationUrl ? t(errors.trackedDestinationUrl) : undefined}
          />
          {draft.trackedDestinationUrl.trim() && (
            <TextField
              fieldId="campaign-link-label"
              label={t("Button label")}
              value={draft.linkButtonLabel}
              onChange={(linkButtonLabel) => patch({ linkButtonLabel })}
              placeholder={t(DEFAULT_LINK_LABEL)}
              maxLength={20}
            />
          )}

          {draft.trackedDestinationUrl.trim() &&
            (showSecond ? (
              <div className="space-y-4 border-t border-border pt-4">
                <TextField
                  fieldId="campaign-second-url"
                  type="url"
                  label={t("Second destination URL")}
                  value={draft.secondaryDestinationUrl}
                  onChange={(secondaryDestinationUrl) => patch({ secondaryDestinationUrl })}
                  placeholder="https://yourlink.com/second"
                  error={errors.secondaryDestinationUrl ? t(errors.secondaryDestinationUrl) : undefined}
                />
                <TextField
                  fieldId="campaign-second-label"
                  label={t("Second button label")}
                  value={draft.secondaryButtonLabel}
                  onChange={(secondaryButtonLabel) => patch({ secondaryButtonLabel })}
                  placeholder={t(DEFAULT_LINK_LABEL)}
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => {
                    patch({ secondaryDestinationUrl: "", secondaryButtonLabel: DEFAULT_LINK_LABEL });
                    setSecondOpen(false);
                  }}
                  className="text-sm font-medium text-muted hover:text-error"
                >
                  {t("Remove second link")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSecondOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                <IconPlus className="h-3.5 w-3.5" />
                {t("Add a second link")}
              </button>
            ))}
        </div>
      </SectionCard>

      <SectionCard
        title={t("Follow-up")}
        description={t("A thank-you message sent after they tap the link.")}
      >
        <ToggleRow
          title={t("Send a follow-up thank-you message")}
          on={draft.followUpEnabled}
          onChange={(followUpEnabled) => patch({ followUpEnabled })}
        >
          <TextArea
            fieldId="campaign-follow-up-message"
            label={t("Follow-up message")}
            value={draft.followUpMessage}
            onChange={(followUpMessage) => patch({ followUpMessage })}
            placeholder={t("Btw just wanted to say thanks for following me, I appreciate the support 🙌")}
            rows={3}
            tokens={tokens.slice(0, 1)}
            error={errors.followUpMessage ? t(errors.followUpMessage) : undefined}
          />
          <Field
            label={t("Delay (minutes)")}
            htmlFor="campaign-follow-up-delay"
            hint={
              draft.followUpDelayMinutes > 0
                ? t("Sent {minutes} min after they tap through.", { minutes: draft.followUpDelayMinutes })
                : t("Sent right after they tap through.")
            }
          >
            <input
              id="campaign-follow-up-delay"
              type="number"
              min={0}
              max={MAX_FOLLOW_UP_MINUTES}
              value={draft.followUpDelayMinutes}
              onChange={(e) =>
                patch({
                  followUpDelayMinutes: Math.max(
                    0,
                    Math.min(MAX_FOLLOW_UP_MINUTES, Math.floor(Number(e.target.value) || 0))
                  ),
                })
              }
              className={`${inputClass()} max-w-[8rem]`}
            />
          </Field>
          <p className="text-xs text-subtle">
            {t("Max 24 hours, to stay inside Instagram's messaging window.")}
          </p>
        </ToggleRow>
      </SectionCard>
    </>
  );
}
