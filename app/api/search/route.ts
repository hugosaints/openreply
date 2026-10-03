import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * Backs the ⌘K command palette. Pages are matched client-side from the nav
 * config; this only searches workspace data (campaigns for now), so it stays
 * cheap enough to call on every keystroke (debounced on the client).
 */
export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);

  const campaigns = await prisma.automation.findMany({
    where: {
      workspaceId,
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: q ? 8 : 5,
    select: { id: true, name: true, isActive: true },
  });

  return NextResponse.json({ success: true, data: { campaigns } });
}
