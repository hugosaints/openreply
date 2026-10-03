import Link from "next/link";
import LanguageSwitcher from "@/components/language-switcher";
import { Logo, type T } from "@/components/public/ui";
import { GITHUB_URL, formatStars, getGitHubStars } from "@/lib/public-links";
import { IconBrandGithub } from "@tabler/icons-react";

const NAV = [
  { href: "/templates", label: "Templates", key: "templates" },
  { href: "/#how", label: "How it works", key: "how" },
  { href: "/#features", label: "Features", key: "features" },
  { href: "/#setup", label: "Self-host", key: "setup" },
  { href: "/#faq", label: "FAQ", key: "faq" },
] as const;

/**
 * Sticky marketing header shared by the landing, SEO, template and legal pages.
 * The language switcher is only offered where the page itself is localized.
 */
export default async function PublicHeader({
  t,
  active,
  showLanguage = false,
}: {
  t: T;
  active?: (typeof NAV)[number]["key"];
  showLanguage?: boolean;
}) {
  const stars = await getGitHubStars();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label={t("OpenReply home")}>
          <Logo />
        </Link>
        <nav aria-label={t("Main navigation")} className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-hover hover:text-foreground ${
                active === item.key ? "bg-accent-soft font-medium text-accent hover:bg-accent-soft hover:text-accent" : "text-muted"
              }`}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t("View OpenReply on GitHub")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-surface-hover"
          >
            <IconBrandGithub size={16} stroke={1.75} />
            {stars !== null && <span>{formatStars(stars)}</span>}
          </a>
          {showLanguage && (
            <div className="hidden sm:block">
              <LanguageSwitcher compact />
            </div>
          )}
          <Link
            href="/login"
            className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:inline-flex"
          >
            {t("Sign in")}
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {t("Get started")}
          </Link>
        </div>
      </div>
    </header>
  );
}
