"use client";

/**
 * New-campaign wizard: 5 steps (Setup → Trigger → Engagement → Delivery →
 * Review) with a live phone preview, per-step validation, a local draft that
 * survives reloads, `?template=` prefill and the CSV import queue.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { translateServerMessage } from "@/lib/i18n/server-messages";
import type { PreviewTab } from "@/components/campaign-preview";
import Stepper, { type StepperItem } from "@/components/campaigns/stepper";
import { DeliveryStep, EngagementStep, SetupStep, TriggerStep } from "@/components/campaigns/steps";
import ReviewStep from "@/components/campaigns/review-step";
import PreviewPanel, { previewTabForStep } from "@/components/campaigns/preview-panel";
import { firstErrorField, focusField } from "@/components/campaigns/focus-field";
import { saveCampaign } from "@/components/campaigns/save-campaign";
import {
  useAccountAvatar,
  useCampaignAccounts,
  useUsedPosts,
} from "@/components/campaigns/use-campaign-data";
import {
  IconArrowLeft,
  IconArrowRight,
  IconPhone,
} from "@/components/campaigns/icons";
import { IMPORT_ACCOUNT_KEY, IMPORT_QUEUE_KEY, type ImportRow } from "@/lib/import-queue";
import { getCampaignTemplate } from "@/lib/templates/campaign-templates";
import {
  DRAFT_STORAGE_KEY,
  STEP_IDS,
  createEmptyDraft,
  draftToPayload,
  firstInvalidStep,
  importRowToDraft,
  isDraftDirty,
  parseDraft,
  serializeDraft,
  templateToDraft,
  validateStep,
  type CampaignDraft,
  type StepId,
} from "@/lib/campaigns/wizard";

type StoredDraft = NonNullable<ReturnType<typeof parseDraft>>;

export default function WizardShell({ templateSlug }: { templateSlug?: string }) {
  const { t } = useI18n();
  const router = useRouter();

  const [draft, setDraft] = useState<CampaignDraft>(() => createEmptyDraft());
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [attempted, setAttempted] = useState<StepId[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"live" | "paused" | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("post");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [resumable, setResumable] = useState<StoredDraft | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [importQueue, setImportQueue] = useState<ImportRow[] | null>(null);
  const [importTotal, setImportTotal] = useState(0);
  const [usedRefresh, setUsedRefresh] = useState(0);

  const autosaveOff = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const { accounts, defaultAccountId } = useCampaignAccounts();
  const accountId = draft.instagramAccountId || defaultAccountId;
  // The account defaults to the first connected one without needing an effect.
  const effective = useMemo(
    () => ({ ...draft, instagramAccountId: accountId }),
    [draft, accountId]
  );
  const username = accounts.find((a) => a.id === accountId)?.username ?? "yourbrand";
  const avatarUrl = useAccountAvatar(accountId);
  const usedPosts = useUsedPosts(accountId, undefined, usedRefresh);

  const patch = useCallback(
    (partial: Partial<CampaignDraft>) => setDraft((prev) => ({ ...prev, ...partial })),
    []
  );

  /* ------------------------------ hydration ------------------------------ */

  // Pick up (in priority order) a staged CSV import, a template, or a saved
  // local draft. localStorage only exists on the client, so this has to run
  // after mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const rawQueue = window.localStorage.getItem(IMPORT_QUEUE_KEY);
      const queue = rawQueue ? (JSON.parse(rawQueue) as ImportRow[]) : null;
      if (Array.isArray(queue) && queue.length > 0) {
        const acct = window.localStorage.getItem(IMPORT_ACCOUNT_KEY) ?? "";
        setImportQueue(queue);
        setImportTotal(queue.length);
        setDraft(importRowToDraft(queue[0], createEmptyDraft(acct)));
      } else {
        const template = getCampaignTemplate(templateSlug);
        if (template) {
          setDraft((prev) => templateToDraft(template, prev));
        } else {
          const saved = parseDraft(window.localStorage.getItem(DRAFT_STORAGE_KEY));
          if (saved && isDraftDirty(saved.draft)) setResumable(saved);
        }
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, [templateSlug]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Debounced local autosave. Disabled while a resume prompt is pending (it
  // would overwrite the saved draft with a blank one) and during CSV imports.
  useEffect(() => {
    if (!hydrated || resumable || importQueue || autosaveOff.current) return;
    if (!isDraftDirty(effective)) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          serializeDraft(effective, step, Date.now())
        );
        setDraftSaved(true);
      } catch {
        // storage full / unavailable — the wizard still works
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [hydrated, resumable, importQueue, effective, step]);

  // Close the mobile preview sheet on Escape.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  /* ------------------------------ navigation ------------------------------ */

  const stepId = STEP_IDS[step];
  const errors = attempted.includes(stepId) ? validateStep(effective, stepId) : {};
  const invalidSteps = new Set<number>();
  STEP_IDS.forEach((id, index) => {
    if (attempted.includes(id) && Object.keys(validateStep(effective, id)).length > 0) {
      invalidSteps.add(index);
    }
  });

  const goTo = useCallback((index: number) => {
    setStep(index);
    setPreviewTab(previewTabForStep(STEP_IDS[index]));
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }, []);

  function markAttempted(id: StepId) {
    setAttempted((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function handleNext() {
    const found = validateStep(effective, stepId);
    if (Object.keys(found).length > 0) {
      markAttempted(stepId);
      focusField(firstErrorField(found));
      return;
    }
    setMaxReached((m) => Math.max(m, step + 1));
    goTo(step + 1);
  }

  function handleStepSelect(index: number) {
    if (index <= maxReached) goTo(index);
  }

  function goToStepId(id: StepId) {
    goTo(STEP_IDS.indexOf(id));
  }

  /* ------------------------------ draft actions ------------------------------ */

  function resumeDraft() {
    if (!resumable) return;
    const firstInvalid = firstInvalidStep(resumable.draft);
    setDraft(resumable.draft);
    setMaxReached(Math.max(resumable.step, firstInvalid === -1 ? STEP_IDS.length - 1 : firstInvalid));
    setStep(resumable.step);
    setPreviewTab(previewTabForStep(STEP_IDS[resumable.step]));
    setResumable(null);
  }

  function discardDraft() {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    setResumable(null);
  }

  /* --------------------------------- import --------------------------------- */

  function finishAndLeave() {
    autosaveOff.current = true;
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.localStorage.removeItem(IMPORT_QUEUE_KEY);
      window.localStorage.removeItem(IMPORT_ACCOUNT_KEY);
    } catch {
      // ignore
    }
    // refresh() busts the router cache so the list reflects the save instead
    // of landing on a stale (empty) campaigns page.
    router.push("/campaigns");
    router.refresh();
  }

  function advanceQueue() {
    if (!importQueue) return;
    const remaining = importQueue.slice(1);
    if (remaining.length === 0) return finishAndLeave();
    try {
      window.localStorage.setItem(IMPORT_QUEUE_KEY, JSON.stringify(remaining));
    } catch {
      // ignore
    }
    setImportQueue(remaining);
    setDraft(importRowToDraft(remaining[0], createEmptyDraft(accountId)));
    setAttempted([]);
    setApiError(null);
    setMaxReached(0);
    setStep(0);
    setPreviewTab("post");
    setUsedRefresh((n) => n + 1);
    window.scrollTo({ top: 0 });
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  /* --------------------------------- publish --------------------------------- */

  async function publish(active: boolean) {
    const invalid = firstInvalidStep(effective);
    if (invalid !== -1) {
      const id = STEP_IDS[invalid];
      markAttempted(id);
      goTo(invalid);
      focusField(firstErrorField(validateStep(effective, id)));
      return;
    }

    setSaving(active ? "live" : "paused");
    setApiError(null);
    const result = await saveCampaign({
      mode: "new",
      payload: draftToPayload(effective, username, active),
      translate: (message) => translateServerMessage({ t }, message),
      fallbackMessage: t("Failed to save campaign"),
    });
    setSaving(null);

    if (!result.ok) {
      setApiError(result.message);
      if (result.step) goTo(STEP_IDS.indexOf(result.step));
      return;
    }

    if (importQueue && importQueue.length > 1) {
      advanceQueue();
      return;
    }
    finishAndLeave();
  }

  /* ---------------------------------- view ---------------------------------- */

  const steps: StepperItem[] = [
    { id: "setup", title: t("Setup"), description: t("Name, account and post") },
    { id: "trigger", title: t("Trigger"), description: t("Keywords and public reply") },
    { id: "engagement", title: t("Engagement"), description: t("Opening message and follow") },
    { id: "delivery", title: t("Delivery"), description: t("Message, link and follow-up") },
    { id: "review", title: t("Review"), description: t("Check and publish") },
  ];
  const isReview = stepId === "review";
  const busy = saving !== null;

  const preview = (
    <PreviewPanel
      draft={effective}
      username={username}
      avatarUrl={avatarUrl}
      tab={previewTab}
      onTabChange={setPreviewTab}
    />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            {t("Back to campaigns")}
          </Link>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">
            {t("New campaign")}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover xl:hidden"
        >
          <IconPhone />
          {t("Preview")}
        </button>
      </div>

      {importQueue && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-muted bg-accent-soft px-4 py-3 text-sm">
          <p className="min-w-0 flex-1">
            <span className="font-medium text-foreground">
              {t("Importing {current} of {total}.", {
                current: importTotal - importQueue.length + 1,
                total: importTotal,
              })}
            </span>{" "}
            <span className="text-muted">
              {t("Fields are prefilled from your CSV. Pick the reel, edit anything, and save to load the next one — or Skip if you don’t want this one.")}
            </span>
          </p>
          <button
            type="button"
            onClick={advanceQueue}
            disabled={busy}
            className="shrink-0 rounded-lg border border-accent-muted bg-surface px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
          >
            {importQueue.length > 1 ? t("Skip") : t("Skip & finish")}
          </button>
        </div>
      )}

      {resumable && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-muted bg-accent-soft px-4 py-3 text-sm"
        >
          <p className="min-w-0 flex-1">
            <span className="font-medium text-foreground">{t("You have an unfinished campaign.")}</span>{" "}
            <span className="text-muted">
              {resumable.draft.name.trim()
                ? t("“{name}” was saved on this device.", { name: resumable.draft.name.trim() })
                : t("It was saved on this device.")}
            </span>
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              {t("Discard")}
            </button>
            <button
              type="button"
              onClick={resumeDraft}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              {t("Resume draft")}
            </button>
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_340px]">
        <div className="lg:sticky lg:top-6">
          <Stepper
            steps={steps}
            current={step}
            maxReached={maxReached}
            invalid={invalidSteps}
            onSelect={handleStepSelect}
          />
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-heading text-xl font-semibold tracking-tight text-foreground focus:outline-none"
            >
              {steps[step].title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {t("Step {current} of {total}", { current: step + 1, total: steps.length })}
              {" · "}
              {steps[step].description}
            </p>
          </div>

          {apiError && (
            <div role="alert" className="rounded-xl border border-error/30 bg-error-soft px-4 py-3 text-sm text-error">
              {apiError}
            </div>
          )}

          {stepId === "setup" && (
            <SetupStep
              draft={effective}
              patch={patch}
              errors={errors}
              accounts={accounts}
              usedPosts={usedPosts}
            />
          )}
          {stepId === "trigger" && <TriggerStep draft={effective} patch={patch} errors={errors} />}
          {stepId === "engagement" && <EngagementStep draft={effective} patch={patch} errors={errors} />}
          {stepId === "delivery" && <DeliveryStep draft={effective} patch={patch} errors={errors} />}
          {isReview && <ReviewStep draft={effective} username={username} onGoToStep={goToStepId} />}

          {/* Footer */}
          <div className="panel sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 p-3 shadow-[0_8px_24px_-12px_rgb(29_38_48/0.25)]">
            <div className="flex items-center gap-3">
              {step === 0 ? (
                <Link
                  href="/campaigns"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  {t("Cancel")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
                >
                  <IconArrowLeft className="h-3.5 w-3.5" />
                  {t("Back")}
                </button>
              )}
              {draftSaved && !importQueue && (
                <span className="hidden text-xs text-subtle sm:inline">{t("Draft saved automatically")}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isReview ? (
                <>
                  <button
                    type="button"
                    onClick={() => void publish(false)}
                    disabled={busy}
                    className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
                  >
                    {saving === "paused" ? t("Saving…") : t("Save as paused")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void publish(true)}
                    disabled={busy}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {saving === "live" ? t("Saving…") : t("Go Live")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  {t("Continue")}
                  <IconArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="hidden xl:sticky xl:top-6 xl:block" aria-label={t("Preview")}>
          <p className="mb-3 text-sm font-medium text-foreground">{t("Preview")}</p>
          {preview}
        </aside>
      </div>

      {/* Mobile / tablet preview sheet */}
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
