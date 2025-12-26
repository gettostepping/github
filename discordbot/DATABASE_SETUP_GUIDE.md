# Neon Database Setup Guide

## Step-by-Step Instructions

### 1. Open Neon Dashboard
- Go to [console.neon.tech](https://console.neon.tech)
- Log in to your account
- Select your project (the one with the database URL you provided)

### 2. Open SQL Editor
- In the left sidebar, click on **"SQL Editor"** (or look for a "Query" or "SQL" button)
- This opens a text editor where you can write and run SQL commands

### 3. Copy the SQL Migration
- Open the file: `discordbot/prisma/migrations/init.sql`
- Select ALL the text (Ctrl+A or Cmd+A)
- Copy it (Ctrl+C or Cmd+C)

### 4. Paste into Neon SQL Editor
- Click in the SQL Editor text area
- Paste the SQL (Ctrl+V or Cmd+V)
- You should see all the SQL commands appear in the editor

### 5. Run the SQL
- Look for a **"Run"** button (usually green, or has a play icon ▶️)
- It might be labeled as:
  - "Run"
  - "Execute"
  - "Run Query"
  - Or just a play button icon
- Click it!

### 6. Check for Success
- You should see a success message like "Query executed successfully"
- If there are errors, they'll be shown in red
- The tables should now be created!

## What the SQL Does

The SQL file creates 5 tables:
1. **GuildSetting** - Stores Discord server admin role settings
2. **RoleCache** - Caches website role information for Discord users
3. **TrendingChannel** - Stores which channels have trending feeds enabled
4. **SearchCache** - Caches search results to reduce API calls
5. **CommandStat** - Tracks command usage statistics

## Troubleshooting

**If you see an error:**
- Make sure you're connected to the correct database
- Check that the SQL was copied completely (all 62 lines)
- Some tables might already exist - that's okay! The `IF NOT EXISTS` prevents errors

**If you can't find SQL Editor:**
- Look for tabs at the top: "Dashboard", "SQL Editor", "Settings", etc.
- Or look in the left sidebar menu
- Some Neon interfaces call it "Query" or "SQL Query"

## Alternative: Using Neon CLI (Advanced)

If you prefer command line:
```bash
# Install Neon CLI (if you haven't)
npm install -g neonctl

# Connect and run SQL
neonctl sql --project-id YOUR_PROJECT_ID < prisma/migrations/init.sql
```

But the web SQL Editor is much easier! 😊

