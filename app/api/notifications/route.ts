import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;
const LIMIT = 15;

export interface NotificationItem {
  id: string;
  kind: "event" | "dm_failed";
  level: "INFO" | "WARNING" | "ERROR";
  title: string;
  detail: string | null;
  href: string;
  createdAt: string;
}

/**
 * Top bar bell feed: unresolved warnings/errors from OperationalEvent plus
 * failed DM deliveries from the last week, newest first. Read state lives on
 * the client (last-seen timestamp), so this endpoint stays stateless.
 */
export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [events, failedDms] = await Promise.all([
    prisma.operationalEvent.findMany({
      where: {
        OR: [{ workspaceId }, { workspaceId: null }],
        level: { in: ["WARNING", "ERROR"] },
        resolvedAt: null,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: { id: true, source: true, level: true, message: true, createdAt: true },
    }),
    prisma.dmLog.findMany({
      where: { workspaceId, status: "FAILED", updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        commenterName: true,
        errorMessage: true,
        updatedAt: true,
        automation: { select: { name: true } },
      },
    }),
  ]);

  const items: NotificationItem[] = [
    ...events.map((e) => ({
      id: `event-${e.id}`,
      kind: "event" as const,
      level: e.level,
      title: e.message,
      detail: e.source,
      href: "/diagnostics",
      createdAt: e.createdAt.toISOString(),
    })),
    ...failedDms.map((d) => ({
      id: `dm-${d.id}`,
      kind: "dm_failed" as const,
      level: "ERROR" as const,
      title: d.automation.name,
      detail: [d.commenterName ? `@${d.commenterName}` : null, d.errorMessage]
        .filter(Boolean)
        .join(" · ") || null,
      href: "/logs",
      createdAt: d.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, LIMIT);

  return NextResponse.json({ success: true, data: { items } });
}
