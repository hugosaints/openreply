-- The account's own public replies were being processed as new comments.
--
-- Zernio stores the app-scoped platformUserId as InstagramAccount.instagramId,
-- but comments written by the account arrive with its professional-account id
-- (1784...). The "is this our own comment?" check compared the two, never
-- matched, and every public reply came back as a webhook that triggered the
-- campaign again: one more public reply, one more "DM", in a loop.
--
-- This migration adds the columns the fix needs and removes the logs the loop
-- produced. Prisma does not wrap a migration in a transaction, so the cleanup
-- runs as one DO block (atomic on its own) and every statement is safe to run
-- again.

-- AlterTable
ALTER TABLE "InstagramAccount" ADD COLUMN IF NOT EXISTS "instagramUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "DmLog" ADD COLUMN IF NOT EXISTS "publicReplyCommentId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DmLog_publicReplyCommentId_idx" ON "DmLog"("publicReplyCommentId");

DO $$
BEGIN
  -- 1. Learn the alternate id from the logs the loop left behind: a log whose
  --    commenter is the account's own username was written by the account.
  UPDATE "InstagramAccount" AS a
  SET "instagramUserIds" = ARRAY(
    SELECT DISTINCT id FROM unnest(
      a."instagramUserIds" || ARRAY(
        SELECT d."commenterId"
        FROM "DmLog" d
        WHERE d."instagramAccountId" = a."id"
          AND lower(d."commenterName") = lower(a."username")
          AND d."commenterId" <> a."instagramId"
      )
    ) AS id
  )
  WHERE EXISTS (
    SELECT 1 FROM "DmLog" d
    WHERE d."instagramAccountId" = a."id"
      AND lower(d."commenterName") = lower(a."username")
      AND d."commenterId" <> a."instagramId"
      AND NOT (d."commenterId" = ANY (a."instagramUserIds"))
  );

  -- 2. Give back the monthly usage those false sends consumed (only the ones
  --    counted in the workspace's current period).
  UPDATE "Workspace" AS w
  SET "dmsSentThisPeriod" = GREATEST(0, w."dmsSentThisPeriod" - s.n)
  FROM (
    SELECT d."workspaceId", count(*)::INTEGER AS n
    FROM "DmLog" d
    JOIN "InstagramAccount" a ON a."id" = d."instagramAccountId"
    JOIN "Workspace" ws ON ws."id" = d."workspaceId"
    WHERE (
        lower(d."commenterName") = lower(a."username")
        OR d."commenterId" = a."instagramId"
        OR d."commenterId" = ANY (a."instagramUserIds")
      )
      AND (d."status" = 'SENT' OR d."dmDeliveryUnconfirmed")
      AND d."createdAt" >= ws."usagePeriodStart"
    GROUP BY d."workspaceId"
  ) AS s
  WHERE w."id" = s."workspaceId";

  -- 3. Delete the logs the loop produced.
  DELETE FROM "DmLog" AS d
  USING "InstagramAccount" AS a
  WHERE a."id" = d."instagramAccountId"
    AND (
      lower(d."commenterName") = lower(a."username")
      OR d."commenterId" = a."instagramId"
      OR d."commenterId" = ANY (a."instagramUserIds")
    );
END $$;
