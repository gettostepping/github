'use client'

import { useState, useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { useAdminUsers, AdminUser } from '@/hooks/useAdminUsers'

interface UserSearchDropdownProps {
  value: string // UID as string
  onChange: (uid: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function UserSearchDropdown({
  value,
  onChange,
  placeholder = "Search users by name or UID...",
  disabled = false,
  className = ""
}: UserSearchDropdownProps) {
  const { users, isLoading: usersLoading } = useAdminUsers()
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const dropdownId = useId()

  // Find selected user when value changes
  useEffect(() => {
    if (value && users.length > 0) {
      const user = users.find(u => u.uid.toString() === value)
      if (user) {
        setSelectedUser(user)
        setSearchQuery(user.name || `UID: ${user.uid}`)
      } else {
        setSelectedUser(null)
        setSearchQuery(value)
      }
    } else {
      setSelectedUser(null)
      setSearchQuery('')
    }
  }, [value, users])

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (dropdownOpen && !selectedUser && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    } else {
      setDropdownPosition(null)
    }
  }, [dropdownOpen, selectedUser])

  // Close dropdown when clicking outside, scrolling, or when another dropdown opens
  useEffect(() => {
    if (!dropdownOpen) return
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const dropdown = document.querySelector('[data-user-dropdown]')
      const input = document.querySelector('[data-user-input]')
      
      if (dropdown && !dropdown.contains(target) && input && !input.contains(target)) {
        setDropdownOpen(false)
      }
    }

    const handleScroll = (event: Event) => {
      if (dropdownRef.current && event.target instanceof Node && dropdownRef.current.contains(event.target)) {
        return
      }
      setDropdownOpen(false)
    }

    const handleOtherDropdownOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>
      if (customEvent.detail?.id !== dropdownId) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true })
    window.addEventListener('wheel', handleScroll, { passive: true })
    window.addEventListener('touchmove', handleScroll, { passive: true })
    window.addEventListener('userDropdownOpen', handleOtherDropdownOpen as EventListener)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions)
      window.removeEventListener('wheel', handleScroll)
      window.removeEventListener('touchmove', handleScroll)
      window.removeEventListener('userDropdownOpen', handleOtherDropdownOpen as EventListener)
    }
  }, [dropdownOpen, dropdownId])

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.name?.toLowerCase().includes(query) ||
      user.uid.toString().includes(query)
    )
  })

  const handleUserSelect = (user: AdminUser) => {
    setSelectedUser(user)
    setSearchQuery(user.name || `UID: ${user.uid}`)
    setDropdownOpen(false)
    onChange(user.uid.toString())
  }

  const handleClear = () => {
    setSelectedUser(null)
    setSearchQuery('')
    setDropdownOpen(false)
    onChange('')
  }

  return (
    <div className={`relative ${className}`}>
      {selectedUser ? (
        <div className="flex items-center gap-2 p-2 rounded-md bg-neutral-700 border border-neutral-600">
          {selectedUser.image && (
            <img
              src={selectedUser.image}
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
              handleClear()
            }}
            disabled={disabled}
            className="text-neutral-400 hover:text-white transition-colors flex-shrink-0 disabled:opacity-50"
          >
            ×
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          data-user-input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            window.dispatchEvent(new CustomEvent('userDropdownOpen', { detail: { id: dropdownId } }))
            setDropdownOpen(true)
            // If it's a number, update the value directly
            if (/^\d+$/.test(e.target.value)) {
              onChange(e.target.value)
            } else {
              onChange('')
            }
          }}
          onFocus={() => {
            window.dispatchEvent(new CustomEvent('userDropdownOpen', { detail: { id: dropdownId } }))
            setDropdownOpen(true)
          }}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('userDropdownOpen', { detail: { id: dropdownId } }))
            setDropdownOpen(true)
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      )}
      
      {/* Dropdown - using portal to escape stacking context */}
      {dropdownOpen && !selectedUser && dropdownPosition && typeof window !== 'undefined' && createPortal(
        <div
          data-user-dropdown
          ref={dropdownRef}
          className="fixed z-[9998] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: `${Math.min(240, window.innerHeight - dropdownPosition.top - 20)}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {usersLoading ? (
            <div className="p-4 text-center text-neutral-400">Loading users...</div>
          ) : (
            <>
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleUserSelect(user)}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-neutral-700 transition-colors text-left"
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
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-4 text-center text-neutral-400">No users found</div>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

