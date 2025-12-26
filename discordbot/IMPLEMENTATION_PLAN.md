# Discord Bot Enhanced Commands - Full Implementation Plan

## Overview

Implement comprehensive Discord bot commands with website role-based permissions, auto-updating trending feeds, interactive search, and proper admin/user command separation. Uses Neon PostgreSQL for persistent storage and website API for role verification.

## Architecture Overview

The bot will use a Neon PostgreSQL database to store:
- **Guild-specific admin role permissions** (Discord roles for bot management)
- **Website role cache** (for invasive command permission checking)
- Channel settings for trending feeds
- Search result cache
- Command usage statistics

### Dual Permission System:

1. **Discord Role-Based** (Per-Guild): For managing bot features (trending feeds, etc.)
2. **Website Role-Based** (Global): For invasive commands that access user data (user info, watchlists, stats, compare)

### Permission Flow

```
User runs admin command
  ↓
Check role cache in bot database
  ↓
If cache miss/expired → Query website API /api/discord/verify-role
  ↓
Website checks user's roles (admin/developer/owner)
  ↓
Cache result for 5 minutes
  ↓
Allow/deny command based on role
```

## Database Schema (Neon PostgreSQL)

**Connection String:**
```
postgresql://neondb_owner:npg_lFi0mW8VkYDp@ep-snowy-scene-adxjaggr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Prisma Schema

**File:** `discordbot/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("BOT_DATABASE_URL")
}

model GuildSetting {
  guildId    String   @id
  adminRoles Json     @default("[]") // Array of Discord role IDs that can use admin commands
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model RoleCache {
  id           Int      @id @default(autoincrement())
  discordId    String   @unique
  roles        Json     // Array of role names from website
  isOwner      Boolean  @default(false)
  isDeveloper  Boolean  @default(false)
  isAdmin      Boolean  @default(false)
  cachedAt     DateTime @default(now())
  expiresAt    DateTime

  @@index([discordId])
  @@index([expiresAt])
}

model TrendingChannel {
  id         Int      @id @default(autoincrement())
  guildId    String
  channelId  String
  type       String   // 'movies' or 'tv'
  enabled    Boolean  @default(true)
  lastUpdate DateTime?
  messageId  String?  // ID of last sent message (for editing)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([guildId, channelId, type])
  @@index([guildId, enabled])
}

model SearchCache {
  id        Int      @id @default(autoincrement())
  query     String
  type      String   // 'movie', 'tv', 'all'
  results   Json     // Cached search results
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([query, type])
  @@index([expiresAt])
}

model CommandStat {
  id          Int      @id @default(autoincrement())
  guildId     String
  userId      String
  commandName String
  usedAt      DateTime @default(now())

  @@index([guildId, commandName])
  @@index([usedAt])
}
```

## Website API Endpoint (Main Project)

### New Endpoint: `/api/discord/verify-role`

**File:** `src/app/api/discord/verify-role/route.ts`

**Purpose:** Allow Discord bot to verify if a Discord user has admin/developer/owner roles on the website

**Implementation:**
- Accepts `discordId` as query parameter
- Requires API key authentication with `admin.*` or `public.discord.verify` permission
- Queries database: `prisma.user.findUnique({ where: { discordId }, include: { roles: true } })`
- Returns role information
- Rate limited for API keys

**Response Format:**
```json
{
  "hasAccess": true,
  "isOwner": false,
  "isDeveloper": false,
  "isAdmin": true,
  "roles": ["admin"],
  "uid": 123,
  "name": "username",
  "found": true
}
```

**Error Response (user not found):**
```json
{
  "hasAccess": false,
  "found": false,
  "message": "User not found with this Discord ID"
}
```

## Permission System

### Permission Levels:

1. **Public** - Anyone can use
2. **Discord Admin** - Requires Discord role set per-guild (for bot feature management)
3. **Website Admin** - Requires admin/developer/owner role on the website (for invasive commands)
4. **Owner** - Bot owner only (from config.js)

### Dual Permission System:

**Discord Role-Based (Per-Guild):**
- Used for: Managing trending feeds, bot configuration
- Stored in: `guild_settings` table
- Managed by: `?admin roles` command (owner-only)
- Checked by: `isDiscordAdmin(client, message)` function

**Website Role-Based (Global):**
- Used for: Viewing user data, watchlists, stats, compare
- Verified via: `/api/discord/verify-role` endpoint
- Cached in: `role_cache` table (5 min TTL)
- Checked by: `isWebsiteAdmin(client, message)` function

### Permission Check Functions

**File:** `discordbot/src/utils/permissions.js`

**Functions:**
- `isDiscordAdmin(client, message)` - Checks if user has admin role in Discord guild (per-guild configurable)
- `isWebsiteAdmin(client, message)` - Checks if Discord user has admin/developer/owner role on website
- `isOwner(message)` - Checks if user is bot owner
- `hasPermission(client, message, level)` - Main permission checker
- `getAdminRoles(guildId)` - Fetch Discord admin roles from DB (per-guild)
- `setAdminRoles(guildId, roleIds)` - Set Discord admin roles for guild (owner-only)
- `getWebsiteRoles(discordId)` - Fetch user roles from website API (with caching)
- `checkWebsiteAdmin(discordId)` - Verify admin access via website API

**Implementation Examples:**

```javascript
// Check Discord admin role (per-guild)
async function isDiscordAdmin(client, message) {
    if (!message.guild) return false;
    
    const guildId = message.guild.id;
    const member = message.member;
    
    // Get admin roles for this guild
    const settings = await prisma.guildSetting.findUnique({
        where: { guildId }
    });
    
    if (!settings || !settings.adminRoles || settings.adminRoles.length === 0) {
        return false; // No admin roles configured
    }
    
    // Check if user has any of the admin roles
    return member.roles.cache.some(role => settings.adminRoles.includes(role.id));
}

// Check website admin role (global)
async function isWebsiteAdmin(client, message) {
    const discordId = message.author.id;
    
    // Check cache first
    const cached = await prisma.roleCache.findUnique({
        where: { discordId }
    });
    
    if (cached && cached.expiresAt > new Date()) {
        return cached.isOwner || cached.isDeveloper || cached.isAdmin;
    }
    
    // Query website API
    try {
        const response = await axios.get(`${client.config.apiBaseUrl}/api/discord/verify-role`, {
            params: { discordId },
            headers: { 'Authorization': `Bearer ${client.config.apikey}` },
            timeout: 10000
        });
        
        if (response.data.hasAccess && response.data.found) {
            // Cache for 5 minutes
            await prisma.roleCache.upsert({
                where: { discordId },
                update: {
                    roles: response.data.roles,
                    isOwner: response.data.isOwner,
                    isDeveloper: response.data.isDeveloper,
                    isAdmin: response.data.isAdmin,
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
                },
                create: {
                    discordId,
                    roles: response.data.roles,
                    isOwner: response.data.isOwner,
                    isDeveloper: response.data.isDeveloper,
                    isAdmin: response.data.isAdmin,
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
                }
            });
            
            return response.data.isOwner || response.data.isDeveloper || response.data.isAdmin;
        }
    } catch (error) {
        console.error('Error checking website admin:', error);
    }
    
    return false;
}
```

## Command Implementation

### Phase 1: Core Commands (Public)

#### 1. `?trendingmovies` - Auto-updating Trending Movies Feed
**File:** `discordbot/src/command/reminiscent/trendingmovies.js`

**Features:**
- Sets channel to receive hourly trending movies updates
- First run: Fetches and sends current trending movies
- Stores channel settings in `trending_channels` table
- Updates every hour automatically via scheduled job
- Shows top 10 trending movies with posters, ratings, release dates
- Edits previous message instead of spamming (uses `message_id`)
- **Discord admin role check required** (per-guild, for managing feeds)

**Implementation:**
- Check if channel already has trending movies enabled
- If enabled: Disable and notify
- If disabled: Enable, fetch trending, send embed, store in DB
- Use Discord embeds with rich formatting
- Include "Watch on Reminiscent" buttons

#### 2. `?trendingtv` - Auto-updating Trending TV Shows Feed
**File:** `discordbot/src/command/reminiscent/trendingtv.js`

**Same as trendingmovies but for TV shows**

#### 3. `?search [query] [type]` - Interactive Content Search
**File:** `discordbot/src/command/reminiscent/search.js`

**Features:**
- Search TMDB database (movies, TV, or both)
- Returns top 10 results
- Interactive buttons for top 5 results (select to view details)
- Remaining 5 shown as list with direct links
- Each result shows: poster, title, year, rating, type
- Button actions:
  - "View Details" - Shows full info embed
  - "Watch Now" - Direct link to watch page
  - "Add to Watchlist" - If user has linked account
- Cache results for 5 minutes to reduce API calls
- Pagination if more than 10 results

**Implementation:**
- Use Discord ActionRowBuilder with ButtonBuilder
- Handle button interactions via interactionCreate event
- Create detail view embeds with full information
- Use search cache table to reduce API calls

#### 4. `?recommend [uid]` - Personalized Recommendations
**File:** `discordbot/src/command/reminiscent/recommend.js`

**Features:**
- Get recommendations based on user's watchlist/ratings
- Uses TMDB recommendations API
- Shows 5-10 recommended items
- Explains why each is recommended
- Links to watch pages
- Public command (doesn't expose sensitive user info)

### Phase 2: Admin-Only Commands (Website Admin Required)

#### 5. `?watchlist [uid]` - View User Watchlist
**File:** `discordbot/src/command/reminiscent/watchlist.js`

**Features:**
- View any user's full watchlist
- Paginated (10 items per page)
- Shows progress for TV shows
- Filter by type
- Sort options
- **Website admin/developer/owner role check required** (invasive command)

#### 6. `?user [uid]` - Enhanced User Info
**File:** `discordbot/src/command/reminiscent/user.js` (update existing)

**Enhancements:**
- **Website admin/developer/owner role check required** (invasive command)
- Show more detailed stats
- Watchlist count
- Total ratings
- Profile views
- Join date
- Role badges

#### 7. `?stats [uid]` - User Statistics
**File:** `discordbot/src/command/reminiscent/stats.js`

**Features:**
- Comprehensive user statistics
- Watchlist breakdown
- Rating distribution
- Favorite genres
- Activity timeline
- **Website admin/developer/owner role check required** (invasive command)

#### 8. `?compare [uid1] [uid2]` - Compare Users
**File:** `discordbot/src/command/reminiscent/compare.js`

**Features:**
- Compare two users' watchlists
- Common interests
- Unique items
- Compatibility score
- **Website admin/developer/owner role check required** (invasive command)

#### 9. `?admin roles [add/remove/list] [role]` - Manage Discord Admin Roles
**File:** `discordbot/src/command/reminiscent/adminroles.js`

**Features:**
- Add/remove Discord roles that can use admin commands (per-guild)
- List current admin roles for the guild
- **Bot owner-only command**
- Updates `guild_settings` table
- Used for: Managing trending feeds, bot features

#### 10. `?admin trending [enable/disable] [movies/tv]` - Manage Trending Feeds
**File:** `discordbot/src/command/reminiscent/admintrending.js`

**Features:**
- Enable/disable trending feeds in current channel
- View all active feeds in guild
- **Discord admin role check required** (per-guild, for managing bot features)

## Scheduled Jobs

### Trending Updates Scheduler
**File:** `discordbot/src/utils/scheduler.js`

**Implementation:**
- Use `node-cron` or setInterval
- Every hour: Query `trending_channels` for enabled feeds
- Fetch latest trending data from API
- Update/edit messages in channels
- Handle errors gracefully (channel deleted, permissions lost, etc.)

**Flow:**
```
Every hour:
  1. Query all enabled trending_channels
  2. For each channel:
     - Fetch trending data from API
     - Format as embed
     - Edit existing message (if message_id exists)
     - Or send new message if edit fails
     - Update last_update timestamp
```

## File Structure

```
discordbot/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── command/
│   │   └── reminiscent/
│   │       ├── trendingmovies.js
│   │       ├── trendingtv.js
│   │       ├── search.js
│   │       ├── recommend.js
│   │       ├── watchlist.js (website admin)
│   │       ├── user.js (update - add website admin check)
│   │       ├── stats.js (website admin)
│   │       ├── compare.js (website admin)
│   │       └── admintrending.js (website admin)
│   ├── utils/
│   │   ├── permissions.js (new)
│   │   ├── scheduler.js (new)
│   │   ├── database.js (new - Prisma client)
│   │   └── embeds.js (new - Embed builders)
│   └── events/
│       └── interactionCreate.js (update - handle search buttons)
├── .env
├── config.js
└── package.json
```

## Dependencies to Add

**File:** `discordbot/package.json`

Add to dependencies:
```json
{
  "prisma": "^5.22.0",
  "@prisma/client": "^5.22.0",
  "node-cron": "^3.0.3"
}
```

## Environment Variables

**File:** `discordbot/.env`

```
BOT_DATABASE_URL="postgresql://neondb_owner:npg_lFi0mW8VkYDp@ep-snowy-scene-adxjaggr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

## Implementation Order

1. **Website API Endpoint** (Main Project)
   - Create `/api/discord/verify-role` endpoint in `src/app/api/discord/verify-role/route.ts`
   - Add API key authentication with `admin.*` or `public.discord.verify` permission
   - Query user by Discord ID: `prisma.user.findUnique({ where: { discordId }, include: { roles: true } })`
   - Return role information (isOwner, isDeveloper, isAdmin, roles array)
   - Add rate limiting
   - Test with bot's API key

2. **Database Setup** (Bot Project)
   - Initialize Prisma in `discordbot/` folder
   - Create `discordbot/prisma/schema.prisma` with all models
   - Use provided Neon connection string in `.env`
   - Run `npx prisma migrate dev` to create tables
   - Create `src/utils/database.js` with Prisma client instance

3. **Permission System** (Bot Project)
   - Create `src/utils/permissions.js`
   - Implement `isDiscordAdmin(client, message)` function (per-guild Discord roles)
   - Implement `isWebsiteAdmin(client, message)` function (website roles)
   - Add role caching logic for website roles (check cache, query API if needed, cache result)
   - Create cache cleanup job (remove expired entries)
   - Test both permission systems

4. **Trending Commands** (Bot Project)
   - Implement `?trendingmovies` command
   - Implement `?trendingtv` command
   - Add Discord admin check (per-guild, for managing feeds)
   - Store channel settings in database
   - Create scheduler in `src/utils/scheduler.js`
   - Test hourly updates

5. **Search Command** (Bot Project)
   - Implement `?search [query] [type]` command
   - Add interactive buttons for top 5 results
   - Create detail view embeds
   - Add search result caching
   - Update `interactionCreate.js` to handle button clicks
   - Test search and button interactions

6. **Recommend Command** (Bot Project)
   - Implement `?recommend [uid]` command
   - Fetch recommendations from TMDB API
   - Format and display results
   - Test with various UIDs

7. **Admin Commands** (Bot Project)
   - Implement `?admin roles` command (bot owner only)
   - Update `?user` command with website admin check
   - Implement `?watchlist [uid]` with website admin check
   - Implement `?stats [uid]` with website admin check
   - Implement `?compare [uid1] [uid2]` with website admin check
   - Test all permission checks (both Discord and website)

## Command Permission Summary

### Public Commands (Anyone):
- `?search [query] [type]` - Search content
- `?recommend [uid]` - Get recommendations (doesn't expose sensitive info)

### Discord Admin Commands (Requires Discord admin role per-guild):
- `?trendingmovies` - Manage trending movies feed
- `?trendingtv` - Manage trending TV feed
- `?admin trending` - Manage trending feeds

### Website Admin Commands (Requires admin/developer/owner on website):
- `?user [uid]` - View user info (invasive - website role required)
- `?watchlist [uid]` - View user watchlist (invasive - website role required)
- `?stats [uid]` - User statistics (invasive - website role required)
- `?compare [uid1] [uid2]` - Compare users (invasive - website role required)

### Bot Owner Only:
- `?admin roles` - Manage Discord admin roles for guilds
- Bot configuration commands (if any)

## Key Implementation Details

### Search Button Handling:
```javascript
// In interactionCreate.js
if (interaction.isButton() && interaction.customId.startsWith('search_')) {
    const [action, tmdbId, type] = interaction.customId.split('_');
    // Handle view details, watch, etc.
}
```

### Trending Scheduler Example:
```javascript
// In scheduler.js
setInterval(async () => {
    const channels = await prisma.trendingChannel.findMany({
        where: { enabled: true }
    });
    
    for (const channel of channels) {
        await updateTrendingFeed(client, channel);
    }
}, 3600000); // Every hour
```

## Notes

- Rate command deferred for later implementation
- **Dual permission system:**
  - **Discord roles (per-guild)**: For managing bot features (trending feeds)
  - **Website roles (global)**: For invasive commands (user data, watchlists, stats)
- **Website role verification via API endpoint** for invasive commands
- **Discord role management** via `?admin roles` command (owner-only)
- **Role caching** (5 minutes) for website roles to reduce API calls
- Hourly trending updates via scheduler
- Interactive search with button selection
- Database-backed configuration persistence
- Caching for search results to reduce API calls
- Bot database connection: `postgresql://neondb_owner:npg_lFi0mW8VkYDp@ep-snowy-scene-adxjaggr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

