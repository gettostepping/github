# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-01-XX

### Added

#### Discord Bot Integration
- **Complete Discord bot implementation** with full integration to Reminiscent.cc website
- **Trending feeds system** for movies and TV shows in Discord forum channels
  - `?trendingmovies` command - Sets up hourly trending movies feed in forum channels
  - `?trendingtv` command - Sets up hourly trending TV shows feed in forum channels
  - `?updatetrending` command - Manually trigger trending feed updates
  - `?cleanuptrending` command - Delete all existing trending posts and recreate them fresh
  - Automatic hourly updates with clean markdown formatting (no emojis, minimalistic design)
  - Forum channel support with individual threads for each trending item
  - Poster images for forum card previews, backdrop images in posts

#### Discord Bot Commands
- **Search command** (`?search`) - Interactive search with 10-result list, user selection, and detailed info embed with "Add to Watchlist" and "Watch Now" buttons
- **Recommend command** (`?recommend`) - Get personalized recommendations for users
- **User info commands** (website admin only):
  - `?user` - Get user information from reminiscent.cc
  - `?watchlist` - View user's watchlist
  - `?stats` - View comprehensive user statistics
  - `?compare` - Compare two users' watchlists
- **Admin commands**:
  - `?adminroles` - Manage Discord admin roles (accepts role ID directly)
  - Server owner or bot owner permissions for trending commands
  - Website admin/developer/owner permissions for invasive user data commands

#### Music Bot Features
- **Playlist support** - Bot can now handle SoundCloud playlists, Spotify albums, and YouTube playlists
- **Queue command** (`?queue`) - View current music queue with up to 10 upcoming tracks
- **Enhanced NOW PLAYING embed**:
  - Album art/thumbnail display
  - Queue size indicator
  - Queue button in music player controls
  - Loop toggle functionality
  - Skip button UI updates

#### API Enhancements
- **New API endpoint**: `/api/discord/verify-role` - Verifies if a Discord user has admin/developer/owner roles on the website
- **Enhanced profiles API**: Now accepts `discordId` search parameter for Discord bot integration
- **API key authentication** with permission checks for Discord bot operations

#### Database & Infrastructure
- **Prisma 7 compatibility** - Updated database adapter to use `@prisma/adapter-pg` for PostgreSQL
- **Separate database** for Discord bot with models for:
  - Guild settings
  - Role caching
  - Trending channel configurations
  - Search caching
  - Command statistics
- **Manual SQL migration** file provided for Neon database setup

#### Website Features
- **Rich link previews** for watch pages (HBO Max-style embeds in Discord)
  - Open Graph metadata with backdrop images
  - Custom descriptions formatted like HBO Max
  - Proper site branding ("Reminiscent")
- **Metadata generation** for watch pages with dynamic content

### Changed

#### Discord Bot
- **Permission system overhaul**:
  - Dual permission system: Discord role-based for bot features, website role-based for user data
  - Trending commands now require server owner OR bot owner (previously bot owner only)
  - Admin roles command accepts role ID directly instead of requiring mentions
- **Search command redesign**:
  - Two-step interactive process (list → selection → details)
  - Rich embeds with all watch page information
  - Action buttons for watchlist and watch page
- **Trending display**:
  - Switched from embeds to clean markdown formatting
  - Removed all emojis for minimalistic design
  - Bold descriptions, code blocks for data points
  - Backdrop images in posts (not posters)
  - Poster images for forum card thumbnails
- **Watch URL generation**: Uses production URL (`https://reminiscent.cc`) instead of localhost for Discord embeds

#### Website
- **Watch page metadata**: Added `layout.tsx` with `generateMetadata` for proper Open Graph tags
- **API routes**: Enhanced to support Discord bot integration

### Fixed

- **502 errors** in trending movies API calls - Fixed type conversion (`movies` → `movie`)
- **Prisma 7 compatibility issues** - Resolved database connection errors with PostgreSQL adapter
- **Metadata generation** - Fixed missing Open Graph tags for Discord rich embeds
- **Forum channel permissions** - Added documentation for making channels read-only (bot only)

### Security

- **API key authentication** for Discord bot API calls
- **Permission verification** for sensitive user data commands
- **Rate limiting** on API endpoints

### Documentation

- **SETUP_INSTRUCTIONS.md** - Comprehensive bot setup guide
- **DATABASE_SETUP_GUIDE.md** - Step-by-step Neon database setup
- **COMMANDS_TESTING_GUIDE.md** - Complete testing guide for all commands
- **FORUM_SETUP.md** - Instructions for forum channel permissions
- **config.example.js** - Template for bot configuration (sensitive data excluded)

### Technical Details

#### Discord Bot Architecture
- Built with Discord.js v14
- Moonlink.js for music playback (SoundCloud > Spotify > YouTube priority)
- Prisma ORM for database operations
- Axios for HTTP requests to main website API
- Node-cron style scheduling for hourly trending updates

#### Database Schema
- `GuildSetting` - Server-specific bot settings
- `RoleCache` - Cached Discord role information
- `TrendingChannel` - Active trending feed configurations
- `SearchCache` - Cached search results
- `CommandStat` - Command usage statistics

#### API Integration
- Discord bot uses API key authentication
- Website verifies Discord user roles via `/api/discord/verify-role`
- Rate limiting on all bot API endpoints
- Proper error handling and logging

---

## Previous Versions

[Previous changelog entries would go here]

