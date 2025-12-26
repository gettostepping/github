-- Discord Bot Database Schema
-- Run this SQL manually in your Neon database

CREATE TABLE IF NOT EXISTS "GuildSetting" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "adminRoles" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "RoleCache" (
    "id" SERIAL PRIMARY KEY,
    "discordId" TEXT NOT NULL UNIQUE,
    "roles" JSONB NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "isDeveloper" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "RoleCache_discordId_idx" ON "RoleCache"("discordId");
CREATE INDEX IF NOT EXISTS "RoleCache_expiresAt_idx" ON "RoleCache"("expiresAt");

CREATE TABLE IF NOT EXISTS "TrendingChannel" (
    "id" SERIAL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdate" TIMESTAMP(3),
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    UNIQUE("guildId", "channelId", "type")
);

CREATE INDEX IF NOT EXISTS "TrendingChannel_guildId_enabled_idx" ON "TrendingChannel"("guildId", "enabled");

CREATE TABLE IF NOT EXISTS "SearchCache" (
    "id" SERIAL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SearchCache_query_type_idx" ON "SearchCache"("query", "type");
CREATE INDEX IF NOT EXISTS "SearchCache_expiresAt_idx" ON "SearchCache"("expiresAt");

CREATE TABLE IF NOT EXISTS "CommandStat" (
    "id" SERIAL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commandName" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "CommandStat_guildId_commandName_idx" ON "CommandStat"("guildId", "commandName");
CREATE INDEX IF NOT EXISTS "CommandStat_usedAt_idx" ON "CommandStat"("usedAt");

