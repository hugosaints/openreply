/**
 * Pure aggregations over the Overview payload (posts + follower history).
 * Kept framework-free so they can be unit-tested and reused by reports.
 */

export interface InsightPost {
  id: string;
  caption: string | null;
  permalink: string | null;
  mediaType: string;
  timestamp: string;
  views: number | null;
  reach: number | null;
  likes: number;
  comments: number;
  saved: number | null;
  shares: number | null;
}

export interface FollowerPoint {
  date: string;
  followers: number;
  delta: number | null;
}

export type PostMetric = "views" | "reach" | "likes" | "comments" | "saved" | "shares" | "interactions";

export function postInteractions(p: InsightPost): number {
  return p.likes + p.comments + (p.saved ?? 0) + (p.shares ?? 0);
}

export function postMetric(p: InsightPost, metric: PostMetric): number | null {
  return metric === "interactions" ? postInteractions(p) : p[metric];
}

/** Top N posts by a metric; posts without the metric (null) are skipped. */
export function topPosts(posts: InsightPost[], metric: PostMetric, limit = 6) {
  return posts
    .map((p) => ({ post: p, value: postMetric(p, metric) }))
    .filter((x): x is { post: InsightPost; value: number } => x.value !== null && x.value > 0)
    .sort((a, b) => b.value - a.value || b.post.timestamp.localeCompare(a.post.timestamp))
    .slice(0, limit);
}

/**
 * Collapse Instagram's media_product_type / media_type values into the four
 * formats people think in.
 */
export function contentFormat(mediaType: string): "REELS" | "CAROUSEL" | "VIDEO" | "IMAGE" | "STORY" | "OTHER" {
  const t = mediaType.toUpperCase();
  if (t === "REELS" || t === "REEL") return "REELS";
  if (t.startsWith("CAROUSEL")) return "CAROUSEL";
  if (t === "STORY" || t === "STORIES") return "STORY";
  if (t === "VIDEO") return "VIDEO";
  if (t === "IMAGE" || t === "FEED" || t === "PHOTO") return "IMAGE";
  return "OTHER";
}

interface Group {
  key: string;
  posts: number;
  interactions: number;
}

function groupBy(posts: InsightPost[], keyOf: (p: InsightPost) => string): Group[] {
  const map = new Map<string, Group>();
  for (const p of posts) {
    const key = keyOf(p);
    const g = map.get(key) ?? { key, posts: 0, interactions: 0 };
    g.posts += 1;
    g.interactions += postInteractions(p);
    map.set(key, g);
  }
  return [...map.values()];
}

function toRows(groups: Group[], by: "posts" | "avg") {
  return groups
    .map((g) => ({
      label: g.key,
      count: by === "posts" ? g.posts : Math.round(g.interactions / g.posts),
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Posts and average interactions per content format. Labels are format codes. */
export function contentMix(posts: InsightPost[]) {
  const groups = groupBy(posts, (p) => contentFormat(p.mediaType));
  return { posts: toRows(groups, "posts"), avgInteractions: toRows(groups, "avg") };
}

/**
 * Posts and average interactions per weekday (local time of the caller).
 * Labels are weekday indexes "0".."6" (Sunday = 0) for the UI to localize.
 */
export function weekdayStats(posts: InsightPost[]) {
  const groups = groupBy(posts, (p) => String(new Date(p.timestamp).getDay()));
  return { posts: toRows(groups, "posts"), avgInteractions: toRows(groups, "avg") };
}

/** Average of a metric across posts that report it; null when none do. */
export function averagePerPost(posts: InsightPost[], metric: PostMetric): number | null {
  const values = posts.map((p) => postMetric(p, metric)).filter((v): v is number => v !== null);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Restrict history to the last `days` points (by date), or all when null. */
export function sliceFollowerHistory(history: FollowerPoint[], days: number | null, today = new Date()) {
  if (days === null) return history;
  const cutoff = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return history.filter((p) => p.date >= cutoffKey);
}

/** Net change and percentage between the first and last point of a window. */
export function followerChange(history: FollowerPoint[]) {
  if (history.length < 2) return null;
  const first = history[0].followers;
  const last = history[history.length - 1].followers;
  const net = last - first;
  const pct = first > 0 ? Number(((net / first) * 100).toFixed(1)) : null;
  return { net, pct, days: history.length };
}
