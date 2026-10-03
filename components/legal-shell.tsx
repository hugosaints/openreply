import PublicFooter from "@/components/public/public-footer";
import PublicHeader from "@/components/public/public-header";
import { heroGlow } from "@/components/public/ui";
import { createI18n } from "@/lib/i18n";

interface LegalShellProps {
  title: string;
  description: string;
  updatedAt: string;
  children: React.ReactNode;
}

// Policies are published in English only and stay statically rendered.
const { t } = createI18n("en");

export default function LegalShell({
  title,
  description,
  updatedAt,
  children,
}: LegalShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader t={t} />

      <main>
        <section className="relative isolate overflow-hidden border-b border-border">
          <div aria-hidden="true" className={heroGlow} />
          <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-muted/70 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Last updated {updatedAt}
            </span>
            <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted">{description}</p>
          </div>
        </section>

        <article className="mx-auto w-full max-w-3xl space-y-4 px-5 py-12 text-sm leading-7 text-muted sm:px-8 [&>section]:rounded-2xl [&>section]:border [&>section]:border-border [&>section]:bg-surface [&>section]:p-6 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground">
          {children}
        </article>
      </main>

      <PublicFooter t={t} />
    </div>
  );
}
