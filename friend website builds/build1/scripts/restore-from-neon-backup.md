# Neon Database Recovery Guide

## Step 1: Create a Branch from Before Migration

1. Go to https://console.neon.tech
2. Select your project
3. Click "Branches" in the sidebar
4. Click "Create branch"
5. **Important**: Set the time to BEFORE you ran the migration (check the timestamp of the migration file)
   - The migration was created at: `20251104225607` (2025-11-04 22:56:07)
   - Set branch time to: **2025-11-04 22:55:00** or earlier
6. Name it: `pre-migration-backup`
7. Click "Create branch"

## Step 2: Export Data from Backup Branch

1. Get the connection string from the backup branch
2. Copy it to a temporary `.env.backup` file
3. Run this command to export all data:

```bash
# Export all tables
pg_dump <BACKUP_BRANCH_CONNECTION_STRING> > backup.sql
```

Or use Prisma Studio to verify the data is there first.

## Step 3: Import Data to Main Branch

1. Make sure your `.env.local` has the MAIN database connection string
2. Run:

```bash
# Import the data
psql <MAIN_BRANCH_CONNECTION_STRING> < backup.sql
```

## Alternative: Use Neon's Built-in Restore

1. In Neon Dashboard → Branches
2. Find your backup branch
3. Click "Promote to primary" or "Merge" to restore
4. **Warning**: This will replace your current database

## Quick Check: Verify Data in Backup Branch

1. Temporarily change DATABASE_URL in `.env.local` to backup branch connection string
2. Run: `node scripts/test-database.js`
3. If you see your users/data, the backup is good!
4. Change DATABASE_URL back to main branch
5. Then proceed with export/import

