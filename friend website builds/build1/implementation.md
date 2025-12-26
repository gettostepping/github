# Complete Reimplementation Prompt for Reminiscent Streaming Security & API System

## Overview
You need to implement a comprehensive security system, API documentation, admin enhancements, and rebranding for a Next.js streaming platform. This document provides all necessary details to recreate the exact implementation.

---

## 🎨 **STYLING & DESIGN PATTERNS**

### **Color Scheme & Theme System**
- **Base Colors**: Use Tailwind's `neutral` palette (neutral-900, neutral-800, neutral-700, etc.)
- **Primary Theme Colors**: Use CSS custom properties `theme-primary` and `theme-secondary` (defined in Tailwind config)
- **Background Pattern**: 
  - Main pages: `bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900`
  - Cards/Components: `bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm`
  - Sub-elements: `bg-neutral-800/50` or `bg-neutral-800/30`

### **Component Styling Conventions**

#### **Card/Section Containers**
```tsx
className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm"
```
- Always use `p-6` for padding
- Use `/50` opacity for backgrounds
- Use `rounded-xl` for border radius
- Always include `backdrop-blur-sm` for glass effect
- Border: `border-neutral-700/50`

#### **Input Fields**
```tsx
className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-theme-primary"
```
- Background: `bg-neutral-800`
- Border: `border-neutral-700`
- Text: `text-white`
- Placeholder: `text-neutral-500`
- Focus ring: `focus:ring-2 focus:ring-theme-primary`

#### **Buttons**
```tsx
// Primary Action
className="px-4 py-2 bg-theme-secondary hover:bg-theme-primary text-white rounded-md transition-colors"

// Danger Action
className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"

// Secondary/Neutral
className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md transition-colors"
```
- Always include `transition-colors` for smooth hover
- Use `rounded-md` (not `rounded-lg` or `rounded-xl`)
- Disabled state: `disabled:bg-neutral-700 disabled:cursor-not-allowed`

#### **Icons**
- Use FontAwesome icons (`@fortawesome/react-fontawesome`)
- Icon pattern: `<FontAwesomeIcon icon={faIconName} className="w-4 h-4" />`
- Primary colored icons: `className="text-theme-primary"`
- Always specify size: `w-4 h-4` or `w-3 h-3` for small icons

#### **Typography**
- Headings: `text-white font-semibold` or `text-white font-bold`
- Body text: `text-neutral-300` or `text-neutral-400`
- Labels: `text-neutral-400 text-sm`
- Muted text: `text-neutral-500 text-xs`
- Code/monospace: `text-theme-primary font-mono`

#### **Status Badges**
```tsx
// Success/Active
className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30"

// Warning
className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30"

// Error/Revoked
className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30"

// Info/Neutral
className="px-2 py-1 bg-neutral-700 text-neutral-300 text-xs rounded"
```

#### **Loading States**
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary mx-auto"></div>
```

#### **Grid Layouts**
```tsx
// 2-column grid
className="grid grid-cols-2 gap-4"

// Responsive grid
className="grid grid-cols-2 md:grid-cols-4 gap-4"

// Flex layouts
className="flex items-center gap-2" // or gap-3, gap-4
```

#### **Spacing Pattern**
- Between sections: `space-y-6` or `mb-6`
- Within cards: `space-y-4` or `mb-4`
- Small gaps: `gap-2` or `gap-3`
- Large gaps: `gap-4` or `gap-6`

---

## 📁 **FILE STRUCTURE & CODE ORGANIZATION**

### **New Files to Create**

#### **Security Library (`src/lib/security/`)**
1. `auth.ts` - Authentication middleware
2. `sanitize.ts` - Data sanitization utilities
3. `rate-limit.ts` - Rate limiting middleware
4. `api-key-auth.ts` - API key verification
5. `audit.ts` - Audit logging (placeholder)
6. `validate.ts` - Input validation (placeholder)

#### **API Routes**
1. `src/app/api/api-docs/route.ts` - Dynamic API discovery endpoint
2. `src/app/api/admin/api-keys/route.ts` - API key management
3. `src/app/api/admin/user-lookup/route.ts` - User search endpoint
4. `src/app/api/admin/stats/route.ts` - System statistics
5. `src/app/api/theme/route.ts` - Theme management (if not exists)

#### **Pages**
1. `src/app/api-docs/page.tsx` - API documentation page
2. `src/app/control/page.tsx` - Control Panel (Developer/Owner only)

#### **Components**
1. `src/components/ApiKeyManagement.tsx` - API key management UI
2. `src/components/UserSearch.tsx` - User lookup component
3. `src/components/SystemDashboard.tsx` - System stats dashboard

---

## 🔒 **SECURITY IMPLEMENTATION DETAILS**

### **1. Authentication System (`src/lib/security/auth.ts`)**

**Key Functions:**
- `getAuthUser(req: NextRequest)` - Returns authenticated user or null
  - Checks API key first (via `verifyApiKey`)
  - Falls back to NextAuth session
  - Returns `AuthUser` interface with `{ id, uid, email, name, roles[] }`
  
- `requireAuth()` - Middleware that returns 401 if not authenticated

- `requireAdmin(roles: string[])` - Middleware for admin endpoints
  - Accepts both session-based auth and API keys
  - For API keys: checks permissions via `hasApiKeyPermission`
  - For sessions: checks role via `hasRole`
  - Attaches user/apiKey to request object

- `getUserFromRequest(req)` - Extracts user from request (null if API key)
- `getApiKeyFromRequest(req)` - Extracts API key info from request

**Important:** API keys don't have user context, so `getUserFromRequest` returns null for API key auth.

### **2. Rate Limiting (`src/lib/security/rate-limit.ts`)**

**Implementation:**
- In-memory Map store (key: `ip:userAgent`, value: `{ count, resetTime }`)
- Cleanup interval: every 5 minutes
- Pre-configured limiters:
  - `strict`: 5 requests / 15 minutes (auth endpoints)
  - `moderate`: 60 requests / minute (general API)
  - `lenient`: 100 requests / minute (public)
  - `admin`: 30 requests / minute (admin endpoints)

**Usage Pattern:**
```typescript
const rateLimitResult = rateLimiters.admin(req)
if (rateLimitResult) return rateLimitResult
```

**Response Headers:**
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` (on 429)

### **3. Data Sanitization (`src/lib/security/sanitize.ts`)**

**Functions:**
- `sanitizeUser(user, options)` - Removes sensitive fields
  - Options: `{ isSelf?, isAdmin?, includeEmail? }`
  - Always removes: password
  - Email only if `includeEmail && (isSelf || isAdmin)`
  - Roles only if `isAdmin || isSelf`

- `sanitizeUsers(users[], options)` - Sanitizes array of users
  - Options: `{ currentUserId?, isAdmin? }`

**Rule:** In list views, never include emails. Only show emails when viewing individual user details (as admin).

### **4. API Key Authentication (`src/lib/security/api-key-auth.ts`)**

**Functions:**
- `verifyApiKey(req: NextRequest)` - Verifies API key from `Authorization: Bearer <key>` header
  - Fetches all non-revoked, non-expired keys
  - Uses bcrypt to compare hashed keys
  - Updates `lastUsedAt` on success
  - Returns `{ id, permissions }` or null

- `hasApiKeyPermission(apiKey, requiredPermission)` - Checks permissions
  - Supports wildcard `*` (all permissions)
  - Supports parent permissions: `admin.*` matches `admin.read`
  - Exact match: `admin.read` matches `admin.read`

### **5. API Route Security Pattern**

**Standard Pattern for Protected Routes:**
```typescript
export async function GET(req: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // 2. Authentication
    const authResult = await requireAdmin(['owner', 'developer', 'admin'])(req)
    if (authResult) return authResult

    // 3. Get user (might be null if API key)
    const admin = getUserFromRequest(req)
    const apiKey = getApiKeyFromRequest(req)

    // 4. Business logic
    // ... fetch data ...

    // 5. Sanitize data
    const sanitized = sanitizeUsers(users, { isAdmin: true })

    // 6. Audit log (if session-based)
    if (admin) {
      await logAdminAction(admin.id, 'action_name', req, { metadata })
    } else if (apiKey) {
      console.log('[API_KEY]', { keyId: apiKey.id, action: 'action_name' })
    }

    return NextResponse.json({ data: sanitized })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

---

## 🗄️ **DATABASE SCHEMA CHANGES**

### **Add to `prisma/schema.prisma`:**

```prisma
model ApiKey {
  id          String   @id @default(cuid())
  key         String   @unique // Hashed API key (never store plain text)
  name        String   // Human-readable name for the key
  createdBy   String   // User ID who created it (Owner/Developer only)
  permissions String[] @default([]) // Array of permission strings like ["admin.read", "users.read", "users.write"]
  lastUsedAt  DateTime? // Track when key was last used
  expiresAt   DateTime? // Optional expiration date
  revoked     Boolean  @default(false) // Can revoke without deleting
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([createdBy])
  @@index([revoked])
}
```

**Migration Command:**
```bash
npx dotenv-cli -e .env.local -- npx prisma migrate dev --name add_api_keys
```

---

## 🔑 **API KEY MANAGEMENT SYSTEM**

### **API Endpoints (`src/app/api/admin/api-keys/route.ts`)**

#### **GET `/api/admin/api-keys`**
- Lists all API keys (metadata only, not actual keys)
- Includes: name, creator, permissions, lastUsedAt, expiresAt, revoked status
- Returns creator name by looking up User

#### **POST `/api/admin/api-keys`**
- Creates new API key
- Request body: `{ name: string, permissions: string[], expiresInDays?: number }`
- Generates key: `ct_${crypto.randomBytes(32).toString('hex')}`
- Hashes with bcrypt (12 rounds) before storing
- Returns plain key ONCE (user must save immediately)
- **Security:** Requires session-based auth (not API keys)

#### **DELETE `/api/admin/api-keys`**
- Revokes API key (sets `revoked: true`)
- Request body: `{ keyId: string }`
- **Security:** Requires session-based auth

### **UI Component (`src/components/ApiKeyManagement.tsx`)**

**Features:**
- List of existing keys with status badges (revoked, expired)
- Create form with:
  - Key name input
  - Checkbox list of permissions
  - Optional expiration
- Warning banner when new key is created (shows key once)
- Copy to clipboard functionality
- Revoke button for each key

**Styling:**
- Container: standard card styling
- Warning banner: `bg-yellow-500/10 border-2 border-yellow-500/50`
- Key display: `bg-neutral-950 p-3 rounded border border-neutral-700`
- Key text: `text-green-400 text-sm font-mono`

---

## 📚 **API DOCUMENTATION SYSTEM**

### **Discovery Endpoint (`src/app/api/api-docs/route.ts`)**

**Functionality:**
- Recursively scans `src/app/api` directory
- Finds all route handlers (route.ts files)
- Extracts HTTP methods from exported functions (GET, POST, PUT, DELETE, etc.)
- Returns array of `{ path, methods[], filePath }`

**Path Generation:**
- Converts file path to API path
- Example: `src/app/api/admin/users/route.ts` → `/api/admin/users`
- Handles root-level routes correctly (`src/app/api/route.ts` → `/api`)

### **Documentation Page (`src/app/api-docs/page.tsx`)**

**Features:**
- Dynamic endpoint list (fetches from `/api/api-docs`)
- Categorized by endpoint prefix (admin, auth, tmdb, etc.)
- Expandable cards with detailed metadata:
  - Request body examples
  - Query parameters
  - Response examples with status codes
  - Authentication requirements
- Role-based visibility:
  - Admin routes hidden from regular users
  - Only Developer/Owner can see admin routes
  - `/api/profiles` and `/api/invitations` also hidden from public

**Metadata Structure:**
```typescript
const endpointMetadata: Record<string, EndpointDetails> = {
  '/api/endpoint': {
    description: '...',
    authRequired: boolean,
    adminOnly: boolean,
    requestBody?: { description: string, example: any },
    queryParams?: Array<{ name, type, required, description }>,
    responseExamples?: Array<{ status, description, example }>
  }
}
```

**Styling:**
- Endpoint cards: `border border-neutral-700 rounded-lg overflow-hidden hover:border-theme-primary/50`
- Method badges: `px-2 py-1 rounded text-xs font-bold bg-neutral-700/50 text-neutral-400 border border-neutral-600/50`
- Code blocks: `bg-neutral-950 p-3 rounded text-xs overflow-x-auto border border-neutral-700`
- Expandable sections: `border-t border-neutral-700 bg-neutral-900/50 p-4`

---

## 👥 **ADMIN PANEL ENHANCEMENTS**

### **User Search Component (`src/components/UserSearch.tsx`)**

**Features:**
- Search form with dropdown (UID, Name, Email)
- Displays full user information:
  - Profile image, name, UID, roles
  - Email (with copy button)
  - Discord ID
  - Created date
  - Stats: watchlist count, ratings count, comments count
  - Profile bio and last active
  - Currently watching info
- Quick actions:
  - View profile link
  - Copy UID button
  - Warn/Ban buttons (for admins)
  - Delete button (for Owner/Developer)

**Layout:**
- Header card with user avatar and info
- Stats grid: `grid grid-cols-3 gap-3`
- Profile info card
- Action buttons row

### **System Dashboard Component (`src/components/SystemDashboard.tsx`)**

**Features:**
- Fetches stats from `/api/admin/stats`
- Auto-refreshes every 30 seconds
- Displays 8 stat cards:
  - Total Users (blue)
  - Active Today (green)
  - New This Week (purple)
  - Total Bans (red)
  - Roles Assigned (yellow)
  - Total Comments (cyan)
  - Total Ratings (orange)
  - Watchlist Items (pink)

**Card Styling:**
- Each card has color theme: `bg-{color}-500/10 border border-{color}-500/30`
- Icon: `text-{color}-400`
- Value: `text-2xl font-bold text-{color}-400`
- Grid: `grid grid-cols-2 md:grid-cols-4 gap-4`

### **Admin Panel Page Updates (`src/app/admin/page.tsx`)**

**Changes:**
- Remove `ThemeManager` component (moved to Control Panel)
- Add `SystemDashboard` component at top
- Add `UserSearch` component
- Keep existing role management, invites, pending registrations

---

## 🎛️ **CONTROL PANEL**

### **Page (`src/app/control/page.tsx`)**

**Access Control:**
- Only Developer and Owner roles can access
- Redirects to home if not authorized
- Checks role via `/api/admin/check`

**Components:**
- `ThemeManager` (moved from Admin Panel)
- `ApiKeyManagement`

**Layout:**
- Same background gradient as Admin Panel
- `max-w-6xl mx-auto space-y-6`
- Header with icon and description

### **Header Navigation Update (`src/components/Header.tsx`)**

**Add to dropdown menu:**
```tsx
{(adminData?.isOwner || adminData?.isDeveloper) && (
  <Link href="/control" className="...">
    <FontAwesomeIcon icon={faCog} className="w-4 h-4" /> Control Panel
  </Link>
)}
```
- Only visible to Owner/Developer
- Uses `faCog` icon
- Same styling as other dropdown items

---

## 🔐 **SECURITY HEADERS**

### **Update `next.config.js`:**

```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        ...(process.env.NODE_ENV === 'production' ? [{
          key: 'X-SourceMap',
          value: 'disable'
        }] : [])
      ]
    }
  ]
},
productionBrowserSourceMaps: false,
```

---

## 🏷️ **REBRANDING: CacheTomb → Reminiscent**

### **Files to Update:**

1. **`src/components/AnimatedLogo.tsx`**
   - Change `logoText` from "CacheTomb" to "Reminiscent"

2. **`src/app/layout.tsx`**
   - Update `metadata.title` to "Reminiscent Streaming"

3. **`src/app/auth/signin/page.tsx`**
   - Change "Welcome Back to CacheTomb" → "Welcome Back to Reminiscent"

4. **`src/app/auth/register/page.tsx`**
   - Change "Join CacheTomb" → "Join Reminiscent"

5. **`src/app/page.tsx`**
   - Change "Welcome to CacheTomb" → "Welcome to Reminiscent"

6. **`src/components/NotSignedIn.tsx`**
   - Change "Welcome to CacheTomb" → "Welcome to Reminiscent"

7. **`src/app/watch/[id]/page.tsx`**
   - Change "CacheTomb.fm Player" → "Reminiscent.fm Player"

8. **`src/components/RequireDiscordLink.tsx`**
   - Change all "CacheTomb" references to "Reminiscent"

9. **`src/app/manifest.webmanifest`**
   - Change `name` and `short_name` to "Reminiscent Streaming" and "Reminiscent"

10. **`src/app/api-docs/page.tsx`**
    - Change "CacheTomb Streaming" → "Reminiscent Streaming"

11. **`src/themes/theme-config.ts`**
    - Change default theme name from "CacheTomb Classic" → "Reminiscent Classic"

12. **`src/contexts/ThemeContext.tsx`**
    - Change localStorage key from "cachetomb-theme" → "reminiscent-theme"
    - Add migration: if old key exists, copy value and delete old key

**Search Pattern:**
```bash
# Find all occurrences
grep -r "CacheTomb" --include="*.tsx" --include="*.ts" --include="*.json"
```

---

## 🔧 **API ENDPOINT DETAILS**

### **New Endpoints:**

#### **`/api/admin/api-keys`**
- GET: List keys (metadata only)
- POST: Create key (requires session auth)
- DELETE: Revoke key (requires session auth)

#### **`/api/admin/user-lookup`**
- GET: Search user by UID, name, or email
- Query params: `type` (uid|name|email), `query` (search value)
- Returns full user data including email (admin only)

#### **`/api/admin/stats`**
- GET: System-wide statistics
- Returns: totalUsers, activeToday, newRegistrations, totalBans, totalRoles, totalComments, totalRatings, totalWatchlists

#### **`/api/api-docs`**
- GET: Dynamic endpoint discovery
- Returns: `{ endpoints: [{ path, methods[], filePath }] }`

### **Modified Endpoints:**

#### **`/api/profiles` (GET)**
- Added `sanitizeUser` call
- Only shows email if `isSelf || isAdmin`
- Removed email from `likedBy` sub-selection

#### **`/api/admin/users` (GET)**
- Removed email from list view `select` query
- Added `sanitizeUsers` call
- Uses `getUserFromRequest` and audit logging

---

## 📝 **CODE STYLE GUIDELINES**

### **TypeScript Patterns:**

1. **Interfaces for Props:**
```typescript
interface ComponentProps {
  adminData: {
    isOwner: boolean
    isDeveloper: boolean
    isAdmin: boolean
  }
}
```

2. **Error Handling:**
```typescript
try {
  // ... code ...
} catch (error) {
  console.error('Error message:', error)
  return NextResponse.json({ error: 'User-friendly message' }, { status: 500 })
}
```

3. **Loading States:**
```typescript
const [loading, setLoading] = useState(true)
// ... fetch ...
finally {
  setLoading(false)
}
```

4. **Form Handling:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  // ... validation ...
  // ... API call ...
}
```

### **React Patterns:**

1. **Client Components:**
   - Always use `'use client'` directive at top
   - Use `useState` and `useEffect` for data fetching
   - Use `useSession` from `next-auth/react` for auth

2. **API Calls:**
```typescript
const res = await fetch('/api/endpoint')
if (res.ok) {
  const data = await res.json()
  // ... handle data ...
} else {
  const error = await res.json()
  alert(error.error || 'Failed')
}
```

3. **Conditional Rendering:**
```tsx
{loading ? (
  <div className="animate-spin ..."></div>
) : error ? (
  <div className="text-red-400">{error}</div>
) : (
  <div>{/* content */}</div>
)}
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Phase 1: Security Infrastructure**
- [ ] Create `src/lib/security/` directory
- [ ] Implement `auth.ts` with hybrid auth system
- [ ] Implement `sanitize.ts` with user sanitization
- [ ] Implement `rate-limit.ts` with pre-configured limiters
- [ ] Implement `api-key-auth.ts` with permission checking
- [ ] Create placeholder `audit.ts` and `validate.ts`

### **Phase 2: Database**
- [ ] Add `ApiKey` model to Prisma schema
- [ ] Run migration: `npx dotenv-cli -e .env.local -- npx prisma migrate dev --name add_api_keys`

### **Phase 3: API Routes**
- [ ] Create `/api/api-docs` discovery endpoint
- [ ] Create `/api/admin/api-keys` (GET, POST, DELETE)
- [ ] Create `/api/admin/user-lookup` (GET)
- [ ] Create `/api/admin/stats` (GET)
- [ ] Update `/api/profiles` with sanitization
- [ ] Update `/api/admin/users` with sanitization

### **Phase 4: Security Headers**
- [ ] Update `next.config.js` with security headers

### **Phase 5: UI Components**
- [ ] Create `ApiKeyManagement.tsx`
- [ ] Create `UserSearch.tsx`
- [ ] Create `SystemDashboard.tsx`
- [ ] Update `AdminPanel` page
- [ ] Create `ControlPanel` page
- [ ] Update `Header.tsx` with Control Panel link

### **Phase 6: API Documentation**
- [ ] Create `/api-docs` page
- [ ] Add comprehensive endpoint metadata
- [ ] Implement role-based visibility

### **Phase 7: Rebranding**
- [ ] Search and replace all "CacheTomb" → "Reminiscent"
- [ ] Update localStorage migration in ThemeContext

### **Phase 8: Testing**
- [ ] Test API key creation and revocation
- [ ] Test API key authentication on protected routes
- [ ] Test rate limiting
- [ ] Test data sanitization
- [ ] Test role-based access control
- [ ] Test API documentation visibility

---

## 🎯 **KEY IMPLEMENTATION NOTES**

1. **API Key Security:**
   - Never store plain API keys
   - Hash with bcrypt (12 rounds)
   - Return plain key only once on creation
   - API key management requires session auth (prevents key-ception)

2. **Data Sanitization:**
   - Emails are sensitive - only show in individual lookups, not lists
   - Always sanitize user objects before sending to client
   - Use `sanitizeUser` for single users, `sanitizeUsers` for arrays

3. **Rate Limiting:**
   - Use appropriate limiter for each endpoint type
   - Return proper headers for client awareness
   - Clean up old entries periodically

4. **Authentication Flow:**
   - Check API key first, then session
   - API keys have permissions, sessions have roles
   - Both can access admin endpoints if properly configured

5. **Styling Consistency:**
   - Always use the same card/container styling
   - Consistent button styles
   - Consistent spacing patterns
   - Use theme colors for primary elements

6. **Error Handling:**
   - Always return user-friendly error messages
   - Log errors server-side
   - Use appropriate HTTP status codes

---

## 📦 **DEPENDENCIES**

Ensure these are installed:
```json
{
  "bcryptjs": "^2.4.3",
  "@fortawesome/react-fontawesome": "^0.2.0",
  "@fortawesome/free-solid-svg-icons": "^6.5.1",
  "next-auth": "^4.24.5",
  "@prisma/client": "^5.7.0"
}
```

---

## 🚀 **FINAL NOTES**

- All security measures are defensive - even if routes are discovered, they're protected
- The system supports both web UI (sessions) and bot integration (API keys)
- All sensitive data is sanitized before sending to clients
- Rate limiting prevents abuse and brute force attacks
- Audit logging tracks sensitive actions (placeholder for full implementation)
- The rebranding is complete and includes localStorage migration

This implementation provides enterprise-grade security while maintaining a clean, modern UI that matches the existing design system.

