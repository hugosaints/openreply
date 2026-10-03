"use client";

import type { StaticMessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
/**
 * Status label for DM status. `text` (default) is plain colored text; `pill`
 * adds a tinted background for tables.
 */

const statusConfig: Record<string, { text: string; pill: string; label: StaticMessageKey }> = {
  SENT: { text: "text-success", pill: "bg-success-soft text-success", label: "Sent" },
  FAILED: { text: "text-error", pill: "bg-error-soft text-error", label: "Failed" },
  PENDING: { text: "text-warning", pill: "bg-warning-soft text-warning", label: "Pending" },
  SKIPPED_DEDUP: { text: "text-muted", pill: "bg-surface-hover text-muted", label: "Dedup" },
  SKIPPED_RATE_LIMIT: { text: "text-warning", pill: "bg-warning-soft text-warning", label: "Rate limited" },
  SKIPPED_PLAN_LIMIT: { text: "text-warning", pill: "bg-warning-soft text-warning", label: "Skipped" },
  SKIPPED_NO_MATCH: { text: "text-muted", pill: "bg-surface-hover text-muted", label: "No match" },
};

interface StatusBadgeProps {
  status: string;
  variant?: "text" | "pill";
}

export default function StatusBadge({ status, variant = "text" }: StatusBadgeProps) {
  const { t } = useI18n();
  const config = statusConfig[status] ?? statusConfig.PENDING;

  if (variant === "pill") {
    return (
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${config.pill}`}
      >
        <i className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        {t(config.label)}
      </span>
    );
  }

  return (
    <span className={`shrink-0 whitespace-nowrap text-sm ${config.text}`}>
      {t(config.label)}
    </span>
  );
}
