/**
 * Campaign wizard — pure logic (no React, no DOM).
 *
 * The wizard (new campaign) and the single-page editor (edit campaign) share a
 * single `CampaignDraft` model. Everything here is deterministic so it can be
 * unit-tested in the node environment:
 *
 * - `validateStep` / `validateAll`  → per-step validation (client side)
 * - `draftToPayload`                → exact body sent to /api/automations
 * - `loadedToDraft`                 → API campaign → editable draft
 * - `templateToDraft`/`importRowToDraft` → prefill sources
 * - `serializeDraft`/`parseDraft`   → local autosave format
 */

import type { StaticMessageKey } from "@/lib/i18n";
import type { ImportRow } from "@/lib/import-queue";
import type { CampaignTemplate } from "@/lib/templates/campaign-templates";

export type TriggerScope = "specific" | "any" | "next";
export type MatchMode = "specific" | "any";

export const STEP_IDS = [
  "setup",
  "trigger",
  "engagement",
  "delivery",
  "review",
] as const;
export type StepId = (typeof STEP_IDS)[number];

export const MAX_KEYWORDS = 10;
export const MAX_KEYWORD_LENGTH = 50;
export const MAX_PUBLIC_REPLIES = 10;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_FOLLOW_UP_MINUTES = 1440;

export const DEFAULT_LINK_LABEL = "Open link";
export const DEFAULT_FOLLOW_BUTTON = "i'm following";

export interface CampaignDraft {
  name: string;
  instagramAccountId: string;
  isActive: boolean;

  // Step 1 — setup
  triggerScope: TriggerScope;
  postId: string | null;
  postUrl: string | null;
  // UI-only (preview); never sent to the API.
  postThumb: string | null;
  postCaption: string;

  // Step 2 — trigger
  matchMode: MatchMode;
  keywords: string[];
  wholeWordMatch: boolean;
  dmTriggerEnabled: boolean;
  publicReplyEnabled: boolean;
  publicReplyMessages: string[];

  // Step 3 — engagement
  openingDmEnabled: boolean;
  openingDmMessage: string;
  openingDmButtonLabel: string;
  requireFollow: boolean;
  followPromptMessage: string;
  followPromptButtonLabel: string;

  // Step 4 — delivery
  dmMessage: string;
  trackedDestinationUrl: string;
  linkButtonLabel: string;
  secondaryDestinationUrl: string;
  secondaryButtonLabel: string;
  followUpEnabled: boolean;
  followUpMessage: string;
  followUpDelayMinutes: number;
}

export function createEmptyDraft(instagramAccountId = ""): CampaignDraft {
  return {
    name: "",
    instagramAccountId,
    isActive: true,
    triggerScope: "specific",
    postId: null,
    postUrl: null,
    postThumb: null,
    postCaption: "",
    matchMode: "specific",
    keywords: [],
    wholeWordMatch: true,
    dmTriggerEnabled: false,
    publicReplyEnabled: false,
    publicReplyMessages: [""],
    openingDmEnabled: false,
    openingDmMessage: "",
    openingDmButtonLabel: "",
    requireFollow: false,
    followPromptMessage: "",
    followPromptButtonLabel: DEFAULT_FOLLOW_BUTTON,
    dmMessage: "",
    trackedDestinationUrl: "",
    linkButtonLabel: DEFAULT_LINK_LABEL,
    secondaryDestinationUrl: "",
    secondaryButtonLabel: DEFAULT_LINK_LABEL,
    followUpEnabled: false,
    followUpMessage: "",
    followUpDelayMinutes: 0,
  };
}

/* ------------------------------ keywords ------------------------------ */

/**
 * Normalise a keyword list: trim, drop empties, de-duplicate (case-insensitive,
 * first spelling wins) and respect the API limits.
 */
export function normalizeKeywords(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const word = raw.trim().slice(0, MAX_KEYWORD_LENGTH);
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

/** Split free text typed/pasted into the keyword field into separate words. */
export function splitKeywordInput(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((word) => word.trim())
    .filter(Boolean);
}

/* ------------------------------ helpers ------------------------------ */

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Append the `{link}` token to the DM text unless it is already there. */
export function ensureLinkToken(message: string): string {
  return message.includes("{link}") ? message : `${message.trim()} {link}`.trim();
}

/** Resolve the Instagram-style @username used for default names/previews. */
export function defaultCampaignName(username: string): string {
  return `Campaign for @${username}`;
}

/* ----------------------------- validation ----------------------------- */

export type FieldKey =
  | "name"
  | "instagramAccountId"
  | "postId"
  | "keywords"
  | "openingDmMessage"
  | "openingDmButtonLabel"
  | "dmMessage"
  | "trackedDestinationUrl"
  | "secondaryDestinationUrl"
  | "followUpMessage";

export type FieldErrors = Partial<Record<FieldKey, StaticMessageKey>>;

export function validateStep(draft: CampaignDraft, step: StepId): FieldErrors {
  const errors: FieldErrors = {};

  if (step === "setup") {
    if (!draft.instagramAccountId) {
      errors.instagramAccountId = "Connect an Instagram account first.";
    }
    if (draft.triggerScope === "specific" && !draft.postId) {
      errors.postId = "Pick a post or reel to trigger the campaign.";
    }
  }

  if (step === "trigger") {
    if (draft.matchMode === "specific" && normalizeKeywords(draft.keywords).length === 0) {
      errors.keywords = "Add at least one keyword, or switch to any word.";
    }
  }

  if (step === "engagement") {
    if (draft.openingDmEnabled) {
      if (!draft.openingDmMessage.trim()) {
        errors.openingDmMessage = "Write the opening message.";
      }
      if (!draft.openingDmButtonLabel.trim()) {
        errors.openingDmButtonLabel = "Add a label for the opening button.";
      }
    }
  }

  if (step === "delivery") {
    if (!draft.dmMessage.trim()) {
      errors.dmMessage = "Add the DM with the link.";
    }
    const link = draft.trackedDestinationUrl.trim();
    if (link && !isValidHttpUrl(link)) {
      errors.trackedDestinationUrl = "Enter a valid link starting with https://";
    } else if (!link && draft.dmMessage.includes("{link}")) {
      errors.trackedDestinationUrl = "Your message includes the link token, so add the destination link.";
    }
    const second = draft.secondaryDestinationUrl.trim();
    if (second && !isValidHttpUrl(second)) {
      errors.secondaryDestinationUrl = "Enter a valid link starting with https://";
    }
    if (draft.followUpEnabled && !draft.followUpMessage.trim()) {
      errors.followUpMessage = "Write the follow-up message or turn it off.";
    }
  }

  return errors;
}

export function validateAll(draft: CampaignDraft): FieldErrors {
  return STEP_IDS.reduce<FieldErrors>(
    (acc, step) => ({ ...acc, ...validateStep(draft, step) }),
    {}
  );
}

/** Index of the first step that has validation errors, or -1. */
export function firstInvalidStep(draft: CampaignDraft): number {
  return STEP_IDS.findIndex((step) => Object.keys(validateStep(draft, step)).length > 0);
}

const FIELD_STEP: Record<string, StepId> = {
  name: "setup",
  instagramAccountId: "setup",
  postId: "setup",
  postUrl: "setup",
  matchAnyPost: "setup",
  pendingNextReel: "setup",
  keywords: "trigger",
  matchAnyWord: "trigger",
  wholeWordMatch: "trigger",
  dmTriggerEnabled: "trigger",
  publicReplyEnabled: "trigger",
  publicReplyMessages: "trigger",
  publicReplyMessage: "trigger",
  openingDmEnabled: "engagement",
  openingDmMessage: "engagement",
  openingDmButtonLabel: "engagement",
  requireFollow: "engagement",
  followPromptMessage: "engagement",
  followPromptButtonLabel: "engagement",
  dmMessage: "delivery",
  trackedDestinationUrl: "delivery",
  linkButtonLabel: "delivery",
  secondaryDestinationUrl: "delivery",
  secondaryButtonLabel: "delivery",
  followUpEnabled: "delivery",
  followUpMessage: "delivery",
  followUpDelayMinutes: "delivery",
};

/** Map an API (zod) field name to the wizard step that owns that field. */
export function errorFieldToStep(field: string): StepId {
  return FIELD_STEP[field] ?? "review";
}

/** Which step (and ordering) the fields of a set of errors belong to. */
export function stepsWithErrors(errors: FieldErrors): StepId[] {
  const owned = new Set<StepId>();
  for (const field of Object.keys(errors)) owned.add(errorFieldToStep(field));
  return STEP_IDS.filter((step) => owned.has(step));
}

/* ------------------------------- payload ------------------------------- */

export interface CampaignPayload {
  name: string;
  instagramAccountId: string;
  postId: string | null;
  postUrl: string | null;
  matchAnyPost: boolean;
  pendingNextReel: boolean;
  matchAnyWord: boolean;
  wholeWordMatch: boolean;
  keywords: string[];
  dmTriggerEnabled: boolean;
  dmMessage: string;
  openingDmEnabled: boolean;
  openingDmMessage: string | null;
  openingDmButtonLabel: string | null;
  publicReplyEnabled: boolean;
  publicReplyMessages: string[];
  trackedDestinationUrl: string;
  linkButtonLabel: string;
  secondaryDestinationUrl: string;
  secondaryButtonLabel: string;
  requireFollow: boolean;
  followPromptMessage: string;
  followPromptButtonLabel: string;
  followUpEnabled: boolean;
  followUpMessage: string;
  followUpDelayMinutes: number;
  isActive: boolean;
}

/**
 * The body sent to `POST /api/automations` and `PATCH /api/automations?id=`.
 * Mirrors what the original builder sent (so the API contract is unchanged)
 * plus `wholeWordMatch`, which the API already accepts.
 */
export function draftToPayload(
  draft: CampaignDraft,
  username: string,
  isActive: boolean = draft.isActive
): CampaignPayload {
  const specific = draft.triggerScope === "specific";
  const anyWord = draft.matchMode === "any";
  const delay = Math.max(
    0,
    Math.min(MAX_FOLLOW_UP_MINUTES, Math.floor(draft.followUpDelayMinutes || 0))
  );

  return {
    name: draft.name.trim() || defaultCampaignName(username),
    instagramAccountId: draft.instagramAccountId,
    postId: specific ? draft.postId : null,
    postUrl: specific ? draft.postUrl : null,
    matchAnyPost: draft.triggerScope === "any",
    pendingNextReel: draft.triggerScope === "next",
    matchAnyWord: anyWord,
    wholeWordMatch: draft.wholeWordMatch,
    keywords: anyWord ? [] : normalizeKeywords(draft.keywords),
    dmTriggerEnabled: draft.dmTriggerEnabled,
    dmMessage: draft.dmMessage,
    openingDmEnabled: draft.openingDmEnabled,
    openingDmMessage: draft.openingDmEnabled ? draft.openingDmMessage : null,
    openingDmButtonLabel: draft.openingDmEnabled ? draft.openingDmButtonLabel : null,
    publicReplyEnabled: draft.publicReplyEnabled,
    publicReplyMessages: draft.publicReplyEnabled
      ? draft.publicReplyMessages.map((m) => m.trim()).filter(Boolean)
      : [],
    trackedDestinationUrl: draft.trackedDestinationUrl.trim() || "",
    linkButtonLabel: draft.linkButtonLabel.trim() || DEFAULT_LINK_LABEL,
    secondaryDestinationUrl: draft.secondaryDestinationUrl.trim() || "",
    secondaryButtonLabel: draft.secondaryButtonLabel.trim() || DEFAULT_LINK_LABEL,
    requireFollow: draft.requireFollow,
    followPromptMessage: draft.requireFollow ? draft.followPromptMessage.trim() : "",
    followPromptButtonLabel: draft.requireFollow
      ? draft.followPromptButtonLabel.trim() || DEFAULT_FOLLOW_BUTTON
      : "",
    followUpEnabled: draft.followUpEnabled,
    followUpMessage: draft.followUpEnabled ? draft.followUpMessage.trim() : "",
    followUpDelayMinutes: draft.followUpEnabled ? delay : 0,
    isActive,
  };
}

/* --------------------------- loaded campaign --------------------------- */

/** Subset of the `/api/automations` list item the editor needs. */
export interface LoadedCampaign {
  id: string;
  name: string;
  postId: string | null;
  postUrl: string | null;
  pendingNextReel: boolean;
  matchAnyPost: boolean;
  keywords: string[];
  matchAnyWord: boolean;
  wholeWordMatch?: boolean;
  dmTriggerEnabled: boolean;
  dmMessage: string;
  openingDmEnabled: boolean;
  openingDmMessage: string | null;
  openingDmButtonLabel: string | null;
  linkButtonLabel: string | null;
  requireFollow: boolean;
  followPromptMessage: string | null;
  followPromptButtonLabel: string | null;
  followUpEnabled: boolean;
  followUpMessage: string | null;
  followUpDelayMinutes: number | null;
  publicReplyEnabled: boolean;
  publicReplyMessage: string | null;
  publicReplyMessages: string[];
  isActive: boolean;
  instagramAccountId: string;
  trackedLinks?: { destinationUrl: string; label?: string | null }[];
}

export function loadedToDraft(c: LoadedCampaign): CampaignDraft {
  const secondLink = c.trackedLinks?.[1];
  const replies = c.publicReplyMessages?.length
    ? c.publicReplyMessages
    : c.publicReplyMessage
      ? [c.publicReplyMessage]
      : [""];

  return {
    name: c.name,
    instagramAccountId: c.instagramAccountId,
    isActive: c.isActive,
    triggerScope: c.matchAnyPost ? "any" : c.pendingNextReel ? "next" : "specific",
    postId: c.postId,
    postUrl: c.postUrl,
    postThumb: null,
    postCaption: "",
    matchMode: c.matchAnyWord ? "any" : "specific",
    keywords: c.keywords ?? [],
    wholeWordMatch: c.wholeWordMatch ?? true,
    dmTriggerEnabled: c.dmTriggerEnabled ?? false,
    publicReplyEnabled: c.publicReplyEnabled,
    publicReplyMessages: replies,
    openingDmEnabled: c.openingDmEnabled,
    openingDmMessage: c.openingDmMessage ?? "",
    openingDmButtonLabel: c.openingDmButtonLabel ?? "",
    requireFollow: c.requireFollow ?? false,
    followPromptMessage: c.followPromptMessage ?? "",
    followPromptButtonLabel: c.followPromptButtonLabel ?? DEFAULT_FOLLOW_BUTTON,
    dmMessage: c.dmMessage,
    trackedDestinationUrl: c.trackedLinks?.[0]?.destinationUrl ?? "",
    linkButtonLabel: c.linkButtonLabel ?? DEFAULT_LINK_LABEL,
    secondaryDestinationUrl: secondLink?.destinationUrl ?? "",
    secondaryButtonLabel: secondLink?.label ?? DEFAULT_LINK_LABEL,
    followUpEnabled: c.followUpEnabled ?? false,
    followUpMessage: c.followUpMessage ?? "",
    followUpDelayMinutes: c.followUpDelayMinutes ?? 0,
  };
}

/* ---------------------------- prefill sources ---------------------------- */

/**
 * Template DM copy ships with a placeholder URL. Swap any URL for the `{link}`
 * token and leave the destination for the user to fill in.
 */
export function templateToDraft(
  template: CampaignTemplate,
  base: CampaignDraft = createEmptyDraft()
): CampaignDraft {
  return {
    ...base,
    name: template.title,
    matchMode: "specific",
    keywords: normalizeKeywords(template.keywords),
    dmMessage: template.dmMessage.replace(/https?:\/\/\S+/g, "{link}"),
    trackedDestinationUrl: "",
  };
}

/** Prefill from one CSV row; the post is left unset so it is picked per row. */
export function importRowToDraft(
  row: ImportRow,
  base: CampaignDraft = createEmptyDraft()
): CampaignDraft {
  const hasOpening = Boolean(row.openingDmMessage);
  return {
    ...base,
    name: row.name ?? "",
    triggerScope: "specific",
    postId: null,
    postUrl: null,
    postThumb: null,
    postCaption: "",
    matchMode: "specific",
    keywords: normalizeKeywords(row.keywords ?? []),
    dmMessage: row.dmMessage ?? "",
    publicReplyEnabled: Boolean(row.publicReply),
    publicReplyMessages: row.publicReply ? [row.publicReply] : [""],
    openingDmEnabled: hasOpening,
    openingDmMessage: row.openingDmMessage ?? "",
    openingDmButtonLabel: row.openingDmButtonLabel || (hasOpening ? "Send link" : ""),
    trackedDestinationUrl: row.trackedUrl ?? "",
  };
}

/* ------------------------------ local draft ------------------------------ */

export const DRAFT_STORAGE_KEY = "openreply-campaign-draft";
const DRAFT_VERSION = 1;

interface StoredDraft {
  v: number;
  step: number;
  savedAt: number;
  draft: CampaignDraft;
}

export function serializeDraft(draft: CampaignDraft, step: number, now: number): string {
  const stored: StoredDraft = { v: DRAFT_VERSION, step, savedAt: now, draft };
  return JSON.stringify(stored);
}

/** Keep only values whose runtime type matches the default's type. */
function sanitizeDraft(input: unknown): CampaignDraft {
  const base = createEmptyDraft();
  if (!input || typeof input !== "object") return base;
  const source = input as Record<string, unknown>;
  const out = { ...base } as Record<string, unknown>;

  for (const key of Object.keys(base) as (keyof CampaignDraft)[]) {
    const fallback = base[key];
    const value = source[key];
    if (value === undefined) continue;
    if (key === "publicReplyMessages" || key === "keywords") {
      if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
        out[key] = value;
      }
    } else if (fallback === null) {
      if (value === null || typeof value === "string") out[key] = value;
    } else if (typeof value === typeof fallback) {
      out[key] = value;
    }
  }

  const scope = out.triggerScope;
  if (scope !== "specific" && scope !== "any" && scope !== "next") out.triggerScope = "specific";
  const mode = out.matchMode;
  if (mode !== "specific" && mode !== "any") out.matchMode = "specific";
  if ((out.publicReplyMessages as string[]).length === 0) out.publicReplyMessages = [""];

  return out as unknown as CampaignDraft;
}

export function parseDraft(
  raw: string | null | undefined
): { draft: CampaignDraft; step: number; savedAt: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (!parsed || parsed.v !== DRAFT_VERSION) return null;
    const draft = sanitizeDraft(parsed.draft);
    const step = Math.max(
      0,
      Math.min(STEP_IDS.length - 1, Math.floor(Number(parsed.step) || 0))
    );
    return { draft, step, savedAt: Number(parsed.savedAt) || 0 };
  } catch {
    return null;
  }
}

/**
 * True when the draft differs from a blank one in a way worth keeping.
 * The account and active flag are ignored: they are always pre-set.
 */
export function isDraftDirty(draft: CampaignDraft): boolean {
  const blank = createEmptyDraft(draft.instagramAccountId);
  const strip = (d: CampaignDraft) =>
    JSON.stringify({ ...d, instagramAccountId: "", isActive: true, postThumb: null, postCaption: "" });
  return strip(draft) !== strip(blank);
}
