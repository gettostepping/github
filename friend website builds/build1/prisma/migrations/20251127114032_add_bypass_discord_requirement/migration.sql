-- AlterTable
ALTER TABLE "User" ADD COLUMN "bypassDiscordLink" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invites" ADD COLUMN "bypassDiscordRequirement" BOOLEAN NOT NULL DEFAULT false;

