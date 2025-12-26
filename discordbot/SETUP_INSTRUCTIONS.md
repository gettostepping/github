# Discord Bot Setup Instructions

## Database Setup

1. **Run the SQL migration:**
   - Open your Neon database dashboard
   - Go to SQL Editor
   - Copy and paste the contents of `prisma/migrations/init.sql`
   - Execute the SQL to create all tables

2. **Set environment variable:**
   - The bot will use the database URL from `src/utils/database.js` (hardcoded for now)
   - Or set `BOT_DATABASE_URL` environment variable when running the bot

## New Features Implemented

### Music Bot Enhancements:
- ✅ **Playlist Support**: Bot now detects and adds entire playlists when you paste a playlist URL
- ✅ **Album Art**: Music player now shows album art/thumbnail in the embed
- ✅ **Queue Button**: Added queue button to view current playlist
- ✅ **Queue Display**: Shows up to 10 tracks in queue

### New Commands:

**Public Commands:**
- `?search [query] [type]` - Interactive search with buttons
- `?recommend [uid]` - Get personalized recommendations

**Discord Admin Commands (per-guild):**
- `?trendingmovies` - Enable/disable hourly trending movies feed
- `?trendingtv` - Enable/disable hourly trending TV feed
- `?adminroles [add/remove/list] [role]` - Manage Discord admin roles (bot owner only)

**Website Admin Commands (requires admin/developer/owner on website):**
- `?user [uid]` - View user info (enhanced)
- `?watchlist [uid]` - View user's watchlist
- `?stats [uid]` - User statistics
- `?compare [uid1] [uid2]` - Compare two users

### Music Commands:
- `?queue` - View current music queue/playlist

## Running the Bot

1. Make sure Lavalink is running on `localhost:3009`
2. Run the database migration SQL
3. Start the bot: `npm run start`

The bot will:
- Start trending feed scheduler (updates every hour)
- Connect to database
- Load all commands
- Be ready to use!

## Permission System

- **Discord Roles**: Set per-guild using `?adminroles add @Role` (bot owner only)
- **Website Roles**: Automatically checked via API for invasive commands
- **Role Caching**: Website roles cached for 5 minutes to reduce API calls

