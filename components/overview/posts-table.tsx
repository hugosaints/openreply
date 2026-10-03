"use client";

import type { OverviewPost } from "@/app/api/instagram/overview/route";
import { formatDateTime, formatDuration, formatNumber as formatCount, formatPercent } from "@/components/overview/format";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { contentFormat, postInteractions } from "@/lib/reports/overview-insights";
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconPhoto,
  IconSearch,
  IconSelector,
} from "@tabler/icons-react";
import { Fragment, useMemo, useState } from "react";

type SortKey =
  | "timestamp"
  | "views"
  | "reach"
  | "likes"
  | "comments"
  | "saved"
  | "shares"
  | "interactions"
  | "engagementRate";

const PAGE_SIZE = 10;

export function useFormatLabel() {
  const { t } = useI18n();
  const labels: Record<ReturnType<typeof contentFormat>, string> = {
    REELS: t("Reels"),
    CAROUSEL: t("Carousel"),
    VIDEO: t("Video"),
    IMAGE: t("Image"),
    STORY: t("Story"),
    OTHER: t("Other"),
  };
  return (code: string) => labels[code as keyof typeof labels] ?? code;
}

function formatNumber(n: number | null, locale: Locale): string {
  if (n === null) return "—";
  return new Intl.NumberFormat(locale, { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}

function sortValue(p: OverviewPost, key: SortKey): number | string {
  if (key === "timestamp") return p.timestamp;
  if (key === "interactions") return postInteractions(p);
  if (key === "engagementRate") return p.details?.engagementRate ?? -1;
  // Missing insights sort below every real value.
  return p[key] ?? -1;
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

/** Everything Zernio reports for one post beyond the table columns. */
function PostDetails({ post }: { post: OverviewPost }) {
  const { t, locale } = useI18n();
  const d = post.details;
  if (!d) return null;

  const stats: { label: string; value: string }[] = [];
  const add = (label: string, value: string | null) => {
    if (value !== null) stats.push({ label, value });
  };
  const count = (n: number | null) => (n === null ? null : formatCount(n, locale));

  add(t("Impressions"), count(d.impressions));
  add(t("Engagement rate"), d.engagementRate === null ? null : formatPercent(d.engagementRate, locale, 2));
  add(t("Link clicks"), count(d.clicks));
  add(t("New followers"), count(d.follows));
  add(t("Reposts"), count(d.reposts));
  add(t("Profile views"), count(d.profileViews));
  add(t("Video length"), d.videoDurationSeconds === null ? null : formatDuration(d.videoDurationSeconds * 1000, locale));
  add(t("Avg. watch time"), d.reelsAvgWatchMs === null || d.reelsAvgWatchMs === 0 ? null : formatDuration(d.reelsAvgWatchMs, locale));
  add(
    t("Avg. watched"),
    d.reelsAvgWatchMs && d.videoDurationSeconds
      ? formatPercent(Math.min((d.reelsAvgWatchMs / 1000 / d.videoDurationSeconds) * 100, 100), locale, 0)
      : null
  );
  add(t("Total watch time"), d.reelsTotalWatchMs === null || d.reelsTotalWatchMs === 0 ? null : formatDuration(d.reelsTotalWatchMs, locale));
  add(t("Skip rate"), d.reelsSkipRate === null ? null : formatPercent(d.reelsSkipRate, locale));
  add(t("Audio"), d.mediaAudioType === null ? null : d.mediaAudioType === "MUSIC" ? t("Music") : t("Original sound"));
  add(t("Shared to feed"), d.isSharedToFeed === null ? null : d.isSharedToFeed ? t("Yes") : t("No"));
  add(t("AI-generated"), d.isAiGenerated === null ? null : d.isAiGenerated ? t("Yes") : t("No"));
  add(t("Last synced"), d.lastUpdated === null ? null : formatDateTime(d.lastUpdated, locale));

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <DetailStat key={s.label} label={s.label} value={s.value} />
      ))}
    </dl>
  );
}

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-hover text-subtle">
      <IconPhoto size={18} stroke={1.5} />
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived Instagram CDN URLs
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}

export default function PostsTable({ posts, loading = false }: { posts: OverviewPost[]; loading?: boolean }) {
  const { t, locale } = useI18n();
  const formatLabel = useFormatLabel();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "timestamp", dir: "desc" });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const hasDetails = posts.some((p) => p.details);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? posts.filter((p) => (p.caption ?? "").toLowerCase().includes(q)) : posts;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
  }, [posts, query, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setPage(0);
    setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "views", label: t("Views") },
    { key: "reach", label: t("Reach") },
    { key: "likes", label: t("Likes") },
    { key: "comments", label: t("Comments") },
    { key: "saved", label: t("Saved") },
    { key: "shares", label: t("Shares") },
  ];

  function renderSortHeader(k: SortKey, label: string) {
    const active = sort.key === k;
    const Icon = !active ? IconSelector : sort.dir === "desc" ? IconArrowDown : IconArrowUp;
    return (
      <th
        key={k}
        scope="col"
        aria-sort={active ? (sort.dir === "desc" ? "descending" : "ascending") : "none"}
        className="px-3 py-2.5 text-right font-medium"
      >
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className={`inline-flex items-center gap-1 rounded hover:text-foreground ${active ? "text-foreground" : ""}`}
        >
          {label}
          <Icon size={13} stroke={2} className={active ? "text-accent" : "text-subtle"} />
        </button>
      </th>
    );
  }

  return (
    <section className="panel overflow-hidden" aria-labelledby="posts-title" aria-busy={loading}>
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="posts-title" className="font-heading text-[15px] font-semibold text-foreground">
            {t("Posts")}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {t(rows.length === 1 ? "{count} post" : "{count} posts", { count: rows.length })}
          </p>
        </div>
        <label className="relative flex h-9 items-center sm:w-64">
          <span className="sr-only">{t("Search posts")}</span>
          <IconSearch size={16} stroke={1.5} className="pointer-events-none absolute left-3 text-subtle" />
          <input
            id="posts-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={t("Search captions")}
            className="h-full w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-subtle focus:border-accent/50"
          />
        </label>
      </div>

      {loading ? (
        <div className="space-y-px border-t border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-surface-hover" />
              <div className="h-3.5 flex-1 animate-pulse rounded bg-surface-hover" />
              <div className="h-3.5 w-24 animate-pulse rounded bg-surface-hover" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="border-t border-border px-5 py-12 text-center text-sm text-muted">
          {query ? t("No results") : t("No posts found")}
        </p>
      ) : (
        <>
          {/* Eight metric columns can't compress into a phone; let the table keep
              its natural width and scroll inside the panel instead. */}
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${hasDetails ? "min-w-[960px]" : "min-w-[860px]"}`}>
              <thead>
                <tr className="border-y border-border bg-surface-hover/60 text-xs text-muted">
                  <th scope="col" className="px-5 py-2.5 text-left font-medium">{t("Post")}</th>
                  {columns.map((c) => renderSortHeader(c.key, c.label))}
                  {hasDetails && renderSortHeader("engagementRate", t("Eng. rate"))}
                  {renderSortHeader("timestamp", t("Date"))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => {
                  const caption = p.caption || t("{type} post", { type: formatLabel(contentFormat(p.mediaType)) });
                  const open = openId === p.id && Boolean(p.details);
                  const colSpan = columns.length + (hasDetails ? 3 : 2);
                  return (
                    <Fragment key={p.id}>
                      <tr className="border-b border-border transition-colors last:border-0 hover:bg-surface-hover/50">
                        <td className="max-w-[320px] px-5 py-2.5">
                          <div className="flex items-center gap-3">
                            {hasDetails && (
                              <button
                                type="button"
                                id={`post-toggle-${p.id}`}
                                onClick={() => setOpenId(open ? null : p.id)}
                                disabled={!p.details}
                                aria-expanded={open}
                                aria-label={open ? t("Hide details") : t("Show details")}
                                title={open ? t("Hide details") : t("Show details")}
                                className="icon-btn -ml-2 shrink-0 disabled:cursor-default disabled:opacity-25"
                              >
                                <IconChevronDown
                                  size={16}
                                  stroke={1.75}
                                  className={`transition-transform ${open ? "rotate-180" : ""}`}
                                />
                              </button>
                            )}
                            <Thumb src={p.thumbnailUrl} />
                            <div className="min-w-0">
                              {p.permalink ? (
                                <a
                                  href={p.permalink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-center gap-1 text-foreground hover:text-accent"
                                  title={caption}
                                >
                                  <span className="truncate">{caption}</span>
                                  <IconExternalLink size={13} stroke={1.75} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                                </a>
                              ) : (
                                <span className="block truncate text-foreground" title={caption}>{caption}</span>
                              )}
                              <span className="mt-0.5 inline-flex rounded-full bg-accent-soft px-2 py-px text-[11px] font-medium text-accent">
                                {formatLabel(contentFormat(p.mediaType))}
                              </span>
                            </div>
                          </div>
                        </td>
                        {columns.map((c) => {
                          const value = p[c.key as keyof OverviewPost] as number | null;
                          return (
                            <td
                              key={c.key}
                              className={`px-3 py-2.5 text-right tabular-nums ${value === null ? "text-subtle" : "text-foreground"}`}
                            >
                              {formatNumber(value, locale)}
                            </td>
                          );
                        })}
                        {hasDetails && (
                          <td
                            className={`px-3 py-2.5 text-right tabular-nums ${
                              p.details?.engagementRate == null ? "text-subtle" : "text-foreground"
                            }`}
                          >
                            {p.details?.engagementRate == null ? "—" : formatPercent(p.details.engagementRate, locale, 2)}
                          </td>
                        )}
                        <td className="whitespace-nowrap px-3 py-2.5 pr-5 text-right text-xs text-muted">
                          <time dateTime={p.timestamp}>
                            {new Date(p.timestamp).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}
                          </time>
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-border bg-surface-hover/40 last:border-0">
                          <td colSpan={colSpan} className="px-5 py-4">
                            <PostDetails post={p} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
              <p className="text-xs text-muted">
                {t("{from}–{to} of {total}", {
                  from: safePage * PAGE_SIZE + 1,
                  to: Math.min((safePage + 1) * PAGE_SIZE, rows.length),
                  total: rows.length,
                })}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="posts-prev-page"
                  className="icon-btn disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 0}
                  aria-label={t("Previous page")}
                >
                  <IconChevronLeft size={16} stroke={1.75} />
                </button>
                <span className="min-w-14 text-center text-xs tabular-nums text-muted">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  id="posts-next-page"
                  className="icon-btn disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= pageCount - 1}
                  aria-label={t("Next page")}
                >
                  <IconChevronRight size={16} stroke={1.75} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
