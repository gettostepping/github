'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut, signIn } from 'next-auth/react'
import Image from 'next/image'

export default function RequireDiscordLink() {
  const { data: session, status } = useSession()
  const [userHasDiscord, setUserHasDiscord] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountDeleted, setAccountDeleted] = useState(false)

  useEffect(() => {
    async function checkDiscordLink() {
      if (status === 'authenticated' && session?.user?.email) {
        try {
          const res = await fetch('/api/profiles?uid=' + session.user.email)
          
          // If user account doesn't exist (deleted/banned)
          if (res.status === 404 || !res.ok) {
            console.log('⚠️ User account not found, signing out...')
            setAccountDeleted(true)
            setLoading(false)
            // Sign out after a brief delay to show the message
            setTimeout(() => {
              signOut({ callbackUrl: '/auth/signin?error=AccountDeleted' })
            }, 3000)
            return
          }
          
          const data = await res.json()
          
          // Double check user exists in response
          if (!data.user) {
            console.log('⚠️ User data not found, signing out...')
            setAccountDeleted(true)
            setLoading(false)
            setTimeout(() => {
              signOut({ callbackUrl: '/auth/signin?error=AccountDeleted' })
            }, 3000)
            return
          }
          
          // Check if user has discordId OR if they have bypassDiscordLink flag
          const hasDiscord = !!data.user?.discordId
          const bypassDiscord = !!data.user?.bypassDiscordLink
          setUserHasDiscord(hasDiscord || bypassDiscord)
          setLoading(false)
        } catch (error) {
          console.error('Failed to check Discord link:', error)
          setLoading(false)
        }
      } else if (status === 'unauthenticated') {
        // User not signed in, no need to check
        setLoading(false)
      }
    }

    checkDiscordLink()
  }, [status, session])

  // Periodic check every 30 seconds to detect account deletion
  useEffect(() => {
    // Only set up interval if user is authenticated
    if (status !== 'authenticated' || !session?.user?.email || accountDeleted) {
      return
    }

    const intervalId = setInterval(async () => {
      try {
        console.log('🔍 Performing periodic account existence check...')
        const res = await fetch('/api/profiles?uid=' + session.user.email)
        
        // If user account doesn't exist (deleted/banned)
        if (res.status === 404 || !res.ok) {
          console.log('⚠️ Periodic check: User account not found, signing out...')
          setAccountDeleted(true)
          setLoading(false)
          // Sign out after a brief delay to show the message
          setTimeout(() => {
            signOut({ callbackUrl: '/auth/signin?error=AccountDeleted' })
          }, 3000)
          clearInterval(intervalId) // Stop checking
          return
        }
        
        const data = await res.json()
        
        // Double check user exists in response
        if (!data.user) {
          console.log('⚠️ Periodic check: User data not found, signing out...')
          setAccountDeleted(true)
          setLoading(false)
          setTimeout(() => {
            signOut({ callbackUrl: '/auth/signin?error=AccountDeleted' })
          }, 3000)
          clearInterval(intervalId) // Stop checking
          return
        }
        
        // Update hasDiscord status in case it changed (though unlikely)
        const hasDiscord = !!data.user?.discordId
        const bypassDiscord = !!data.user?.bypassDiscordLink
        setUserHasDiscord(hasDiscord || bypassDiscord)
      } catch (error) {
        console.error('Periodic account check failed:', error)
      }
    }, 30000) // Check every 30 seconds

    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId)
    }
  }, [status, session, accountDeleted])

  const handleLinkDiscord = () => {
    // Use NextAuth's Discord provider for linking
    signIn('discord', { callbackUrl: '/' })
  }

  // Show account deleted message
  if (accountDeleted) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-neutral-900 border border-red-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            Account Removed
          </h2>
          
          <p className="text-neutral-400 mb-6 text-center leading-relaxed">
            Your account has been removed from Reminiscent. You are being signed out...
          </p>
          
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <p className="text-sm text-neutral-300 text-center">
              If you believe this was a mistake, please contact support. You may create a new account if you have an invite code.
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        </div>
      </div>
    )
  }

  // Don't show anything while loading or if user is not authenticated
  if (loading || status !== 'authenticated' || userHasDiscord === null) {
    return null
  }

  // If user has Discord linked, don't show anything
  if (userHasDiscord) {
    return null
  }

  // Show full-page modal requiring Discord link
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-[#5865F2] rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-4 text-center">
          Discord Link Required
        </h2>
        
        <p className="text-neutral-400 mb-6 text-center leading-relaxed">
          To use Reminiscent, you must link your Discord account. This helps us build a connected community and prevents abuse.
        </p>
        
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-neutral-300">
              <p className="font-semibold mb-1">Why Discord?</p>
              <p className="text-neutral-400">
                Linking your Discord account provides profile customization, community features, and helps us maintain a safe environment.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLinkDiscord}
          className="w-full py-4 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Link Discord Account
        </button>

        <p className="text-xs text-neutral-500 text-center mt-4">
          You'll be redirected to Discord to authorize the connection
        </p>
      </div>
    </div>
  )
}

