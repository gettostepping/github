# API Key Fixes Summary

## ✅ Fixes Applied

### 1. Permission Fix for `/api/profiles`
**File**: `src/app/api/profiles/route.ts`

**Change**: Updated permission check to accept `admin.*` permission for public endpoints.

**Before**:
```typescript
if (!hasApiKeyPermission(apiKey, 'public.profiles.read') && !hasApiKeyPermission(apiKey, 'public.*')) {
  return NextResponse.json({ error: 'Insufficient permissions. Requires public.profiles.read' }, { status: 403 })
}
```

**After**:
```typescript
const hasAccess = hasApiKeyPermission(apiKey, 'public.profiles.read') || 
                  hasApiKeyPermission(apiKey, 'public.*') || 
                  hasApiKeyPermission(apiKey, 'admin.*') ||
                  hasApiKeyPermission(apiKey, '*')
if (!hasAccess) {
  return NextResponse.json({ error: 'Insufficient permissions. Requires public.profiles.read' }, { status: 403 })
}
```

**Result**: API keys with `admin.*` permission can now access `/api/profiles` endpoint.

---

### 2. Admin Endpoints Already Support `admin.*`
**File**: `src/lib/security/auth.ts` (requireAdmin function)

**Status**: ✅ Already working correctly

The `requireAdmin` function already accepts `admin.*` permission for admin endpoints like `/api/admin/pending-registrations`. No changes needed.

---

## ⚠️ Remaining Issue: API Key Authentication

### Problem
The friend's API key `ct_fa10a916669b24eee83f5d1fe7cf06528d2b453cfd2b58eb6e2601a92bc9f` does NOT match the database hash.

**Test Results**:
- ❌ Key doesn't match database hash
- ❌ Returns 401 "Not authenticated" before permission checks

### Root Cause
The API key authentication fails because:
1. The key hash doesn't match what's stored in the database
2. This causes `verifyApiKey()` to return `null`
3. Route then checks for session, finds none, returns 401

### Solution
The friend needs to use the **correct API key** that matches the database hash.

**How to get the correct key**:
1. Log in as Owner/Developer on reminiscent.cc
2. Go to API Key Management
3. Find the API key with ID: `cmitqvs6x000fkvg1fkl5u2r0` (name: "Dimension")
4. Click "Show Key" to retrieve the decrypted plain text key
5. Use that key in the Discord bot

**OR** use the API endpoint:
```
GET /api/admin/api-keys/cmitqvs6x000fkvg1fkl5u2r0
```
(Requires Owner/Developer session authentication)

---

## 📊 Expected Behavior After Fixes

Once the correct API key is used:

### `/api/profiles?uid=<uid>`
- ✅ Should return 200 OK with user data
- ✅ Works with `admin.*` permission (now fixed)

### `/api/admin/pending-registrations`
- ✅ Should return 200 OK with pending registrations
- ✅ Already works with `admin.*` permission

---

## 🧪 Testing

Run the test script to verify:
```bash
node test-api-key-verification.js
```

This will test:
1. Key hash matching
2. `/api/profiles` endpoint
3. `/api/admin/pending-registrations` endpoint

---

## 📝 Summary

**Fixes Complete**:
- ✅ Permission logic updated to accept `admin.*` for public endpoints
- ✅ Admin endpoints already support `admin.*` (no changes needed)

**Remaining Issue**:
- ⚠️ Friend needs to use the correct API key that matches the database hash
- The key format should be: `ct_<64 hex characters>`
- Can be retrieved via `/api/admin/api-keys/[id]` endpoint (Owner/Developer only)

**Next Steps**:
1. Friend retrieves correct API key from admin panel
2. Updates Discord bot with correct key
3. Both endpoints should work correctly

