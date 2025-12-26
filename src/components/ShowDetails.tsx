"use client"
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faStar, faGlobe, faCalendar, faClock, faFlag, faTv, faFilm, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import Image from 'next/image'
import { getPosterUrl } from '@/lib/images'
import RatingStars from './RatingStars'

interface ShowDetailsProps {
  tmdbId: string
  type: 'movie' | 'tv'
  currentEpisode?: number
  currentSeason?: number
  isAnime?: boolean
  showData?: ShowData | null // Optional: pass showData directly to avoid duplicate fetch
}

interface ShowData {
  id: number
  title?: string
  name?: string
  overview: string
  poster_path?: string
  backdrop_path?: string
  vote_average: number
  vote_count: number
  genres: Array<{ id: number; name: string }>
  production_companies: Array<{ id: number; name: string; logo_path?: string }>
  production_countries: Array<{ iso_3166_1: string; name: string }>
  spoken_languages: Array<{ iso_639_1: string; name: string }>
  status: string
  release_date?: string
  first_air_date?: string
  last_air_date?: string
  runtime?: number
  episode_run_time?: number[]
  number_of_episodes?: number
  number_of_seasons?: number
  adult: boolean
  homepage?: string
  original_language: string
  original_title?: string
  original_name?: string
  popularity: number
  revenue?: number
  budget?: number
  tagline?: string
  videos?: {
    results: Array<{
      id: string
      key: string
      name: string
      site: string
      type: string
    }>
  }
}

export default function ShowDetails({ tmdbId, type, currentEpisode, currentSeason, isAnime = false, showData: propShowData }: ShowDetailsProps) {
  const [showData, setShowData] = useState<ShowData | null>(propShowData || null)
  const [loading, setLoading] = useState(!propShowData)
  const [websiteRating, setWebsiteRating] = useState<{ average: number; count: number } | null>(null)

  useEffect(() => {
    // If showData is passed as prop, use it and skip fetch
    if (propShowData) {
      setShowData(propShowData)
      setLoading(false)
      return
    }
    
    // Skip fetch for anime (AniList data should be passed as prop)
    if (isAnime) {
      setLoading(false)
      return
    }

    const fetchShowData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/tmdb/details?id=${tmdbId}&type=${type}`)
        const data = await response.json()
        setShowData(data)
      } catch (error) {
        console.error('Failed to fetch show data:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchWebsiteRating = async () => {
      try {
        const response = await fetch(`/api/ratings/public?tmdbId=${tmdbId}&type=${type}`)
        if (response.ok) {
          const data = await response.json()
          setWebsiteRating({
            average: data.averageRating || 0,
            count: data.totalRatings || 0
          })
        }
      } catch (err) {
        console.error('Failed to fetch website rating:', err)
      }
    }

    fetchShowData()
    fetchWebsiteRating()
  }, [tmdbId, type, propShowData, isAnime])

  if (loading) {
    return (
      <div className="bg-neutral-900 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-700 rounded mb-4"></div>
          <div className="h-4 bg-neutral-700 rounded mb-2"></div>
          <div className="h-4 bg-neutral-700 rounded mb-2"></div>
          <div className="h-4 bg-neutral-700 rounded mb-4"></div>
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-neutral-700 rounded w-16"></div>
            <div className="h-6 bg-neutral-700 rounded w-20"></div>
            <div className="h-6 bg-neutral-700 rounded w-24"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!showData) {
    return (
      <div className="bg-neutral-900 rounded-lg p-6">
        <div className="text-neutral-400">Failed to load show details</div>
      </div>
    )
  }

  const title = showData.title || showData.name || 'Unknown'
  const originalTitle = showData.original_title || showData.original_name
  const releaseDate = showData.release_date || showData.first_air_date
  const endDate = showData.last_air_date
  const runtime = showData.runtime || (showData.episode_run_time && showData.episode_run_time[0])
  const format = type === 'tv' ? 'TV' : 'Movie'
  const status = showData.status || 'Unknown'
  const rating = Math.round(showData.vote_average * 10)
  const startDate = releaseDate ? new Date(releaseDate).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  }) : 'Unknown'
  const endDateFormatted = endDate ? new Date(endDate).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  }) : 'Unknown'

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getSeason = () => {
    if (type === 'tv' && currentSeason) {
      const month = new Date().getMonth()
      if (month >= 2 && month <= 4) return 'Spring'
      if (month >= 5 && month <= 7) return 'Summer'
      if (month >= 8 && month <= 10) return 'Fall'
      return 'Winter'
    }
    return 'N/A'
  }

  const isStillAiring = () => {
    if (!endDate) return true
    const today = new Date()
    const end = new Date(endDate)
    return today < end
  }

  return (
    <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-6 pb-24">
      {/* Title and Rating */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          {originalTitle && originalTitle !== title && (
            <p className="text-neutral-400 text-lg mb-2">{originalTitle}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-neutral-400">
            <span className="flex items-center gap-1">
              <FontAwesomeIcon icon={faStar} className="text-yellow-400" />
              {showData.vote_average?.toFixed(1) || 'N/A'} ({showData.vote_count?.toLocaleString() || 0})
            </span>
            {websiteRating && websiteRating.count > 0 && (
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faStar} className="text-brand-400" />
                {websiteRating.average.toFixed(1)} ({websiteRating.count})
              </span>
            )}
            <span className="flex items-center gap-1">
              <FontAwesomeIcon icon={faCalendar} />
              {startDate}
            </span>
            {endDate && (
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faChevronRight} className="text-neutral-500" />
                {isStillAiring() ? 'Airing' : endDateFormatted}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className="text-right">
            <div className="text-white font-semibold mb-2">Rate this {type === 'tv' ? 'show' : 'movie'}</div>
            <RatingStars tmdbId={parseInt(tmdbId)} type={type} />
          </div>
        </div>
      </div>

      {/* Genres */}
      <div className="flex flex-wrap gap-2 mb-4">
        {showData.genres?.map((genre) => (
          <span
            key={genre.id}
            className="px-3 py-1 bg-neutral-800 text-white text-sm rounded-full hover:bg-neutral-700 cursor-pointer transition-colors"
          >
            {genre.name}
          </span>
        )) || <span className="text-neutral-400 text-sm">No genres available</span>}
      </div>

      {/* Poster and Overview */}
      <div className="flex gap-6 mb-6">
        <div className="flex-shrink-0">
          <div className="relative w-48 h-72">
            <Image
              src={getPosterUrl(showData.poster_path)}
              alt={title}
              fill
              sizes="192px"
              className="object-cover rounded-lg"
            />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-neutral-300 text-base leading-relaxed mb-4">
            {showData.overview}
          </p>
          
          {/* Trailer Button - Only show if trailer exists */}
          {showData.videos?.results && showData.videos.results.length > 0 && (
            <div className="flex items-center gap-3 mb-6">
              <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors">
                <FontAwesomeIcon icon={faPlay} className="mr-2" />
                TRAILER
              </button>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Official Site:</span>
                <span className="text-white">
                  {showData.homepage ? (
                    <a href={showData.homepage} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                      Link
                    </a>
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Format:</span>
                <span className="text-white">{format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Status:</span>
                <span className="text-white">{status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">TMDB Rating:</span>
                <span className="text-white">{rating}/100</span>
              </div>
              {websiteRating && websiteRating.count > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Our Rating:</span>
                  <span className="text-white">
                    {websiteRating.average.toFixed(1)}/5 ({websiteRating.count} rating{websiteRating.count !== 1 ? 's' : ''})
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-400">Start Date:</span>
                <span className="text-white">{startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">End Date:</span>
                <span className="text-white">{endDate ? endDateFormatted : 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Episodes:</span>
                <span className="text-white">{showData.number_of_episodes || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Duration:</span>
                <span className="text-white">
                  {runtime ? formatRuntime(runtime) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Season:</span>
                <span className="text-white">{getSeason()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Country:</span>
                <span className="text-white">
                  {showData.production_countries?.[0]?.iso_3166_1 || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Adult:</span>
                <span className="text-white">{showData.adult ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Studios:</span>
                <span className="text-white">
                  {showData.production_companies?.[0]?.name || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
