'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faKey,
  faCopy,
  faTrash,
  faExclamationTriangle,
  faCheck,
  faEye,
  faCode,
  faSnowflake,
  faTimes
} from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'

interface ApiKey {
  id: string
  name: string
  createdBy: string
  creatorName: string
  creatorUid: number | null
  userId: string | null
  tiedUserName: string | null
  tiedUserUid: number | null
  tiedUserImage: string | null
  permissions: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  revoked: boolean
  frozen: boolean
  createdAt: string
  hasPlainKey?: boolean // Indicates if plain key is available for retrieval
}

interface ApiKeyManagementProps {
  adminData: {
    isOwner: boolean
    isDeveloper: boolean
    isAdmin: boolean
  }
}

// Permission definitions
const publicPermissions = [
  { value: 'public.*', label: 'All Public Permissions', description: 'Full access to Public API' },
  { value: 'public.search', label: 'Search Movies & TV Shows', description: 'Search for content' },
  { value: 'public.content.read', label: 'Read Content Details', description: 'Get movie/TV show details, episodes, seasons' },
  { value: 'public.profiles.read', label: 'Read Public Profiles', description: 'View public user profile information' },
  { value: 'public.ratings.read', label: 'Read Ratings', description: 'View public ratings and averages' },
  { value: 'public.comments.read', label: 'Read Comments', description: 'View public profile comments' },
  { value: 'public.stats.read', label: 'Read Public Statistics', description: 'View public statistics' }
]

const privatePermissions = [
  { value: 'admin.*', label: 'All Private Permissions', description: 'Full access to Private API' },
  { value: 'admin.users.read', label: 'User Lookup', description: 'Search and view user information' },
  { value: 'admin.users.ban', label: 'Ban Users', description: 'Ban users by UID or username' },
  { value: 'admin.users.warn', label: 'Warn Users', description: 'Issue warnings to users' },
  { value: 'admin.users.assign', label: 'Assign Roles', description: 'Assign roles to users' },
  { value: 'admin.users.remove', label: 'Remove Roles', description: 'Remove roles from users' },
  { value: 'admin.reports.read', label: 'View Reports', description: 'View moderation reports' },
  { value: 'admin.reports.resolve', label: 'Resolve Reports', description: 'Resolve and handle reports' },
  { value: 'admin.stats.read', label: 'System Statistics', description: 'View full system statistics' },
  { value: 'admin.invites.manage', label: 'Manage Invites', description: 'Create and manage invites' }
]

interface User {
  id: string
  name: string | null
  uid: number
  image: string | null
}

export default function ApiKeyManagement({ adminData }: ApiKeyManagementProps) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [apiType, setApiType] = useState<'public' | 'private'>('public')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState<{ keyId: string; key: string } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    type: 'revoke' | 'freeze' | 'freezeAll' | 'revokeAll'
    keyId?: string
    keyName?: string
  } | null>(null)
  const [newKeyMap, setNewKeyMap] = useState<Map<string, string>>(new Map()) // Store newly created keys
  const { toasts, removeToast, showSuccess, showError, showInfo, showWarning } = useToast()

  useEffect(() => {
    fetchKeys()
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    // When switching to Private API, automatically include all public permissions
    if (apiType === 'private') {
      const hasPublicWildcard = selectedPermissions.includes('public.*')
      const adminPerms = selectedPermissions.filter(p => p.startsWith('admin.'))
      
      // If public.* is already selected, keep it; otherwise add all public permissions
      const publicPerms = hasPublicWildcard 
        ? ['public.*']
        : publicPermissions.map(p => p.value)
      
      // Combine public permissions with any existing admin permissions
      setSelectedPermissions([...publicPerms, ...adminPerms])
    } else {
      // When switching to Public API, remove all admin permissions
      const publicPerms = selectedPermissions.filter(p => p.startsWith('public.') || p === '*')
      setSelectedPermissions(publicPerms)
    }
  }, [apiType])

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownOpen) {
        const target = event.target as HTMLElement
        const dropdown = document.querySelector('[data-user-dropdown]')
        const input = document.querySelector('[data-user-input]')
        
        if (dropdown && !dropdown.contains(target) && input && !input.contains(target)) {
          setUserDropdownOpen(false)
        }
      }
    }

    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [userDropdownOpen])

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/admin/api-keys')
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim() || selectedPermissions.length === 0) return

    setCreating(true)
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          permissions: selectedPermissions,
          expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
          userId: selectedUserId || undefined
        })
      })

      if (res.ok) {
        const data = await res.json()
        setNewKey(data.key)
        // Store the key in the map for later retrieval
        setNewKeyMap(prev => {
          const newMap = new Map(prev)
          newMap.set(data.id, data.key)
          return newMap
        })
        setNewKeyName('')
        setSelectedPermissions([])
        setExpiresInDays('')
        setApiType('public')
        setSelectedUserId('')
        setUserSearchQuery('')
        fetchKeys()
      } else {
        const error = await res.json()
        showError(error.error || 'Failed to create API key')
      }
    } catch (error) {
      showError('Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId })
      })

      if (res.ok) {
        fetchKeys()
        setConfirmModal(null)
        showSuccess('API key revoked successfully')
      } else {
        const error = await res.json()
        showError(error.error || 'Failed to revoke API key')
      }
    } catch (error) {
      showError('Failed to revoke API key')
    }
  }

  const handleFreezeKey = async (keyId: string, frozen: boolean) => {
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, frozen })
      })

      if (res.ok) {
        fetchKeys()
        setConfirmModal(null)
        showSuccess(`API key ${frozen ? 'frozen' : 'unfrozen'} successfully`)
      } else {
        const error = await res.json()
        showError(error.error || `Failed to ${frozen ? 'freeze' : 'unfreeze'} API key`)
      }
    } catch (error) {
      showError(`Failed to ${frozen ? 'freeze' : 'unfreeze'} API key`)
    }
  }

  const handleFreezeAll = async () => {
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freezeAll: true })
      })

      if (res.ok) {
        const data = await res.json()
        showSuccess(data.message)
        fetchKeys()
        setConfirmModal(null)
      } else {
        const error = await res.json()
        showError(error.error || 'Failed to freeze all API keys')
      }
    } catch (error) {
      showError('Failed to freeze all API keys')
    }
  }

  const handleRevokeAll = async () => {
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeAll: true })
      })

      if (res.ok) {
        const data = await res.json()
        showWarning(data.message)
        fetchKeys()
        setConfirmModal(null)
      } else {
        const error = await res.json()
        showError(error.error || 'Failed to revoke all API keys')
      }
    } catch (error) {
      showError('Failed to revoke all API keys')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const togglePermission = (permission: string) => {
    // Prevent unchecking public permissions when Private API is selected
    if (apiType === 'private' && permission.startsWith('public.')) {
      return // Public perms are always enabled for private API
    }

    const isWildcard = permission === 'public.*' || permission === 'admin.*'
    
    if (isWildcard) {
      // If selecting wildcard, clear all others of same type
      const prefix = permission.split('.')[0]
      const sameTypePerms = apiType === 'public' 
        ? publicPermissions.map(p => p.value)
        : privatePermissions.map(p => p.value)
      
      if (selectedPermissions.includes(permission)) {
        setSelectedPermissions([])
      } else {
        setSelectedPermissions([permission])
      }
    } else {
      // Remove wildcard if selecting specific permission
      const prefix = permission.split('.')[0]
      const wildcard = `${prefix}.*`
      const newPerms = selectedPermissions.filter(p => p !== wildcard)
      
      if (newPerms.includes(permission)) {
        setSelectedPermissions(newPerms.filter(p => p !== permission))
      } else {
        setSelectedPermissions([...newPerms, permission])
      }
    }
  }

  const getPermissionLabel = (value: string, viewMode: 'simple' | 'advanced'): string => {
    if (viewMode === 'advanced') {
      return value
    }
    
    // Find in public permissions
    const publicPerm = publicPermissions.find(p => p.value === value)
    if (publicPerm) return publicPerm.label
    
    // Find in private permissions
    const privatePerm = privatePermissions.find(p => p.value === value)
    if (privatePerm) return privatePerm.label
    
    return value
  }

  const getPermissionDescription = (value: string): string | null => {
    const publicPerm = publicPermissions.find(p => p.value === value)
    if (publicPerm) return publicPerm.description

    const privatePerm = privatePermissions.find(p => p.value === value)
    if (privatePerm) return privatePerm.description

    return null
  }

  // Format permissions for display - show wildcard instead of individual permissions
  const formatPermissionsForDisplay = (permissions: string[], viewMode: 'simple' | 'advanced'): string[] => {
    const hasPublicWildcard = permissions.includes('public.*')
    const hasAdminWildcard = permissions.includes('admin.*')
    
    // If wildcards exist, don't show individual permissions of that type
    const publicPerms = hasPublicWildcard 
      ? ['public.*']
      : permissions.filter(p => p.startsWith('public.'))
    
    const adminPerms = hasAdminWildcard
      ? ['admin.*']
      : permissions.filter(p => p.startsWith('admin.'))
    
    const formatted = [...publicPerms, ...adminPerms]
    
    return formatted.map(p => getPermissionLabel(p, viewMode))
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const getApiTypeFromPermissions = (permissions: string[]): 'public' | 'private' | 'mixed' => {
    const hasPublic = permissions.some(p => p.startsWith('public.'))
    const hasPrivate = permissions.some(p => p.startsWith('admin.'))
    
    // If has admin.* wildcard, it's private (unless it's explicitly mixed with individual public perms)
    if (permissions.includes('admin.*')) {
      // Check if there are individual public permissions (not just public.*)
      const hasIndividualPublic = permissions.some(p => 
        p.startsWith('public.') && p !== 'public.*'
      )
      return hasIndividualPublic ? 'mixed' : 'private'
    }
    
    // If has public.* wildcard only, it's public
    if (permissions.includes('public.*') && !hasPrivate) {
      return 'public'
    }
    
    // If has both individual public and private perms, it's mixed
    if (hasPublic && hasPrivate) return 'mixed'
    
    // If has only private perms, it's private
    if (hasPrivate) return 'private'
    
    // Otherwise it's public
    return 'public'
  }

  // When Private API is selected, show both public and private permissions
  // When Public API is selected, only show public permissions
  const currentPermissions = apiType === 'private' 
    ? [...publicPermissions, ...privatePermissions]
    : publicPermissions

  if (loading) {
    return (
      <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FontAwesomeIcon icon={faKey} className="text-brand-400" />
        API Key Management
      </h3>


      {/* Create Form */}
      <form onSubmit={handleCreateKey} className="mb-6 space-y-4">
        <div>
          <label className="text-neutral-400 text-sm mb-2 block">Key Name</label>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g., Production Bot, Public Discord Bot"
            className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>

        {/* API Type Selection and User Selection */}
        <div className="grid grid-cols-2 gap-4">
          {/* API Type Selection */}
          <div>
            <label className="text-neutral-400 text-sm mb-2 block">API Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-neutral-700/50 bg-neutral-800/50 hover:bg-neutral-800/70 transition-colors flex-1">
                <input
                  type="radio"
                  name="apiType"
                  value="public"
                  checked={apiType === 'public'}
                  onChange={(e) => setApiType('public')}
                  className="w-4 h-4 focus:ring-0 focus:outline-none"
                />
                <div>
                  <div className="text-white font-medium">Public API</div>
                  <div className="text-neutral-400 text-xs">Read-only access to public data</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-neutral-700/50 bg-neutral-800/50 hover:bg-neutral-800/70 transition-colors flex-1">
                <input
                  type="radio"
                  name="apiType"
                  value="private"
                  checked={apiType === 'private'}
                  onChange={(e) => setApiType('private')}
                  className="w-4 h-4 focus:ring-0 focus:outline-none"
                />
                <div>
                  <div className="text-white font-medium">Private API</div>
                  <div className="text-neutral-400 text-xs">Admin/moderation capabilities</div>
                </div>
              </label>
            </div>
          </div>

          {/* User Selection */}
          <div className="relative">
            <label className="text-neutral-400 text-sm mb-2 block">Tied to User (Optional)</label>
            <div className="relative">
              {selectedUserId ? (
                <div className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 flex items-center gap-2">
                  {(() => {
                    const selectedUser = users.find(u => u.id === selectedUserId)
                    return selectedUser ? (
                      <>
                        {selectedUser.image && (
                          <img
                            src={selectedUser.image}
                            alt={selectedUser.name || 'User'}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        )}
                        <span className="text-white text-sm flex-1 truncate">
                          {selectedUser.name || 'Unknown'} (UID: {selectedUser.uid})
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedUserId('')
                            setUserSearchQuery('')
                            setUserDropdownOpen(false)
                          }}
                          className="text-neutral-400 hover:text-white transition-colors flex-shrink-0"
                        >
                          ×
                        </button>
                      </>
                    ) : null
                  })()}
                </div>
              ) : (
                <input
                  type="text"
                  data-user-input
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value)
                    setUserDropdownOpen(true)
                  }}
                  onFocus={() => setUserDropdownOpen(true)}
                  placeholder="Search users..."
                  className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              )}
              
              {/* Dropdown */}
              {userDropdownOpen && !selectedUserId && (
                <div
                  data-user-dropdown
                  className="absolute z-50 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                    {usersLoading ? (
                      <div className="p-4 text-center text-neutral-400">Loading users...</div>
                    ) : (
                      <>
                        {users
                          .filter(user => {
                            if (!userSearchQuery) return true
                            const query = userSearchQuery.toLowerCase()
                            return (
                              user.name?.toLowerCase().includes(query) ||
                              user.uid.toString().includes(query)
                            )
                          })
                          .map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedUserId(user.id)
                                setUserSearchQuery(user.name || `UID: ${user.uid}`)
                                setUserDropdownOpen(false)
                              }}
                              className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-neutral-700 transition-colors text-left ${
                                selectedUserId === user.id ? 'bg-neutral-700' : ''
                              }`}
                            >
                              {user.image && (
                                <img
                                  src={user.image}
                                  alt={user.name || 'User'}
                                  className="w-8 h-8 rounded-full"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-medium truncate">
                                  {user.name || 'Unknown'} (UID: {user.uid})
                                </div>
                              </div>
                              {selectedUserId === user.id && (
                                <div className="text-brand-400">✓</div>
                              )}
                            </button>
                          ))}
                        {users.filter(user => {
                          if (!userSearchQuery) return true
                          const query = userSearchQuery.toLowerCase()
                          return (
                            user.name?.toLowerCase().includes(query) ||
                            user.uid.toString().includes(query)
                          )
                        }).length === 0 && (
                          <div className="p-4 text-center text-neutral-400">No users found</div>
                        )}
                      </>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-neutral-400 text-sm">Permissions</label>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'simple' ? 'advanced' : 'simple')}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors"
          >
            <FontAwesomeIcon icon={viewMode === 'simple' ? faCode : faEye} className="w-4 h-4" />
            {viewMode === 'simple' ? 'Advanced View' : 'Simple View'}
          </button>
        </div>

        {/* Permissions Selection */}
        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-700/50">
          {apiType === 'private' ? (
            // Two columns for Private API
            <div className="grid grid-cols-2 gap-4">
              {/* Public Permissions Column */}
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
                <div className="text-sm text-neutral-300 font-medium mb-3 sticky top-0 bg-neutral-900/50 backdrop-blur-sm z-10 pb-2 pt-1 pl-1 rounded-t-md">
                  Public API Permissions
                </div>
                {publicPermissions.map((perm) => {
                  const isChecked = selectedPermissions.includes(perm.value)
                  const isWildcard = perm.value === 'public.*'
                  const hasPublicWildcard = selectedPermissions.includes('public.*')
                  // When private API is selected, public perms are always checked and disabled
                  const isDisabled = (hasPublicWildcard && !isWildcard) || (apiType === 'private')
                  
                  return (
                    <label
                      key={perm.value}
                    className={`flex items-start gap-3 p-2 rounded transition-colors ${
                      isDisabled 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'cursor-pointer hover:bg-neutral-900/50'
                    }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked || (apiType === 'private' && perm.value.startsWith('public.'))}
                        disabled={isDisabled}
                        onChange={() => togglePermission(perm.value)}
                        className="api-key-permission-checkbox mt-1 w-4 h-4 text-brand-600 bg-neutral-700 border-neutral-600 rounded focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <div className="text-neutral-200 text-sm font-medium">
                          {viewMode === 'simple' ? perm.label : perm.value}
                        </div>
                        {viewMode === 'simple' && perm.description && (
                          <div className="text-neutral-400 text-xs mt-0.5">{perm.description}</div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
              
              {/* Private Permissions Column */}
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
                <div className="text-sm text-neutral-300 font-medium mb-3 sticky top-0 bg-neutral-900/50 backdrop-blur-sm z-10 pb-2 pt-1 pl-1 rounded-t-md">
                  Private API Permissions
                </div>
                {privatePermissions.map((perm) => {
                  const isChecked = selectedPermissions.includes(perm.value)
                  const isWildcard = perm.value === 'admin.*'
                  const hasAdminWildcard = selectedPermissions.includes('admin.*')
                  // Only disable if admin wildcard is selected (public wildcard doesn't affect private perms)
                  const isDisabled = hasAdminWildcard && !isWildcard
                  
                  return (
                    <label
                      key={perm.value}
                    className={`flex items-start gap-3 p-2 rounded transition-colors ${
                      isDisabled 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'cursor-pointer hover:bg-neutral-900/50'
                    }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked || (apiType === 'private' && perm.value.startsWith('public.'))}
                        disabled={isDisabled}
                        onChange={() => togglePermission(perm.value)}
                        className="api-key-permission-checkbox mt-1 w-4 h-4 text-brand-600 bg-neutral-700 border-neutral-600 rounded focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <div className="text-neutral-200 text-sm font-medium">
                          {viewMode === 'simple' ? perm.label : perm.value}
                        </div>
                        {viewMode === 'simple' && perm.description && (
                          <div className="text-neutral-400 text-xs mt-0.5">{perm.description}</div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ) : (
            // Single column for Public API
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
              <div className="text-sm text-neutral-300 font-medium mb-3 pl-1 rounded-t-md pb-2">
                Public API Permissions
              </div>
              {publicPermissions.map((perm) => {
                const isChecked = selectedPermissions.includes(perm.value)
                const isWildcard = perm.value === 'public.*'
                const hasWildcard = selectedPermissions.includes('public.*')
                const isDisabled = hasWildcard && !isWildcard
                
                return (
                  <label
                    key={perm.value}
                    className={`flex items-start gap-3 p-2 rounded transition-colors ${
                      isDisabled 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'cursor-pointer hover:bg-neutral-800/50'
                    }`}
                  >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => togglePermission(perm.value)}
                        className="api-key-permission-checkbox mt-1 w-4 h-4 text-brand-600 bg-neutral-700 border-neutral-600 rounded focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    <div className="flex-1">
                      <div className="text-neutral-200 text-sm font-medium">
                        {viewMode === 'simple' ? perm.label : perm.value}
                      </div>
                      {viewMode === 'simple' && perm.description && (
                        <div className="text-neutral-400 text-xs mt-0.5">{perm.description}</div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <label className="text-neutral-400 text-sm mb-2 block">Expires In (Days) - Optional</label>
          <input
            type="number"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : '')}
            placeholder="Leave empty for no expiration"
            min="1"
            className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={creating || !newKeyName.trim() || selectedPermissions.length === 0}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium"
        >
          {creating ? 'Creating...' : 'Create API Key'}
        </button>
      </form>

      {/* Warning Banner for New Key - shown after creation */}
      {newKey && (
        <div className="mb-6 p-4 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-400 w-5 h-5 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-yellow-400 font-semibold mb-2">API Key Created</h4>
              <p className="text-yellow-300 text-sm mb-3">
                This key will only be shown once. Copy it immediately and store it securely!
              </p>
              <div className="bg-neutral-950 p-3 rounded border border-neutral-700 flex items-center gap-2">
                <code className="text-green-400 text-sm font-mono flex-1">{newKey}</code>
                <button
                  onClick={() => copyToClipboard(newKey)}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
                >
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Keys */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-semibold">Existing Keys</h4>
          {keys.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmModal({ type: 'freezeAll' })}
                className="px-4 py-2 bg-neutral-800 hover:bg-purple-600/20 text-purple-400 rounded-md border border-purple-600/50 transition-colors text-sm flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faSnowflake} className="w-4 h-4" />
                Pause All Keys
              </button>
              <button
                onClick={() => setConfirmModal({ type: 'revokeAll' })}
                className="px-4 py-2 bg-neutral-800 hover:bg-red-600/20 text-red-400 rounded-md border border-red-600/50 transition-colors text-sm flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                Revoke All Keys
              </button>
            </div>
          )}
        </div>
        {keys.length === 0 ? (
          <p className="text-neutral-400 text-sm">No API keys created yet</p>
        ) : (
          keys.map((key) => {
            const keyType = getApiTypeFromPermissions(key.permissions)
            return (
              <div
                key={key.id}
                className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h5 className="text-white font-semibold">{key.name}</h5>
                      <span className={`px-2 py-1 text-xs rounded border ${
                        keyType === 'public' 
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : keyType === 'private'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      }`}>
                        {keyType === 'public' ? 'Public' : keyType === 'private' ? 'Private' : 'Mixed'}
                      </span>
                      {key.revoked ? (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">
                          Revoked
                        </span>
                      ) : key.frozen ? (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                          Frozen
                        </span>
                      ) : key.expiresAt && isExpired(key.expiresAt) ? (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                          Expired
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-neutral-400 space-y-1">
                      <div>Created by: {key.creatorName} {key.creatorUid && `(UID: ${key.creatorUid})`}</div>
                      {key.tiedUserName && (
                        <div className="flex items-center gap-2">
                          <span>Tied to:</span>
                          {key.tiedUserImage && (
                            <img
                              src={key.tiedUserImage}
                              alt={key.tiedUserName}
                              className="w-5 h-5 rounded-full"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          )}
                          <span>{key.tiedUserName} {key.tiedUserUid && `(UID: ${key.tiedUserUid})`}</span>
                        </div>
                      )}
                      <div>
                        Permissions ({formatPermissionsForDisplay(key.permissions, viewMode).length}): {formatPermissionsForDisplay(key.permissions, viewMode).join(', ')}
                      </div>
                      {key.lastUsedAt && (
                        <div>Last used: {new Date(key.lastUsedAt).toLocaleString()}</div>
                      )}
                      {key.expiresAt && (
                        <div>
                          Expires: {new Date(key.expiresAt).toLocaleString()}
                        </div>
                      )}
                      <div>Created: {new Date(key.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  {!key.revoked && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setConfirmModal({ type: 'revoke', keyId: key.id, keyName: key.name })}
                        className="px-4 py-2 bg-neutral-800 hover:bg-red-600/20 text-red-400 rounded-md border border-red-600/50 transition-colors flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        Revoke
                      </button>
                      <button
                        onClick={() => setConfirmModal({ type: 'freeze', keyId: key.id, keyName: key.name })}
                        className="px-4 py-2 bg-neutral-800 hover:bg-purple-600/20 text-purple-400 rounded-md border border-purple-600/50 transition-colors flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faSnowflake} className="w-4 h-4" />
                        {key.frozen ? 'Unfreeze' : 'Freeze'}
                      </button>
                      <button
                        onClick={async () => {
                          // First check if we have it in memory (recently created)
                          const storedKey = newKeyMap.get(key.id)
                          if (storedKey) {
                            setShowKeyModal({ keyId: key.id, key: storedKey })
                            return
                          }

                          // Try to fetch from server (Owner/Developer only)
                          try {
                            const res = await fetch(`/api/admin/api-keys/${key.id}`)
                            if (res.ok) {
                              const data = await res.json()
                              setShowKeyModal({ keyId: key.id, key: data.key })
                            } else {
                              const errorData = await res.json().catch(() => ({ error: 'Failed to retrieve key' }))
                              showError(errorData.error || 'API key cannot be retrieved. Keys are only shown once after creation for security reasons.')
                            }
                          } catch (error) {
                            console.error('Error fetching API key:', error)
                            showError('Failed to retrieve API key. Only Owners and Developers can view keys after creation.')
                          }
                        }}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md border border-neutral-700 transition-colors flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                        Show Key
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>

      {/* Show Key Modal - Rendered outside container */}
      {showKeyModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          style={{ position: 'fixed' }}
          onClick={() => setShowKeyModal(null)}
        >
          <div
            className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">API Key</h3>
              <button
                onClick={() => setShowKeyModal(null)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-neutral-950 p-3 rounded border border-neutral-700 flex items-center gap-2 mb-4">
              <code className="text-green-400 text-sm font-mono flex-1 break-all">{showKeyModal.key}</code>
              <button
                onClick={() => copyToClipboard(showKeyModal.key)}
                className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-sm flex items-center gap-2 transition-colors flex-shrink-0"
              >
                <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-neutral-400 text-sm">
              This key will only be shown once. Save it securely!
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Rendered outside container */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          style={{ position: 'fixed' }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold text-lg mb-4">
              {confirmModal.type === 'revoke' && 'Revoke API Key'}
              {confirmModal.type === 'freeze' && 'Freeze/Unfreeze API Key'}
              {confirmModal.type === 'freezeAll' && 'Pause All API Keys'}
              {confirmModal.type === 'revokeAll' && 'Revoke All API Keys'}
            </h3>
            <p className="text-neutral-300 mb-6">
              {confirmModal.type === 'revoke' && `Are you sure you want to revoke "${confirmModal.keyName}"? This action cannot be undone.`}
              {confirmModal.type === 'freeze' && `Are you sure you want to ${keys.find(k => k.id === confirmModal.keyId)?.frozen ? 'unfreeze' : 'freeze'} "${confirmModal.keyName}"?`}
              {confirmModal.type === 'freezeAll' && `Are you sure you want to pause all active API keys? This will temporarily disable all keys.`}
              {confirmModal.type === 'revokeAll' && `Are you sure you want to revoke all API keys? This action cannot be undone.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal.type === 'revoke' && confirmModal.keyId) {
                    handleRevokeKey(confirmModal.keyId)
                  } else if (confirmModal.type === 'freeze' && confirmModal.keyId) {
                    const key = keys.find(k => k.id === confirmModal.keyId)
                    if (key) {
                      handleFreezeKey(confirmModal.keyId, !key.frozen)
                    }
                  } else if (confirmModal.type === 'freezeAll') {
                    handleFreezeAll()
                  } else if (confirmModal.type === 'revokeAll') {
                    handleRevokeAll()
                  }
                }}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  confirmModal.type === 'revoke' || confirmModal.type === 'revokeAll'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {confirmModal.type === 'revoke' && 'Revoke'}
                {confirmModal.type === 'freeze' && (keys.find(k => k.id === confirmModal.keyId)?.frozen ? 'Unfreeze' : 'Freeze')}
                {confirmModal.type === 'freezeAll' && 'Pause All'}
                {confirmModal.type === 'revokeAll' && 'Revoke All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
