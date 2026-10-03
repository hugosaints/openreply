"use client";

import BarList, { type BarListRow } from "@/components/overview/bar-list";
import { countryName, formatNumber } from "@/components/overview/format";
import { Panel, SectionState } from "@/components/overview/section";
import Segmented from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n/provider";
import { shareOfTotal, tidyCityName } from "@/lib/reports/overview-insights";
import type { BreakdownEntry, Demographics, ZernioOverviewExtras } from "@/lib/zernio/analytics";
import { IconInfoCircle } from "@tabler/icons-react";
import { useState } from "react";

type Audience = "followers" | "engaged";

const GENDER_TONES: Record<string, string> = {
  F: "bg-accent",
  M: "bg-accent/55",
  U: "bg-border-hover",
};

/** Age buckets sort numerically by their lower bound ("13-17" < "18-24" < "65+"). */
function ageOrder(dimension: string): number {
  const n = Number.parseInt(dimension, 10);
  return Number.isFinite(n) ? n : 999;
}

function GenderSplit({ entries }: { entries: BreakdownEntry[] }) {
  const { t, locale } = useI18n();
  const labels: Record<string, string> = { F: t("Women"), M: t("Men"), U: t("Not specified") };
  const rows = [...entries].filter((e) => e.value > 0).sort((a, b) => b.value - a.value);
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted">{t("No data in this period")}</p>;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-hover" role="img" aria-label={t("Gender split")}>
        {rows.map((row) => (
          <span
            key={row.dimension}
            className={`${GENDER_TONES[row.dimension] ?? "bg-border-hover"} h-full transition-[width] duration-500`}
            style={{ width: `${shareOfTotal(entries, row.value)}%` }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((row) => (
          <li key={row.dimension} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <i className={`h-2.5 w-2.5 rounded-full ${GENDER_TONES[row.dimension] ?? "bg-border-hover"}`} />
              {labels[row.dimension] ?? row.dimension}
            </span>
            <span className="tabular-nums text-muted">
              <span className="font-medium text-foreground">{shareOfTotal(entries, row.value).toLocaleString(locale)}%</span>
              <span className="ml-2 text-xs">{formatNumber(row.value, locale)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AgeColumns({ entries }: { entries: BreakdownEntry[] }) {
  const { t, locale } = useI18n();
  const rows = [...entries].sort((a, b) => ageOrder(a.dimension) - ageOrder(b.dimension));
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (rows.every((r) => r.value === 0)) {
    return <p className="py-8 text-center text-sm text-muted">{t("No data in this period")}</p>;
  }
  return (
    <div className="flex h-[200px] items-end gap-2 sm:gap-3" role="img" aria-label={t("Age distribution")}>
      {rows.map((row) => (
        <div key={row.dimension} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-xs font-medium tabular-nums text-foreground">
            {shareOfTotal(entries, row.value).toLocaleString(locale)}%
          </span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-accent/70 transition-[height] duration-500"
              style={{ height: `${Math.max((row.value / max) * 100, row.value > 0 ? 3 : 0)}%` }}
              title={`${row.dimension}: ${row.value.toLocaleString(locale)}`}
            />
          </div>
          <span className="truncate text-xs text-muted">{row.dimension}</span>
        </div>
      ))}
    </div>
  );
}

function demographicsRows(
  entries: BreakdownEntry[],
  label: (dimension: string) => string,
  locale: string
): BarListRow[] {
  return [...entries]
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((e) => ({
      label: label(e.dimension),
      value: e.value,
      display: `${shareOfTotal(entries, e.value).toLocaleString(locale)}%`,
      hint: e.value.toLocaleString(locale),
    }));
}

export default function AudiencePanel({
  extras,
  loading,
}: {
  extras: ZernioOverviewExtras | null;
  loading: boolean;
}) {
  const { t, locale } = useI18n();
  const [audience, setAudience] = useState<Audience>("followers");

  if (loading && !extras) {
    return (
      <div className="space-y-6">
        <SectionState loading />
        <SectionState loading />
      </div>
    );
  }

  const issue = extras?.issues.find((i) => i.section === "audience");
  const sources = extras?.audience ?? null;
  const available = (["followers", "engaged"] as const).filter((key) => sources?.[key]);

  if (!sources || available.length === 0) {
    return (
      <div className="space-y-4">
        <SectionState issue={issue} />
        <p className="text-center text-xs text-subtle">{t("Audience demographics need at least 100 followers.")}</p>
      </div>
    );
  }

  const active: Audience = available.includes(audience) ? audience : available[0];
  const data: Demographics = sources[active]!;
  const genderTotal = data.gender.reduce((sum, e) => sum + e.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold text-foreground">{t("Audience")}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {active === "followers"
              ? t("Who follows the account, by gender, age and location.")
              : t("Who engaged with your content recently, by gender, age and location.")}
          </p>
        </div>
        {available.length > 1 && (
          <Segmented
            id="overview-audience"
            ariaLabel={t("Audience")}
            value={active}
            onChange={setAudience}
            options={[
              { value: "followers", label: t("Followers") },
              { value: "engaged", label: t("Engaged audience") },
            ]}
          />
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-accent/15 bg-accent-soft px-4 py-3 text-sm">
        <IconInfoCircle size={18} stroke={1.75} className="mt-px shrink-0 text-accent" />
        <p className="text-foreground">
          {t("Instagram shares the top 45 entries per breakdown and refreshes it with up to 48 hours of delay.")}
          {genderTotal > 0 && (
            <>
              {" "}
              {t("{count} people in this sample.", { count: genderTotal.toLocaleString(locale) })}
            </>
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel id="audience-gender" title={t("Gender")} subtitle={t("Share of the audience")}>
          <GenderSplit entries={data.gender} />
        </Panel>
        <Panel id="audience-age" title={t("Age")} subtitle={t("Share of the audience by age range")}>
          <AgeColumns entries={data.age} />
        </Panel>
        <Panel id="audience-countries" title={t("Top countries")} subtitle={t("Where the audience lives")}>
          <BarList
            limit={10}
            rows={demographicsRows(data.country, (code) => countryName(code, locale), locale)}
            empty={t("No data in this period")}
          />
        </Panel>
        <Panel id="audience-cities" title={t("Top cities")} subtitle={t("Cities with the most people")}>
          <BarList
            limit={10}
            rows={demographicsRows(data.city, tidyCityName, locale)}
            empty={t("No data in this period")}
          />
        </Panel>
      </div>
    </div>
  );
}
