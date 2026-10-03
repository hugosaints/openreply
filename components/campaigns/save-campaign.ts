/**
 * Client-side persistence helpers for campaigns. Thin wrappers over the
 * existing `/api/automations` routes (unchanged) that normalise the response
 * shape and surface zod field errors.
 */

import type { CampaignPayload } from "@/lib/campaigns/wizard";
import { errorFieldToStep, type StepId } from "@/lib/campaigns/wizard";

export type SaveResult =
  | { ok: true }
  | {
      ok: false;
      /** Human-readable message (already translated when known). */
      message: string;
      /** API field names that failed validation, in API order. */
      fields: string[];
      /** Earliest wizard step that owns a failing field. */
      step: StepId | null;
    };

const ORDER: StepId[] = ["setup", "trigger", "engagement", "delivery", "review"];

export async function saveCampaign(options: {
  mode: "new" | "edit";
  id?: string;
  payload: CampaignPayload | Partial<CampaignPayload>;
  translate: (message: string) => string;
  fallbackMessage: string;
}): Promise<SaveResult> {
  const { mode, id, payload, translate, fallbackMessage } = options;
  try {
    const res =
      mode === "new"
        ? await fetch("/api/automations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/automations?id=${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
    const data = await res.json();
    if (data.success) return { ok: true };

    const fieldErrors = data.details?.fieldErrors as Record<string, string[]> | undefined;
    const fields = fieldErrors ? Object.keys(fieldErrors) : [];
    const first = fields[0];
    const raw = first ? fieldErrors?.[first]?.[0] : undefined;
    let message = fallbackMessage;
    if (raw) {
      const translated = translate(raw);
      // Known sentences read fine alone; raw zod messages need the field name.
      message = translated !== raw ? translated : `${first}: ${raw}`;
    } else if (typeof data.error === "string") {
      message = translate(data.error);
    }
    const steps = fields.map(errorFieldToStep);
    const step = ORDER.find((s) => steps.includes(s)) ?? null;
    return { ok: false, message, fields, step };
  } catch {
    return { ok: false, message: fallbackMessage, fields: [], step: null };
  }
}
