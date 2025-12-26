'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import NotSignedIn from '@/components/NotSignedIn'
import SectionGrid from '@/components/SectionGrid'
import { convertAniwatchListToCards } from '@/lib/aniwatch-utils'
import AnimeSchedule from '@/components/anime/AnimeSchedule'

interface Anime {
  id: string | number
  name: string
  title?: string
  poster_path: string
  overview: string
  first_air_date?: string
  release_date?: string
  vote_average: number
  genre_ids?: number[]
}

interface AdminData {
  isOwner: boolean
  isDeveloper: boolean
  isAdmin: boolean
  isTrialMod: boolean
  roles: string[]
  uid: number
}

export default function AnimePage() {
  const { data: session, status } = useSession()
  const [trendingAnime, setTrendingAnime] = useState<Anime[]>([])
  const [popularAnime, setPopularAnime] = useState<Anime[]>([])
  const [topRatedAnime, setTopRatedAnime] = useState<Anime[]>([])
  const [newReleasesAnime, setNewReleasesAnime] = useState<Anime[]>([])
  const [recentlyCompletedAnime, setRecentlyCompletedAnime] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Anime[]>([])
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)

  const loadAllAnime = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all anime sections from AniList API
      const [trending, popular, topRated, newReleases, completed] = await Promise.all([
        fetch('/api/aniwatch/category?slug=top-airing').then(r => r.json()).catch(() => ({})),
        fetch('/api/aniwatch/category?slug=most-popular').then(r => r.json()).catch(() => ({})),
        fetch('/api/aniwatch/category?slug=most-favorite').then(r => r.json()).catch(() => ({})),
        fetch('/api/aniwatch/category?slug=recently-added').then(r => r.json()).catch(() => ({})),
        fetch('/api/aniwatch/category?slug=completed').then(r => r.json()).catch(() => ({})),
      ])
      
      setTrendingAnime(convertAniwatchListToCards(trending.animes || trending.results || []))
      setPopularAnime(convertAniwatchListToCards(popular.animes || []))
      setTopRatedAnime(convertAniwatchListToCards(topRated.animes || []))
      setNewReleasesAnime(convertAniwatchListToCards(newReleases.animes || []))
      setRecentlyCompletedAnime(convertAniwatchListToCards(completed.animes || []))
    } catch (error) {
      console.error('Error loading anime:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Check admin access
  useEffect(() => {
    async function checkAccess() {
      if (status === 'authenticated') {
        try {
          const res = await fetch('/api/admin/check')
          if (res.ok) {
            const data = await res.json()
            setAdminData(data)
            // Only allow developers, admins, or owners
            if (data.isDeveloper || data.isAdmin || data.isOwner) {
              setCheckingAccess(false)
              loadAllAnime()
            } else {
              setCheckingAccess(false)
            }
          } else {
            setCheckingAccess(false)
          }
        } catch (error) {
          console.error('Failed to check admin status:', error)
          setCheckingAccess(false)
        }
      } else if (status === 'unauthenticated') {
        setCheckingAccess(false)
      }
    }
    checkAccess()
  }, [status, loadAllAnime])

  // Show loading spinner while session is being checked
  if (status === 'loading' || checkingAccess) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-neutral-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="rounded-full h-8 w-8 border-2 border-brand-400 border-t-transparent"
        />
      </main>
    )
  }

  // If user is not signed in, show the same component as home
  if (status === "unauthenticated") {
    return <NotSignedIn />
  }

  // Check if user has access (developer, admin, or owner)
  const hasAccess = adminData && (adminData.isDeveloper || adminData.isAdmin || adminData.isOwner)
  
  if (!hasAccess) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-neutral-400">This section is only currently in development.</p>
        </div>
      </main>
    )
  }


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/aniwatch/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        const animeResults = convertAniwatchListToCards(data.animes || data.results || [])
        setSearchResults(animeResults)
      }
    } catch (error) {
      console.error('Error searching anime:', error)
    } finally {
      setLoading(false)
    }
  }

  const showSearchResults = searchResults.length > 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 relative">
      {/* Left Sidebar - Schedule (Fixed position on left edge) */}
      <div className="hidden lg:block fixed left-0 top-20 bottom-0 z-10 pl-6 pt-6">
        <AnimeSchedule />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 lg:ml-[395px]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Anime</h1>
          <p className="text-neutral-400">Discover and watch your favorite anime series</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anime..."
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div className="mb-12">
            <SectionGrid title="Search Results" items={searchResults} />
          </div>
        )}

        {/* Content Sections */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="rounded-full h-8 w-8 border-2 border-brand-400 border-t-transparent"
            />
          </div>
        ) : !showSearchResults ? (
          <div className="space-y-12">
            <SectionGrid title="Trending Anime" items={trendingAnime} />
            <SectionGrid title="Most Popular Anime" items={popularAnime} />
            <SectionGrid title="Highest Rated Anime" items={topRatedAnime} />
            <SectionGrid title="New Releases" items={newReleasesAnime} />
            <SectionGrid title="Recently Completed" items={recentlyCompletedAnime} />
          </div>
        ) : null}
      </div>
    </main>
  )
}

