"use client";

import Segmented from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n/provider";
import type { RankRow } from "@/lib/tracking/analytics";
import { useState } from "react";

export interface RankingRow extends RankRow {
  /** Optional external link for the label (opens in a new tab). */
  href?: string | null;
}

export interface RankingTab {
  value: string;
  label: string;
  rows: RankingRow[];
}

export interface RankingColumn {
  id: string;
  title: string;
  /** Period hint shown to the right of the title. */
  subtitle?: string;
  tabs: RankingTab[];
  empty: string;
  /** Map stored labels (status codes, sentinels) to display text. */
  formatLabel?: (label: string) => string;
}

function RankingColumnView({ column, loading }: { column: RankingColumn; loading: boolean }) {
  const { locale } = useI18n();
  const [tab, setTab] = useState(column.tabs[0]?.value ?? "");
  const current = column.tabs.find((x) => x.value === tab) ?? column.tabs[0];
  const rows = current?.rows ?? [];
  const max = Math.max(...rows.map((r) => r.count), 1);
  const panelId = `ranking-${column.id}-panel`;

  return (
    <div className="flex min-w-0 flex-col p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-[15px] font-semibold text-foreground">{column.title}</h2>
        {column.subtitle && <span className="shrink-0 text-xs text-subtle">{column.subtitle}</span>}
      </div>
      <Segmented
        id={`ranking-${column.id}`}
        full
        className="mt-4"
        ariaLabel={column.title}
        value={current?.value ?? ""}
        onChange={setTab}
        options={column.tabs.map((x) => ({ value: x.value, label: x.label }))}
      />

      <div id={panelId} role="tabpanel" className="mt-4 flex-1">
        {loading ? (
          <ul className="space-y-4" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i}>
                <div className="flex justify-between">
                  <div className="h-3.5 w-28 animate-pulse rounded bg-surface-hover" />
                  <div className="h-3.5 w-10 animate-pulse rounded bg-surface-hover" />
                </div>
                <div className="mt-2 h-1 w-1/2 animate-pulse rounded-full bg-surface-hover" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="flex h-full min-h-[160px] items-center justify-center text-center text-sm text-muted">
            {column.empty}
          </p>
        ) : (
          <ul className="space-y-3.5">
            {rows.map((row, index) => {
              const label = column.formatLabel ? column.formatLabel(row.label) : row.label;
              const pct = (row.count / max) * 100;
              return (
                <li key={`${index}-${row.label}`}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    {row.href ? (
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 truncate text-foreground hover:text-accent hover:underline"
                        title={label}
                      >
                        {label}
                      </a>
                    ) : (
                      <span className="min-w-0 truncate text-foreground" title={label}>
                        {label}
                      </span>
                    )}
                    <span className="shrink-0 font-medium tabular-nums text-foreground">
                      {row.count.toLocaleString(locale)}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1 rounded-full bg-accent/60 transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max(pct, 3)}%` }}
                    role="presentation"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** One card, three ranking columns split by dividers (stacks on mobile). */
export default function RankingPanel({ columns, loading = false }: { columns: RankingColumn[]; loading?: boolean }) {
  return (
    <section className="panel-split grid-cols-1 lg:grid-cols-3">
      {columns.map((column, i) => (
        <div key={column.id} className={i > 0 ? "border-t lg:border-l lg:border-t-0" : ""}>
          <RankingColumnView column={column} loading={loading} />
        </div>
      ))}
    </section>
  );
}
