'use client'

import { useEffect, useState, FormEvent } from 'react'
import SectionGrid from '@/components/SectionGrid'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faSearch } from '@fortawesome/free-solid-svg-icons'
import { IResult, MovieType } from '@/lib/flixhq'

export default function FlixHQPage() {
  const [trendingMovies, setTrendingMovies] = useState<IResult[]>([])
  const [trendingTV, setTrendingTV] = useState<IResult[]>([])
  const [loading, setLoading] = useState(true)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<IResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/flixhq/trending')
        const data = await res.json()
        if (data.movies) setTrendingMovies(data.movies)
        if (data.tv) setTrendingTV(data.tv)
      } catch (err) {
        console.error('Failed to fetch FlixHQ trending:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/flixhq/search?query=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (data.results) {
        setSearchResults(data.results)
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  const clearSearch = () => {
    setIsSearching(false)
    setSearchQuery('')
    setSearchResults([])
  }

  // Transform IResult to Card item format
  const transformToCardItem = (item: IResult) => ({
    id: item.id,
    title: item.title,
    poster_path: item.image,
    media_type: item.type === MovieType.MOVIE ? 'movie' : 'tv',
    url: `/flixhq/watch/${encodeURIComponent(item.id)}` // Custom URL handling for Card
  })

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <motion.h1 
          className="text-3xl font-bold text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          FlixHQ
        </motion.h1>

        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies & TV..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-full py-2 px-5 pl-12 text-white focus:outline-none focus:border-brand-500 transition-colors"
          />
          <FontAwesomeIcon 
            icon={faSearch} 
            className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          {isSearching && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-white"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-brand-500" />
        </div>
      ) : isSearching ? (
        <div className="space-y-12">
           {searchLoading ? (
             <div className="flex justify-center py-20">
               <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-brand-500" />
             </div>
           ) : searchResults.length > 0 ? (
             <SectionGrid 
               title={`Search Results for "${searchQuery}"`}
               items={searchResults.map(transformToCardItem)} 
             />
           ) : (
             <div className="text-center text-neutral-400 py-20">
               No results found for "{searchQuery}"
             </div>
           )}
        </div>
      ) : (
        <div className="space-y-12">
          {trendingMovies.length > 0 && (
            <SectionGrid 
              title="Trending Movies" 
              items={trendingMovies.map(transformToCardItem)} 
            />
          )}
          
          {trendingTV.length > 0 && (
            <SectionGrid 
              title="Trending TV Shows" 
              items={trendingTV.map(transformToCardItem)} 
            />
          )}
        </div>
      )}
    </div>
  )
}
