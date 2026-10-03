"use client";

import BarList, { type BarListRow } from "@/components/overview/bar-list";
import { formatNumber, formatPercent } from "@/components/overview/format";
import { Panel, SectionState } from "@/components/overview/section";
import { useI18n } from "@/lib/i18n/provider";
import { localizeBestTimes } from "@/lib/reports/overview-insights";
import type { ZernioOverviewExtras } from "@/lib/zernio/analytics";
import { useMemo } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK = Array.from({ length: 7 }, (_, i) => i);
const ACCENT_RGB = "79, 70, 229";

function BestTimesHeatmap({ slots }: { slots: NonNullable<ZernioOverviewExtras["bestTimes"]> }) {
  const { t, locale } = useI18n();

  // Slots arrive in UTC weekday/hour; show them in the viewer's timezone.
  const local = useMemo(() => localizeBestTimes(slots), [slots]);
  const cells = useMemo(() => {
    const map = new Map<string, (typeof local)[number]>();
    for (const slot of local) map.set(`${slot.dayOfWeek}-${slot.hour}`, slot);
    return map;
  }, [local]);
  const max = Math.max(...local.map((s) => s.avgEngagement), 1);
  const top = [...local].sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 3);

  // 2024-01-01 was a Monday, matching Zernio's 0 = Monday convention.
  const dayName = (index: number, style: "short" | "long") =>
    new Date(2024, 0, 1 + index).toLocaleDateString(locale, { weekday: style });
  const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

  if (local.length === 0) {
    return <p className="flex min-h-[140px] items-center justify-center text-sm text-muted">{t("Not enough posts to suggest posting times yet.")}</p>;
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2" aria-label={t("Best slots")}>
        {top.map((slot, i) => (
          <li
            key={`${slot.dayOfWeek}-${slot.hour}`}
            className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
          >
            <span className="tabular-nums">#{i + 1}</span>
            <span>
              {dayName(slot.dayOfWeek, "long")} · {hourLabel(slot.hour)}
            </span>
            <span className="text-accent/70">
              {t("{count} avg interactions", { count: formatNumber(Math.round(slot.avgEngagement), locale) })}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[3rem_repeat(24,minmax(0,1fr))] gap-[3px]">
            <span />
            {HOURS.map((hour) => (
              <span key={hour} className="text-center text-[10px] tabular-nums text-subtle">
                {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
              </span>
            ))}
            {WEEK.map((day) => (
              <Row
                key={day}
                day={day}
                dayLabel={dayName(day, "short")}
                cells={cells}
                max={max}
                describe={(slot) =>
                  t("{day} {time} — {count} avg interactions, {posts} posts", {
                    day: dayName(day, "long"),
                    time: hourLabel(slot.hour),
                    count: formatNumber(Math.round(slot.avgEngagement), locale),
                    posts: slot.postCount,
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-subtle">
        {t("Times are shown in your local timezone. Darker cells mean more average interactions per post.")}
      </p>
    </div>
  );
}

function Row({
  day,
  dayLabel,
  cells,
  max,
  describe,
}: {
  day: number;
  dayLabel: string;
  cells: Map<string, { hour: number; avgEngagement: number; postCount: number; dayOfWeek: number }>;
  max: number;
  describe: (slot: { hour: number; avgEngagement: number; postCount: number }) => string;
}) {
  return (
    <>
      <span className="flex items-center text-xs text-muted">{dayLabel}</span>
      {HOURS.map((hour) => {
        const slot = cells.get(`${day}-${hour}`);
        return (
          <span
            key={hour}
            className={`aspect-square rounded-[3px] ${slot ? "" : "bg-surface-hover"}`}
            style={slot ? { backgroundColor: `rgba(${ACCENT_RGB}, ${0.16 + 0.84 * (slot.avgEngagement / max)})` } : undefined}
            title={slot ? describe(slot) : undefined}
          />
        );
      })}
    </>
  );
}

export default function TimingPanel({
  extras,
  loading,
}: {
  extras: ZernioOverviewExtras | null;
  loading: boolean;
}) {
  const { t, locale } = useI18n();

  if (loading && !extras) return <SectionState loading />;
  if (!extras) return null;

  const issue = (section: "bestTimes" | "frequency" | "decay") => extras.issues.find((i) => i.section === section);

  const frequencyRows: BarListRow[] = (extras.frequency ?? []).map((f) => ({
    label: t("{count} posts per week", { count: f.postsPerWeek }),
    value: f.avgEngagementRate,
    display: formatPercent(f.avgEngagementRate, locale, 2),
    hint: t("{count} weeks", { count: f.weeks }),
  }));
  const bestFrequency = extras.frequency?.length
    ? [...extras.frequency].sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)[0]
    : null;

  const decayRows: BarListRow[] = (extras.decay ?? []).map((d) => ({
    label: d.label,
    value: d.pctOfFinal,
    display: formatPercent(d.pctOfFinal, locale, 0),
    hint: t("{count} posts", { count: d.postCount }),
  }));

  return (
    <div className="space-y-6">
      <Panel
        id="timing-best"
        title={t("Best time to post")}
        subtitle={t("Average interactions per post by weekday and hour.")}
      >
        {extras.bestTimes ? <BestTimesHeatmap slots={extras.bestTimes} /> : <SectionState issue={issue("bestTimes")} />}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          id="timing-frequency"
          title={t("Posting frequency")}
          subtitle={
            bestFrequency
              ? t("Best engagement rate at {count} posts per week.", { count: bestFrequency.postsPerWeek })
              : t("Engagement rate by how often you post.")
          }
        >
          {extras.frequency ? (
            <BarList rows={frequencyRows} empty={t("Not enough posts to compare yet.")} />
          ) : (
            <SectionState issue={issue("frequency")} />
          )}
        </Panel>
        <Panel
          id="timing-decay"
          title={t("Content lifespan")}
          subtitle={t("Share of a post's total engagement reached after each time window.")}
        >
          {extras.decay ? (
            <BarList rows={decayRows} empty={t("Not enough posts to compare yet.")} />
          ) : (
            <SectionState issue={issue("decay")} />
          )}
        </Panel>
      </div>
    </div>
  );
}
