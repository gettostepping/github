"use client"

import { Suspense, useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from 'next-auth/react'
import NotSignedIn from '@/components/NotSignedIn'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') {
      // Use hard redirect to ensure session is fully loaded
      window.location.href = "/"
    }
  }, [status])

  useEffect(() => {
    // Check for error and success parameters
    const errorParam = searchParams.get('error')
    const approvedParam = searchParams.get('approved')
    const registeredParam = searchParams.get('registered')
    
    if (errorParam === 'AccountDeleted') {
      setError('Your account has been removed. Please contact support if you believe this was a mistake, or create a new account with an invite code.')
    } else if (errorParam === 'OAuthCallback') {
      // Check if there's a pending approval
      const checkPending = async () => {
        // Redirect to pending approval page if needed
        router.push('/auth/pending-approval')
      }
      checkPending()
    } else if (approvedParam === 'true') {
      setError('✅ Your registration has been approved! You can now sign in with Discord.')
    } else if (registeredParam === 'true') {
      setError('✅ Account created successfully! Sign in with your email and the password you just set.')
    }
  }, [searchParams, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    })

    if (res?.error) {
      setLoading(false)
      setError(res.error)
    } else if (res?.ok) {
      // Wait for session to update, then do a hard redirect
      // This ensures the session is fully loaded before redirecting
      setTimeout(() => {
        window.location.href = "/"
      }, 100)
    } else {
      setLoading(false)
      setError("Sign in failed. Please try again.")
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-6 relative">
      {/* Card */}
      <div className="bg-neutral-900/60 border border-neutral-700 rounded-2xl p-10 backdrop-blur-sm shadow-xl max-w-lg w-full">
        <h1 className="text-5xl font-bold text-white mb-4 text-center">
          Welcome Back to <span className="text-brand-400">Reminiscent</span>
        </h1>
        <p className="text-lg text-neutral-400 mb-8 text-center">
          Sign in to explore trending movies and TV shows, save your favorites, and access personalized recommendations.
        </p>

        {/* Sign In Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
          <button
            type="submit"
            disabled={loading}
            className="py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

        {/* Links */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <a href="/auth/register" className="px-6 py-3 text-lg font-semibold text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-all duration-200 text-center">
            Create Account
          </a>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-neutral-400 mb-3">
            New to Discord login? You'll need to <a href="/auth/register" className="text-brand-400 hover:text-brand-300 underline">register first</a> with an invite code.
          </p>
          <p className="text-xs text-neutral-500">
            Existing Discord users can sign in with email/password above
          </p>
        </div>
      </div>

      {/* Subtle gradient glow */}
      <div className="absolute w-[600px] h-[600px] bg-brand-500/10 blur-[200px] rounded-full -z-10"></div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
