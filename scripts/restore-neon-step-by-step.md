# Step-by-Step Neon Database Restoration Guide

## Prerequisites
- Access to your Neon dashboard at https://console.neon.tech
- Your Neon account credentials

## Step 1: Identify the Migration Time
The migration that reset your database was created at:
- **Time**: 2025-11-04 22:56:07
- **We need to restore to BEFORE this time**

## Step 2: Create a Branch from Before Migration

1. Go to https://console.neon.tech
2. Log in to your account
3. Select your project (the one with database "neondb")
4. Click **"Branches"** in the left sidebar
5. Click the **"Create branch"** button (usually top right)
6. In the branch creation dialog:
   - **Name**: `pre-migration-recovery` (or any name you like)
   - **Time**: Select a time BEFORE the migration
     - Set to: **November 4, 2025 at 22:55:00** (1 minute before migration)
     - Or use the time picker to go back to before you ran the migration
   - Click **"Create branch"**

## Step 3: Verify the Backup Has Your Data

1. In the Branches list, find your new branch (`pre-migration-recovery`)
2. Click on it to view details
3. Copy the **Connection string** (it will be different from your main branch)
4. Temporarily update your `.env.local` file:
   ```
   DATABASE_URL=<paste-backup-branch-connection-string-here>
   ```
5. Test that it has your data:
   ```bash
   npx dotenv-cli -e .env.local -- node scripts/test-database.js
   ```
6. If you see your users/data, the backup is good! ✅

## Step 4: Restore the Data

You have two options:

### Option A: Promote Backup Branch (Recommended - Fastest)

1. Go back to Neon Dashboard → Branches
2. Find your `pre-migration-recovery` branch
3. Click the **three dots (⋯)** menu next to it
4. Click **"Promote to primary"** or **"Set as primary"**
5. Confirm the action
6. This makes the backup branch your main database
7. Update your `.env.local` with the NEW main branch connection string
8. Done! Your data is restored ✅

### Option B: Export/Import (If you need to merge)

1. **Export from backup branch:**
   - Make sure `.env.local` has backup branch connection string
   - Run: `npx dotenv-cli -e .env.local -- node scripts/export-neon-data.js`
   - This creates a `backup-*.sql` file

2. **Import to main branch:**
   - Update `.env.local` back to main branch connection string
   - Run: `psql <main-branch-connection-string> < backup-*.sql`

## Step 5: Verify Restoration

1. Make sure your `.env.local` has the correct (restored) connection string
2. Run: `npx dotenv-cli -e .env.local -- node scripts/test-database.js`
3. You should see your users and data! ✅

## Step 6: Re-add ApiKey Table (If Needed)

After restoration, the ApiKey table might be missing. Add it safely:

```bash
npx dotenv-cli -e .env.local -- node scripts/add-api-key-table-safe.js
```

This will ONLY add the ApiKey table without touching your restored data.

## Troubleshooting

- **Can't find branch creation?** Look for "Branches" → "Create branch" button
- **Time picker not working?** Manually enter: `2025-11-04 22:55:00`
- **Connection string format?** It should look like: `postgresql://user:pass@host/dbname`
- **Still no data?** Try a different time (maybe 30 minutes or 1 hour before migration)

