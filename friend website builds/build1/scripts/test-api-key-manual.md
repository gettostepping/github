# Manual API Key Testing Guide

## Step 1: Create an API Key

### Option A: Through the UI (Recommended)
1. Start your dev server: `npm run dev`
2. Sign in as an Owner or Developer
3. Go to `/control` (Control Panel)
4. Fill in the API Key form:
   - **Name**: "Test Key"
   - **Permissions**: Select "Admin Read" and "Users Read"
   - **Expires In**: Leave empty (no expiration)
5. Click "Create API Key"
6. **IMPORTANT**: Copy the API key immediately - it's only shown once!

### Option B: Using the Test Script
```bash
npx dotenv-cli -e .env.local -- node scripts/test-api-key.js
```

This will:
- Create a test API key
- Show you the key
- Test it automatically

## Step 2: Test the API Key

### Method 1: Using curl (Command Line)

```bash
# Replace YOUR_API_KEY with the actual key
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/admin/stats
```

Or use the provided script:
```bash
chmod +x scripts/test-api-key-curl.sh
./scripts/test-api-key-curl.sh YOUR_API_KEY
```

### Method 2: Using JavaScript/TypeScript

```javascript
const apiKey = 'ct_your_actual_api_key_here'

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

### Method 3: Using Postman/Insomnia

1. **Method**: GET
2. **URL**: `http://localhost:3000/api/admin/stats`
3. **Headers**:
   - `Authorization`: `Bearer YOUR_API_KEY`
   - `Content-Type`: `application/json`
4. Click Send

### Method 4: Using Node.js Script

```javascript
const fetch = require('node-fetch') // or use native fetch in Node 18+

const apiKey = 'ct_your_actual_api_key_here'

async function test() {
  const res = await fetch('http://localhost:3000/api/admin/stats', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })
  
  const data = await res.json()
  console.log(data)
}

test()
```

## Step 3: Test Different Endpoints

### ✅ Should Work (with proper permissions):
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/user-lookup?type=uid&query=1` - User lookup
- `GET /api/admin/users` - List users (if key has `admin.read`)

### ❌ Should NOT Work (requires session auth):
- `POST /api/admin/api-keys` - Create key (session only)
- `DELETE /api/admin/api-keys` - Revoke key (session only)

## Step 4: Verify Permissions

Your API key has permissions. Test if they work:

```bash
# Test with admin.read permission
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/admin/stats

# Test with users.read permission  
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/admin/users
```

## Troubleshooting

- **401 Unauthorized**: Check that the API key is correct and not revoked
- **403 Forbidden**: The API key doesn't have the required permission
- **404 Not Found**: Make sure your dev server is running
- **Key not working**: Check if the key is expired or revoked

## Security Notes

- ⚠️ Never commit API keys to git
- ⚠️ API keys shown once - save them immediately
- ⚠️ Revoke keys you're not using
- ⚠️ Use different keys for different purposes

