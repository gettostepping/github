"use client"
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faTh, faList, faChevronDown, faSearch, faFilter, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import Image from 'next/image'
import { getPosterUrl } from '@/lib/images'

interface Episode {
  id: number
  name: string
  overview: string
  air_date: string
  episode_number: number
  season_number: number
  still_path?: string
  vote_average: number
  runtime?: number
}

interface EpisodeListProps {
  tmdbId: string
  season: number
  currentEpisode: number
  onEpisodeSelect: (episode: number) => void
  onSeasonChange: (season: number) => void
  onBlurToggle: (blur: boolean) => void
  blurPlayer: boolean
  isAnime?: boolean
  totalEpisodes?: number
  aniwatchId?: string | null
}

export default function EpisodeList({
  tmdbId,
  season,
  currentEpisode,
  onEpisodeSelect,
  onSeasonChange,
  onBlurToggle,
  blurPlayer,
  isAnime = false,
  totalEpisodes,
  aniwatchId
}: EpisodeListProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [seasons, setSeasons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [showWatched, setShowWatched] = useState(false)
  const [blurImages, setBlurImages] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('blurImages') === 'true'
    }
    return false
  })

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        setLoading(true)
        
        if (isAnime) {
          if (aniwatchId) {
            const response = await fetch(`/api/aniwatch/episodes?id=${aniwatchId}`)
            const data = await response.json()
            const total = data.totalEpisodes || totalEpisodes || data.episodes?.length || 12
            const animeEpisodes: Episode[] = (data.episodes || []).map((item: any) => ({
              id: item.number,
              name: item.title || `Episode ${item.number}`,
              overview: '',
              air_date: '',
              episode_number: item.number,
              season_number: 1,
              vote_average: 0,
              runtime: 24
            }))
            if (!animeEpisodes.length) {
              for (let i = 1; i <= total; i++) {
                animeEpisodes.push({
                  id: i,
                  name: `Episode ${i}`,
                  overview: '',
                  air_date: '',
                  episode_number: i,
                  season_number: 1,
                  vote_average: 0,
                  runtime: 24
                })
              }
            }
            setEpisodes(animeEpisodes)
            setSeasons([{ season_number: 1, name: 'Season 1', episode_count: total }])
          } else {
            const fallbackTotal = totalEpisodes || 12
            const animeEpisodes: Episode[] = []
            for (let i = 1; i <= fallbackTotal; i++) {
              animeEpisodes.push({
                id: i,
                name: `Episode ${i}`,
                overview: '',
                air_date: '',
                episode_number: i,
                season_number: 1,
                vote_average: 0,
                runtime: 24
              })
            }
            setEpisodes(animeEpisodes)
            setSeasons([{ season_number: 1, name: 'Season 1', episode_count: fallbackTotal }])
          }
        } else {
          // For regular TV shows, fetch from TMDB
          // Skip if tmdbId is not numeric (likely an anime ID)
          const isNumericId = /^\d+$/.test(tmdbId)
          if (!isNumericId) {
            console.log('⏭️ Skipping TMDB episode fetch for non-numeric ID:', tmdbId)
            setEpisodes([])
            setSeasons([])
          } else {
            const response = await fetch(`/api/tmdb/episodes?id=${tmdbId}&season=${season}`)
            const data = await response.json()
            setEpisodes(data.episodes || [])
            
            const seasonsResponse = await fetch(`/api/tmdb/seasons?id=${tmdbId}`)
            const seasonsData = await seasonsResponse.json()
            setSeasons(seasonsData.seasons || [])
          }
        }
      } catch (error) {
        console.error('Failed to fetch episodes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEpisodes()
  }, [tmdbId, season, isAnime, totalEpisodes, aniwatchId])

  // Save blur preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('blurImages', blurImages.toString())
    }
  }, [blurImages])

  const filteredEpisodes = episodes.filter(episode => 
    episode.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    episode.overview.toLowerCase().includes(searchTerm.toLowerCase()) ||
    episode.episode_number.toString().includes(searchTerm)
  )

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
      })
    } catch (error) {
      console.error('Error formatting date:', dateString, error)
      return dateString // Return original string if formatting fails
    }
  }

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className="w-full h-96 bg-neutral-800 rounded-lg flex items-center justify-center">
        <div className="text-neutral-400">Loading episodes...</div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4 h-[calc(100vh-190px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select 
            value={season} 
            onChange={(e) => onSeasonChange(parseInt(e.target.value))}
            className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white"
          >
            {seasons.map((s) => (
              <option key={s.season_number} value={s.season_number}>
                Season {s.season_number} - {s.episode_count || 0} episodes
              </option>
            ))}
          </select>
          
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 text-sm" />
            <input
              type="text"
              placeholder="Filter episodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded pl-10 pr-3 py-2 text-sm text-white placeholder-neutral-400 w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBlurImages(!blurImages)
              onBlurToggle(!blurPlayer)
            }}
            className={`p-2 rounded ${blurImages ? 'bg-purple-600' : 'bg-neutral-800'} hover:bg-neutral-700 transition-colors`}
            title={blurImages ? "Show episode images" : "Blur episode images"}
          >
            <FontAwesomeIcon icon={blurImages ? faEyeSlash : faEye} className="text-white text-sm" />
          </button>
          
          
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-600' : 'bg-neutral-800'} hover:bg-neutral-700 transition-colors`}
            title={viewMode === 'list' ? 'Grid view' : 'List view'}
          >
            <FontAwesomeIcon icon={viewMode === 'list' ? faTh : faList} className="text-white text-sm" />
          </button>
        </div>
      </div>

      {/* Episodes */}
      {viewMode === 'list' ? (
        <div className="space-y-2 flex-1 overflow-y-auto">
          {filteredEpisodes.map((episode) => (
            <div
              key={episode.id}
              onClick={() => onEpisodeSelect(episode.episode_number)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                currentEpisode === episode.episode_number 
                  ? 'bg-purple-600' 
                  : 'bg-neutral-800 hover:bg-neutral-700'
              }`}
            >
              <div className="relative w-24 h-16 flex-shrink-0">
                {episode.still_path ? (
                  <Image
                    src={getPosterUrl(episode.still_path)}
                    alt={episode.name}
                    fill
                    sizes="96px"
                    className={`object-cover rounded transition-all duration-300 ${blurImages ? 'blur-sm' : 'blur-0'}`}
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-700 rounded flex items-center justify-center">
                    <FontAwesomeIcon icon={faPlay} className="text-neutral-400 text-xs" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 bg-black bg-opacity-75 text-white text-xs px-1 rounded-tr">
                  EP {episode.episode_number}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-medium text-sm truncate">
                    {episode.episode_number}. {episode.name}
                  </h4>
                </div>
                <p className="text-neutral-400 text-xs line-clamp-2 mb-1">
                  {episode.overview}
                </p>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>{formatDate(episode.air_date)}</span>
                  {episode.runtime && <span>• {formatRuntime(episode.runtime)}</span>}
                  <span>• {episode.vote_average.toFixed(1)}★</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2 flex-1 overflow-y-auto">
          {filteredEpisodes.map((episode) => (
            <div
              key={episode.id}
              onClick={() => onEpisodeSelect(episode.episode_number)}
              className={`relative aspect-video rounded-lg cursor-pointer transition-colors bg-neutral-800 flex items-center justify-center ${
                currentEpisode === episode.episode_number 
                  ? 'ring-2 ring-purple-500' 
                  : 'hover:bg-neutral-700'
              }`}
            >
              <div className="text-white text-lg font-bold">
                {episode.episode_number}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
