/**
 * CSV → import queue rows. Pure and shared by the import page (live preview +
 * submit) and its tests.
 */

import type { ImportRow } from "@/lib/import-queue";
import { parseCsv } from "@/lib/utils/csv";

export type CsvImportResult =
  | { ok: true; rows: ImportRow[] }
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "row"; row: number };

export const MAX_IMPORT_KEYWORDS = 10;

export function csvToImportRows(csv: string): CsvImportResult {
  const parsed = parseCsv(csv);
  if (parsed.length === 0) return { ok: false, reason: "empty" };

  const rows: ImportRow[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i];
    const keywords = (r.keywords ?? "")
      .split(/[,;]/)
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, MAX_IMPORT_KEYWORDS);
    const dmMessage = (r.dm_message ?? r.message ?? "").trim();
    if (keywords.length === 0 || !dmMessage) return { ok: false, reason: "row", row: i + 1 };
    rows.push({
      name: (r.name ?? "").trim(),
      keywords,
      dmMessage,
      publicReply: (r.public_reply ?? "").trim(),
      trackedUrl: (r.tracked_url ?? "").trim(),
      openingDmMessage: (r.opening_dm ?? "").trim(),
      openingDmButtonLabel: (r.opening_dm_button ?? "").trim(),
    });
  }
  return { ok: true, rows };
}
