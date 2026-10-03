import type { FieldKey } from "@/lib/campaigns/wizard";

/** DOM id of the control that owns each validated field. */
export const FIELD_DOM_IDS: Record<FieldKey, string> = {
  name: "campaign-name",
  instagramAccountId: "campaign-account",
  postId: "campaign-post",
  keywords: "campaign-keywords",
  openingDmMessage: "campaign-opening-message",
  openingDmButtonLabel: "campaign-opening-button",
  dmMessage: "campaign-dm-message",
  trackedDestinationUrl: "campaign-link-url",
  secondaryDestinationUrl: "campaign-second-url",
  followUpMessage: "campaign-follow-up-message",
};

/** Field order within the pages, used to pick the first invalid one. */
const FIELD_ORDER = Object.keys(FIELD_DOM_IDS) as FieldKey[];

export function firstErrorField(errors: Partial<Record<FieldKey, unknown>>): FieldKey | null {
  return FIELD_ORDER.find((key) => errors[key]) ?? null;
}

/** Focus (and scroll to) a field once React has rendered it. */
export function focusField(key: FieldKey | null) {
  if (!key || typeof window === "undefined") return;
  window.setTimeout(() => {
    const el = document.getElementById(FIELD_DOM_IDS[key]);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  }, 60);
}
