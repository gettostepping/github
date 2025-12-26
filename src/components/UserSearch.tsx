'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faEnvelope,
  faCalendar,
  faHashtag,
  faCopy,
  faEye,
  faExclamationTriangle,
  faBan,
  faTrash,
  faShield
} from '@fortawesome/free-solid-svg-icons'
import Image from 'next/image'
import Link from 'next/link'
import { getUserAvatar } from '@/lib/images'
import UserSearchDropdown from '@/components/UserSearchDropdown'

interface AdminData {
  isOwner: boolean
  isDeveloper: boolean
  isAdmin: boolean
}

interface UserData {
  id: string
  uid: number
  name: string | null
  email: string | null
  image: string | null
  discordId: string | null
  banner: string | null
  createdAt: string
  roles: string[]
  profile: {
    bio: string | null
    lastActiveAt: string
    currentWatchingTitle: string | null
    currentWatchingType: string | null
    currentWatchingSeason: number | null
    currentWatchingEpisode: number | null
  } | null
  stats: {
    watchlistCount: number
    ratingsCount: number
    commentsCount: number
  }
}

interface UserSearchProps {
  adminData: AdminData
}

export default function UserSearch({ adminData }: UserSearchProps) {
  const [searchUid, setSearchUid] = useState('')
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchUid.trim()) return

    setLoading(true)
    setError(null)
    setUserData(null)

    try {
      const res = await fetch(`/api/admin/user-lookup?type=uid&query=${encodeURIComponent(searchUid.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setUserData(data.user)
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'User not found')
      }
    } catch (err) {
      setError('Failed to search user')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm relative" style={{ isolation: 'auto' }}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FontAwesomeIcon icon={faSearch} className="text-brand-400" />
        User Search & Lookup
      </h3>

      <form onSubmit={handleSearch} className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <UserSearchDropdown
              value={searchUid}
              onChange={setSearchUid}
              placeholder="Search users by name or UID..."
          />
          </div>
          <button
            type="submit"
            disabled={loading || !searchUid.trim()}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2 font-medium"
          >
            <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
            Search
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
        </div>
      )}

      {userData && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
            <div className="flex items-start gap-4">
              <Image
                src={getUserAvatar(userData.image, userData.discordId)}
                alt={userData.name || 'User'}
                width={80}
                height={80}
                className="rounded-full border-2 border-brand-400"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-xl font-bold text-white">{userData.name || 'Unknown User'}</h4>
                  <span className="px-2 py-1 bg-neutral-700 text-neutral-300 text-xs rounded">
                    UID: {userData.uid}
                  </span>
                  {userData.roles.length > 0 && (
                    <span className="px-2 py-1 bg-brand-500/20 text-brand-400 text-xs rounded flex items-center gap-1 border border-brand-500/30">
                      <FontAwesomeIcon icon={faShield} className="w-3 h-3" />
                      {userData.roles.join(', ')}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                  {userData.email && (
                    <span className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faEnvelope} className="w-3 h-3" />
                      {userData.email}
                      <button
                        onClick={() => copyToClipboard(userData.email!)}
                        className="ml-1 hover:text-brand-400 transition-colors"
                      >
                        <FontAwesomeIcon icon={faCopy} className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" />
                    Joined: {formatDate(userData.createdAt)}
                  </span>
                  {userData.discordId && (
                    <span className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faHashtag} className="w-3 h-3" />
                      Discord: {userData.discordId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
              <div className="text-neutral-400 text-xs mb-1">Watchlist Items</div>
              <div className="text-2xl font-bold text-white">{userData.stats.watchlistCount}</div>
            </div>
            <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
              <div className="text-neutral-400 text-xs mb-1">Ratings</div>
              <div className="text-2xl font-bold text-white">{userData.stats.ratingsCount}</div>
            </div>
            <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
              <div className="text-neutral-400 text-xs mb-1">Comments</div>
              <div className="text-2xl font-bold text-white">{userData.stats.commentsCount}</div>
            </div>
          </div>

          {/* Profile Info Card */}
          {userData.profile && (
            <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
              <h5 className="text-sm font-semibold text-neutral-300 mb-3">Profile Information</h5>
              <div className="space-y-2 text-sm">
                {userData.profile.bio && (
                  <div>
                    <span className="text-neutral-400">Bio: </span>
                    <span className="text-neutral-300">{userData.profile.bio}</span>
                  </div>
                )}
                <div>
                  <span className="text-neutral-400">Last Active: </span>
                  <span className="text-neutral-300">{formatDate(userData.profile.lastActiveAt)}</span>
                </div>
                {userData.profile.currentWatchingTitle && (
                  <div>
                    <span className="text-neutral-400">Currently Watching: </span>
                    <span className="text-brand-400">{userData.profile.currentWatchingTitle}</span>
                    {userData.profile.currentWatchingType === 'tv' && (
                      <span className="text-neutral-400 ml-2">
                        S{userData.profile.currentWatchingSeason}E{userData.profile.currentWatchingEpisode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/u/${userData.uid}`}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md text-sm flex items-center gap-2 transition-colors"
            >
              <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
              View Profile
            </Link>
            <button
              onClick={() => copyToClipboard(userData.uid.toString())}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md text-sm flex items-center gap-2 transition-colors"
            >
              <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
              Copy UID
            </button>
            {adminData.isAdmin && (
              <>
                <button className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-md text-sm flex items-center gap-2 transition-colors">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
                  Warn User
                </button>
                <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md text-sm flex items-center gap-2 transition-colors">
                  <FontAwesomeIcon icon={faBan} className="w-4 h-4" />
                  Ban User
                </button>
              </>
            )}
            {(adminData.isOwner || adminData.isDeveloper) && (
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm flex items-center gap-2 transition-colors">
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                Delete User
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

