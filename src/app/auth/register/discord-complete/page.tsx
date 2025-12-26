'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function DiscordCompleteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [discordData, setDiscordData] = useState({
    discordId: '',
    email: '',
    name: '',
    avatar: '',
    banner: ''
  })
  const [inviteCode, setInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get Discord data from URL params
    const discordId = searchParams.get('discordId') || ''
    const email = searchParams.get('email') || ''
    const name = searchParams.get('name') || ''
    const avatar = searchParams.get('avatar') || ''
    const banner = searchParams.get('banner') || ''
    
    setDiscordData({ discordId, email, name, avatar, banner })
    
    // Get invite code from cookie
    const cookies = document.cookie.split(';')
    const inviteCookie = cookies.find(c => c.trim().startsWith('discord_invite_code='))
    if (inviteCookie) {
      const code = inviteCookie.split('=')[1]
      setInviteCode(code)
    } else {
      setError('No invite code found. Please start registration again.')
    }
    
    // If no Discord data, redirect back to register
    if (!discordId || !email) {
      router.push('/auth/register')
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (!inviteCode) {
      setError('No invite code found. Please start registration again.')
      return
    }
    
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth/discord/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...discordData,
          password,
          inviteCode
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }
      
      // Success! Delete the cookie
      document.cookie = 'discord_invite_code=; path=/; max-age=0'
      
      // Check if this requires admin approval (tracked identity)
      if (data.pendingApproval) {
        console.log('⚠️ Registration requires admin approval, redirecting...')
        router.push(`/auth/pending-approval?discordId=${encodeURIComponent(data.discordId)}&email=${encodeURIComponent(data.email)}`)
      } else {
        // Normal registration - redirect to sign-in
        router.push('/auth/signin?registered=true')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative p-4">
      <div className="w-full max-w-md bg-neutral-900/70 backdrop-blur-md rounded-2xl p-8 border border-neutral-700/50 shadow-2xl relative z-10">
        <h1 className="text-4xl font-bold text-center mb-2">
          Complete Your <span className="text-brand-400">Registration</span>
        </h1>
        <p className="text-neutral-400 text-center mb-8">
          Set a password for your Discord-linked account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (disabled) */}
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Name (from Discord)</label>
            <input
              type="text"
              value={discordData.name}
              disabled
              className="w-full p-3 rounded-lg bg-neutral-800/50 text-neutral-400 border border-neutral-700 cursor-not-allowed"
            />
          </div>

          {/* Email (disabled) */}
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Email (from Discord)</label>
            <input
              type="email"
              value={discordData.email}
              disabled
              className="w-full p-3 rounded-lg bg-neutral-800/50 text-neutral-400 border border-neutral-700 cursor-not-allowed"
            />
          </div>

          {/* Invite Code (disabled) */}
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Invitation Code</label>
            <input
              type="text"
              value={inviteCode}
              disabled
              className="w-full p-3 rounded-lg bg-neutral-800/50 text-neutral-400 border border-neutral-700 cursor-not-allowed"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Create Password</label>
            <input
              type="password"
              placeholder="Enter password (8+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
              minLength={8}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}
      </div>

      {/* Subtle gradient glow */}
      <div className="absolute w-[600px] h-[600px] bg-brand-500/10 blur-[200px] rounded-full -z-10"></div>
    </main>
  )
}

export default function DiscordCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-white">Loading...</p></div>}>
      <DiscordCompleteForm />
    </Suspense>
  )
}

