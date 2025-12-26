# API Key Testing Guide

## ✅ Your Test API Key

**Key**: `ct_d2367e5b7c7a06f65b1f1fc68d794647be920e82921b5e144dc7bb1f7419a1ad`

**Permissions**: `admin.read`, `users.read`

⚠️ **Save this key - it won't be shown again!**

## Quick Test Commands

### 1. Test with curl (Command Line)

```bash
# Replace YOUR_API_KEY with the key above
curl -H "Authorization: Bearer ct_d2367e5b7c7a06f65b1f1fc68d794647be920e82921b5e144dc7bb1f7419a1ad" \
     http://localhost:3000/api/admin/stats
```

### 2. Test with JavaScript/Node.js

```javascript
const apiKey = 'ct_d2367e5b7c7a06f65b1f1fc68d794647be920e82921b5e144dc7bb1f7419a1ad'

// Test: Get system stats
const response = await fetch('http://localhost:3000/api/admin/stats', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
console.log(data)
```

### 3. Test with Postman/Insomnia

1. **Method**: GET
2. **URL**: `http://localhost:3000/api/admin/stats`
3. **Headers**:
   - Key: `Authorization`
   - Value: `Bearer ct_d2367e5b7c7a06f65b1f1fc68d794647be920e82921b5e144dc7bb1f7419a1ad`
4. Click **Send**

## Testable Endpoints

### ✅ Should Work (with `admin.read` permission):

- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - List users (if key has `users.read`)
- `GET /api/admin/user-lookup?type=uid&query=1` - User lookup

### ❌ Won't Work (requires session auth, not API keys):

- `POST /api/admin/api-keys` - Create key
- `DELETE /api/admin/api-keys` - Revoke key

## Expected Response

When testing `/api/admin/stats`, you should get:

```json
{
  "totalUsers": 6,
  "activeToday": 2,
  "newRegistrations": 1,
  "totalBans": 0,
  "totalRoles": 3,
  "totalComments": 0,
  "totalRatings": 1,
  "totalWatchlists": 12
}
```

## Create More Keys via UI

1. Start dev server: `npm run dev`
2. Sign in as Owner/Developer
3. Go to `/control` (Control Panel)
4. Create API keys with different permissions

## Automated Test Script

Run the test script anytime:

```bash
npx dotenv-cli -e .env.local -- node scripts/test-api-key.js
```

This will create a new test key and test it automatically.

