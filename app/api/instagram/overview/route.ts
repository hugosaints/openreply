import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { getWorkspaceInstagramAccount } from "@/lib/instagram-accounts";
import {
  getAllUserMedia,
  getMediaInsights,
  PermissionError,
  type InstagramMedia,
} from "@/lib/instagram/provider";
import { createInstagramContext } from "@/lib/instagram/provider";
import {
  ensureFollowerHistory,
  getFollowerHistory,
  type FollowerHistoryPoint,
} from "@/lib/reports/follower-history";
import {
  getZernioPostAnalytics,
  type ZernioPostAnalytics,
} from "@/lib/zernio/analytics";

// Allow time for paginated media + per-post insight calls on larger accounts.
export const maxDuration = 60;

// Safety ceiling for "all time": bounds pagination and the number of
// per-media insight requests so we can't hammer the API or time out.
const MAX_POSTS = 500;

// How many insight requests to run at once.
const INSIGHTS_CONCURRENCY = 8;

/** Map over items with a bounded number of in-flight async operations. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}

/**
 * Extra per-post figures only Zernio reports. Every field is nullable: absent
 * means the platform did not report it for this media type, not zero.
 */
export interface OverviewPostDetails {
  impressions: number | null;
  engagementRate: number | null;
  clicks: number | null;
  follows: number | null;
  reposts: number | null;
  profileViews: number | null;
  /** Reels only: average watch time per play, in milliseconds. */
  reelsAvgWatchMs: number | null;
  /** Reels only: total watch time including replays, in milliseconds. */
  reelsTotalWatchMs: number | null;
  /** Reels only: % of views that skipped within the first 3 seconds. */
  reelsSkipRate: number | null;
  videoDurationSeconds: number | null;
  isAiGenerated: boolean | null;
  isSharedToFeed: boolean | null;
  /** MUSIC or ORIGINAL_SOUND. */
  mediaAudioType: string | null;
  /** When Zernio last synced this post's analytics. */
  lastUpdated: string | null;
}

export interface OverviewPost {
  id: string;
  caption: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  mediaType: string;
  timestamp: string;
  views: number | null;
  reach: number | null;
  likes: number;
  comments: number;
  saved: number | null;
  shares: number | null;
  details?: OverviewPostDetails;
}

export interface OverviewResponse {
  account: { id: string; username: string };
  accounts: Array<{ id: string; username: string }>;
  requestedCount: "all" | number;
  truncated: boolean;
  insightsAvailable: boolean;
  /** Current follower total, or null if Instagram did not return it. */
  followers: number | null;
  /**
   * Follower total per day, ascending. Independent of the selected post range —
   * limited to what has been snapshotted plus any 30-day insights backfill.
   */
  followerHistory: FollowerHistoryPoint[];
  totals: {
    posts: number;
    views: number;
    reach: number;
    likes: number;
    comments: number;
    saved: number;
    shares: number;
    interactions: number;
  };
  posts: OverviewPost[];
  provider?: "META" | "ZERNIO";
  limitations?: string[];
}

function isVideoLike(media: InstagramMedia): boolean {
  return media.media_product_type === "REELS" || media.media_type === "VIDEO";
}

/**
 * Zernio reports FEED for every non-reel feed post, so the carousel/video/image
 * distinction has to come from its media type.
 */
function zernioFormat(rich: ZernioPostAnalytics): string | null {
  const product = rich.mediaProductType?.toUpperCase();
  if (product === "REELS" || product === "STORY") return product;
  switch (rich.mediaType) {
    case "carousel":
      return "CAROUSEL_ALBUM";
    case "video":
      return "VIDEO";
    case "image":
      return "IMAGE";
    default:
      return null;
  }
}

function postDetails(rich: ZernioPostAnalytics): OverviewPostDetails {
  return {
    impressions: rich.impressions,
    engagementRate: rich.engagementRate,
    clicks: rich.clicks,
    follows: rich.follows,
    reposts: rich.reposts,
    profileViews: rich.profileViews,
    reelsAvgWatchMs: rich.reelsAvgWatchMs,
    reelsTotalWatchMs: rich.reelsTotalWatchMs,
    reelsSkipRate: rich.reelsSkipRate,
    videoDurationSeconds: rich.videoDurationSeconds,
    isAiGenerated: rich.isAiGenerated,
    isSharedToFeed: rich.isSharedToFeed,
    mediaAudioType: rich.mediaAudioType,
    lastUpdated: rich.lastUpdated,
  };
}

export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const account = await getWorkspaceInstagramAccount(
    workspaceId,
    request.nextUrl.searchParams.get("instagramAccountId")
  );

  if (!account) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Instagram account not connected. Please connect your account first.",
      },
      { status: 400 }
    );
  }

  try {
    const accessToken = await createInstagramContext(account);

    // `count` is either "all" or a positive integer (last N posts).
    const countParam = request.nextUrl.searchParams.get("count");
    const isAll = countParam === "all";
    const parsedCount = countParam ? Number.parseInt(countParam, 10) : NaN;
    const requestedCount: "all" | number = isAll
      ? "all"
      : Number.isFinite(parsedCount)
        ? Math.max(parsedCount, 1)
        : 50;

    const target = isAll
      ? MAX_POSTS
      : Math.min(requestedCount as number, MAX_POSTS);

    const media = await getAllUserMedia({ context: accessToken, max: target });
    const truncated =
      media.length >= MAX_POSTS ||
      (account.provider === "ZERNIO" && media.length >= 25);

    // Zernio returns every synced post's full analytics block in one paginated
    // call. null means the list could not be read, so the per-post path below
    // is used instead.
    let zernioPosts: Map<string, ZernioPostAnalytics> | null = null;
    if (accessToken.provider === "ZERNIO") {
      try {
        zernioPosts = await getZernioPostAnalytics(accessToken, target);
      } catch (err) {
        console.warn(
          "[Instagram Overview] Zernio post analytics list unavailable:",
          err instanceof Error ? err.message : err
        );
      }
    }

    // Likes and comments come free with basic media fields. Views / reach /
    // saved / shares require the insights permission, so fetch them per media
    // (bounded concurrency) and degrade gracefully if the token was granted
    // before that scope.
    let insightsAvailable = false;
    let permissionDenied = false;

    const insights = await mapWithConcurrency(
      media,
      INSIGHTS_CONCURRENCY,
      async (m) => {
        if (zernioPosts) {
          const rich = zernioPosts.get(m.id);
          if (!rich?.synced) return null;
          insightsAvailable = true;
          return {
            views: rich.views ?? undefined,
            reach: rich.reach ?? undefined,
            saved: rich.saves ?? undefined,
            shares: rich.shares ?? undefined,
            likes: rich.likes ?? undefined,
            comments: rich.comments ?? undefined,
          };
        }
        const metrics = isVideoLike(m)
          ? ["views", "reach", "saved", "shares", "total_interactions"]
          : ["reach", "saved", "shares", "total_interactions"];
        try {
          const data = await getMediaInsights({
            context: accessToken,
            mediaId: m.id,
            metrics: metrics,
          });
          insightsAvailable = true;
          return data;
        } catch (err) {
          if (err instanceof PermissionError) permissionDenied = true;
          return null;
        }
      }
    );

    const posts: OverviewPost[] = media.map((m, i) => {
      const ins = insights[i];
      const rich = zernioPosts?.get(m.id);
      // Zernio's analytics are fresher than the live post list's counters.
      const likes = ins?.likes ?? m.like_count ?? 0;
      const comments = ins?.comments ?? m.comments_count ?? 0;
      return {
        id: m.id,
        caption: m.caption?.trim().slice(0, 120) ?? null,
        permalink: m.permalink ?? null,
        // Zernio re-hosts covers, so they outlive Instagram's expiring CDN links.
        thumbnailUrl: rich?.thumbnailUrl ?? m.thumbnail_url ?? m.media_url ?? null,
        mediaType:
          (rich && zernioFormat(rich)) ?? m.media_product_type ?? m.media_type,
        timestamp: m.timestamp,
        views: ins?.views ?? null,
        reach: ins?.reach ?? null,
        likes,
        comments,
        saved: ins?.saved ?? null,
        shares: ins?.shares ?? null,
        ...(rich?.synced ? { details: postDetails(rich) } : {}),
      };
    });

    const totals = posts.reduce(
      (acc, p) => {
        acc.posts += 1;
        acc.views += p.views ?? 0;
        acc.reach += p.reach ?? 0;
        acc.likes += p.likes;
        acc.comments += p.comments;
        acc.saved += p.saved ?? 0;
        acc.shares += p.shares ?? 0;
        acc.interactions +=
          p.likes + p.comments + (p.saved ?? 0) + (p.shares ?? 0);
        return acc;
      },
      {
        posts: 0,
        views: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        saved: 0,
        shares: 0,
        interactions: 0,
      }
    );

    const accounts = await prisma.instagramAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: { id: true, username: true },
    });

    // Followers is a point-in-time figure and deliberately not part of
    // `totals`, which sums over the selected posts. A failure here must not
    // take down the rest of the overview.
    let followers: number | null = null;
    let followerHistory: FollowerHistoryPoint[] = [];
    try {
      followers = await ensureFollowerHistory(
        { id: account.id, instagramId: account.instagramId },
        accessToken
      );
      followerHistory = await getFollowerHistory(account.id);
    } catch (err) {
      console.warn(
        "[Instagram Overview] Follower history unavailable:",
        err instanceof Error ? err.message : err
      );
    }

    const data: OverviewResponse = {
      account: { id: account.id, username: account.username },
      accounts,
      requestedCount,
      provider: account.provider,
      limitations:
        account.provider === "ZERNIO"
          ? [
              "Post reporting covers the 25 most recent Instagram posts.",
              "Insights and follower history require the Zernio Analytics add-on and reflect its last sync. Missing metrics remain unavailable.",
            ]
          : [],
      truncated,
      insightsAvailable: insightsAvailable && !permissionDenied,
      followers,
      followerHistory,
      totals,
      posts,
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[Instagram Overview] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load Instagram overview" },
      { status: 500 }
    );
  }
}
