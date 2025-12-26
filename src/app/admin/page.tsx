"use client"

import { useState, useEffect, useRef, useId } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCrown,
  faShield,
  faUser,
  faPlus,
  faTrash,
  faToggleOn,
  faToggleOff,
  faCopy,
} from "@fortawesome/free-solid-svg-icons"
import SystemDashboard from "@/components/SystemDashboard"
import UserSearch from "@/components/UserSearch"
import ConfirmationModal from "@/components/ConfirmationModal"
import { ToastContainer } from "@/components/Toast"
import { useToast } from "@/hooks/useToast"
import UserSearchDropdown from "@/components/UserSearchDropdown"
import { useAdminUsers } from "@/hooks/useAdminUsers"
import { getUserAvatar } from "@/lib/images"

interface AdminData {
  isOwner: boolean
  isDeveloper: boolean
  isAdmin: boolean
  isTrialMod: boolean
  roles: string[]
  uid: number
}

interface Invite {
  id: string
  code: string
  issuerId: string
  enabled: boolean
  usedBy: number | null
  testingMode: boolean
  bypassDiscordRequirement: boolean
  createdAt: string
  usedByUser?: {
    uid: number
    name: string | null
    deleted?: boolean
  } | null
  issuerUser?: {
    uid: number
    name: string | null
    deleted?: boolean
  } | null
}

interface PendingRegistration {
  id: string
  discordId: string
  email: string
  name: string
  avatarUrl: string | null
  inviteCode: string
  flagReason: string
  status: string
  createdAt: string
}

export default function AdminPage() {
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Pending Registrations
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)

  // Roles
  const [targetUid, setTargetUid] = useState("")
  const [role, setRole] = useState("trial_mod")
  const [assigning, setAssigning] = useState(false)
  const [removeTargetUid, setRemoveTargetUid] = useState("")
  const [removeRole, setRemoveRole] = useState("trial_mod")
  const [removing, setRemoving] = useState(false)

  // Delete User
  const [deleteUid, setDeleteUid] = useState("")
  const [deleteUserName, setDeleteUserName] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Invites
  const [invites, setInvites] = useState<Invite[]>([])
  const [search, setSearch] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteCount, setInviteCount] = useState(1)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  
  // Individual invite - user dropdown
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [userDropdownPosition, setUserDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const userInputRef = useRef<HTMLInputElement | null>(null)
  const userDropdownContainerRef = useRef<HTMLDivElement | null>(null)
  const userDropdownId = useId()
  const { users, isLoading: usersLoading } = useAdminUsers()
  
  // Mass invite
  const [massInviteMessage, setMassInviteMessage] = useState('')

  // Confirmation modals
  const [denyRegistrationModal, setDenyRegistrationModal] = useState<{ registrationId: string } | null>(null)
  const [deleteInviteModal, setDeleteInviteModal] = useState<{ inviteId: string } | null>(null)
  const [massInviteModal, setMassInviteModal] = useState(false)
  const [previewModalConfirm, setPreviewModalConfirm] = useState(false)

  // Toast notifications
  const { toasts, removeToast, showSuccess, showError } = useToast()

  // Fetch admin status, invites, and pending registrations
  useEffect(() => {
    async function fetchData() {
      try {
        const [adminRes, invitesRes, pendingRes] = await Promise.all([
          fetch("/api/admin/check"),
          fetch("/api/admin/invites"),
          fetch("/api/admin/pending-registrations"),
        ])
        if (adminRes.ok) setAdminData(await adminRes.json())
        if (invitesRes.ok) setInvites(await invitesRes.json())
        if (pendingRes.ok) {
          const data = await pendingRes.json()
          setPendingRegistrations(data.registrations || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Calculate user dropdown position when it opens
  useEffect(() => {
    if (userDropdownOpen && !selectedUserId && userInputRef.current) {
      const rect = userInputRef.current.getBoundingClientRect()
      setUserDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    } else {
      setUserDropdownPosition(null)
    }
  }, [userDropdownOpen, selectedUserId])

  // Close user dropdown when clicking outside, scrolling, or when another dropdown opens
  useEffect(() => {
    if (!userDropdownOpen) return
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const dropdown = document.querySelector('[data-user-dropdown]')
      const input = document.querySelector('[data-user-input]')
      
      // Check if clicking on any user input (to close other dropdowns)
      const clickedInput = target.closest('[data-user-input]')
      if (clickedInput && clickedInput !== input) {
        setUserDropdownOpen(false)
        return
      }
      
      if (dropdown && !dropdown.contains(target) && input && !input.contains(target)) {
        setUserDropdownOpen(false)
      }
    }
    
    const handleScroll = (event: Event) => {
      if (userDropdownContainerRef.current && event.target instanceof Node && userDropdownContainerRef.current.contains(event.target)) {
        return
      }
      setUserDropdownOpen(false)
    }
    
    const handleOtherDropdownOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>
      if (customEvent.detail?.id !== userDropdownId) {
        setUserDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true })
    window.addEventListener('wheel', handleScroll, { passive: true })
    window.addEventListener('touchmove', handleScroll, { passive: true })
    // Listen for custom event when other dropdowns open
    window.addEventListener('userDropdownOpen', handleOtherDropdownOpen as EventListener)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions)
      window.removeEventListener('wheel', handleScroll)
      window.removeEventListener('touchmove', handleScroll)
      window.removeEventListener('userDropdownOpen', handleOtherDropdownOpen as EventListener)
    }
  }, [userDropdownOpen, userDropdownId])

  // Roles
  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetUid.trim()) return
    setAssigning(true)
    try {
      const res = await fetch("/api/admin/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: targetUid.trim(), role }),
      })
      if (res.ok) {
        showSuccess("Role assigned!")
        setTargetUid("")
      } else {
        const err = await res.json()
        showError(`Error: ${err.error}`)
      }
    } catch {
      showError("Failed to assign role")
    } finally {
      setAssigning(false)
    }
  }

  const handleRemoveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!removeTargetUid.trim()) return
    setRemoving(true)
    try {
      const res = await fetch("/api/admin/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: removeTargetUid.trim(), role: removeRole }),
      })
      if (res.ok) {
        showSuccess("Role removed!")
        setRemoveTargetUid("")
      } else {
        const err = await res.json()
        showError(`Error: ${err.error}`)
      }
    } catch {
      showError("Failed to remove role")
    } finally {
      setRemoving(false)
    }
  }

  const handleShowDeleteConfirm = async () => {
    if (!deleteUid.trim()) return
    
    // First, fetch the user's name
    try {
      const res = await fetch(`/api/profiles?uid=${deleteUid.trim()}`)
      if (res.ok) {
        const data = await res.json()
        setDeleteUserName(data.user?.name || "Unknown User")
        setShowDeleteConfirm(true)
      } else {
        showError("User not found")
      }
    } catch {
      showError("Failed to fetch user information")
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUid.trim()) return
    setDeleting(true)
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: deleteUid.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        showSuccess(data.message || "User deleted successfully!")
        setDeleteUid("")
        setDeleteUserName("")
        setShowDeleteConfirm(false)
      } else {
        const err = await res.json()
        showError(`Error: ${err.error}`)
      }
    } catch {
      showError("Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  // Pending Registrations
  const handleApproveRegistration = async (registrationId: string) => {
    setPendingLoading(true)
    try {
      const res = await fetch("/api/admin/pending-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, action: "approve" }),
      })
      if (res.ok) {
        const data = await res.json()
        showSuccess(data.message || "Registration approved!")
        // Remove from pending list
        setPendingRegistrations((prev) => prev.filter((r) => r.id !== registrationId))
      } else {
        const err = await res.json()
        showError(`Error: ${err.error}`)
      }
    } catch {
      showError("Failed to approve registration")
    } finally {
      setPendingLoading(false)
    }
  }

  const handleDenyRegistration = async (registrationId: string) => {
    setPendingLoading(true)
    try {
      const res = await fetch("/api/admin/pending-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, action: "deny" }),
      })
      if (res.ok) {
        const data = await res.json()
        showSuccess(data.message || "Registration denied!")
        // Remove from pending list
        setPendingRegistrations((prev) => prev.filter((r) => r.id !== registrationId))
      } else {
        const err = await res.json()
        showError(`Error: ${err.error}`)
      }
    } catch {
      showError("Failed to deny registration")
    } finally {
      setPendingLoading(false)
      setDenyRegistrationModal(null)
    }
  }

  // Invites
  const toggleInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invites/${id}/toggle`, { method: "POST" })
      if (res.ok) {
        const updated = await res.json()
        setInvites((prev) => prev.map((i) => (i.id === id ? updated : i)))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleTestingMode = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invites/${id}/toggle-testing`, { method: "POST" })
      if (res.ok) {
        const updated = await res.json()
        setInvites((prev) => prev.map((i) => (i.id === id ? updated : i)))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleBypassDiscord = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invites/${id}/toggle-bypass-discord`, { method: "POST" })
      if (res.ok) {
        const updated = await res.json()
        setInvites((prev) => prev.map((i) => (i.id === id ? updated : i)))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const deleteInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invites/${id}`, { method: "DELETE" })
      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== id))
        showSuccess("Invite deleted successfully")
      } else {
        const error = await res.json()
        // If invite not found, still remove it from the list (might have been deleted already)
        if (res.status === 404) {
          setInvites((prev) => prev.filter((i) => i.id !== id))
          showError(error.error || "Invite not found")
        } else {
          showError(error.error || "Failed to delete invite")
        }
      }
    } catch (err) {
      console.error(err)
      showError("Failed to delete invite")
    } finally {
      setDeleteInviteModal(null)
    }
  }

  const createInviteForUser = async () => {
    if (!selectedUserId) {
      showError("Please select a user")
      return
    }
    try {
      const selectedUser = users.find(u => u.id === selectedUserId)
      if (!selectedUser) {
        showError("Selected user not found")
        return
      }
      
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: selectedUser.uid.toString(), count: inviteCount }),
      })
      if (res.ok) {
        const data = await res.json()
        const newInvites = Array.isArray(data) ? data : [data]
        setInvites((prev) => [...newInvites, ...prev])
        setSelectedUserId("")
        setUserSearchQuery("")
        showSuccess(`Created ${newInvites.length} invite(s) for ${selectedUser.name || `UID ${selectedUser.uid}`}`)
      } else {
        const error = await res.json()
        showError(error.error || "Failed to create invites")
      }
    } catch (err) {
      console.error(err)
      showError("Failed to create invites")
    }
  }

  const createInviteForAll = async () => {
    try {
      const res = await fetch('/api/admin/invites/mass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          count: inviteCount,
          message: massInviteMessage.trim() || undefined
        })
      })
      if (res.ok) {
        const newInvites = await res.json()
        setInvites(prev => [...newInvites, ...prev])
        setMassInviteMessage("")
        showSuccess('Mass invites created!')
      } else {
        const error = await res.json()
        showError(error.error || "Failed to create mass invites")
      }
    } catch (err) {
      console.error(err)
      showError("Failed to create mass invites")
    } finally {
      setMassInviteModal(false)
    }
  }


  const filteredInvites = invites.filter((i) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    
    // Search by issuer
    if (i.issuerId === 'admin' && 'admin'.includes(searchLower)) return true
    if (i.issuerId && i.issuerId.includes(search)) return true
    
    // Search by code
    if (i.code.toLowerCase().includes(searchLower)) return true
    
    // Search by issuer name
    if (i.issuerUser?.name?.toLowerCase().includes(searchLower)) return true
    
    // Search by used by name
    if (i.usedByUser?.name?.toLowerCase().includes(searchLower)) return true
    
    return false
  })

  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400 mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading...</p>
        </div>
      </main>
    )

  if (!adminData?.isAdmin && !adminData?.isOwner && !adminData?.isDeveloper)
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-neutral-400">You don't have admin permissions.</p>
        </div>
      </main>
    )

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-white">Admin Panel</h1>
        <p className="text-neutral-400 mb-6">Manage roles and invitations</p>

        {/* System Dashboard */}
        <SystemDashboard />

        {/* User Search */}
        <UserSearch adminData={adminData} />

        {/* Role Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assign */}
          <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm relative" style={{ isolation: 'auto' }}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faPlus} className="text-brand-400" /> Assign Role
            </h3>
            <form onSubmit={handleAssignRole} className="space-y-4">
              <UserSearchDropdown
                value={targetUid}
                onChange={setTargetUid}
                placeholder="Search users by name or UID..."
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="trial_mod">Trial Moderator</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="premium">Premium</option>
                <option value="vip">VIP</option>
                {(adminData.isOwner || adminData.isDeveloper) && (
                  <>
                    <option value="developer">Developer</option>
                    <option value="owner">Owner</option>
                  </>
                )}
              </select>
              <button
                type="submit"
                disabled={assigning}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-700 text-white py-2 px-4 rounded-md"
              >
                {assigning ? "Assigning..." : "Assign Role"}
              </button>
            </form>
          </div>

          {/* Remove */}
          <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm relative" style={{ isolation: 'auto' }}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faShield} className="text-red-400" /> Remove Role
            </h3>
            <form onSubmit={handleRemoveRole} className="space-y-4">
              <UserSearchDropdown
                value={removeTargetUid}
                onChange={setRemoveTargetUid}
                placeholder="Search users by name or UID..."
              />
              <select
                value={removeRole}
                onChange={(e) => setRemoveRole(e.target.value)}
                className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="trial_mod">Trial Moderator</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="premium">Premium</option>
                <option value="vip">VIP</option>
                {(adminData.isOwner || adminData.isDeveloper) && (
                  <>
                    <option value="developer">Developer</option>
                    <option value="owner">Owner</option>
                  </>
                )}
              </select>
              <button
                type="submit"
                disabled={removing}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 text-white py-2 px-4 rounded-md"
              >
                {removing ? "Removing..." : "Remove Role"}
              </button>
            </form>
          </div>
        </div>

        {/* Delete User */}
        {(adminData.isOwner || adminData.isDeveloper) && (
          <div className="p-6 bg-neutral-900/50 border border-red-900/30 rounded-xl backdrop-blur-sm relative" style={{ isolation: 'auto' }}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faTrash} className="text-red-400" /> Delete User by UID
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              ⚠️ Warning: This action is permanent and will delete all user data including profile, comments, ratings, and watchlists.
            </p>
            <div className="space-y-4">
              <UserSearchDropdown
                value={deleteUid}
                onChange={setDeleteUid}
                placeholder="Search users by name or UID..."
              />
              <button
                onClick={handleShowDeleteConfirm}
                disabled={!deleteUid.trim() || deleting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors"
              >
                Delete User
              </button>
            </div>

          </div>
        )}

        {/* Delete Confirmation Modal - Rendered at root level */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-neutral-900 border border-red-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                  <h2 className="text-2xl font-bold text-white mb-4">⚠️ Confirm Deletion</h2>
                  <p className="text-neutral-300 mb-6">
                    Are you sure you want to permanently delete the user <span className="font-semibold text-red-400">{deleteUserName}</span> (UID: <span className="font-mono bg-neutral-800 px-2 py-1 rounded text-red-400">{deleteUid}</span>)?
                  </p>
                  <p className="text-sm text-red-400 mb-6">
                    This will delete all associated data including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Profile and settings</li>
                      <li>Comments and likes</li>
                      <li>Ratings and reviews</li>
                      <li>Watchlist and activity</li>
                      <li>All other user data</li>
                    </ul>
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteUserName("")
                        setDeleting(false)
                      }}
                      disabled={deleting}
                      className="flex-1 py-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-semibold transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteUser}
                      disabled={deleting}
                      className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Yes, Delete"}
                    </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Registrations */}
        {(adminData?.isOwner || adminData?.isDeveloper || adminData?.isAdmin) && (
          <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Pending Registrations</h3>
              {pendingRegistrations.length > 0 && (
                <span className="bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {pendingRegistrations.length}
                </span>
              )}
            </div>

            {pendingRegistrations.length === 0 ? (
              <p className="text-neutral-400 text-sm">No pending registrations</p>
            ) : (
              <div className="space-y-3">
                {pendingRegistrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {reg.avatarUrl ? (
                          <img
                            src={reg.avatarUrl}
                            alt={reg.name}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center">
                            <FontAwesomeIcon icon={faUser} className="text-neutral-400" />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">{reg.name}</h4>
                          <p className="text-neutral-400 text-sm">{reg.email}</p>
                          <p className="text-xs text-neutral-500 mt-1">
                            Discord ID: <span className="font-mono">{reg.discordId}</span>
                          </p>
                          <div className="mt-2 bg-yellow-900/20 border border-yellow-700/50 rounded px-2 py-1">
                            <p className="text-xs text-yellow-400">
                              <strong>Flagged:</strong> {reg.flagReason}
                            </p>
                          </div>
                          {reg.inviteCode && reg.inviteCode !== 'TRACKED_USER' && (
                            <p className="text-xs text-neutral-400 mt-1">
                              Invite Code: <span className="font-mono">{reg.inviteCode}</span>
                            </p>
                          )}
                          <p className="text-xs text-neutral-500 mt-1">
                            Requested: {new Date(reg.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRegistration(reg.id)}
                          disabled={pendingLoading}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-700 text-white text-sm font-semibold rounded transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setDenyRegistrationModal({ registrationId: reg.id })}
                          disabled={pendingLoading}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 text-white text-sm font-semibold rounded transition"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invite Management */}
        <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} className="text-brand-400" />
            Invitation Management
          </h3>

          {/* Individual Invite Section */}
          <div className="mb-6 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
            <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="text-brand-400 text-sm" />
              Create Individual Invites
            </h4>
            
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <label className="text-sm text-neutral-400 whitespace-nowrap">Invite Count:</label>
                <input
                  type="number"
                  min={1}
                  value={inviteCount}
                  onChange={(e) => setInviteCount(Number(e.target.value))}
                  className="w-20 rounded-md bg-neutral-700 border border-neutral-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="relative">
                <label className="block text-sm text-neutral-400 mb-2">Select User:</label>
                <div className="relative">
                  {selectedUserId ? (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-neutral-700 border border-neutral-600">
                      {(() => {
                        const selectedUser = users.find(u => u.id === selectedUserId)
                        if (!selectedUser) return null
                        return (
                          <>
                            {selectedUser.image && (
                              <img
                                src={getUserAvatar(selectedUser.image, selectedUser.discordId)}
                                alt={selectedUser.name || 'User'}
                                className="w-6 h-6 rounded-full"
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
                        )
                      })()}
                    </div>
                  ) : (
                    <input
                      ref={userInputRef}
                      type="text"
                      data-user-input
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value)
                        window.dispatchEvent(new CustomEvent('userDropdownOpen', { detail: { id: userDropdownId } }))
                        setUserDropdownOpen(true)
                      }}
                      onFocus={() => {
                        window.dispatchEvent(new CustomEvent('userDropdownOpen', { detail: { id: userDropdownId } }))
                        setUserDropdownOpen(true)
                      }}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('userDropdownOpen', { detail: { id: userDropdownId } }))
                        setUserDropdownOpen(true)
                      }}
                      placeholder="Search users by name or UID..."
                      className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  )}
                  
                  {/* Dropdown - using portal to escape stacking context */}
                  {userDropdownOpen && !selectedUserId && userDropdownPosition && typeof window !== 'undefined' && createPortal(
                    <div
                      data-user-dropdown
                      ref={userDropdownContainerRef}
                      className="fixed z-[9998] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
                      style={{
                        top: `${userDropdownPosition.top}px`,
                        left: `${userDropdownPosition.left}px`,
                        width: `${userDropdownPosition.width}px`,
                        maxHeight: `${Math.min(240, window.innerHeight - userDropdownPosition.top - 20)}px`
                      }}
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
                                    src={getUserAvatar(user.image, user.discordId)}
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
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              <button
                onClick={createInviteForUser}
                disabled={!selectedUserId}
                className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors"
              >
                Create Invite{inviteCount > 1 ? 's' : ''}
              </button>
            </div>
          </div>

          {/* Mass Invite Section */}
          <div className="mb-6 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
            <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faPlus} className="text-green-400 text-sm" />
              Generate Mass Invites
            </h4>
            
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <label className="text-sm text-neutral-400 whitespace-nowrap">Invites per User:</label>
                <input
                  type="number"
                  min={1}
                  value={inviteCount}
                  onChange={(e) => setInviteCount(Number(e.target.value))}
                  className="w-20 rounded-md bg-neutral-700 border border-neutral-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Message (Optional):</label>
                <textarea
                  value={massInviteMessage}
                  onChange={(e) => setMassInviteMessage(e.target.value)}
                  placeholder="Enter a message to show users when they log in..."
                  rows={3}
                  className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mb-2"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500">
                    This message will be shown to all users in a modal when they log in
                  </p>
                  <button
                    onClick={() => {
                      if (!massInviteMessage.trim()) {
                        showError('Please enter a message first to preview the modal.')
                        return
                      }
                      setPreviewModalConfirm(true)
                    }}
                    disabled={!massInviteMessage.trim()}
                    className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white text-xs font-medium rounded-md transition-colors"
                  >
                    Preview Modal
                  </button>
                </div>
              </div>

              <button
                onClick={() => setMassInviteModal(true)}
                className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Generate Mass Invites
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <label className="block text-sm text-neutral-400 mb-2">Search Invites:</label>
            <input
              type="text"
              placeholder="Search by code, issuer, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Invite table */}
          {inviteLoading ? (
            <p className="text-neutral-400">Loading invites...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-neutral-400">Code</th>
                    <th className="px-4 py-2 text-neutral-400">Issuer UID</th>
                    <th className="px-4 py-2 text-neutral-400">Used By</th>
                    <th className="px-4 py-2 text-neutral-400">Enabled</th>
                    <th className="px-4 py-2 text-neutral-400">Testing Mode</th>
                    <th className="px-4 py-2 text-neutral-400">Discord Bypass</th>
                    <th className="px-4 py-2 text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvites.map((inv) => (
                    <tr key={inv.id} className="border-t border-neutral-700">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={copiedCode === inv.code ? 'text-brand-300' : 'text-white'}>
                            {inv.code}
                          </span>
                          <button
                            onClick={() => {
                              const inviteLink = `${window.location.origin}/register?code=${inv.code}`
                              navigator.clipboard.writeText(inviteLink).then(() => {
                                setCopiedCode(inv.code)
                                setTimeout(() => setCopiedCode(null), 2000)
                              }).catch(err => {
                                console.error('Failed to copy:', err)
                              })
                            }}
                            className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
                            title="Copy invite link"
                          >
                            <FontAwesomeIcon icon={faCopy} />
                          </button>
                          {copiedCode === inv.code && (
                            <span className="text-xs text-green-400">Copied!</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {inv.issuerUser ? (
                          inv.issuerUser.deleted ? (
                            <span className="flex items-center gap-2">
                              <span className="text-red-400 line-through font-medium">
                                {inv.issuerUser.name || 'Unknown User'}
                              </span>
                              <span className="text-neutral-500 text-sm">
                                (UID: {inv.issuerUser.uid})
                              </span>
                              <span className="bg-red-900/30 text-red-400 text-xs px-2 py-0.5 rounded border border-red-700/50">
                                BANNED
                              </span>
                            </span>
                          ) : (
                            <Link 
                              href={`/u/${inv.issuerUser.uid}`}
                              className="text-brand-400 hover:text-brand-300 transition-colors underline"
                            >
                              {inv.issuerUser.name} (UID: {inv.issuerUser.uid})
                            </Link>
                          )
                        ) : (
                          <span className="text-neutral-500">{inv.issuerId || "N/A"}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {inv.usedBy === -1 ? (
                          <span className="flex items-center gap-2">
                            <span className="text-orange-400 font-medium">Registration Denied</span>
                            <span className="bg-orange-900/30 text-orange-400 text-xs px-2 py-0.5 rounded border border-orange-700/50">
                              DISABLED
                            </span>
                          </span>
                        ) : inv.usedBy && inv.usedBy > 0 && inv.usedByUser ? (
                          inv.usedByUser.deleted ? (
                            <span className="flex items-center gap-2">
                              <span className="text-red-400 line-through font-medium">
                                {inv.usedByUser.name || 'Unknown User'}
                              </span>
                              <span className="text-neutral-500 text-sm">
                                (UID: {inv.usedByUser.uid})
                              </span>
                              <span className="bg-red-900/30 text-red-400 text-xs px-2 py-0.5 rounded border border-red-700/50">
                                BANNED
                              </span>
                            </span>
                          ) : (
                            <Link 
                              href={`/u/${inv.usedByUser.uid}`}
                              className="text-brand-400 hover:text-brand-300 transition-colors underline"
                            >
                              {inv.usedByUser.name} (UID: {inv.usedByUser.uid})
                            </Link>
                          )
                        ) : (
                          <span className="text-neutral-500">Not Used</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {inv.enabled ? (
                          <FontAwesomeIcon
                            icon={faToggleOn}
                            className="text-green-400 cursor-pointer"
                            onClick={() => toggleInvite(inv.id)}
                          />
                        ) : (
                          <FontAwesomeIcon
                            icon={faToggleOff}
                            className="text-red-400 cursor-pointer"
                            onClick={() => toggleInvite(inv.id)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {inv.testingMode ? (
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon
                              icon={faToggleOn}
                              className="text-yellow-400 cursor-pointer"
                              onClick={() => toggleTestingMode(inv.id)}
                            />
                            <span className="text-xs text-yellow-400 font-medium">TEST</span>
                          </div>
                        ) : (
                          <FontAwesomeIcon
                            icon={faToggleOff}
                            className="text-neutral-500 cursor-pointer"
                            onClick={() => toggleTestingMode(inv.id)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {inv.bypassDiscordRequirement ? (
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon
                              icon={faToggleOn}
                              className="text-blue-400 cursor-pointer"
                              onClick={() => toggleBypassDiscord(inv.id)}
                            />
                            <span className="text-xs text-blue-400 font-medium">BYPASS</span>
                          </div>
                        ) : (
                          <FontAwesomeIcon
                            icon={faToggleOff}
                            className="text-neutral-500 cursor-pointer"
                            onClick={() => toggleBypassDiscord(inv.id)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-2 flex gap-2">
                        <button
                          onClick={() => setDeleteInviteModal({ inviteId: inv.id })}
                          className="text-red-500 hover:text-red-600"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredInvites.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-neutral-400 px-4 py-2 text-center">
                        No invites found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modals */}
      {denyRegistrationModal && (
        <ConfirmationModal
          isOpen={true}
          title="Deny Registration"
          message="Are you sure you want to deny this registration?"
          confirmText="Yes, Deny"
          cancelText="Cancel"
          confirmColor="red"
          onConfirm={() => handleDenyRegistration(denyRegistrationModal.registrationId)}
          onCancel={() => setDenyRegistrationModal(null)}
          isLoading={pendingLoading}
        />
      )}

      {deleteInviteModal && (
        <ConfirmationModal
          isOpen={true}
          title="Delete Invite"
          message="Are you sure you want to delete this invite? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="red"
          onConfirm={() => deleteInvite(deleteInviteModal.inviteId)}
          onCancel={() => setDeleteInviteModal(null)}
        />
      )}

      {massInviteModal && (
        <ConfirmationModal
          isOpen={true}
          title="Generate Mass Invites"
          message={`Are you sure you want to generate ${inviteCount} invite(s) for each user${massInviteMessage ? ' with a message' : ''}?`}
          confirmText="Generate"
          cancelText="Cancel"
          confirmColor="green"
          onConfirm={createInviteForAll}
          onCancel={() => setMassInviteModal(false)}
        />
      )}

      {previewModalConfirm && (
        <ConfirmationModal
          isOpen={true}
          title="Preview Mass Invitation Message Modal"
          message="This will set a send a test message for you to preview. Refresh the page after confirming to see the modal."
          confirmText="Send Test Message"
          cancelText="Cancel"
          confirmColor="brand"
          onConfirm={async () => {
            try {
              const res = await fetch('/api/mass-invite-message/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: massInviteMessage })
              })
              if (res.ok) {
                showSuccess('Test message sent! Refresh the page to see the modal.')
              } else {
                const error = await res.json()
                showError(error.error || 'Failed to send test message')
              }
            } catch (err) {
              console.error(err)
              showError('Failed to send test message')
            } finally {
              setPreviewModalConfirm(false)
            }
          }}
          onCancel={() => setPreviewModalConfirm(false)}
        />
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </main>
  )
}
