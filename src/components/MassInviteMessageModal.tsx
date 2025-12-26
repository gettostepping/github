'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faGift, faShield, faArrowRight } from '@fortawesome/free-solid-svg-icons'

export default function MassInviteMessageModal() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [messageId, setMessageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return Boolean((window as any).__changelogOpen)
  })

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      checkForMessage()
    }
  }, [status, session])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOpen = () => setChangelogOpen(true)
    const handleClose = () => setChangelogOpen(false)
    window.addEventListener('changelogOpen', handleOpen)
    window.addEventListener('changelogClosed', handleClose)
    return () => {
      window.removeEventListener('changelogOpen', handleOpen)
      window.removeEventListener('changelogClosed', handleClose)
    }
  }, [])

  const checkForMessage = async () => {
    try {
      const res = await fetch('/api/mass-invite-message')
      if (res.ok) {
        const data = await res.json()
        if (data.message && data.messageId) {
          setMessage(data.message)
          setMessageId(data.messageId)
        }
      }
    } catch (err) {
      console.error('Failed to check for messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async () => {
    if (!messageId) return

    setMarkingRead(true)
    try {
      await fetch('/api/mass-invite-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId })
      })
      setMessage(null)
      setMessageId(null)
    } catch (err) {
      console.error('Failed to mark message as read:', err)
    } finally {
      setMarkingRead(false)
    }
  }

  const handleGoToInvitations = async () => {
    // Mark as read first, then navigate
    if (messageId) {
      setMarkingRead(true)
      try {
        await fetch('/api/mass-invite-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId })
        })
        // Clear the message state so modal dismisses
        setMessage(null)
        setMessageId(null)
      } catch (err) {
        console.error('Failed to mark message as read:', err)
      } finally {
        setMarkingRead(false)
      }
    }
    router.push('/invitations')
  }

  if (loading || !message || changelogOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-neutral-900/95 backdrop-blur-sm border border-neutral-800 rounded-xl shadow-2xl max-w-4xl w-full relative">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <FontAwesomeIcon icon={faGift} className="text-brand-400 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">New Invitation Available</h2>
              <div className="mt-2 flex items-center gap-2">
                <div className="px-2.5 py-1 bg-neutral-800 border border-neutral-700 rounded-md flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faShield} className="text-neutral-400 w-3.5 h-3.5" />
                  <span className="text-sm text-neutral-400">From </span>
                  <span className="text-sm font-semibold text-red-400 text-glow-red">Owner</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            disabled={markingRead}
            className="text-neutral-400 hover:text-white transition-colors p-1.5 hover:bg-neutral-800 rounded-md disabled:opacity-50"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="p-6">
          <div className="bg-neutral-800/60 rounded-lg p-6 border-2 border-neutral-700 mb-6">
            <p className="text-white text-lg whitespace-pre-wrap leading-relaxed font-semibold">{message}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDismiss}
              disabled={markingRead}
              className="flex-1 py-2.5 px-4 rounded-md bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white font-bold transition-colors"
            >
              {markingRead ? 'Dismissing...' : 'Dismiss'}
            </button>
            <button
              onClick={handleGoToInvitations}
              disabled={markingRead}
              className="flex-1 py-2.5 px-4 rounded-md bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span>View Invitations</span>
              <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

