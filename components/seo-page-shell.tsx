import Link from "next/link";
import PublicFooter from "@/components/public/public-footer";
import PublicHeader from "@/components/public/public-header";
import { SectionHeading, heroGlow, primaryButton, secondaryButton } from "@/components/public/ui";
import { createI18n } from "@/lib/i18n";
import { IconArrowRight, IconCheck, IconChevronDown, IconX } from "@tabler/icons-react";

export interface SeoPageSection {
  title: string;
  body: string;
}

export interface SeoPageConfig {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta?: string;
  bullets: string[];
  sections: SeoPageSection[];
  comparisonTitle: string;
  comparisons: Array<{
    label: string;
    ours: string;
    other: string;
  }>;
  templateLinks: Array<{
    label: string;
    href: string;
  }>;
  faqs: SeoPageSection[];
}

// Search-landing pages are published in English and stay statically rendered.
const { t } = createI18n("en");

export default function SeoPageShell({ config }: { config: SeoPageConfig }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader t={t} />

      <main>
        <section className="relative isolate overflow-hidden border-b border-border">
          <div aria-hidden="true" className={heroGlow} />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent-muted/70 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {config.eyebrow}
              </span>
              <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
                {config.title}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{config.description}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/login" className={primaryButton}>
                  {config.primaryCta}
                  <IconArrowRight size={16} stroke={2} />
                </Link>
                <Link href="/templates" className={secondaryButton}>
                  {config.secondaryCta ?? "Browse templates"}
                </Link>
              </div>
            </div>

            <div className="panel rounded-2xl p-6 shadow-[0_24px_60px_-28px_rgb(29_38_48/0.25)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Campaign OS checklist</p>
              <ul className="mt-5 space-y-4">
                {config.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/85">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                      <IconCheck size={13} stroke={2.5} />
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {config.sections.map((section, index) => (
              <article key={section.title} className="panel relative rounded-2xl p-6 transition-colors hover:border-border-hover">
                <span className="font-mono text-xs text-subtle">0{index + 1}</span>
                <h2 className="mt-3 font-heading text-xl font-semibold tracking-tight text-foreground">{section.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface-hover/40 py-20">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <SectionHeading center eyebrow="Compare" title={config.comparisonTitle} />
            <div className="panel mt-10 overflow-hidden rounded-2xl">
              <div className="hidden grid-cols-[0.8fr_1fr_1fr] border-b border-border bg-surface-hover/70 text-xs font-semibold uppercase tracking-wider text-subtle md:grid">
                <div className="p-4">Need</div>
                <div className="p-4 text-accent">OpenReply</div>
                <div className="p-4">Generic automation</div>
              </div>
              {config.comparisons.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-1 border-b border-border last:border-0 md:grid-cols-[0.8fr_1fr_1fr]"
                >
                  <div className="p-4 text-sm font-medium text-foreground md:bg-surface-hover/40">{item.label}</div>
                  <div className="flex items-start gap-2.5 p-4 text-sm leading-relaxed text-foreground/85">
                    <IconCheck size={16} stroke={2.25} className="mt-0.5 shrink-0 text-success" />
                    {item.ours}
                  </div>
                  <div className="flex items-start gap-2.5 p-4 text-sm leading-relaxed text-muted">
                    <IconX size={16} stroke={2} className="mt-0.5 shrink-0 text-subtle" />
                    {item.other}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl items-start gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            eyebrow="Start from a template"
            title="Launch a campaign faster than building a chatbot flow"
            description="Use a campaign template, connect the right Instagram account, pick the post, and ship a measurable comment-to-DM loop."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {config.templateLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="panel group flex items-center justify-between gap-3 rounded-xl p-4 text-sm font-medium text-foreground transition-colors hover:border-accent-muted hover:bg-accent-soft/50"
              >
                {link.label}
                <IconArrowRight size={16} stroke={1.75} className="shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-surface-hover/40 py-20">
          <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
            <SectionHeading center eyebrow="FAQ" title="Search questions, answered clearly" />
            <div className="panel mt-10 divide-y divide-border overflow-hidden rounded-2xl">
              {config.faqs.map((faq) => (
                <details key={faq.title} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-base font-medium text-foreground transition-colors hover:bg-surface-hover/60 [&::-webkit-details-marker]:hidden">
                    {faq.title}
                    <IconChevronDown size={18} stroke={1.75} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{faq.body}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="relative isolate overflow-hidden rounded-3xl bg-accent px-6 py-16 text-center text-white sm:px-12">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-[radial-gradient(50%_80%_at_50%_0%,rgb(255_255_255/0.22),transparent),radial-gradient(40%_60%_at_100%_100%,rgb(255_255_255/0.12),transparent)]"
            />
            <h2 className="mx-auto max-w-xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Turn the next high-intent comment into a private reply
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/80">
              OpenReply is built for Instagram professional accounts, official Meta private replies, and campaign
              reporting teams can show clients.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
            >
              Start free
              <IconArrowRight size={16} stroke={2} />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter t={t} />
    </div>
  );
}
