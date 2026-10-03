"use client";

import { useI18n } from "@/lib/i18n/provider";

type Tone = "success" | "neutral" | "warning" | "accent";

const TONES: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  neutral: "bg-surface-hover text-muted",
  warning: "bg-warning-soft text-warning",
  accent: "bg-accent-soft text-accent",
};

export function Pill({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Active / Paused badge for a campaign. */
export default function StatusPill({ active }: { active: boolean }) {
  const { t } = useI18n();
  return (
    <Pill tone={active ? "success" : "neutral"} dot>
      {active ? t("Active") : t("Paused")}
    </Pill>
  );
}
