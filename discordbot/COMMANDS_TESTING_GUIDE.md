# Commands Testing Guide

## 🎵 Music Commands (5 commands)

### 1. `?play [song/url]` or `?p [song/url]`
**What it does:** Plays music or adds to queue
**Test with:**
- `?play never gonna give you up`
- `?play https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `?play https://www.youtube.com/playlist?list=PLxxx` (playlist URL - should add all tracks!)

**Expected:** Bot joins VC, plays song, shows album art in music channel

### 2. `?queue` or `?q`
**What it does:** Shows current music queue/playlist
**Test with:**
- `?queue` (while music is playing)

**Expected:** Shows list of upcoming tracks

### 3. `?pause`
**What it does:** Pauses/resumes music
**Test with:**
- Click the "⏯ Pause" button in music channel
- Or use `?pause` command

**Expected:** Music pauses/resumes

### 4. `?skip`
**What it does:** Skips to next track
**Test with:**
- Click the "⏭ Skip" button in music channel
- Or use `?skip` command

**Expected:** Skips to next song in queue

### 5. `?stop`
**What it does:** Stops music playback
**Test with:**
- Click the "⏹ Stop" button in music channel
- Or use `?stop` command

**Expected:** Music stops

---

## 🔍 Public Commands (Anyone can use)

### 6. `?search [query] [type]` or `?find [query]` or `?s [query]`
**What it does:** Search for movies/TV shows with interactive buttons
**Test with:**
- `?search breaking bad`
- `?search avengers movie`
- `?search game of thrones tv`

**Expected:** 
- Shows top 10 results
- Buttons to view details
- "Watch" buttons for top 3 results
- Click buttons to see more info or get watch links

### 7. `?recommend [uid]` or `?rec [uid]` or `?suggest [uid]`
**What it does:** Get personalized recommendations based on user's watchlist
**Test with:**
- `?recommend YOUR_UID` (replace with actual UID)

**Expected:** Shows recommendations based on user's first watchlist item

---

## 🎬 Discord Admin Commands (Requires Discord admin role set via `?adminroles`)

### 8. `?trendingmovies` or `?trendingmovie` or `?tmovies`
**What it does:** Enable/disable hourly trending movies feed in current channel
**Test with:**
- `?trendingmovies` (first time enables it)
- `?trendingmovies` (again disables it)

**Expected:**
- First run: Shows trending movies embed, enables hourly updates
- Second run: Disables the feed
- Bot automatically updates the message every hour

### 9. `?trendingtv` or `?trendingshows` or `?ttv` or `?tshows`
**What it does:** Enable/disable hourly trending TV shows feed in current channel
**Test with:**
- `?trendingtv` (first time enables it)
- `?trendingtv` (again disables it)

**Expected:**
- First run: Shows trending TV embed, enables hourly updates
- Second run: Disables the feed
- Bot automatically updates the message every hour

### 10. `?adminroles [add/remove/list] [role]` or `?aroles [action] [role]`
**What it does:** Manage Discord admin roles (BOT OWNER ONLY)
**Test with:**
- `?adminroles list` - See current admin roles
- `?adminroles add @AdminRole` - Add a role as admin
- `?adminroles remove @AdminRole` - Remove a role

**Expected:**
- Only bot owner can use this
- Sets which Discord roles can use Discord admin commands

---

## 🔐 Website Admin Commands (Requires admin/developer/owner role on reminiscent.cc)

### 11. `?user [uid]`
**What it does:** View detailed user information
**Test with:**
- `?user YOUR_UID` (replace with actual UID)

**Expected:**
- Shows user profile with avatar
- Last active time
- Last watched item
- Buttons to view profile and last watched

**Note:** This now requires website admin/developer/owner role!

### 12. `?watchlist [uid]` or `?wl [uid]`
**What it does:** View a user's complete watchlist
**Test with:**
- `?watchlist YOUR_UID`

**Expected:**
- Shows first 10 items in watchlist
- Shows total count
- Shows progress for TV shows (Season/Episode)

### 13. `?stats [uid]` or `?statistics [uid]`
**What it does:** View comprehensive user statistics
**Test with:**
- `?stats YOUR_UID`

**Expected:**
- Watchlist count (movies vs TV)
- Ratings count
- Comments count
- Profile views
- Join date

### 14. `?compare [uid1] [uid2]` or `?comp [uid1] [uid2]`
**What it does:** Compare two users' watchlists
**Test with:**
- `?compare UID1 UID2`

**Expected:**
- Common interests count
- Items unique to each user
- Compatibility score percentage

---

## 🎮 Music Channel Auto-Play

**Special Feature:** In the music channel (ID: 1436051260535996430)
- Just type a song name or URL
- Bot automatically adds it to queue
- No command needed!

**Test with:**
- Join voice channel
- Go to music channel
- Type: `rick roll` or paste a YouTube URL
- Bot reacts with ✅ and plays it

---

## 🎨 Music Player Features

**In the music channel, the bot shows:**
- ✅ **Album Art/Thumbnail** - Shows song artwork
- ✅ **Queue Count** - Shows how many tracks are queued
- ✅ **Queue Button** - Click to see full playlist
- ✅ **Loop Button** - Toggle loop on/off
- ✅ **All controls** - Pause, Skip, Stop buttons

---

## Testing Checklist

### Basic Tests:
- [ ] `?search breaking bad` - Should show results with buttons
- [ ] Click a search result button - Should show detailed embed
- [ ] `?play rick astley` - Should play music with album art
- [ ] Click queue button in music player - Should show queue
- [ ] `?queue` command - Should show queue list

### Admin Tests (if you have website admin role):
- [ ] `?user YOUR_UID` - Should show user info
- [ ] `?watchlist YOUR_UID` - Should show watchlist
- [ ] `?stats YOUR_UID` - Should show statistics
- [ ] `?compare UID1 UID2` - Should compare users

### Discord Admin Tests (if you set admin roles):
- [ ] `?adminroles add @YourRole` - Add admin role (bot owner only)
- [ ] `?trendingmovies` - Enable trending feed
- [ ] Wait and see if it updates hourly (or test manually)

### Playlist Tests:
- [ ] `?play [youtube playlist URL]` - Should add all tracks
- [ ] Check queue - Should show all playlist tracks

### Permission Tests:
- [ ] Try `?user` without website admin - Should deny
- [ ] Try `?trendingmovies` without Discord admin - Should deny
- [ ] Try `?adminroles` without bot owner - Should deny

---

## Common Issues & Fixes

**"Insufficient permissions" errors:**
- Website admin commands need admin/developer/owner role on reminiscent.cc
- Discord admin commands need Discord role set via `?adminroles`
- Bot owner commands need your Discord ID in `config.js` owner array

**"API key not configured":**
- Check `config.js` has `apikey` set
- Make sure API key has correct permissions

**"Could not connect to API":**
- Check if main website is running (localhost:3000 or reminiscent.cc)
- Verify `apiBaseUrl` in `config.js` is correct

**Music not playing:**
- Make sure Lavalink is running on localhost:3009
- Check bot is in voice channel
- Verify music channel ID is correct in code

---

## Quick Test Sequence

1. **Test Search:**
   ```
   ?search breaking bad
   ```

2. **Test Music:**
   ```
   ?play never gonna give you up
   ```

3. **Test Queue:**
   ```
   ?queue
   ```

4. **Test Trending (if Discord admin):**
   ```
   ?trendingmovies
   ```

5. **Test User Info (if website admin):**
   ```
   ?user YOUR_UID
   ```

Enjoy testing! 🚀

