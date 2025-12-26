# Discord Bot Updates - Ready to Run! 🚀

## ✅ What Was Updated

### 1. **Config.js** - Added API Base URL
- Added `apiBaseUrl` config option
- Defaults to production URL: `https://reminiscent.cc`
- Can be overridden with `API_BASE_URL` environment variable
- Uses the API key from config instead of hardcoded values

### 2. **User Command** (`src/command/reminiscent/user.js`)
**Improvements:**
- ✅ Uses API key from `client.config.apikey` (no more hardcoded keys!)
- ✅ Uses production URL from config (no more localhost!)
- ✅ Proper error handling with helpful messages
- ✅ Handles missing watchlist gracefully (won't crash if user has no watchlist)
- ✅ Better error messages for different scenarios:
  - Authentication errors (401/403)
  - User not found (404)
  - Connection errors
  - Timeout errors
- ✅ Added 10-second timeout to prevent hanging
- ✅ Removed unused imports
- ✅ Fixed watchlist display logic (handles empty watchlist)

**Features:**
- Shows user profile information
- Shows last watched item from watchlist (if available)
- Links to user profile and last watched content
- Beautiful Discord Components V2 UI

### 3. **Status Command** (`src/command/reminiscent/status.js`)
**Improvements:**
- ✅ Uses API key from `client.config.apikey`
- ✅ Uses production URL from config
- ✅ Better error handling
- ✅ Handles missing data gracefully
- ✅ Added timeout protection
- ✅ Removed unused imports

**Features:**
- Shows API health status
- Shows active API keys count
- Shows success/error rates
- Shows total requests

---

## 🎯 How to Use

### 1. **Make sure your API key is correct in `config.js`**
```js
apikey: 'ct_a98ddebaf430df451dadede35904a42296971805d5ce5cda3e165b11fb168f1f'
```

### 2. **Optional: Set custom API URL (for local testing)**
You can set the `API_BASE_URL` environment variable:
```bash
# Windows PowerShell
$env:API_BASE_URL="http://localhost:3000"
node .

# Linux/Mac
API_BASE_URL=http://localhost:3000 node .
```

Or edit `config.js` directly:
```js
apiBaseUrl: 'http://localhost:3000' // For local testing
```

### 3. **Run the bot**
```bash
cd discordbot
npm install  # If you haven't already
npm run start
```

---

## 📋 Commands

### `?user [uid]`
Get user information from reminiscent.cc
- Shows username, UID, Discord mention, last active time
- Shows last watched item (if available)
- Links to profile and last watched content

**Example:**
```
?user 1
?user username
```

### `?status`
Get API status from reminiscent.cc
- Shows API health status
- Shows active API keys
- Shows success/error rates
- Shows total requests

---

## 🔒 Security Notes

1. **API Key**: Make sure your API key in `config.js` has the correct permissions:
   - `public.profiles.read` - For user command
   - `admin.*` - For status command (or `admin.api-status.read`)

2. **Rate Limiting**: The API has rate limiting, so don't spam commands!

3. **Production URL**: By default, it uses `https://reminiscent.cc`. Make sure this is correct for your deployment.

---

## 🐛 Troubleshooting

### "Authentication failed"
- Check your API key in `config.js`
- Make sure the API key has the correct permissions
- Verify the API key is active and not revoked

### "Could not connect to [URL]"
- Check if the website is running
- Verify the `apiBaseUrl` in config is correct
- Check your internet connection

### "User not found"
- Make sure the UID or username is correct
- User might not exist in the database

### "An error occurred"
- Check the console for detailed error messages
- Make sure all dependencies are installed (`npm install`)
- Verify the API endpoints are working

---

## ✨ What's New

1. **No more hardcoded API keys** - Everything uses config
2. **Production-ready** - Uses production URL by default
3. **Better error handling** - Helpful error messages
4. **Graceful degradation** - Won't crash if watchlist is empty
5. **Timeout protection** - Won't hang on slow requests
6. **Clean code** - Removed unused imports and code

---

## 🚀 Ready to Go!

Just run `npm run start` in the `discordbot` folder and you're good to go! The bot will:
- Connect to Discord
- Use your API key from config
- Connect to the production API
- Work with all the new API endpoints we just implemented

**No more configuration needed - it's ready to run!** 🎉

---

**Updated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

