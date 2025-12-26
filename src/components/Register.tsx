"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invitation, setInvitation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      // Automatically sign in after registration
      const signInRes = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (signInRes?.error) setError(signInRes.error)
      else router.push('/') // redirect on success

    } catch (err) {
      console.error(err)
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-900 p-6">
      <form
        onSubmit={handleRegister}
        className="bg-neutral-800 p-8 rounded-xl w-full max-w-md space-y-6"
      >
        <h1 className="text-3xl font-bold text-white">Register</h1>

        {error && <p className="text-red-400">{error}</p>}

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full p-3 rounded-lg bg-neutral-700 text-white"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg bg-neutral-700 text-white"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-3 rounded-lg bg-neutral-700 text-white"
        />

        <input
          type="text"
          placeholder="Invitation Code "
          value={invitation}
          onChange={e => setInvitation(e.target.value)}
          className="w-full p-3 rounded-lg bg-neutral-700 text-white"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 p-3 rounded-lg text-white font-semibold"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </main>
  )
}
