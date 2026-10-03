import type { I18n } from "@/lib/i18n";
import { IconCircleCheckFilled, IconCornerDownRight, IconMessageCircleBolt } from "@tabler/icons-react";

/** Product-style mock of a campaign: comment → keyword match → private reply. */
export default function ReplyPreview({ t }: { t: I18n["t"] }) {
  return (
    <figure className="relative isolate mx-auto w-full max-w-[460px]" aria-label={t("Example campaign: a GUIDE comment triggers a private reply with a guide link")}>
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_40%,var(--color-accent-muted),transparent)] opacity-60 blur-2xl"
      />
      <div className="panel overflow-hidden rounded-2xl shadow-[0_24px_60px_-24px_rgb(29_38_48/0.28)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
              <IconMessageCircleBolt size={16} stroke={2} />
            </span>
            <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
              {t("Campaign preview")}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("Active")}
          </span>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              S
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-semibold text-foreground">Sunday studio</p>
              <p className="text-xs text-muted">@sunday.studio · Instagram</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-accent-muted/60 bg-gradient-to-br from-accent-soft via-white to-white p-5">
            <div aria-hidden="true" className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-accent-muted/70" />
            <div aria-hidden="true" className="absolute -right-3 -top-3 h-18 w-18 rounded-full border border-accent-muted/70" />
            <p className="relative text-xs font-medium text-accent">
              {t("Campaign")}: {t("New drop")}
            </p>
            <p className="relative mt-2 max-w-[16rem] font-heading text-xl font-semibold leading-snug tracking-tight text-foreground">
              {t("Comment GUIDE below and I’ll send you the link.")}
            </p>
            <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs text-muted ring-1 ring-border">
              {t("Keyword")}: <span className="font-semibold text-foreground">{t("GUIDE")}</span>
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-muted">
              M
            </span>
            <div className="rounded-xl rounded-tl-sm bg-surface-hover px-3 py-2 text-sm">
              <p className="text-xs font-semibold text-foreground">maya.creates</p>
              <p className="mt-0.5 text-foreground">{t("GUIDE! need this 😍")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">
              <IconCircleCheckFilled size={14} />
              {t("Keyword matched")}
            </span>
            <span className="h-px flex-1 bg-border" />
            <span className="inline-flex items-center gap-1">
              <IconCornerDownRight size={14} stroke={1.75} />
              {t("Private reply")}
            </span>
          </div>

          <div className="ml-9 rounded-xl rounded-tl-sm bg-accent p-4 text-white shadow-[0_10px_24px_-12px_rgb(79_70_229/0.7)]">
            <p className="text-sm leading-relaxed">{t("Hey Maya! Here’s the link 👇")}</p>
            <span className="mt-3 flex items-center justify-between rounded-lg bg-white/15 px-3 py-2 text-sm font-medium">
              {t("Shop the new drop")}
              <span aria-hidden="true">↗</span>
            </span>
          </div>

          <p className="ml-9 flex items-center gap-1.5 text-xs text-muted">
            <IconCircleCheckFilled size={14} className="text-success" />
            {t("Sent through the official Instagram API")}
          </p>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-subtle">
        {t("Example content. Your keywords, your message, your links.")}
      </figcaption>
    </figure>
  );
}
