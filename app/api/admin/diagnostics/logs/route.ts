import { NextResponse, NextRequest } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "dm-failures";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;

  try {
    if (type === "dm-failures") {
      const [data, total] = await Promise.all([
        prisma.dmLog.findMany({
          where: {
            workspaceId,
            status: {
              in: [
                "FAILED",
                "SKIPPED_RATE_LIMIT",
                "SKIPPED_PLAN_LIMIT",
                "SKIPPED_NO_MATCH",
              ],
            },
          },
          orderBy: { updatedAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            status: true,
            commentId: true,
            commentText: true,
            errorMessage: true,
            updatedAt: true,
            automation: { select: { name: true } },
          },
        }),
        prisma.dmLog.count({
          where: {
            workspaceId,
            status: {
              in: [
                "FAILED",
                "SKIPPED_RATE_LIMIT",
                "SKIPPED_PLAN_LIMIT",
                "SKIPPED_NO_MATCH",
              ],
            },
          },
        }),
      ]);
      return NextResponse.json({
        success: true,
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    if (type === "webhook-failures") {
      const [data, total] = await Promise.all([
        prisma.webhookEvent.findMany({
          where: { workspaceId, status: "FAILED" },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            object: true,
            errorMessage: true,
            createdAt: true,
            processedAt: true,
          },
        }),
        prisma.webhookEvent.count({
          where: { workspaceId, status: "FAILED" },
        }),
      ]);
      return NextResponse.json({
        success: true,
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    if (type === "token-refresh") {
      const [data, total] = await Promise.all([
        prisma.operationalEvent.findMany({
          where: { workspaceId, source: "TOKEN_REFRESH", level: "ERROR" },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            message: true,
            createdAt: true,
            payload: true,
          },
        }),
        prisma.operationalEvent.count({
          where: { workspaceId, source: "TOKEN_REFRESH", level: "ERROR" },
        }),
      ]);
      return NextResponse.json({
        success: true,
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    if (type === "operational-events") {
      const [data, total] = await Promise.all([
        prisma.operationalEvent.findMany({
          where: {
            OR: [{ workspaceId }, { workspaceId: null }],
            NOT: { source: "TOKEN_REFRESH", level: "ERROR" }, // Exclude the token refresh errors handled above if needed, or include all
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            source: true,
            level: true,
            message: true,
            createdAt: true,
            resolvedAt: true,
          },
        }),
        prisma.operationalEvent.count({
          where: {
            OR: [{ workspaceId }, { workspaceId: null }],
            NOT: { source: "TOKEN_REFRESH", level: "ERROR" },
          },
        }),
      ]);
      return NextResponse.json({
        success: true,
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid log type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
