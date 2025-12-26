# UserSearch Component - Complete Styling Reference

## **Main Container**
```tsx
className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm"
```

## **Title/Header**
```tsx
className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
```
Icon styling:
```tsx
className="text-theme-primary"
```

## **Search Form Container**
```tsx
className="mb-6 space-y-3"
```

## **Search Form Row (Flex Container)**
```tsx
className="flex gap-2"
```

## **Dropdown Select**
```tsx
className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
```

## **Search Input**
```tsx
className="flex-1 rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-theme-primary"
```

## **Search Button**
```tsx
className="px-6 py-2 bg-theme-secondary hover:bg-theme-primary disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2"
```
Icon inside button:
```tsx
className="w-4 h-4"
```

## **Error Message**
```tsx
className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
```

## **User Data Container**
```tsx
className="space-y-4"
```

---

## **Header Card (User Info Card)**

### Container
```tsx
className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
```

### Inner Flex Container
```tsx
className="flex items-start gap-4"
```

### User Avatar Image
```tsx
className="rounded-full border-2 border-theme-primary"
```
*Size: width={80} height={80}*

### User Info Section
```tsx
className="flex-1"
```

### Name & Badges Row
```tsx
className="flex items-center gap-3 mb-2"
```

### User Name
```tsx
className="text-xl font-bold text-white"
```

### UID Badge
```tsx
className="px-2 py-1 bg-neutral-700 text-neutral-300 text-xs rounded"
```

### Roles Badge
```tsx
className="px-2 py-1 bg-theme-primary/20 text-theme-primary text-xs rounded flex items-center gap-1"
```
Icon inside badge:
```tsx
className="w-3 h-3"
```

### User Details Row (Email, Joined, Discord)
```tsx
className="flex flex-wrap gap-4 text-sm text-neutral-400"
```

### Each Detail Item (Email, Joined, Discord)
```tsx
className="flex items-center gap-2"
```
Icons:
```tsx
className="w-3 h-3"
```

### Copy Button (Next to Email)
```tsx
className="ml-1 hover:text-theme-primary"
```
Icon:
```tsx
className="w-3 h-3"
```

---

## **Stats Grid Section**

### Stats Grid Container
```tsx
className="grid grid-cols-3 gap-3"
```

### Each Stat Card
```tsx
className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700"
```

### Stat Label
```tsx
className="text-neutral-400 text-xs mb-1"
```

### Stat Value
```tsx
className="text-2xl font-bold text-white"
```

---

## **Profile Info Card**

### Container
```tsx
className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
```

### Profile Info Title
```tsx
className="text-sm font-semibold text-neutral-300 mb-3"
```

### Profile Info Content
```tsx
className="space-y-2 text-sm"
```

### Profile Info Items
- **Label**: `className="text-neutral-400"`
- **Value**: `className="text-neutral-300"`
- **Currently Watching value**: `className="text-theme-primary"`
- **TV Show indicator**: `className="text-neutral-400 ml-2"`

---

## **Quick Actions Section**

### Actions Container
```tsx
className="flex gap-2 flex-wrap"
```

### View Profile Link
```tsx
className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md text-sm flex items-center gap-2 transition-colors"
```
Icon:
```tsx
className="w-4 h-4"
```

### Copy UID Button
```tsx
className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md text-sm flex items-center gap-2 transition-colors"
```
Icon:
```tsx
className="w-4 h-4"
```

### Warn User Button
```tsx
className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-md text-sm flex items-center gap-2 transition-colors"
```
Icon:
```tsx
className="w-4 h-4"
```

### Ban User Button
```tsx
className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md text-sm flex items-center gap-2 transition-colors"
```
Icon:
```tsx
className="w-4 h-4"
```

### Delete User Button
```tsx
className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md text-sm flex items-center gap-2 transition-colors"
```
Icon:
```tsx
className="w-4 h-4"
```

---

## **Complete Structure Example**

```tsx
<div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
  {/* Title */}
  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
    <FontAwesomeIcon icon={faSearch} className="text-theme-primary" />
    User Search & Lookup
  </h3>

  {/* Search Form */}
  <form className="mb-6 space-y-3">
    <div className="flex gap-2">
      <select className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary">
        {/* options */}
      </select>
      <input className="flex-1 rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-theme-primary" />
      <button className="px-6 py-2 bg-theme-secondary hover:bg-theme-primary disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2">
        <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
        Search
      </button>
    </div>
  </form>

  {/* Error Message */}
  {error && (
    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
      {error}
    </div>
  )}

  {/* User Data */}
  {userData && (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
        <div className="flex items-start gap-4">
          <Image className="rounded-full border-2 border-theme-primary" width={80} height={80} />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-xl font-bold text-white">User Name</h4>
              <span className="px-2 py-1 bg-neutral-700 text-neutral-300 text-xs rounded">UID: 123</span>
              <span className="px-2 py-1 bg-theme-primary/20 text-theme-primary text-xs rounded flex items-center gap-1">
                <FontAwesomeIcon icon={faShield} className="w-3 h-3" />
                admin
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faEnvelope} className="w-3 h-3" />
                email@example.com
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
          <div className="text-neutral-400 text-xs mb-1">Watchlist Items</div>
          <div className="text-2xl font-bold text-white">10</div>
        </div>
        {/* ... more stat cards ... */}
      </div>

      {/* Profile Info */}
      <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
        <h5 className="text-sm font-semibold text-neutral-300 mb-3">Profile Information</h5>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-neutral-400">Bio: </span>
            <span className="text-neutral-300">User bio text</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Link className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md text-sm flex items-center gap-2 transition-colors">
          <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
          View Profile
        </Link>
        {/* ... more action buttons ... */}
      </div>
    </div>
  )}
</div>
```

---

## **Key Color Values**

- **Backgrounds**: 
  - Main: `bg-neutral-900/50`
  - Cards: `bg-neutral-800/50`
  - Inputs: `bg-neutral-800`
  
- **Borders**: 
  - Default: `border-neutral-700/50` or `border-neutral-700`
  
- **Text Colors**:
  - Headings: `text-white`
  - Body: `text-neutral-300` or `text-neutral-400`
  - Labels: `text-neutral-400`
  - Muted: `text-neutral-500`
  
- **Theme Colors**:
  - Primary: `text-theme-primary` (used for icons, accents)
  - Secondary: `bg-theme-secondary` (buttons)
  
- **Status Colors**:
  - Error: `bg-red-500/10`, `border-red-500/30`, `text-red-400`
  - Warning: `bg-yellow-500/20`, `text-yellow-400`
  - Danger: `bg-red-600/20`, `text-red-400`

---

## **Spacing Patterns**

- Container padding: `p-6`
- Card padding: `p-4` or `p-3` (for smaller cards)
- Gap between sections: `gap-4` or `gap-2`
- Margin bottom: `mb-4` or `mb-6`
- Space between items: `space-y-4` or `space-y-2`

---

## **Border Radius**

- Main container: `rounded-xl`
- Cards: `rounded-lg`
- Buttons/Inputs: `rounded-md`
- Badges: `rounded`
- Avatar: `rounded-full`

---

## **Icon Sizes**

- Small icons (in badges, details): `w-3 h-3`
- Medium icons (buttons, headers): `w-4 h-4`
- Large icons: Use larger classes as needed

