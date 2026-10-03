import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicFooter from "@/components/public/public-footer";
import PublicHeader from "@/components/public/public-header";
import { Chip, heroGlow, primaryButton, secondaryButton } from "@/components/public/ui";
import TemplateVisual from "@/components/template-visual";
import JsonLd from "@/components/seo/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo/site";
import { createI18n } from "@/lib/i18n";
import { IconArrowLeft, IconArrowRight, IconCheck } from "@tabler/icons-react";
import {
  CAMPAIGN_TEMPLATES,
  getCampaignTemplate,
  getCampaignTemplateSlugs,
} from "@/lib/templates/campaign-templates";

type TemplatePageProps = {
  params: Promise<{ slug: string }>;
};

// Template playbooks are English-only search content and stay static.
const { t } = createI18n("en");

export function generateStaticParams() {
  return getCampaignTemplateSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: TemplatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const template = getCampaignTemplate(slug);

  if (!template) {
    return {
      title: "Template Not Found - OpenReply",
    };
  }

  return buildPageMetadata({
    title: `${template.title} - Instagram Comment-to-DM Template`,
    description: template.summary,
    path: `/templates/${template.slug}`,
    image: false,
    keywords: [
      `${template.title} template`,
      "Instagram comment to DM template",
      "Instagram DM campaign template",
      template.category,
      template.audience,
    ],
  });
}

export default async function TemplateDetailPage({ params }: TemplatePageProps) {
  const { slug } = await params;
  const template = getCampaignTemplate(slug);

  if (!template) {
    notFound();
  }

  const relatedTemplates = CAMPAIGN_TEMPLATES.filter(
    (item) => item.slug !== template.slug
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "OpenReply", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Templates", item: absoluteUrl("/templates") },
            { "@type": "ListItem", position: 3, name: template.title, item: absoluteUrl(`/templates/${template.slug}`) },
          ],
        }}
      />
      <PublicHeader t={t} active="templates" />

      <main>
        <section className="relative isolate overflow-hidden border-b border-border">
          <div aria-hidden="true" className={heroGlow} />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
            <div>
              <Link
                href="/templates"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                <IconArrowLeft size={16} stroke={1.75} />
                Back to templates
              </Link>
              <div className="mt-8">
                <Chip tone="accent">{template.category} template</Chip>
              </div>
              <h1 className="mt-5 font-heading text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
                {template.title}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{template.summary}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={`/login?template=${template.slug}`} className={primaryButton}>
                  Use this template
                  <IconArrowRight size={16} stroke={2} />
                </Link>
                <a href="#playbook" className={secondaryButton}>
                  Read playbook
                </a>
              </div>
            </div>

            <TemplateVisual template={template} />
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {[
              ["Audience", template.audience],
              ["Setup time", `${template.setupMinutes} minutes`],
              ["Campaign goal", template.goal],
            ].map(([label, value]) => (
              <div key={label} className="panel rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle">{label}</p>
                <p className="mt-2 font-heading text-lg font-semibold tracking-tight text-foreground">{value}</p>
              </div>
            ))}
          </aside>

          <div id="playbook" className="scroll-mt-24 space-y-6">
            <section className="panel rounded-2xl p-6">
              <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">Campaign Outcome</h2>
              <p className="mt-3 text-base leading-relaxed text-muted">{template.outcome}</p>
            </section>

            <section className="panel rounded-2xl p-6">
              <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">Setup Playbook</h2>
              <ol className="mt-5 space-y-4">
                {template.playbook.map((step, index) => (
                  <li key={step} className="flex items-start gap-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 text-sm leading-relaxed text-foreground/85">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              {[
                ["Best For", template.bestFor],
                ["Metrics To Watch", template.metrics],
              ].map(([heading, items]) => (
                <div key={heading as string} className="panel rounded-2xl p-6">
                  <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                    {heading as string}
                  </h2>
                  <ul className="mt-4 space-y-2.5">
                    {(items as string[]).map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/85">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                          <IconCheck size={13} stroke={2.5} />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <section className="relative isolate overflow-hidden rounded-2xl bg-accent p-6 text-white">
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(50%_80%_at_100%_0%,rgb(255_255_255/0.2),transparent)]"
              />
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <h2 className="font-heading text-2xl font-semibold tracking-tight">
                    Copy this campaign into OpenReply
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    Sign in, connect Instagram, pick a post or reel, and the template copy will be ready for your
                    campaign draft.
                  </p>
                </div>
                <Link
                  href={`/login?template=${template.slug}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
                >
                  Use this template
                  <IconArrowRight size={16} stroke={2} />
                </Link>
              </div>
            </section>
          </div>
        </section>

        <section className="border-t border-border bg-surface-hover/40 py-16">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">More templates</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {relatedTemplates.map((item) => (
                <Link
                  key={item.slug}
                  href={`/templates/${item.slug}`}
                  className="panel group rounded-2xl p-5 transition-colors hover:border-accent-muted hover:bg-accent-soft/40"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent">{item.category}</p>
                  <h3 className="mt-2 font-heading text-lg font-semibold tracking-tight text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter t={t} />
    </div>
  );
}
