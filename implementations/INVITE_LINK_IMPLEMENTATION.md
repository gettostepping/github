# Invite Link Feature Implementation Guide

## Overview
This guide explains how to implement an invite link feature that allows users to:
1. Copy an invite link from the invitations page (format: `https://yourdomain.com/register?code=XXXXXXXX`)
2. Auto-fill the invite code when users visit the registration page via the invite link

## Files to Modify

### 1. Invitations Page (`src/app/invitations/page.tsx`)

**Changes needed:**
- Add FontAwesome icon imports for the copy button
- Add state to track which invite code was copied
- Add a function to copy the invite link to clipboard
- Add a copy button next to each invite code in the table

**Implementation:**

```typescript
// Add these imports at the top
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy } from '@fortawesome/free-solid-svg-icons'

// Add state inside the component
const [copiedCode, setCopiedCode] = useState<string | null>(null)

// Add this function inside the component
const copyInviteLink = (code: string) => {
  const inviteLink = `${window.location.origin}/register?code=${code}`
  navigator.clipboard.writeText(inviteLink).then(() => {
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }).catch(err => {
    console.error('Failed to copy:', err)
  })
}

// In the table where invite codes are displayed, modify the code cell:
<td className="p-4 font-mono">
  {inv.code}{' '}
  <button
    onClick={() => copyInviteLink(inv.code)}
    className="ml-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
    title="Copy invite link"
  >
    <FontAwesomeIcon icon={faCopy} />
  </button>
  {copiedCode === inv.code && (
    <span className="ml-2 text-xs text-green-400">Copied!</span>
  )}
</td>
```

**Key points:**
- Uses `window.location.origin` to get the current domain
- Constructs the link as `/register?code=${code}`
- Shows a "Copied!" confirmation for 2 seconds
- Uses FontAwesome copy icon

### 2. Registration Page (`src/app/auth/register/page.tsx`)

**Changes needed:**
- Import `useSearchParams` from Next.js
- Wrap the registration form in a Suspense boundary (required for `useSearchParams` in client components)
- Read the `code` query parameter from the URL
- Auto-fill the invite code fields when the code parameter is present

**Implementation:**

```typescript
// Add these imports
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

// Create a separate component for the form (to use useSearchParams)
function RegisterForm() {
  const searchParams = useSearchParams()
  // ... existing state declarations ...
  const [invitation, setInvitation] = useState('')
  const [discordInviteCode, setDiscordInviteCode] = useState('')

  // Add this useEffect to read the code parameter
  useEffect(() => {
    const codeParam = searchParams.get('code')
    if (codeParam) {
      setInvitation(codeParam)
      setDiscordInviteCode(codeParam)
    }
  }, [searchParams])

  // ... rest of your existing form component ...
}

// Update the main export to wrap in Suspense
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
```

**Key points:**
- `useSearchParams` must be used in a client component wrapped in Suspense
- The `code` query parameter is read using `searchParams.get('code')`
- Both `invitation` and `discordInviteCode` states are set to the code value
- The effect runs when `searchParams` changes

### 3. Register Redirect Page (`src/app/register/page.tsx`)

**Purpose:** Create a redirect route from `/register` to `/auth/register` while preserving the `code` query parameter.

**Create this new file:**

```typescript
import { redirect } from 'next/navigation';

export default function RegisterRedirectPage({ 
  searchParams 
}: { 
  searchParams: { code?: string } 
}) {
  const codeParam = searchParams.code ? `?code=${searchParams.code}` : '';
  redirect(`/auth/register${codeParam}`);
}
```

**Key points:**
- This is a server component (no "use client" directive)
- Uses Next.js `redirect` function for server-side redirect
- Preserves the `code` query parameter in the redirect URL
- Handles cases where `code` may not be present

## Flow Diagram

```
User clicks copy button on /invitations
    ↓
Invite link copied: https://yourdomain.com/register?code=ABC123
    ↓
User shares link or visits it
    ↓
Browser navigates to /register?code=ABC123
    ↓
Next.js redirects to /auth/register?code=ABC123
    ↓
RegisterForm component reads code parameter
    ↓
Invite code fields auto-filled with ABC123
    ↓
User can register with pre-filled code
```

## Testing Checklist

1. **Copy Functionality:**
   - [ ] Click copy button next to an invite code
   - [ ] Verify "Copied!" message appears
   - [ ] Paste clipboard and verify link format: `https://yourdomain.com/register?code=XXXXXXXX`

2. **Link Navigation:**
   - [ ] Visit `/register?code=TESTCODE`
   - [ ] Verify redirect to `/auth/register?code=TESTCODE`
   - [ ] Verify invite code fields are pre-filled with `TESTCODE`

3. **Edge Cases:**
   - [ ] Visit `/register` without code parameter (should redirect normally)
   - [ ] Visit `/auth/register?code=TESTCODE` directly (should work)
   - [ ] Verify form still works if user manually changes the code

## Dependencies

Ensure these packages are installed:
- `@fortawesome/react-fontawesome`
- `@fortawesome/free-solid-svg-icons`
- `next` (for `useSearchParams` and `redirect`)

## Notes

- The copy button uses the browser's Clipboard API (`navigator.clipboard.writeText`)
- The "Copied!" confirmation disappears after 2 seconds
- The redirect preserves query parameters automatically
- The Suspense boundary is required because `useSearchParams` causes the component to suspend during server-side rendering

## Troubleshooting

**Issue:** Copy button doesn't work
- Check browser console for errors
- Ensure Clipboard API is available (HTTPS required in production)
- Verify FontAwesome icons are properly imported

**Issue:** Code doesn't auto-fill
- Verify the URL contains `?code=XXXXX`
- Check browser console for errors
- Ensure `useSearchParams` is wrapped in Suspense
- Verify state variable names match your form fields

**Issue:** Redirect doesn't preserve code
- Check that `searchParams.code` is being read correctly
- Verify the redirect URL construction includes the query parameter
- Test with both `/register?code=XXX` and `/auth/register?code=XXX`

