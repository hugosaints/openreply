import Link from "next/link";
import { Logo, SponsorCredit, type T } from "@/components/public/ui";
import { GITHUB_URL, SETUP_DOCS_URL } from "@/lib/public-links";

export default function PublicFooter({ t }: { t: T }) {
  return (
    <footer className="border-t border-border bg-surface-hover/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <div>
            <Link href="/" aria-label={t("OpenReply home")}>
              <Logo />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted">{t("Open source Instagram comment-to-DM automation.")}</p>
          </div>
          <nav className="flex flex-wrap items-start gap-x-6 gap-y-3 text-sm text-muted">
            <a href={GITHUB_URL} className="hover:text-foreground">
              {t("GitHub")}
            </a>
            <a href={SETUP_DOCS_URL} className="hover:text-foreground">
              {t("Setup guide")}
            </a>
            <Link href="/templates" className="hover:text-foreground">
              {t("Templates")}
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              {t("Privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {t("Terms")}
            </Link>
            <Link href="/data-deletion" className="hover:text-foreground">
              {t("Data deletion")}
            </Link>
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-5 text-xs text-subtle sm:flex-row sm:items-center">
          <span>
            {t("MIT licensed")} · {t("Built by {name}", { name: "Diwen Huang" })}
          </span>
          <SponsorCredit placement="landing-footer" t={t} />
        </div>
      </div>
    </footer>
  );
}
