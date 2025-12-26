'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import NotSignedIn from '@/components/NotSignedIn'
import SectionGrid from '@/components/SectionGrid'

interface TVShow {
  id: number
  name: string
  title?: string
  poster_path: string
  overview: string
  first_air_date: string
  release_date?: string
  vote_average: number
  genre_ids: number[]
}

export default function TVPage() {
  const { data: session, status } = useSession()
  const [trendingTv, setTrendingTv] = useState<TVShow[]>([])
  const [popularTv, setPopularTv] = useState<TVShow[]>([])
  const [topRatedTv, setTopRatedTv] = useState<TVShow[]>([])
  const [onTheAirTv, setOnTheAirTv] = useState<TVShow[]>([])
  const [airingTodayTv, setAiringTodayTv] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TVShow[]>([])

  // Load TV shows when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      loadAllTVShows()
    }
  }, [status])

  // Show loading spinner while session is being checked
  if (status === 'loading') {
    return (
      <main className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
      </main>
    )
  }

  // If user is not signed in, show the same component as home
  if (status === "unauthenticated") {
    return <NotSignedIn />
  }

  const loadAllTVShows = async () => {
    setLoading(true)
    try {
      const [trending, popular, topRated, onTheAir, airingToday] = await Promise.all([
        fetch('/api/tmdb/trending?type=tv').then(r => r.json()),
        fetch('/api/tmdb/popular?type=tv').then(r => r.json()),
        fetch('/api/tmdb/top-rated?type=tv').then(r => r.json()),
        fetch('/api/tmdb/on-the-air').then(r => r.json()),
        fetch('/api/tmdb/airing-today').then(r => r.json()),
      ])
      
      setTrendingTv(trending.results || [])
      setPopularTv(popular.results || [])
      setTopRatedTv(topRated.results || [])
      setOnTheAirTv(onTheAir.results || [])
      setAiringTodayTv(airingToday.results || [])
    } catch (error) {
      console.error('Error loading TV shows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(searchQuery)}&type=tv`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
      }
    } catch (error) {
      console.error('Error searching TV shows:', error)
    } finally {
      setLoading(false)
    }
  }

  const showSearchResults = searchResults.length > 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">TV Shows</h1>
          <p className="text-neutral-400">Discover and watch your favorite TV shows</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search TV shows..."
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
            <h2 className="text-2xl font-bold text-white mb-6">Search Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {searchResults.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <Link
                    href={`/watch/${item.id}?type=tv`}
                    className="group bg-neutral-800/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 overflow-hidden hover:bg-neutral-700/50 transition-all duration-300 hover:scale-105 block"
                  >
                    <div className="aspect-[3/4] relative overflow-hidden">
                      <img
                        src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '/placeholder.png'}
                        alt={item.name || item.title || 'TV Show'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="p-4 min-h-[80px] flex flex-col justify-between">
                      <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 group-hover:text-brand-400 transition-colors h-10">
                        {item.name || item.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-neutral-400 mt-auto">
                        <span>{(item.first_air_date || item.release_date) ? new Date(item.first_air_date || item.release_date!).getFullYear() : 'N/A'}</span>
                        <span>★ {item.vote_average.toFixed(1)}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
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
            <SectionGrid title="Trending TV Shows" items={trendingTv} />
            <SectionGrid title="Most Popular TV Shows" items={popularTv} />
            <SectionGrid title="Highest Rated TV Shows" items={topRatedTv} />
            <SectionGrid title="On The Air" items={onTheAirTv} />
            <SectionGrid title="Airing Today" items={airingTodayTv} />
          </div>
        ) : null}
      </div>
    </main>
  )
}
