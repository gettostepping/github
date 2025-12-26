'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PendingApprovalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied'>('pending')
  const [checking, setChecking] = useState(false)
  
  // Get Discord ID or email from URL params or localStorage
  const [userInfo, setUserInfo] = useState<{ discordId?: string; email?: string } | null>(null)

  useEffect(() => {
    // Try to get user info from URL params first
    const discordId = searchParams.get('discordId')
    const email = searchParams.get('email')
    
    if (discordId || email) {
      const info = { discordId: discordId || undefined, email: email || undefined }
      setUserInfo(info)
      // Store in localStorage for page refreshes
      localStorage.setItem('pending_user_info', JSON.stringify(info))
    } else {
      // Try to get from localStorage
      const stored = localStorage.getItem('pending_user_info')
      if (stored) {
        setUserInfo(JSON.parse(stored))
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (!userInfo) return

    // Poll every 5 seconds to check registration status
    const checkStatus = async () => {
      if (checking) return
      setChecking(true)
      
      try {
        const res = await fetch('/api/pending-registration/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userInfo)
        })
        
        if (res.ok) {
          const data = await res.json()
          console.log('Registration status:', data.status)
          
          if (data.status === 'approved') {
            setStatus('approved')
            // Clear stored info
            localStorage.removeItem('pending_user_info')
            // Redirect to sign-in after 2 seconds
            setTimeout(() => {
              router.push('/auth/signin?approved=true')
            }, 2000)
          } else if (data.status === 'denied') {
            setStatus('denied')
            localStorage.removeItem('pending_user_info')
          } else {
            setStatus('pending')
          }
        }
      } catch (error) {
        console.error('Error checking status:', error)
      } finally {
        setChecking(false)
      }
    }

    // Check immediately
    checkStatus()

    // Then check every 5 seconds
    const interval = setInterval(checkStatus, 5000)

    return () => clearInterval(interval)
  }, [router, userInfo, checking])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-6 relative">
      <div className={`bg-neutral-900/60 border rounded-2xl p-10 backdrop-blur-sm shadow-xl max-w-lg w-full ${
        status === 'approved' ? 'border-green-700' : status === 'denied' ? 'border-red-700' : 'border-yellow-700'
      }`}>
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
            status === 'approved' ? 'bg-green-600' : status === 'denied' ? 'bg-red-600' : 'bg-yellow-600'
          }`}>
            {status === 'approved' ? (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : status === 'denied' ? (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4 text-center">
          {status === 'approved' ? 'Registration Approved!' : status === 'denied' ? 'Registration Denied' : 'Registration Pending Approval'}
        </h1>
        
        <p className="text-neutral-400 mb-6 text-center leading-relaxed">
          {status === 'approved' 
            ? 'Your account has been approved! Redirecting you to the homepage...'
            : status === 'denied'
            ? 'Unfortunately, your registration request has been denied by an administrator.'
            : 'Your registration request has been received and is currently under review by our administrators. This page will automatically update when a decision is made.'}
        </p>
        
        {status === 'pending' && (
          <>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-neutral-300">
                  <p className="font-semibold mb-1">Why is approval needed?</p>
                  <p className="text-neutral-400">
                    Our system detected that your account details match a previously registered account. 
                    This is a security measure to prevent abuse and ensure a safe community.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-neutral-300 text-center">
                <strong>What happens next?</strong>
                <br />
                An administrator will review your registration request. This page will automatically update when your request is processed.
                This usually takes 24-48 hours.
              </p>
            </div>

            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center gap-2 text-neutral-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                <span className="text-sm">Checking for updates...</span>
              </div>
            </div>
          </>
        )}

        {status === 'approved' && (
          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-300 text-center">
              Your account has been successfully created! You'll be redirected shortly.
            </p>
          </div>
        )}

        {status === 'denied' && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-300 text-center">
              If you believe this was a mistake, please contact support for assistance.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {status !== 'approved' && (
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition"
            >
              Return to Sign In
            </button>
          )}
          
          <p className="text-xs text-neutral-500 text-center">
            If you believe this is an error, please contact support
          </p>
        </div>
      </div>

      {/* Subtle gradient glow */}
      <div className={`absolute w-[600px] h-[600px] blur-[200px] rounded-full -z-10 ${
        status === 'approved' ? 'bg-green-500/10' : status === 'denied' ? 'bg-red-500/10' : 'bg-yellow-500/10'
      }`}></div>
    </main>
  )
}

export default function PendingApprovalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    }>
      <PendingApprovalContent />
    </Suspense>
  )
}
