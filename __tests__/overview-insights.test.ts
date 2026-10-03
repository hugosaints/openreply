import { describe, expect, it } from "vitest";
import {
  averagePerPost,
  contentFormat,
  contentMix,
  followerChange,
  postInteractions,
  sliceFollowerHistory,
  topPosts,
  weekdayStats,
  type InsightPost,
} from "../lib/reports/overview-insights";

function post(overrides: Partial<InsightPost> & { id: string }): InsightPost {
  return {
    caption: null,
    permalink: null,
    mediaType: "IMAGE",
    timestamp: "2026-09-01T12:00:00Z",
    views: null,
    reach: null,
    likes: 0,
    comments: 0,
    saved: null,
    shares: null,
    ...overrides,
  };
}

describe("overview insights", () => {
  it("sums interactions, treating missing insights as zero", () => {
    expect(postInteractions(post({ id: "a", likes: 3, comments: 2, saved: 1, shares: null }))).toBe(6);
  });

  it("ranks top posts and skips posts without the metric", () => {
    const posts = [
      post({ id: "a", views: 10 }),
      post({ id: "b", views: null }),
      post({ id: "c", views: 30 }),
      post({ id: "d", views: 0 }),
    ];
    expect(topPosts(posts, "views").map((x) => x.post.id)).toEqual(["c", "a"]);
  });

  it("normalizes content formats", () => {
    expect(contentFormat("REELS")).toBe("REELS");
    expect(contentFormat("CAROUSEL_ALBUM")).toBe("CAROUSEL");
    expect(contentFormat("FEED")).toBe("IMAGE");
    expect(contentFormat("VIDEO")).toBe("VIDEO");
    expect(contentFormat("SOMETHING")).toBe("OTHER");
  });

  it("groups posts and average interactions by format", () => {
    const mix = contentMix([
      post({ id: "a", mediaType: "REELS", likes: 10 }),
      post({ id: "b", mediaType: "REELS", likes: 20 }),
      post({ id: "c", mediaType: "IMAGE", likes: 5 }),
    ]);
    expect(mix.posts).toEqual([
      { label: "REELS", count: 2 },
      { label: "IMAGE", count: 1 },
    ]);
    expect(mix.avgInteractions).toEqual([
      { label: "REELS", count: 15 },
      { label: "IMAGE", count: 5 },
    ]);
  });

  it("buckets posts by local weekday index", () => {
    const sunday = new Date(2026, 8, 6, 12).toISOString();
    const stats = weekdayStats([post({ id: "a", timestamp: sunday, likes: 4 })]);
    expect(stats.posts).toEqual([{ label: "0", count: 1 }]);
  });

  it("averages only posts that report the metric", () => {
    expect(averagePerPost([post({ id: "a", reach: 10 }), post({ id: "b", reach: null }), post({ id: "c", reach: 20 })], "reach")).toBe(15);
    expect(averagePerPost([post({ id: "a" })], "reach")).toBeNull();
  });

  it("slices follower history and computes the window change", () => {
    const history = [
      { date: "2026-09-01", followers: 100, delta: null },
      { date: "2026-09-25", followers: 110, delta: 10 },
      { date: "2026-10-03", followers: 120, delta: 10 },
    ];
    const today = new Date("2026-10-03T15:00:00Z");
    const week = sliceFollowerHistory(history, 7, today);
    expect(week.map((p) => p.date)).toEqual(["2026-10-03"]);
    expect(followerChange(week)).toBeNull();

    const month = sliceFollowerHistory(history, 30, today);
    expect(followerChange(month)).toEqual({ net: 10, pct: 9.1, days: 2 });
    expect(sliceFollowerHistory(history, null)).toHaveLength(3);
  });
});
