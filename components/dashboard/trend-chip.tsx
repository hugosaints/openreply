"use client";

import { useI18n } from "@/lib/i18n/provider";
import { IconArrowDown, IconArrowUp, IconMinus } from "@tabler/icons-react";

interface TrendChipProps {
  /** Percent change; null means there was no baseline last period. */
  changePct: number | null;
  /** Current value — distinguishes "new activity" from "still nothing". */
  current: number;
  /** Comparison sentence for screen readers, e.g. "compared to last week". */
  srContext?: string;
}

/** Reference-style trend: tinted round arrow badge followed by the percentage. */
export default function TrendChip({ changePct, current, srContext }: TrendChipProps) {
  const { t, locale } = useI18n();

  if (changePct === null) {
    return current > 0 ? (
      <span className="inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
        {t("New")}
      </span>
    ) : null;
  }

  const up = changePct > 0;
  const flat = changePct === 0;
  const tone = flat ? "text-subtle" : up ? "text-success" : "text-error";
  const badge = flat ? "bg-surface-hover" : up ? "bg-success-soft" : "bg-error-soft";
  const Icon = flat ? IconMinus : up ? IconArrowUp : IconArrowDown;
  const pct = `${Math.abs(changePct).toLocaleString(locale, { maximumFractionDigits: 1 })}%`;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${tone}`}>
      <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${badge}`} aria-hidden="true">
        <Icon size={12} stroke={2.25} />
      </span>
      <span aria-hidden="true">{pct}</span>
      <span className="sr-only">
        {flat ? t("No change") : up ? t("Up {pct}", { pct }) : t("Down {pct}", { pct })}
        {srContext ? ` ${srContext}` : ""}
      </span>
    </span>
  );
}
