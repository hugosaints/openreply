import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getDashboardSeries, parseSeriesRange } from "@/lib/dashboard/series";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Chart-only endpoint so switching Daily / Monthly / Yearly on the dashboard
 * refetches two grouped queries instead of the whole stats payload.
 */
export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const accountParam = params.get("instagramAccountId");
  const range = parseSeriesRange(params.get("range"));

  const series = await getDashboardSeries({
    workspaceId,
    instagramAccountId: accountParam && accountParam !== "all" ? accountParam : null,
    range,
    locale: resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value),
  });

  return NextResponse.json({ success: true, data: { series, range } });
}
