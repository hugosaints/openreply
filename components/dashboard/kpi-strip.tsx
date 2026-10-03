"use client";

import TrendChip from "@/components/dashboard/trend-chip";

export interface KpiItem {
  id: string;
  label: string;
  value: string;
  trend?: { changePct: number | null; current: number };
  /** Per-cell caption; falls back to the strip-level caption. */
  caption?: string;
  /** Dim the value (e.g. metric unavailable). */
  muted?: boolean;
}

interface KpiStripProps {
  items: KpiItem[];
  caption?: string;
  loading?: boolean;
  /** Grid column classes; defaults to 2 on phones, 4 on desktop. */
  columnsClassName?: string;
}

/**
 * Single card split into KPI cells by hairline dividers.
 *
 * Every cell draws a left and top border and the grid is pulled 1px up/left
 * inside an overflow-hidden card, so the outer edges are clipped and the
 * dividers stay correct for any column count or wrap.
 */
export default function KpiStrip({
  items,
  caption,
  loading = false,
  columnsClassName = "grid-cols-2 lg:grid-cols-4",
}: KpiStripProps) {
  return (
    <section className="panel overflow-hidden" aria-busy={loading}>
      <div className={`-ml-px -mt-px grid ${columnsClassName}`}>
        {items.map((item) => {
          const cellCaption = item.caption ?? caption;
          return (
            <div key={item.id} id={`kpi-${item.id}`} className="min-w-0 border-l border-t border-border px-5 py-5">
              <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
              {loading ? (
                <div className="mt-3 space-y-2" aria-hidden="true">
                  <div className="h-7 w-24 animate-pulse rounded bg-surface-hover" />
                  <div className="h-3 w-28 animate-pulse rounded bg-surface-hover" />
                </div>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <p
                      className={`font-heading text-[26px] font-semibold leading-tight tracking-tight tabular-nums ${
                        item.muted ? "text-subtle" : "text-foreground"
                      }`}
                    >
                      {item.value}
                    </p>
                    {item.trend && (
                      <TrendChip
                        changePct={item.trend.changePct}
                        current={item.trend.current}
                        srContext={cellCaption}
                      />
                    )}
                  </div>
                  {cellCaption && <p className="mt-1 truncate text-xs text-subtle">{cellCaption}</p>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
