import Image from "next/image";
import type { I18n } from "@/lib/i18n";
import { zernioLink } from "@/lib/zernio-links";
import { IconMessageCircleBolt } from "@tabler/icons-react";

export type T = I18n["t"];

export const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgb(79_70_229/0.65)] transition-colors hover:bg-accent-hover";
export const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface px-5 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-surface-hover";

/** Soft indigo wash used behind page heroes. */
export const heroGlow =
  "absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_70%_0%,var(--color-accent-soft),transparent),radial-gradient(40%_40%_at_0%_30%,var(--color-accent-soft),transparent)]";

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
        <IconMessageCircleBolt size={18} stroke={2} />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight text-foreground">OpenReply</span>
    </span>
  );
}

export function SponsorCredit({ placement, t }: { placement: string; t: T }) {
  return (
    <a
      className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted hover:text-foreground"
      href={zernioLink({ placement })}
      target="_blank"
      rel="sponsored noopener noreferrer"
    >
      <span>{t("Supported by")}</span>
      <Image src="/brand/zernio-primary.svg" alt="Zernio" width={68} height={22} />
      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] text-subtle">
        {t("Optional paid provider")}
      </span>
    </a>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  center = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
      <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-relaxed text-muted">{description}</p>}
    </div>
  );
}

/** Small tag chip (keywords, categories). */
export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
        tone === "accent" ? "bg-accent-soft text-accent" : "bg-surface-hover text-foreground/80 ring-1 ring-border"
      }`}
    >
      {children}
    </span>
  );
}
