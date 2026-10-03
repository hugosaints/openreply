import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/site";
import Link from "next/link";
import PublicFooter from "@/components/public/public-footer";
import PublicHeader from "@/components/public/public-header";
import { Chip, heroGlow, primaryButton, secondaryButton } from "@/components/public/ui";
import TemplateVisual from "@/components/template-visual";
import { createI18n } from "@/lib/i18n";
import { CAMPAIGN_TEMPLATES } from "@/lib/templates/campaign-templates";
import { IconArrowRight } from "@tabler/icons-react";

export const metadata: Metadata = buildPageMetadata({
  title: "Instagram Comment to DM Templates - OpenReply",
  description:
    "Copy ready-to-launch Instagram comment-to-DM campaign templates for product links, lead magnets, real estate, fitness, restaurants, events, and creators.",
  path: "/templates",
  keywords: ["Instagram comment to DM templates","comment to DM campaigns","Instagram DM automation templates","Manychat alternative templates"],
});

// The template library is English-only search content and stays static.
const { t } = createI18n("en");

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader t={t} active="templates" />

      <main>
        <section className="relative isolate overflow-hidden border-b border-border">
          <div aria-hidden="true" className={heroGlow} />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent-muted/70 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Public template library
              </span>
              <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
                Instagram campaigns you can <span className="text-accent">copy in minutes</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                Start with proven comment-to-DM playbooks for lead magnets, product links, events, service menus, and
                agency client campaigns.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/login" className={primaryButton}>
                  Start free
                  <IconArrowRight size={16} stroke={2} />
                </Link>
                <a href="#template-grid" className={secondaryButton}>
                  Browse templates
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {CAMPAIGN_TEMPLATES.slice(0, 2).map((template) => (
                <TemplateVisual key={template.slug} template={template} compact />
              ))}
            </div>
          </div>
        </section>

        <section id="template-grid" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CAMPAIGN_TEMPLATES.map((template) => (
              <article
                key={template.slug}
                className="panel flex min-h-full flex-col rounded-2xl p-5 transition-colors hover:border-border-hover"
              >
                <TemplateVisual template={template} compact />
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-accent">{template.category}</p>
                <h2 className="mt-2 font-heading text-xl font-semibold leading-tight tracking-tight text-foreground">
                  {template.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{template.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {template.keywords.map((keyword) => (
                    <Chip key={keyword}>{keyword}</Chip>
                  ))}
                </div>
                <div className="mt-auto grid gap-2 pt-6">
                  <Link href={`/templates/${template.slug}`} className={`${secondaryButton} h-10 w-full`}>
                    View playbook
                  </Link>
                  <Link href={`/login?template=${template.slug}`} className={`${primaryButton} h-10 w-full`}>
                    Use this template
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter t={t} />
    </div>
  );
}
