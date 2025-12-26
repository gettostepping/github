'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faCopy, 
  faGift, 
  faCheckCircle, 
  faTimesCircle, 
  faUser, 
  faClock,
  faUserPlus,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons'

interface Invite {
  id: string
  code: string
  issuerId: string
  enabled: boolean
  usedBy: number
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

export default function InvitationsPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const res = await fetch('/api/invitations')
        if (!res.ok) throw new Error('Failed to fetch invites')
        const data = await res.json()
        setInvites(data)
      } catch (err) {
        console.error(err)
        setError('Failed to load invites.')
      } finally {
        setLoading(false)
      }
    }
    fetchInvites()
  }, [])

  const copyInviteLink = (code: string) => {
    const inviteLink = `${window.location.origin}/register?code=${code}`
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading your invitations...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="bg-neutral-900/50 border border-red-500/30 rounded-xl backdrop-blur-sm p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 text-xl" />
            <h2 className="text-xl font-bold text-white">Error</h2>
          </div>
          <p className="text-red-400">{error}</p>
        </div>
      </main>
    )
  }

  const unusedCount = invites.filter(inv => inv.enabled && inv.usedBy !== -1 && (inv.usedBy === 0 || !inv.usedBy)).length
  const usedCount = invites.filter(inv => inv.usedBy > 0).length

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FontAwesomeIcon icon={faGift} className="text-brand-400 text-3xl" />
            <h1 className="text-4xl font-bold text-white">My Invitations</h1>
          </div>
          <p className="text-neutral-400">Manage and share your invitation codes</p>
        </div>

        {/* Stats Cards */}
        {invites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm p-4">
              <div className="flex items-center gap-3 mb-2">
                <FontAwesomeIcon icon={faGift} className="text-brand-400" />
                <span className="text-neutral-400 text-sm">Total Invites</span>
              </div>
              <p className="text-2xl font-bold text-white">{invites.length}</p>
            </div>
            <div className="bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm p-4">
              <div className="flex items-center gap-3 mb-2">
                <FontAwesomeIcon icon={faCheckCircle} className="text-green-400" />
                <span className="text-neutral-400 text-sm">Available</span>
              </div>
              <p className="text-2xl font-bold text-white">{unusedCount}</p>
            </div>
            <div className="bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm p-4">
              <div className="flex items-center gap-3 mb-2">
                <FontAwesomeIcon icon={faUserPlus} className="text-blue-400" />
                <span className="text-neutral-400 text-sm">Used</span>
              </div>
              <p className="text-2xl font-bold text-white">{usedCount}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
      {invites.length === 0 ? (
          <div className="bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm p-12 text-center">
            <FontAwesomeIcon icon={faGift} className="text-brand-400 text-6xl mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-white mb-2">No Invitations Yet</h2>
            <p className="text-neutral-400 mb-6">
              You haven't received any invites yet. Please contact an admin to request one.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faUser} />
              Go to Home
            </Link>
          </div>
        ) : (
          /* Invitation Cards Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {invites.map(inv => {
              const isUnusedAndEnabled = inv.enabled && inv.usedBy !== -1 && (inv.usedBy === 0 || !inv.usedBy)
              const isCopied = copiedCode === inv.code
              
              return (
                <div
                  key={inv.id}
                  className={`bg-neutral-900/50 border rounded-xl backdrop-blur-sm p-6 transition-all duration-300 hover:scale-[1.02] ${
                    isCopied 
                      ? 'border-brand-500/50 bg-brand-500/10 shadow-lg shadow-brand-500/20' 
                      : 'border-neutral-700/50 hover:border-neutral-600'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`font-mono text-lg font-bold ${
                          isCopied ? 'text-brand-300 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'text-white'
                        }`}>
                          {inv.code}
                        </span>
                        {isUnusedAndEnabled && (
                          <button
                            onClick={() => copyInviteLink(inv.code)}
                            className="text-brand-400 hover:text-brand-300 transition-colors"
                            title="Copy invite link"
                          >
                            <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
                          </button>
                        )}
                        {isCopied && (
                          <span className="text-xs text-green-400 font-semibold animate-pulse flex items-center gap-1">
                            <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
                            Copied!
                          </span>
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                    {inv.enabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                            <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
                            Enabled
                          </span>
                    ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">
                            <FontAwesomeIcon icon={faTimesCircle} className="w-3 h-3" />
                            Disabled
                          </span>
                    )}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="space-y-3">
                    {/* Issuer */}
                    <div className="flex items-center gap-2 text-sm">
                      <FontAwesomeIcon icon={faUser} className="text-neutral-500 w-4 h-4" />
                      <span className="text-neutral-400">Issued by:</span>
                    {inv.issuerUser ? (
                      inv.issuerUser.deleted ? (
                        <span className="flex items-center gap-2">
                          <span className="text-red-400 line-through font-medium">
                            {inv.issuerUser.name || 'Unknown User'}
                          </span>
                          <span className="bg-red-900/30 text-red-400 text-xs px-2 py-0.5 rounded border border-red-700/50">
                            BANNED
                          </span>
                        </span>
                      ) : (
                        <Link 
                          href={`/u/${inv.issuerUser.uid}`}
                            className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                        >
                          {inv.issuerUser.name}
                        </Link>
                      )
                    ) : (
                      <span className="text-neutral-500">Unknown</span>
                    )}
                    </div>

                    {/* Usage Status */}
                    <div className="flex items-center gap-2 text-sm">
                      <FontAwesomeIcon icon={faUserPlus} className="text-neutral-500 w-4 h-4" />
                      <span className="text-neutral-400">Status:</span>
                    {inv.usedBy === -1 ? (
                      <span className="flex items-center gap-2">
                        <span className="text-orange-400 font-medium">Registration Denied</span>
                        <span className="bg-orange-900/30 text-orange-400 text-xs px-2 py-0.5 rounded border border-orange-700/50">
                          DISABLED
                        </span>
                      </span>
                    ) : inv.usedBy > 0 && inv.usedByUser ? (
                      inv.usedByUser.deleted ? (
                        <span className="flex items-center gap-2">
                          <span className="text-red-400 line-through font-medium">
                            {inv.usedByUser.name || 'Unknown User'}
                          </span>
                          <span className="bg-red-900/30 text-red-400 text-xs px-2 py-0.5 rounded border border-red-700/50">
                            BANNED
                          </span>
                        </span>
                      ) : (
                        <Link 
                          href={`/u/${inv.usedByUser.uid}`}
                            className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                        >
                            Used by {inv.usedByUser.name}
                        </Link>
                      )
                    ) : (
                        <span className="text-blue-400 font-medium">Available</span>
                    )}
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center gap-2 text-sm">
                      <FontAwesomeIcon icon={faClock} className="text-neutral-500 w-4 h-4" />
                      <span className="text-neutral-400">Created:</span>
                      <span className="text-neutral-300">
                        {new Date(inv.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}
      </div>

      {/* Subtle gradient glow */}
      <div className="fixed w-[600px] h-[600px] bg-brand-500/10 blur-[200px] rounded-full -z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
    </main>
  )
}
