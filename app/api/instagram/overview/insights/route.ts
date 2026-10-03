import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getWorkspaceInstagramAccount } from "@/lib/instagram-accounts";
import { createInstagramContext } from "@/lib/instagram/provider";
import {
  ZERNIO_INSIGHT_PERIODS,
  loadZernioOverviewExtras,
  type ZernioInsightPeriod,
  type ZernioOverviewExtras,
} from "@/lib/zernio/analytics";

// Seven independent Zernio calls run in parallel; allow for a slow upstream.
export const maxDuration = 60;

export interface OverviewInsightsResponse {
  provider: "META" | "ZERNIO";
  /** Null when the provider exposes no account-level analytics (direct Meta). */
  extras: ZernioOverviewExtras | null;
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
    if (account.provider !== "ZERNIO") {
      const data: OverviewInsightsResponse = {
        provider: account.provider,
        extras: null,
      };
      return NextResponse.json({ success: true, data });
    }

    const requested = Number.parseInt(
      request.nextUrl.searchParams.get("days") ?? "",
      10
    );
    const days: ZernioInsightPeriod = (
      ZERNIO_INSIGHT_PERIODS as readonly number[]
    ).includes(requested)
      ? (requested as ZernioInsightPeriod)
      : 30;

    const context = await createInstagramContext(account);
    if (context.provider !== "ZERNIO") {
      return NextResponse.json({
        success: true,
        data: { provider: account.provider, extras: null },
      });
    }

    const extras = await loadZernioOverviewExtras(context, days);
    const data: OverviewInsightsResponse = { provider: "ZERNIO", extras };
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[Instagram Overview Insights] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load Instagram overview" },
      { status: 500 }
    );
  }
}
