-- Add targetUserId column to Invites table
-- This tracks which user each mass invite was created for

ALTER TABLE "Invites" ADD COLUMN IF NOT EXISTS "targetUserId" INTEGER;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS "Invites_targetUserId_idx" ON "Invites"("targetUserId");

