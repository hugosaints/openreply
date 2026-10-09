import { prisma } from "@/lib/db/client";

export const MAX_COMMENT_SEND_ATTEMPTS = 3;

// A durable, atomic claim precedes the external side effect. If the process
// crashes or the final log write fails, an uncertain send must not be repeated.
export async function claimCommentDelivery(
  automationId: string,
  commentId: string,
  leg: "dm" | "public",
): Promise<boolean> {
  // Cross-campaign safety: if another campaign for this comment has already
  // sent or claimed the delivery, reject this claim so the commenter never
  // receives duplicate public replies or DMs.
  if (leg === "public") {
    const otherPublicClaim = await prisma.dmLog.findFirst({
      where: {
        commentId,
        automationId: { not: automationId },
        OR: [
          { publicReplySentAt: { not: null } },
          { publicReplyDeliveryUnconfirmed: true },
        ],
      },
      select: { id: true },
    });
    if (otherPublicClaim) {
      return false;
    }
  } else if (leg === "dm") {
    const otherDmClaim = await prisma.dmLog.findFirst({
      where: {
        commentId,
        automationId: { not: automationId },
        OR: [
          { status: "SENT" },
          { dmDeliveryUnconfirmed: true },
        ],
      },
      select: { id: true },
    });
    if (otherDmClaim) {
      return false;
    }
  }

  const result = await prisma.dmLog.updateMany({
    where: {
      automationId,
      commentId,
      ...(leg === "dm"
        ? {
            status: { not: "SENT" as const },
            dmDeliveryUnconfirmed: false,
            attempts: { lt: MAX_COMMENT_SEND_ATTEMPTS },
          }
        : { publicReplySentAt: null, publicReplyDeliveryUnconfirmed: false }),
    },
    data:
      leg === "dm"
        ? {
            dmDeliveryUnconfirmed: true,
            attempts: { increment: 1 },
            status: "PENDING",
            errorMessage: null,
          }
        : { publicReplyDeliveryUnconfirmed: true },
  });
  return result.count === 1;
}

