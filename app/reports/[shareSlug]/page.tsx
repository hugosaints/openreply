import type { Metadata } from "next";
import type { I18n } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip, Logo, heroGlow } from "@/components/public/ui";
import { getCampaignReportBySlug } from "@/lib/reports/data";
import { IconExternalLink } from "@tabler/icons-react";

type ReportPageProps = {
  params: Promise<{ shareSlug: string }>;
};

function formatDate(date: Date | null, { locale, t }: Pick<I18n, "locale" | "t">) {
  if (!date) return t("No sends yet");
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1.5 text-xs leading-5 text-subtle">{helper}</p>
    </div>
  );
}

function Card({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const { shareSlug } = await params;
  const report = await getCampaignReportBySlug(shareSlug, locale);

  if (!report) {
    return {
      title: t("Report Not Found"),
      robots: { index: false, follow: false },
    };
  }

  return {
    title: t("{name} Campaign Report", { name: report.campaign.name }),
    description: t("Read-only Instagram comment-to-DM campaign report for {name}.", { name: report.campaign.name }),
    robots: { index: false, follow: false },
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { locale, t } = await getI18n();
  const { shareSlug } = await params;
  const report = await getCampaignReportBySlug(shareSlug, locale);

  if (!report) {
    notFound();
  }

  const maxDaily = Math.max(
    ...report.daily.map((day) => Math.max(day.sent, day.clicks)),
    1
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative isolate overflow-hidden border-b border-border">
        <div aria-hidden="true" className={heroGlow} />
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent-muted/70 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t("Client campaign report")}
              </span>
              <h1 className="mt-5 max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
                {report.campaign.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>@{report.campaign.instagramUsername}</span>
                {report.campaign.goal && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{report.campaign.goal}</span>
                  </>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    report.campaign.isActive ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${report.campaign.isActive ? "bg-success" : "bg-warning"}`} />
                  {report.campaign.isActive ? t("Active campaign") : t("Paused campaign")}
                </span>
              </div>
            </div>

            <div className="panel rounded-2xl p-4 text-sm md:min-w-64">
              <p className="text-xs font-medium text-subtle">{t("Workspace")}</p>
              <p className="mt-1 font-heading text-base font-semibold text-foreground">{report.workspace.name}</p>
              <p className="mt-3 text-xs text-muted">
                {t("Generated")} {formatDate(report.generatedAt, { locale, t })}
              </p>
              {report.branded && (
                <Link
                  href="/"
                  className="mt-4 inline-flex h-8 items-center justify-center rounded-lg bg-accent-soft px-3 text-xs font-medium text-accent transition-colors hover:bg-accent-muted/60"
                >
                  {t("Powered by OpenReply")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-6 px-5 py-10 sm:px-8">
        <div className="panel-split grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
          <MetricCard
            label={t("DMs sent")}
            value={report.metrics.sent}
            helper={t("Private replies successfully sent.")}
          />
          <MetricCard
            label={t("Skipped")}
            value={report.metrics.skipped}
            helper={t("Duplicates, limits, or no-send outcomes.")}
          />
          <MetricCard
            label={t("Failed")}
            value={report.metrics.failed}
            helper={t("Replies that need operational review.")}
          />
          <MetricCard
            label={t("Clicks")}
            value={report.metrics.clicks}
            helper={t("Tracked link visits from replies.")}
          />
          <MetricCard
            label={t("CTR")}
            value={`${report.metrics.ctr}%`}
            helper={t("Clicks divided by sent replies.")}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card
            title={t("Last 7 Days")}
            description={t("Sent replies and tracked clicks by day.")}
            aside={
              <p className="text-xs text-subtle">
                {t("Last send:")} {formatDate(report.metrics.latestSentAt, { locale, t })}
              </p>
            }
          >
            <div className="mt-8 grid h-56 grid-cols-7 items-end gap-1.5 sm:gap-3">
              {report.daily.map((day) => (
                <div key={day.date} className="flex h-full flex-col justify-end gap-2">
                  <div className="flex min-h-0 flex-1 items-end gap-1">
                    <div
                      className="w-full rounded-t-md bg-accent"
                      style={{
                        height: `${Math.max((day.sent / maxDaily) * 100, 4)}%`,
                      }}
                      title={t("{count} sent", { count: day.sent })}
                    />
                    <div
                      className="w-full rounded-t-md bg-success"
                      style={{
                        height: `${Math.max((day.clicks / maxDaily) * 100, 4)}%`,
                      }}
                      title={t("{count} clicks", { count: day.clicks })}
                    />
                  </div>
                  <p className="truncate text-center text-[11px] text-subtle">{day.date}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
                {t("Sent replies")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-success" />
                {t("Link clicks")}
              </span>
            </div>
          </Card>

          <aside className="space-y-6">
            <Card title={t("Top Keywords")}>
              <div className="mt-4 space-y-3">
                {report.topKeywords.length === 0 && (
                  <p className="text-sm text-muted">{t("No matched keyword data yet.")}</p>
                )}
                {report.topKeywords.map((keyword) => (
                  <div
                    key={keyword.keyword}
                    className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-medium text-foreground">{keyword.keyword}</span>
                    <span className="rounded-md bg-surface-hover px-2 py-0.5 text-xs font-medium text-muted">
                      {keyword.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title={t("Tracked Links")}>
              <div className="mt-4 space-y-3">
                {report.trackedLinks.length === 0 && (
                  <p className="text-sm text-muted">{t("This campaign does not have a tracked link.")}</p>
                )}
                {report.trackedLinks.map((link) => (
                  <div key={link.slug} className="flex items-center justify-between gap-4">
                    <span className="min-w-0 truncate text-sm text-muted">{link.destinationHost}</span>
                    <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                      {link.clicks}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>

        <Card title={t("Campaign Setup")}>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-subtle">{t("Keywords")}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {report.campaign.keywords.map((keyword) => (
                  <Chip key={keyword}>{keyword}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-subtle">{t("Created")}</p>
              <p className="mt-3 text-sm text-foreground">{formatDate(report.campaign.createdAt, { locale, t })}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-subtle">{t("Source post")}</p>
              {report.campaign.postUrl ? (
                <a
                  href={report.campaign.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
                >
                  {t("View Instagram post")}
                  <IconExternalLink size={14} stroke={1.75} />
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted">{t("Not attached")}</p>
              )}
            </div>
          </div>
        </Card>

        {report.branded && (
          <footer className="flex flex-col items-center gap-3 border-t border-border pt-8 text-center text-xs text-subtle">
            <Link href="/" aria-label="OpenReply">
              <Logo />
            </Link>
            {t("Built with OpenReply, the Instagram comment-to-DM campaign OS.")}
          </footer>
        )}
      </section>
    </main>
  );
}
