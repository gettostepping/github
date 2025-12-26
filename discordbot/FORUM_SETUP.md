# Forum Channel Setup

## Making Forum Channel Read-Only (Bot Only)

To prevent users from posting in the trending forum channels:

1. **Go to Server Settings** → **Roles** → **@everyone**
2. **Find the forum channel** in the channel list
3. **Right-click the channel** → **Edit Channel**
4. **Go to Permissions tab**
5. **Add a permission override for @everyone:**
   - **Send Messages in Threads**: ❌ Deny
   - **Create Public Threads**: ❌ Deny
   - **Create Private Threads**: ❌ Deny
6. **Make sure the bot role has:**
   - **Send Messages in Threads**: ✅ Allow
   - **Create Public Threads**: ✅ Allow
   - **Create Private Threads**: ✅ Allow

This will make the channel read-only for everyone except the bot!

