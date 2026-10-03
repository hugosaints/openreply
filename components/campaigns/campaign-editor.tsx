"use client";

/**
 * Edit-campaign page: the same four step bodies as the wizard, stacked in one
 * scrollable page with a live preview and a sticky save bar.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { translateServerMessage } from "@/lib/i18n/server-messages";
import type { PreviewTab } from "@/components/campaign-preview";
import { DeliveryStep, EngagementStep, SetupStep, TriggerStep } from "@/components/campaigns/steps";
import PreviewPanel, { previewTabForStep } from "@/components/campaigns/preview-panel";
import { firstErrorField, focusField } from "@/components/campaigns/focus-field";
import { saveCampaign } from "@/components/campaigns/save-campaign";
import StatusPill from "@/components/campaigns/status-pill";
import {
  useAccountAvatar,
  useCampaignAccounts,
  useUsedPosts,
} from "@/components/campaigns/use-campaign-data";
import { IconArrowLeft, IconPause, IconPhone, IconPlay } from "@/components/campaigns/icons";
import {
  draftToPayload,
  loadedToDraft,
  validateAll,
  type CampaignDraft,
  type LoadedCampaign,
} from "@/lib/campaigns/wizard";

const SECTIONS = ["setup", "trigger", "engagement", "delivery"] as const;

function fingerprint(draft: CampaignDraft) {
  return JSON.stringify({ ...draft, postThumb: null, postCaption: "" });
}

export default function CampaignEditor({ campaignId }: { campaignId: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<
    { status: "loading" } | { status: "missing" } | { status: "ready"; campaign: LoadedCampaign }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/automations", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        const found = payload.success
          ? (payload.data as LoadedCampaign[]).find((item) => item.id === campaignId)
          : undefined;
        setState(found ? { status: "ready", campaign: found } : { status: "missing" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (state.status === "loading") {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="h-8 w-56 animate-pulse rounded bg-surface-hover" />
        <div className="panel h-64 animate-pulse" />
        <div className="panel h-64 animate-pulse" />
      </div>
    );
  }

  if (state.status === "missing") {
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

  return <EditorForm campaign={state.campaign} />;
}

function EditorForm({ campaign }: { campaign: LoadedCampaign }) {
  const { t } = useI18n();
  const router = useRouter();

  const initial = useMemo(() => loadedToDraft(campaign), [campaign]);
  const [draft, setDraft] = useState<CampaignDraft>(initial);
  const [isActive, setIsActive] = useState(campaign.isActive);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("dm");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { accounts } = useCampaignAccounts();
  const accountId = draft.instagramAccountId;
  const username = accounts.find((a) => a.id === accountId)?.username ?? "yourbrand";
  const avatarUrl = useAccountAvatar(accountId);
  const usedPosts = useUsedPosts(accountId, campaign.id);

  const patch = useCallback(
    (partial: Partial<CampaignDraft>) => setDraft((prev) => ({ ...prev, ...partial })),
    []
  );

  const dirty = fingerprint(draft) !== fingerprint(initial);
  const errors = showErrors ? validateAll(draft) : {};

  // Warn before losing unsaved edits (there is no autosave for edits).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const translate = (message: string) => translateServerMessage({ t }, message);

  async function handleSave() {
    setApiError(null);
    setNotice(null);
    const found = validateAll(draft);
    if (Object.keys(found).length > 0) {
      setShowErrors(true);
      focusField(firstErrorField(found));
      return;
    }
    setSaving(true);
    const result = await saveCampaign({
      mode: "edit",
      id: campaign.id,
      payload: draftToPayload(draft, username, isActive),
      translate,
      fallbackMessage: t("Failed to save campaign"),
    });
    if (!result.ok) {
      setSaving(false);
      setApiError(result.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // refresh() busts the router cache so the list reflects the save.
    router.push("/campaigns");
    router.refresh();
  }

  async function handleToggleActive() {
    setApiError(null);
    setNotice(null);
    setToggling(true);
    const next = !isActive;
    const result = await saveCampaign({
      mode: "edit",
      id: campaign.id,
      payload: { isActive: next },
      translate,
      fallbackMessage: t("Failed to save campaign"),
    });
    setToggling(false);
    if (!result.ok) {
      setApiError(result.message);
      return;
    }
    setIsActive(next);
    setNotice(next ? t("Campaign is live again.") : t("Campaign paused."));
    router.refresh();
  }

  const stepCopy: Record<(typeof SECTIONS)[number], { title: string; description: string }> = {
    setup: { title: t("Setup"), description: t("Name, account and post") },
    trigger: { title: t("Trigger"), description: t("Keywords and public reply") },
    engagement: { title: t("Engagement"), description: t("Opening message and follow") },
    delivery: { title: t("Delivery"), description: t("Message, link and follow-up") },
  };

  const preview = (
    <PreviewPanel
      draft={draft}
      username={username}
      avatarUrl={avatarUrl}
      tab={previewTab}
      onTabChange={setPreviewTab}
    />
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/campaigns/${campaign.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            {t("Back to campaign")}
          </Link>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="truncate font-heading text-2xl font-semibold tracking-tight text-foreground">
              {draft.name.trim() || t("Untitled campaign")}
            </h1>
            <StatusPill active={isActive} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover xl:hidden"
          >
            <IconPhone />
            {t("Preview")}
          </button>
          <button
            type="button"
            onClick={() => void handleToggleActive()}
            disabled={toggling || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            {isActive ? <IconPause className="h-3.5 w-3.5" /> : <IconPlay className="h-3.5 w-3.5" />}
            {isActive ? t("Stop") : t("Go Live")}
          </button>
        </div>
      </div>

      {notice && (
        <div role="status" className="rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          {notice}
        </div>
      )}
      {apiError && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error-soft px-4 py-3 text-sm text-error">
          {apiError}
        </div>
      )}
      {showErrors && Object.keys(errors).length > 0 && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error-soft px-4 py-3 text-sm text-error">
          {t("Some fields need your attention before saving.")}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          {SECTIONS.map((id, index) => (
            <section
              key={id}
              aria-labelledby={`edit-${id}`}
              onFocusCapture={() => setPreviewTab(previewTabForStep(id))}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                  {index + 1}
                </span>
                <div>
                  <h2 id={`edit-${id}`} className="font-heading text-lg font-semibold text-foreground">
                    {stepCopy[id].title}
                  </h2>
                  <p className="text-sm text-muted">{stepCopy[id].description}</p>
                </div>
              </div>
              {id === "setup" && (
                <SetupStep
                  draft={draft}
                  patch={patch}
                  errors={errors}
                  accounts={accounts}
                  usedPosts={usedPosts}
                />
              )}
              {id === "trigger" && <TriggerStep draft={draft} patch={patch} errors={errors} />}
              {id === "engagement" && <EngagementStep draft={draft} patch={patch} errors={errors} />}
              {id === "delivery" && <DeliveryStep draft={draft} patch={patch} errors={errors} />}
            </section>
          ))}

          <div className="panel sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 p-3 shadow-[0_8px_24px_-12px_rgb(29_38_48/0.25)]">
            <p className="px-1 text-sm text-muted">
              {dirty ? t("You have unsaved changes.") : t("No changes yet.")}
            </p>
            <div className="flex items-center gap-2">
              {dirty && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(initial);
                    setShowErrors(false);
                    setApiError(null);
                  }}
                  disabled={saving}
                  className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
                >
                  {t("Discard changes")}
                </button>
              )}
              <Link
                href="/campaigns"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                {t("Cancel")}
              </Link>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !dirty}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? t("Saving…") : t("Save changes")}
              </button>
            </div>
          </div>
        </div>

        <aside className="hidden xl:sticky xl:top-6 xl:block" aria-label={t("Preview")}>
          <p className="mb-3 text-sm font-medium text-foreground">{t("Preview")}</p>
          {preview}
        </aside>
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-foreground/40 xl:hidden"
          onClick={() => setSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("Preview")}
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-heading text-base font-semibold text-foreground">{t("Preview")}</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground"
              >
                {t("Close")}
              </button>
            </div>
            <div className="flex justify-center">{preview}</div>
          </div>
        </div>
      )}
    </div>
  );
}
