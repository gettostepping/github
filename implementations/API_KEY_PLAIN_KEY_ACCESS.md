# API Key Plain Key Access for Owners/Developers

## Overview
Owners and Developers can now view API keys even after they've been created. This is essential for managing and controlling all API keys on the platform.

## Changes Made

### 1. Database Schema
- Added `plainKey` field to `ApiKey` model (optional String)
- This field stores the encrypted plain text key

### 2. Encryption System
- Created `src/lib/security/encryption.ts`
- Uses AES-256-CBC encryption
- Encryption key from `ENCRYPTION_KEY` environment variable (optional, has default for dev)

### 3. API Changes
- **POST `/api/admin/api-keys`**: Now encrypts and stores plain key when creating new keys
- **GET `/api/admin/api-keys`**: Returns `hasPlainKey` flag for each key
- **GET `/api/admin/api-keys/[id]`**: New endpoint to retrieve plain key (Owner/Developer only)

### 4. Frontend Changes
- Updated "Show Key" button to fetch from server if key not in memory
- Only Owners/Developers can retrieve keys after creation

## Migration Required

You need to run a database migration to add the `plainKey` field:

```bash
npx prisma migrate dev --name add_plain_key_field
```

Or if you want to push without creating a migration:

```bash
npx prisma db push
```

## Important Notes

1. **Existing Keys**: Keys created before this update won't have `plainKey` stored, so they cannot be retrieved. Only new keys will have this capability.

2. **Security**: 
   - Plain keys are encrypted using AES-256-CBC
   - Only accessible to Owners and Developers via session authentication
   - Set `ENCRYPTION_KEY` environment variable in production (32-byte hex string)

3. **Backward Compatibility**: Old keys will show `hasPlainKey: false` and cannot be retrieved.

## Testing

After migration:
1. Create a new API key
2. Click "Show Key" - should work immediately (from memory)
3. Refresh the page
4. Click "Show Key" again - should fetch from server and decrypt

## Environment Variable (Optional)

For production, set in `.env.local`:
```
ENCRYPTION_KEY=your-32-byte-hex-string-here
```

Generate a secure key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```



