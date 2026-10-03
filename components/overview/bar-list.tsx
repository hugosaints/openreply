"use client";

import { useI18n } from "@/lib/i18n/provider";

export interface BarListRow {
  label: string;
  value: number;
  /** Optional right-aligned text; defaults to the localized value. */
  display?: string;
  /** Secondary text under the label. */
  hint?: string;
}

/** Ranked horizontal bars, matching the look of the Overview ranking panel. */
export default function BarList({
  rows,
  empty,
  limit,
}: {
  rows: BarListRow[];
  empty: string;
  limit?: number;
}) {
  const { locale } = useI18n();
  const visible = limit ? rows.slice(0, limit) : rows;
  const max = Math.max(...visible.map((r) => r.value), 1);

  if (visible.length === 0) {
    return (
      <p className="flex min-h-[120px] items-center justify-center text-center text-sm text-muted">
        {empty}
      </p>
    );
  }

  return (
    <ul className="space-y-3.5">
      {visible.map((row, index) => (
        <li key={`${index}-${row.label}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-foreground" title={row.label}>
              {row.label}
              {row.hint && <span className="ml-2 text-xs text-subtle">{row.hint}</span>}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              {row.display ?? row.value.toLocaleString(locale)}
            </span>
          </div>
          <div
            className="mt-1.5 h-1 rounded-full bg-accent/60 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max((row.value / max) * 100, 3)}%` }}
            role="presentation"
          />
        </li>
      ))}
    </ul>
  );
}
