import type { Metadata } from "next";
import Link from "next/link";
import { DemoNotice } from "@/components/demo-notice";
import ReplyPreview from "@/components/landing/reply-preview";
import PublicFooter from "@/components/public/public-footer";
import PublicHeader from "@/components/public/public-header";
import { SectionHeading, SponsorCredit, heroGlow, primaryButton, secondaryButton } from "@/components/public/ui";
import { type StaticMessageKey } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/provider";
import { getI18n } from "@/lib/i18n/server";
import { GITHUB_URL, SETUP_DOCS_URL, ZERNIO_DOCS_URL } from "@/lib/public-links";
import JsonLd from "@/components/seo/json-ld";
import { SITE_NAME, absoluteUrl, buildPageMetadata } from "@/lib/seo/site";
import { zernioLink } from "@/lib/zernio-links";
import {
  IconArrowRight,
  IconBolt,
  IconBrandGithub,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconDatabase,
  IconInbox,
  IconLicense,
  IconListDetails,
  IconLock,
  IconMessage2Share,
  IconPlugConnected,
  IconRefresh,
  IconServer2,
  IconShieldCheck,
  IconStack2,
  IconTargetArrow,
  type Icon,
} from "@tabler/icons-react";

type Key = StaticMessageKey;

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return buildPageMetadata({
    title: t("OpenReply - Open source Instagram comment-to-DM automation"),
    description: t(
      "A free, self-hosted ManyChat alternative. Turn Instagram keyword comments into automatic private replies. Connect through your own Meta app or optional paid provider Zernio.",
    ),
    path: "/",
    image: false,
    locale,
  });
}

const steps: { icon: Icon; title: Key; description: Key }[] = [
  {
    icon: IconPlugConnected,
    title: "Connect your account",
    description: "Choose Zernio or your own Meta app, then connect an Instagram Business or Creator account.",
  },
  {
    icon: IconTargetArrow,
    title: "Set up a campaign",
    description:
      "Pick a post or reel, add keywords, and write the private reply. Add a public reply or tracked link buttons if you need them.",
  },
  {
    icon: IconBolt,
    title: "OpenReply handles the rest",
    description:
      "Incoming events trigger your campaigns. A background worker queues, rate-limits, and logs each send, with retries and comment reconciliation.",
  },
];

const features: { icon: Icon; title: Key; description: Key }[] = [
  {
    icon: IconMessage2Share,
    title: "Custom reply messages",
    description: "Write your own messages, personalize with a username, and use up to two tracked link buttons.",
  },
  {
    icon: IconTargetArrow,
    title: "Multiple triggers",
    description: "Trigger campaigns from post comments, incoming DMs, and text replies to Stories.",
  },
  {
    icon: IconInbox,
    title: "Inbox",
    description: "Read conversations and reply from OpenReply, within Instagram’s messaging window.",
  },
  {
    icon: IconListDetails,
    title: "Delivery logs",
    description: "See sent, skipped, and failed messages, with reasons. Follow tracked link clicks back to a campaign.",
  },
  {
    icon: IconRefresh,
    title: "Reliable queue",
    description:
      "A background worker queues, rate-limits, and retries every send so replies keep flowing within Instagram’s limits.",
  },
  {
    icon: IconChartBar,
    title: "Reports",
    description: "Track views, reach, interactions, and audience insights for every connected account.",
  },
];

const trust: { icon: Icon; label: Key }[] = [
  { icon: IconLicense, label: "MIT licensed" },
  { icon: IconShieldCheck, label: "Official Instagram API" },
  { icon: IconLock, label: "No password sharing" },
  { icon: IconDatabase, label: "Your campaigns, in your database" },
];

const runtime: { icon: Icon; label: Key; title: string; description: Key }[] = [
  { icon: IconStack2, label: "Web app", title: "Next.js + React", description: "Dashboard & incoming events" },
  {
    icon: IconServer2,
    label: "Background worker",
    title: "Node.js + BullMQ",
    description: "Queued delivery & reconciliation",
  },
  { icon: IconDatabase, label: "Your data", title: "PostgreSQL + Redis", description: "Campaigns, accounts, logs & queue" },
];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
            <IconCheck size={13} stroke={2.5} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const { locale, t } = await getI18n();

  const faqs: { question: string; answer: string; link?: { label: string; href: string; sponsored?: boolean } }[] = [
    {
      question: t("Is OpenReply free?"),
      answer: t(
        "Yes. OpenReply is MIT-licensed software with no software subscription or seat limits. You pay for your own infrastructure and any optional services you choose, including Zernio.",
      ),
    },
    {
      question: t("Can I use the public demo to send DMs?"),
      answer: t(
        "No. Deploy your own instance first. The public demo shows the interface; it is not a hosted automation service.",
      ),
      link: { label: t("Read the setup guide"), href: SETUP_DOCS_URL },
    },
    {
      question: t("Do I need Zernio?"),
      answer: t(
        "No. Zernio is an optional paid connection provider and sponsor. It can spare you setting up your own Meta app, while OpenReply still runs on your infrastructure. The direct Meta path stays available.",
      ),
      link: { label: t("Learn about Zernio"), href: zernioLink({ placement: "landing-faq" }), sponsored: true },
    },
    {
      question: t("Which Instagram accounts can I connect?"),
      answer: t(
        "Instagram Business and Creator accounts. Personal accounts are not supported. Connections use the official API, and Instagram’s platform policies still apply.",
      ),
    },
    {
      question: t("Are there differences between providers?"),
      answer: t(
        "Yes. With Zernio, the post picker shows the latest 25 posts. Reporting needs its analytics add-on and synced data, and follower snapshots can be up to 24 hours old. Inbox previews are omitted when message direction is unavailable; opening threads and replying are supported.",
      ),
      link: { label: t("Read the provider guide"), href: ZERNIO_DOCS_URL },
    },
  ];

  return (
    <I18nProvider locale={locale}>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: SITE_NAME,
            url: absoluteUrl("/"),
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            inLanguage: locale,
            description: t(
              "A free, self-hosted ManyChat alternative. Turn Instagram keyword comments into automatic private replies. Connect through your own Meta app or optional paid provider Zernio.",
            ),
            license: "https://opensource.org/licenses/MIT",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            codeRepository: GITHUB_URL,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: absoluteUrl("/"),
            inLanguage: locale,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]}
      />
      <div id="top" className="min-h-screen bg-background text-foreground">
        <a
          href="#main"
          className="absolute left-4 top-[-100px] z-[60] rounded-lg bg-surface px-3 py-2 text-sm font-medium ring-1 ring-border focus:top-3"
        >
          {t("Skip to content")}
        </a>
        <DemoNotice variant="banner" />

        <PublicHeader t={t} showLanguage />

        <main id="main">
          <section className="relative isolate overflow-hidden border-b border-border">
            <div aria-hidden="true" className={heroGlow} />
            <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-accent-muted/70 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {t("Free and open source")}
                </span>
                <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.06] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
                  {t("Turn Instagram comments")} <span className="text-accent">{t("into private replies.")}</span>
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                  {t(
                    "Someone comments a keyword on your post or reel, OpenReply sends them a DM automatically. Free, open source, self-hosted.",
                  )}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/login" className={primaryButton}>
                    {t("Get started")}
                    <IconArrowRight size={16} stroke={2} />
                  </Link>
                  <a href={SETUP_DOCS_URL} className={secondaryButton}>
                    {t("Set up OpenReply")}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <p className="mt-4 text-sm text-subtle">{t("Free software. Self-hosted. Your infrastructure.")}</p>
                <div className="mt-8 border-t border-border pt-5">
                  <SponsorCredit placement="landing-hero" t={t} />
                </div>
              </div>
              <ReplyPreview t={t} />
            </div>
          </section>

          <section className="border-b border-border bg-surface-hover/40">
            <ul className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-4 px-5 py-6 sm:px-8 lg:grid-cols-4">
              {trust.map(({ icon: TrustIcon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm font-medium text-foreground/85">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-accent ring-1 ring-border">
                    <TrustIcon size={18} stroke={1.75} />
                  </span>
                  {t(label)}
                </li>
              ))}
            </ul>
          </section>

          <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8">
            <SectionHeading
              center
              eyebrow={t("How it works")}
              title={t("Three steps from comment to conversation")}
              description={t(
                "Send a product link, share a resource, or deliver your latest guide. You decide what starts the conversation and what happens next.",
              )}
            />
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {steps.map(({ icon: StepIcon, title, description }, index) => (
                <li key={title} className="panel relative rounded-2xl p-6 transition-colors hover:border-border-hover">
                  <span className="absolute right-5 top-5 font-mono text-xs text-subtle">0{index + 1}</span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <StepIcon size={22} stroke={1.75} />
                  </span>
                  <h3 className="mt-5 font-heading text-lg font-semibold tracking-tight text-foreground">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(description)}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="features" className="scroll-mt-20 border-y border-border bg-surface-hover/40 py-20">
            <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
              <SectionHeading center eyebrow={t("Features")} title={t("Everything you need to automate replies")} />
              <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {features.map(({ icon: FeatureIcon, title, description }) => (
                  <article
                    key={title}
                    className="panel rounded-2xl p-6 transition-colors hover:border-border-hover"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <FeatureIcon size={20} stroke={1.75} />
                    </span>
                    <h3 className="mt-4 font-heading text-base font-semibold tracking-tight text-foreground">
                      {t(title)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{t(description)}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
            <div>
              <SectionHeading
                eyebrow={t("Open source")}
                title={t("Open code. A system you can inspect.")}
                description={t(
                  "OpenReply owns the campaigns, keyword matching, queues, retries, logs, and inbox. Your connection provider handles the Instagram API.",
                )}
              />
              <a href={GITHUB_URL} className={`${secondaryButton} mt-7`}>
                <IconBrandGithub size={16} stroke={1.75} />
                {t("Explore the source")}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="panel divide-y divide-border overflow-hidden rounded-2xl">
              {runtime.map(({ icon: RuntimeIcon, label, title, description }) => (
                <div key={label} className="flex items-center gap-4 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <RuntimeIcon size={22} stroke={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-subtle">{t(label)}</p>
                    <p className="font-heading text-base font-semibold tracking-tight text-foreground">{title}</p>
                    <p className="text-sm text-muted">{t(description)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="setup" className="scroll-mt-20 border-y border-border bg-surface-hover/40 py-20">
            <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
              <SectionHeading
                center
                eyebrow={t("Setup")}
                title={t("Self-host OpenReply. Choose your connection.")}
                description={t(
                  "Both options need your own web app, background worker, PostgreSQL, and Redis. OpenReply is free software; hosting and provider costs are separate.",
                )}
              />
              <div className="mt-12 grid gap-5 md:grid-cols-2">
                <article className="panel relative flex flex-col overflow-hidden rounded-2xl p-7">
                  <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-zernio-coral" />
                  <span className="w-fit rounded-full bg-zernio-coral/10 px-2.5 py-1 text-xs font-medium text-zernio-coral">
                    {t("Recommended for simpler setup")}
                  </span>
                  <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight text-foreground">
                    {t("Connect with Zernio")}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {t(
                      "Use Zernio’s managed Instagram connection instead of creating and reviewing your own Meta app. Save an API key in Settings, choose a profile, and connect your account.",
                    )}
                  </p>
                  <BulletList
                    items={[
                      t("No Meta app secrets to configure in OpenReply"),
                      t("OpenReply registers the webhook for you"),
                      t("Optional paid service and project sponsor"),
                    ]}
                  />
                  <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                    <a
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-zernio-coral px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      href={zernioLink({ placement: "landing-setup" })}
                      rel="sponsored noopener noreferrer"
                      target="_blank"
                    >
                      {t("Explore Zernio")} <span aria-hidden="true">↗</span>
                    </a>
                    <a className="text-sm font-medium text-muted underline underline-offset-4 hover:text-foreground" href={ZERNIO_DOCS_URL}>
                      {t("Read setup & feature limits")}
                    </a>
                  </div>
                </article>

                <article className="panel flex flex-col rounded-2xl p-7">
                  <span className="w-fit rounded-full bg-surface-hover px-2.5 py-1 text-xs font-medium text-muted">
                    {t("Direct connection")}
                  </span>
                  <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight text-foreground">
                    {t("Use your own Meta app")}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {t(
                      "Keep the existing direct Meta integration. Create your app, configure Instagram Login and webhooks, and manage platform credentials yourself.",
                    )}
                  </p>
                  <BulletList
                    items={[
                      t("Bring your own Meta app and secrets"),
                      t("Handle App Review where required"),
                      t("No Zernio account or subscription needed"),
                    ]}
                  />
                  <div className="mt-6 pt-1">
                    <a className={secondaryButton} href={`${SETUP_DOCS_URL}#the-meta-app`}>
                      {t("Follow the direct Meta guide")} <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </article>
              </div>
              <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-subtle">
                {t(
                  "Instagram’s account requirements, permissions, messaging windows, and rate limits apply with either provider. Existing accounts are never automatically migrated.",
                )}
              </p>
            </div>
          </section>

          <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-5 py-20 sm:px-8">
            <SectionHeading center eyebrow={t("FAQ")} title={t("Frequently asked questions")} />
            <div className="panel mt-10 divide-y divide-border overflow-hidden rounded-2xl">
              {faqs.map((faq) => (
                <details key={faq.question} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-base font-medium text-foreground transition-colors hover:bg-surface-hover/60 [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <IconChevronDown
                      size={18}
                      stroke={1.75}
                      className="shrink-0 text-muted transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="px-6 pb-5">
                    <p className="text-sm leading-relaxed text-muted">{faq.answer}</p>
                    {faq.link && (
                      <a
                        href={faq.link.href}
                        {...(faq.link.sponsored
                          ? { target: "_blank", rel: "sponsored noopener noreferrer" }
                          : {})}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
                      >
                        {faq.link.label}
                        <IconArrowRight size={14} stroke={2} />
                      </a>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-accent px-6 py-16 text-center text-white sm:px-12">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,rgb(255_255_255/0.22),transparent),radial-gradient(40%_60%_at_100%_100%,rgb(255_255_255/0.12),transparent)]"
              />
              <div className="relative">
                <h2 className="mx-auto max-w-xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  {t("Set up your first campaign")}
                </h2>
                <p className="mx-auto mt-4 max-w-md text-base text-white/80">
                  {t("Clone it, connect Instagram, and write your first reply.")}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={SETUP_DOCS_URL}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
                  >
                    {t("Set up OpenReply")} <span aria-hidden="true">↗</span>
                  </a>
                  <a
                    href={GITHUB_URL}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium text-white ring-1 ring-white/35 transition-colors hover:bg-white/10"
                  >
                    <IconBrandGithub size={16} stroke={1.75} />
                    {t("Star on GitHub")}
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <PublicFooter t={t} />
      </div>
    </I18nProvider>
  );
}
