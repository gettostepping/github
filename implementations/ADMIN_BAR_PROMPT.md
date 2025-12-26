# Admin Control Panel Mock - Frontend Only

Create a **frontend-only mockup** of a floating admin control panel/management bar inspired by the design pattern from https://animate-ui.com/docs/components/community/management-bar.mdx. This should be a **purely visual/interactive mockup** with **mock data** - no backend integration needed.

## Design Requirements

### Visual Style
- **Floating management bar** that appears on all pages (fixed position)
- **Collapsible/expandable** - can collapse to icon-only mode or expand to full panel
- **Dark theme** matching a streaming website aesthetic:
  - Background: `neutral-900` with backdrop blur
  - Borders: `neutral-700/50`
  - Accent color: `brand-400` / `brand-600` (purple/indigo theme)
  - Text: White/neutral-300 for primary, neutral-400 for secondary
- **Smooth animations** for expand/collapse, hover states, and interactions
- **Mobile responsive** - adapts to smaller screens (stack vertically or use drawer)

### Layout Options (choose one or make it configurable)
1. **Top bar** - Fixed at top of viewport, horizontal layout
2. **Side bar** - Fixed on left/right side, vertical layout
3. **Bottom bar** - Fixed at bottom, horizontal layout
4. **Corner widget** - Floating in corner, expands to panel

## Required Features & Sections

### 1. Quick Stats Dashboard (Collapsed View)
When collapsed, show icon badges with counts:
- 🔴 **Pending Reports** badge (red, with count number)
- ⚠️ **Pending Registrations** badge (yellow, with count)
- 🚫 **Active Bans** badge (orange, with count)
- 📊 **System Status** indicator (green/yellow/red dot)

### 2. User Search & Quick Actions (Expanded View)
**Search Bar:**
- Dropdown to select search type: `UID` | `Name` | `Email`
- Text input for search query
- Search button
- When user is found, display:
  - User avatar (circular, 64px)
  - User name
  - UID badge
  - Role badges (if admin/moderator)
  - Email (with copy button)
  - Join date
  - Last active time
  - Quick action buttons (see below)

**Quick Action Buttons** (for found user):
- 🚫 **Ban User** - Opens modal with:
  - Reason input (textarea)
  - Duration selector (Permanent, 1 day, 7 days, 30 days, Custom date)
  - Confirm button
- ⚠️ **Warn User** - Opens modal with:
  - Warning reason (textarea)
  - Severity selector (Low, Medium, High)
  - Confirm button
- 👤 **View Profile** - Link to user profile page
- 🛡️ **Assign Role** - Dropdown with roles:
  - Trial Mod
  - Moderator
  - Admin
  - Developer
  - Owner (only if current user is owner)
- ➖ **Remove Role** - Dropdown with user's current roles
- 🗑️ **Delete User** - Opens confirmation modal

### 3. Pending Reports Section
**Expandable section** showing:
- List of pending reports (mock data):
  - Report ID
  - Reporter name + avatar
  - Reported user name + avatar
  - Report reason (truncated, expandable)
  - Report type (Comment, Profile, etc.)
  - Timestamp
  - Quick actions:
    - ✅ **Resolve** button
    - 👁️ **View Details** button
    - 🚫 **Ban Reported User** (quick action)
    - ⚠️ **Warn Reported User** (quick action)

### 4. Pending Registrations Section
**Expandable section** showing:
- List of pending registrations (mock data):
  - Registration ID
  - Discord username + avatar
  - Email
  - Invite code used
  - Flag reason (if flagged)
  - Registration date
  - Quick actions:
    - ✅ **Approve** button
    - ❌ **Deny** button
    - 👁️ **View Details** button

### 5. Invitation Management Section
**Expandable section** showing:
- List of invitation codes (mock data):
  - Invite code (with copy button)
  - Issuer name
  - Status (Enabled/Disabled) - toggle switch
  - Used by (user name or "Unused")
  - Created date
  - Testing mode toggle
  - Actions:
    - 🗑️ **Delete** button
    - 🔄 **Toggle Enable/Disable**
    - 🧪 **Toggle Testing Mode**

**Create Invite Section:**
- UID input field
- Count selector (1-10)
- "Create Invites" button

### 6. System Stats Section
**Expandable section** showing:
- Total Users count
- Active Users (last 24h)
- Total Reports count
- Resolved Reports count
- Active Bans count
- Total Invites created
- System uptime/status

### 7. Quick Access Menu
**Icon buttons** for:
- 🏠 **Admin Dashboard** - Link to full admin page
- 📋 **All Reports** - Link to reports page
- 👥 **All Users** - Link to users list
- ⚙️ **Settings** - Link to admin settings

## Mock Data Requirements

Create realistic mock data for:
- **3-5 sample users** with different roles (user, moderator, admin)
- **5-7 pending reports** with various types and reasons
- **3-4 pending registrations** with different statuses
- **10-15 invitation codes** with various states (used/unused, enabled/disabled)
- **System stats** with realistic numbers

## Interaction Requirements

### Modals/Dialogs Needed:
1. **Ban User Modal:**
   - User info display
   - Reason textarea
   - Duration selector (radio buttons or dropdown)
   - Cancel/Confirm buttons
   - Success/error toast notification

2. **Warn User Modal:**
   - User info display
   - Warning reason textarea
   - Severity selector
   - Cancel/Confirm buttons
   - Success/error toast notification

3. **Delete User Confirmation:**
   - User info display
   - Warning message
   - Cancel/Confirm buttons

4. **Assign/Remove Role Modal:**
   - User info display
   - Role selector dropdown
   - Current roles display
   - Cancel/Confirm buttons

### Toast Notifications:
- Success messages (green)
- Error messages (red)
- Info messages (blue)
- Should appear top-right or bottom-right
- Auto-dismiss after 3-5 seconds

## Technical Stack (Suggestions)
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** or CSS transitions for animations
- **Font Awesome** icons (or similar icon library)
- **No backend calls** - all data should be hardcoded/mocked

## UI/UX Details

### Collapsed State:
- Show only icons with badge counts
- Hover to show tooltips
- Click to expand

### Expanded State:
- Full panel with all sections
- Sections can be individually collapsed/expanded
- Smooth scroll if content is long
- Close button to collapse

### Responsive Behavior:
- **Desktop**: Side bar or top bar
- **Tablet**: Adjustable width, stack sections if needed
- **Mobile**: Drawer that slides in from side, or bottom sheet

### Visual Polish:
- Subtle shadows and borders
- Hover effects on all interactive elements
- Loading states (spinners) for actions
- Empty states when no data
- Smooth transitions between states

## Example Component Structure

```tsx
<AdminBar>
  <AdminBarHeader>
    <CollapseButton />
    <QuickStats />
  </AdminBarHeader>
  
  <AdminBarContent>
    <UserSearchSection />
    <PendingReportsSection />
    <PendingRegistrationsSection />
    <InvitationManagementSection />
    <SystemStatsSection />
    <QuickAccessMenu />
  </AdminBarContent>
</AdminBar>
```

## Notes
- This is a **frontend mockup only** - no API calls needed
- All actions should show visual feedback (toasts, loading states)
- Make it feel like a real, functional admin panel
- Use the animate-ui management bar as visual inspiration for the floating/collapsible design
- Focus on making it look polished and professional
- All buttons/actions should be interactive (even if they just show a toast saying "Mock action")

---

**Goal**: Create a beautiful, functional-looking admin control panel mockup that demonstrates all the admin features in an elegant, accessible floating interface.


