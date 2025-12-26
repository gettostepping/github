"use client"

import { useEffect, useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from 'next-auth/react'
import NotSignedIn from '@/components/NotSignedIn'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setInvitation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDiscordInviteModal, setShowDiscordInviteModal] = useState(false)
  const [discordInviteCode, setDiscordInviteCode] = useState("")
  const [discordError, setDiscordError] = useState<string | null>(null)
  const [isCodeFromUrl, setIsCodeFromUrl] = useState(false)
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace("/") // redirect immediately
    }
  }, [status, router])

  // Read code parameter from URL and auto-fill
  useEffect(() => {
    const codeParam = searchParams.get('code')
    if (codeParam) {
      setInvitation(codeParam)
      setDiscordInviteCode(codeParam)
      setIsCodeFromUrl(true)
    }
  }, [searchParams])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, code }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Registration failed")
        setLoading(false)
        return
      }

      // Automatically sign in after registration
      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (signInRes?.error) setError(signInRes.error)
      else {
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleDiscordRegister = async () => {
    if (!discordInviteCode.trim()) {
      setDiscordError("Please enter an invitation code")
      return
    }
    
    setDiscordError(null)
    
    try {
      // Validate the invite code on the server
      const res = await fetch('/api/discord/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: discordInviteCode })
      })
      
      if (!res.ok) {
        const data = await res.json()
        setDiscordError(data.error || 'Invalid invitation code')
        return
      }
      
      // Store the invite code in a cookie for the auth callback to use
      document.cookie = `discord_invite_code=${discordInviteCode}; path=/; max-age=600; SameSite=Lax`
      
      // Start Discord OAuth
      signIn("discord", { 
        callbackUrl: `/`,
      })
    } catch (err) {
      console.error('Error:', err)
      setDiscordError('Failed to start registration')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-6 relative">
      {/* Card */}
      <div className="bg-neutral-900/60 border border-neutral-700 rounded-2xl p-10 backdrop-blur-sm shadow-xl max-w-lg w-full">
        <h1 className="text-5xl font-bold text-white mb-4 text-center">
          Join <span className="text-brand-400">Reminiscent</span>
        </h1>
        <p className="text-lg text-neutral-400 mb-8 text-center">
          Create an account to explore trending movies and TV shows, save your favorites, and get personalized recommendations.
        </p>

        {/* Register Form */}
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-3 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          <input
            type="text"
            placeholder="Invitation Code"
            value={code}
            onChange={(e) => {
              setInvitation(e.target.value)
              setIsCodeFromUrl(false)
            }}
            readOnly={isCodeFromUrl}
            className={`p-3 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 ${
              isCodeFromUrl ? 'cursor-not-allowed opacity-75 border-2 border-brand-500/50' : ''
            }`}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

        {/* Links & Discord */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <a href="/auth/signin" className="px-6 py-3 text-lg font-semibold text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-all duration-200 text-center">
            Already have an account? Sign In
          </a>
          <button
            onClick={() => setShowDiscordInviteModal(true)}
            className="px-6 py-3 text-lg font-semibold text-white bg-[#5865F2] hover:bg-[#4752C4] rounded-lg transition-all duration-200"
          >
            Register with Discord
          </button>
        </div>
      </div>

      {/* Subtle gradient glow */}
      <div className="absolute w-[600px] h-[600px] bg-brand-500/10 blur-[200px] rounded-full -z-10"></div>

      {/* Discord Invite Code Modal */}
      {showDiscordInviteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Invitation Code Required</h2>
            <p className="text-neutral-400 mb-6">
              Please enter your invitation code to register with Discord.
            </p>
            <input
              type="text"
              placeholder="Enter Invitation Code"
              value={discordInviteCode}
              onChange={(e) => {
                setDiscordInviteCode(e.target.value)
                setDiscordError(null) // Clear error on input change
                setIsCodeFromUrl(false)
              }}
              readOnly={isCodeFromUrl}
              className={`w-full p-3 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4 ${
                isCodeFromUrl ? 'cursor-not-allowed opacity-75 border-2 border-brand-500/50' : ''
              }`}
              autoFocus={!isCodeFromUrl}
              onKeyDown={(e) => e.key === 'Enter' && handleDiscordRegister()}
            />
            {discordError && (
              <p className="text-red-400 text-sm mb-4 text-center">{discordError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDiscordInviteModal(false)
                  setDiscordError(null)
                  setDiscordInviteCode("")
                }}
                className="flex-1 py-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscordRegister}
                className="flex-1 py-3 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold transition"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
