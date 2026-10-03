"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { ZernioSectionIssue } from "@/lib/zernio/analytics";
import { IconChartDots, IconLock } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** Titled card wrapper shared by the Overview panels. */
export function Panel({
  title,
  subtitle,
  action,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  id: string;
}) {
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby={`${id}-title`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="font-heading text-[15px] font-semibold text-foreground">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Empty state for a section Zernio could not serve. A 402 means the Analytics
 * add-on is missing; anything else is treated as "not available right now".
 */
export function SectionState({
  issue,
  loading = false,
}: {
  issue?: ZernioSectionIssue;
  loading?: boolean;
}) {
  const { t } = useI18n();
  if (loading) return <div className="panel h-[220px] animate-pulse bg-surface-hover/40" aria-hidden="true" />;
  const addon = issue?.reason === "addon_required";
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        {addon ? <IconLock size={22} stroke={1.5} /> : <IconChartDots size={22} stroke={1.5} />}
      </span>
      <p className="mt-3 text-sm font-medium text-foreground">
        {addon ? t("Requires the Zernio Analytics add-on") : t("Not available yet")}
      </p>
      <p className="mt-1 max-w-md text-sm text-muted">
        {addon
          ? t("Enable the Analytics add-on in Zernio to unlock this section.")
          : t("Zernio has not returned this data yet. It appears once the account has synced.")}
      </p>
    </div>
  );
}
