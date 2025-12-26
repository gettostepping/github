"use client"
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Recommendations from './Recommendations'
import Related from './Related'
import EpisodeList from '@/components/EpisodeList'
import ShowDetails from '@/components/ShowDetails'
import VideoPlayer from '@/components/VideoPlayer'
import PopupBlockerBanner from '@/components/PopupBlockerBanner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faSearch, faBell, faUser, faTh, faList, faFilter } from '@fortawesome/free-solid-svg-icons'
import { getStreamingUrl, setupStreamingEventListeners, StreamingResult } from '@/lib/streaming'
import { useSession } from 'next-auth/react'
import { convertAniwatchDetailToShowData, convertAniwatchListToCards } from '@/lib/aniwatch-utils'
import NotSignedIn from '@/components/NotSignedIn'
import { ToastContainer } from '@/components/Toast'
import { useToast } from '@/hooks/useToast'

// Helper function to normalize poster paths (handle both TMDB relative paths and full URLs)
function getPosterUrl(posterPath: string | null | undefined, size: 'w500' | 'w780' | 'w1280' = 'w500'): string | null {
  if (!posterPath) return null
  
  // If it's already a full URL, return as-is
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath
  }
  
  // Otherwise, assume it's a TMDB relative path
  return `https://image.tmdb.org/t/p/${size}${posterPath}`
}

export default function WatchPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const search = useSearchParams()
  const queryType = (search?.get('type') || 'movie').toLowerCase()
  const queryAnilistParam = search?.get('anilistId')
  const queryAniwatchId = search?.get('aniId') || null
  const queryAnimepaheSession = search?.get('animepaheSession') || null
  const isNumericId = /^\d+$/.test(params.id)
  // Only use params.id as aniwatchId if animepaheSession is not provided
  const aniwatchId = queryAniwatchId || (!isNumericId && !queryAnimepaheSession ? params.id : null)
  const animepaheSession = queryAnimepaheSession
  const [anilistId, setAnilistId] = useState<number | null>(
    queryAnilistParam ? parseInt(queryAnilistParam, 10) : null
  )
  const hasAniwatchId = !!aniwatchId
  const hasAnimepaheSession = !!animepaheSession
  const hasAnilistId = anilistId !== null
  const type = hasAniwatchId || hasAnimepaheSession ? 'tv' : queryType
  const [season, setSeason] = useState(1)
  const [episode, setEpisode] = useState(1)
  const [blurPlayer, setBlurPlayer] = useState(false)
  const isTv = type === 'tv'
  const [originalLang, setOriginalLang] = useState<string>('')
  const [mediaData, setMediaData] = useState<any>(null)
  const [currentEpisodeData, setCurrentEpisodeData] = useState<any>(null)
  const [showData, setShowData] = useState<any>(null)
  const [lastTrackedShow, setLastTrackedShow] = useState<string | null>(null)
  const [relatedAnime, setRelatedAnime] = useState<any[]>([])
  const [recommendedAnime, setRecommendedAnime] = useState<any[]>([])
  const [animeEpisodeMap, setAnimeEpisodeMap] = useState<Record<number, string>>({})
  const [animepaheEpisodeMap, setAnimepaheEpisodeMap] = useState<Record<number, { session: string; episodeId: string }>>({})
  const episodeAdjustmentRef = useRef<number | null>(null)
  
  // Store all server data
  const [aniwatchData, setAniwatchData] = useState<{ id: string; session?: string } | null>(null)
  const [animepaheData, setAnimepaheData] = useState<{ session: string } | null>(null)
  
  // Server toggle state - 'aniwatch' or 'animepahe' (must be declared after server data states)
  const [selectedServer, setSelectedServer] = useState<'aniwatch' | 'animepahe'>(
    hasAnimepaheSession ? 'animepahe' : 'aniwatch'
  )
  
  // Determine which server to use based on toggle (must be after selectedServer declaration)
  // Check both URL params and state data
  const useAniwatch = selectedServer === 'aniwatch' && (aniwatchData || hasAniwatchId)
  const useAnimepahe = selectedServer === 'animepahe' && (animepaheData || hasAnimepaheSession)

  // New streaming service states
  const [streamingResult, setStreamingResult] = useState<StreamingResult | null>(null)
  const [streamingLoading, setStreamingLoading] = useState(false)
  const [streamingError, setStreamingError] = useState<string | null>(null)
  const [isAnime, setIsAnime] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const [animeStream, setAnimeStream] = useState<{
    url: string
    tracks: Array<{ src: string; label?: string; kind?: 'subtitles' | 'metadata'; lang?: string }>
    serverName: string
    category: 'sub' | 'dub' | 'raw'
  } | null>(null)
  const shouldUseWatchlist = !hasAniwatchId && !hasAnimepaheSession

  // If user is not signed in, show the same component as home
  if (status === "unauthenticated") {
    return <NotSignedIn />
  }

  // Track presence when component mounts
  useEffect(() => {
    trackPresence()
  }, [isTv])

  // Initialize server data from URL params
  useEffect(() => {
    if (hasAniwatchId && aniwatchId) {
      setAniwatchData({ id: aniwatchId })
    }
    if (hasAnimepaheSession && animepaheSession) {
      setAnimepaheData({ session: animepaheSession })
    }
  }, [aniwatchId, hasAniwatchId, animepaheSession, hasAnimepaheSession])

  // Handle server switching - search for anime on the other API if needed
  const handleServerSwitch = useCallback(async (server: 'aniwatch' | 'animepahe') => {
    setSelectedServer(server)
    
    // If switching to a server that doesn't have data, try to find it
    if (server === 'animepahe' && !animepaheData && (showData?.title || showData?.name)) {
      try {
        const searchQuery = showData?.title || showData?.name || ''
        console.log('🔍 Searching Animepahe for:', searchQuery)
        const response = await fetch(`/api/animepahe/search?q=${encodeURIComponent(searchQuery)}`)
        const responseText = await response.text()
        console.log('📡 Animepahe search HTTP status:', response.status, response.statusText)
        console.log('📦 Animepahe search raw response:', responseText)
        
        if (response.ok) {
          let data
          try {
            data = JSON.parse(responseText)
          } catch (e) {
            console.error('❌ Failed to parse Animepahe search response as JSON:', e)
            return
          }
          
          console.log('📦 Animepahe search parsed response:', data)
          
          // HeroX API returns: { data: [...] } or { result: { data: [...] } }
          const results = data.result?.data || data.data || []
          console.log('📋 Parsed results:', results, 'Count:', results.length)
          
          if (results.length > 0) {
            const match = results[0] // Take first result
            console.log('🎯 First match:', match)
            const session = match.session || match.id
            if (session) {
              setAnimepaheData({ session })
              console.log('✅ Found Animepahe session:', session)
              // Fetch episodes immediately after setting the session
              // This will be handled by the useEffect that watches animepaheData
            } else {
              console.error('❌ No session found in match:', match)
            }
          } else {
            console.warn('⚠️ No results found in Animepahe search. Response:', data)
            // Try a more specific search or check if API is working
            console.log('💡 Tip: The HeroX API might be down or the search query might need adjustment')
          }
        } else {
          console.error('❌ Animepahe search failed:', response.status, responseText)
        }
      } catch (error) {
        console.error('❌ Failed to search Animepahe:', error)
      }
    } else if (server === 'aniwatch' && !aniwatchData && showData?.title) {
      try {
        console.log('🔍 Searching Aniwatch for:', showData.title)
        const response = await fetch(`/api/aniwatch/search?q=${encodeURIComponent(showData.title)}`)
        if (response.ok) {
          const data = await response.json()
          const results = data.animes || data.data || []
          if (results.length > 0) {
            const match = results[0] // Take first result
            const id = match.aniwatch_id || match.id
            setAniwatchData({ id })
            console.log('✅ Found Aniwatch ID:', id)
            // Fetch episodes immediately after setting the ID
            // This will be handled by the useEffect that watches aniwatchData
          }
        }
      } catch (error) {
        console.error('Failed to search Aniwatch:', error)
      }
    }
  }, [animepaheData, aniwatchData, showData])

  useEffect(() => {
    if (!hasAniwatchId && !hasAnimepaheSession) return
    setAnimeStream(null)
    setAnimeEpisodeMap({})
    setAnimepaheEpisodeMap({})
  }, [selectedServer, aniwatchId, hasAniwatchId, animepaheSession, hasAnimepaheSession])

  // Stop watching when component unmounts
  useEffect(() => {
    return () => {
      // Call stop watching API when user leaves the watch page
      fetch('/api/activity/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(error => {
        console.error('Failed to stop watching:', error)
      })
    }
  }, [])

  // Setup streaming event listeners on mount
  useEffect(() => {
    setupStreamingEventListeners()
  }, [])

  // Load last watched episode for TV shows on mount
  // Skip for anime content (Aniwatch IDs are strings, not numeric TMDB IDs)
  useEffect(() => {
    if (!shouldUseWatchlist || !params.id) return
    
    const loadLastWatched = async () => {
      try {
        // Only load if params.id is a valid number (TMDB ID)
        const numericId = parseInt(params.id)
        if (isNaN(numericId)) {
          console.log('⏭️ Skipping last watched load for non-numeric ID (anime):', params.id)
          return
        }

        const response = await fetch('/api/watchlist')
        if (response.ok) {
          const data = await response.json()
          const item = data.items.find((i: any) => i.tmdbId === numericId)
          
          if (item && item.lastSeason && item.lastEpisode) {
            console.log('📺 Loading last watched: S', item.lastSeason, 'E', item.lastEpisode)
            setSeason(item.lastSeason)
            setEpisode(item.lastEpisode)
          }
        }
      } catch (error) {
        console.error('Failed to load last watched episode:', error)
      }
    }
    
    loadLastWatched()
  }, [params.id, shouldUseWatchlist]) // Only run once on mount

  // Save last watched episode whenever season/episode changes (TV shows only)
  // Skip for anime content (Aniwatch IDs are strings, not numeric TMDB IDs)
  useEffect(() => {
    if (!shouldUseWatchlist || !params.id || !showData) return
    
    const saveLastWatched = async () => {
      try {
        // Only save if params.id is a valid number (TMDB ID)
        const numericId = parseInt(params.id)
        if (isNaN(numericId)) {
          console.log('⏭️ Skipping watchlist save for non-numeric ID (anime):', params.id)
          return
        }

        const payload = {
          tmdbId: numericId,
          type: type,
          title: showData.name || showData.title || 'Unknown',
          poster: getPosterUrl(showData.poster_path, 'w500'),
          lastSeason: season,
          lastEpisode: episode
        }
        console.log('📤 Saving last watched:', payload)
        
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ Failed to save last watched:', errorData)
          return
        }
        
        console.log('💾 Saved last watched: S', season, 'E', episode)
      } catch (error) {
        console.error('❌ Exception saving last watched episode:', error)
      }
    }
    
    // Add a small delay to avoid too many API calls during rapid changes
    const timeoutId = setTimeout(saveLastWatched, 1000)
    return () => clearTimeout(timeoutId)
  }, [season, episode, shouldUseWatchlist, params.id, showData])

  // Get streaming URL for movies/TV (non-anime)
  useEffect(() => {
    if (!params.id || hasAniwatchId || hasAnimepaheSession) {
      return
    }

    const getStreamingUrlAsync = async () => {
      setStreamingLoading(true)
      setStreamingError(null)

      try {
        console.log('🎬 Getting streaming URL for:', {
          id: params.id,
          type,
          anilistId,
          season,
          episode
        })

        const result = await getStreamingUrl(
          params.id,
          type as 'movie' | 'tv',
          isTv ? season : undefined,
          isTv ? episode : undefined,
          showData,
          {
            autoPlay: true,
            title: true,
            poster: true,
            nextButton: isTv,
            autoNext: isTv,
            episodeSelector: isTv,
            overlay: true
          },
          anilistId || undefined
        )

        if (result) {
          setStreamingResult(result)
          setIsAnime(false)
          console.log('✅ Streaming URL found:', result.url)
          console.log('🔧 Service:', result.service)
        } else {
          setStreamingError('No streaming sources available')
          console.log('❌ No streaming sources found')
        }
      } catch (error) {
        console.error('❌ Error getting streaming URL:', error)
        setStreamingError('Failed to load streaming sources')
      } finally {
        setStreamingLoading(false)
      }
    }

    getStreamingUrlAsync()
  }, [params.id, type, season, episode, showData, anilistId, hasAniwatchId, isTv])

  // Get the current streaming URL
  const embedSrc = useMemo(() => {
    if (!streamingResult || !streamingResult.url) return ''
    // Validate URL to prevent constructor errors
    try {
      new URL(streamingResult.url)
      return streamingResult.url
    } catch (error) {
      console.error('❌ Invalid streaming URL:', streamingResult.url, error)
      return ''
    }
  }, [streamingResult])

  const trackActivity = async (title: string, poster: string) => {
    try {
      const response = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: params.id,
          type: type,
          season: isTv ? season : 1,
          episode: isTv ? episode : 1,
          title: title,
          poster: poster
        })
      })

      if (!response.ok) {
        throw new Error('Activity tracking failed')
      }

      console.log('✅ Activity tracked successfully')
    } catch (error) {
      console.error('❌ Activity tracking error:', error)
    }
  }

  const trackPresence = async () => {
    try {
      const response = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPage: `/watch/${params.id}`,
          pageType: type,
          mediaType: type
        })
      })

      if (!response.ok) {
        throw new Error('Presence tracking failed')
      }
    } catch (error) {
      console.error('❌ Presence tracking error:', error)
    }
  }

  // Track activity when show data changes
  useEffect(() => {
    if (showData) {
      const showKey = `${showData.title}-${params.id}`
      
      try {
        //console.log('🎬 Calling trackActivity with TMDB data: ', showData.poster_path)
        
        trackActivity(showData.name || showData.title, getPosterUrl(showData.poster_path, 'w500') || '')
        setLastTrackedShow(showKey)
      } catch (error) {
        console.log('I AHTE PEOPLE I HATE POEPL:', error) //2025
      }
    }
  }, [showData, params.id, lastTrackedShow])

  const load = async () => {
    try {
      await fetchShowData()
      if (isTv) {
        await fetchEpisodeData()
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const fetchShowData = async () => {
    try {
      // Try to fetch from all servers if available (check URL params and state)
      // Priority: Animepahe > Aniwatch > TMDB
      const animepaheSessionToUse = animepaheSession || animepaheData?.session
      if ((hasAnimepaheSession || animepaheData) && animepaheSessionToUse) {
        const response = await fetch(`/api/animepahe/details?session=${animepaheSessionToUse}`)
        if (!response.ok) throw new Error('Failed to fetch anime data from Animepahe')

        const data = await response.json()
        const anime = data.anime || data.data || data

        // Convert Animepahe format to showData format
        const converted = {
          id: anime.id || null,
          title: anime.title || 'Unknown',
          name: anime.title || 'Unknown',
          poster_path: anime.poster || null,
          backdrop_path: anime.banner || null,
          overview: anime.synopsis || anime.description || '',
          type: anime.type || 'TV',
          status: anime.status || 'Unknown',
          number_of_episodes: anime.episodes || null,
          vote_average: anime.score || 0,
          release_date: anime.year ? `${anime.year}-01-01` : null,
          first_air_date: anime.year ? `${anime.year}-01-01` : null,
          original_language: 'ja',
          genres: []
        }

        setShowData(converted)
        setAnilistId(anime.info?.anilistId ?? null)
        setIsAnime(true)
        setOriginalLang('ja')
        setRelatedAnime([])
        setRecommendedAnime([])
        return // Exit early, don't try Aniwatch or TMDB
      }
      
      const aniwatchIdToUse = aniwatchId || aniwatchData?.id
      if ((hasAniwatchId || aniwatchData) && aniwatchIdToUse) {
        const response = await fetch(`/api/aniwatch/details?id=${aniwatchIdToUse}`)
        if (!response.ok) throw new Error('Failed to fetch anime data from Aniwatch')

        const data = await response.json()
        const converted = convertAniwatchDetailToShowData(data.anime)

        setShowData(converted)
        setAnilistId(data.anime?.info?.anilistId ?? null)
        setIsAnime(true)
        setOriginalLang('ja')
        setRelatedAnime(convertAniwatchListToCards(data.relatedAnimes || []))
        setRecommendedAnime(convertAniwatchListToCards(data.recommendedAnimes || []))
        return // Exit early, don't try TMDB
      }
      
      // Only fetch from TMDB if no anime APIs are available
      if (!hasAniwatchId && !hasAnimepaheSession) {
        const response = await fetch(`/api/tmdb/details?id=${params.id}&type=${type}`)
        if (!response.ok) throw new Error('Failed to fetch show data')
        
        const data = await response.json()
        console.log('📊 TMDB data received:', {
          title: data.title || data.name,
          poster: data.poster_path
        })
        
        setShowData(data)
        setOriginalLang(data.original_language || '')
      }
    } catch (error) {
      console.error('Error fetching show data:', error)
    }
  }

  const fetchEpisodeData = useCallback(async () => {
    try {
      // Check if we should use Animepahe (from URL or state)
      const shouldUseAnimepahe = (hasAnimepaheSession && animepaheSession) || (animepaheData?.session)
      const animepaheSessionToUse = animepaheSession || animepaheData?.session
      
      if (shouldUseAnimepahe && animepaheSessionToUse) {
        console.log('📺 Fetching Animepahe episodes for session:', animepaheSessionToUse)
        const response = await fetch(`/api/animepahe/episodes?session=${animepaheSessionToUse}`)
        if (!response.ok) throw new Error('Failed to fetch Animepahe episodes')

        const data = await response.json()
        console.log('📺 Animepahe episodes response:', data)
        const totalEpisodes = data.totalEpisodes || (data.episodes ? data.episodes.length : 12)

        const episodeMap: Record<number, { session: string; episodeId: string }> = {}
        data.episodes?.forEach((item: any) => {
          // item.episodeId is the episode session ID (from the API response)
          // animepaheSession is the anime session ID (from the URL)
          episodeMap[item.number] = {
            session: animepaheSessionToUse, // Anime session
            episodeId: item.episodeId || item.session // Episode session
          }
          console.log(`📝 Mapped episode ${item.number}:`, {
            animeSession: animepaheSessionToUse,
            episodeSession: item.episodeId || item.session
          })
        })
        console.log('📺 Animepahe episode map:', episodeMap)
        setAnimepaheEpisodeMap(episodeMap)

        const currentEpInfo =
          data.episodes?.find((ep: any) => ep.number === episode) || null

        const currentEp = {
          id: episode,
          episode_number: episode,
          season_number: 1,
          name: currentEpInfo?.title || `Episode ${episode}`,
          overview: '',
          air_date: '',
          nextEpisode: episode < totalEpisodes ? episode + 1 : null,
          prevEpisode: episode > 1 ? episode - 1 : null,
          runtime: 24,
          vote_average: 0,
          still_path: currentEpInfo?.snapshot || null
        }
        setCurrentEpisodeData(currentEp)
        setShowData((prev: any) => {
          if (!prev) return prev
          return {
            ...prev,
            episodes: totalEpisodes,
            number_of_episodes: totalEpisodes
          }
        })
        return
      }

      // Check if we should use Aniwatch (from URL or state)
      const shouldUseAniwatch = (hasAniwatchId && aniwatchId) || (aniwatchData?.id)
      const aniwatchIdToUse = aniwatchId || aniwatchData?.id
      
      // Fetch from Aniwatch if available (check URL params or state)
      if (shouldUseAniwatch && aniwatchIdToUse) {
        const response = await fetch(`/api/aniwatch/episodes?id=${aniwatchIdToUse}`)
        if (!response.ok) throw new Error('Failed to fetch anime episodes')

        const data = await response.json()
        const totalEpisodes =
          data.totalEpisodes || (data.episodes ? data.episodes.length : 12)

        const episodeMap: Record<number, string> = {}
        data.episodes?.forEach((item: any) => {
          episodeMap[item.number] = item.episodeId
        })
        setAnimeEpisodeMap(episodeMap)

        const currentEpInfo =
          data.episodes?.find((ep: any) => ep.number === episode) || null

        const currentEp = {
          id: episode,
          episode_number: episode,
          season_number: 1,
          name: currentEpInfo?.title || `Episode ${episode}`,
          overview: '',
          air_date: '',
          nextEpisode: episode < totalEpisodes ? episode + 1 : null,
          prevEpisode: episode > 1 ? episode - 1 : null,
          runtime: 24,
          vote_average: 0,
          still_path: null
        }
        setCurrentEpisodeData(currentEp)
        setShowData((prev: any) => {
          if (!prev) return prev
          return {
            ...prev,
            episodes: totalEpisodes,
            number_of_episodes: totalEpisodes
          }
        })
        return // Exit early, don't try TMDB
      }

      // Only fetch from TMDB if no anime APIs are available
      if (!hasAniwatchId && !hasAnimepaheSession) {
        const response = await fetch(`/api/tmdb/episodes?id=${params.id}&season=${season}`)
        if (!response.ok) throw new Error('Failed to fetch episode data')

        const data = await response.json()
        const currentEp = data.episodes.find((ep: any) => ep.episode_number === episode)

        if (currentEp) {
          setCurrentEpisodeData({
            ...currentEp,
            nextEpisode:
              currentEp.episode_number < data.episodes.length
                ? currentEp.episode_number + 1
                : null,
            prevEpisode: currentEp.episode_number > 1 ? currentEp.episode_number - 1 : null
          })
        }
      }
    } catch (error) {
      console.error('Error fetching episode data:', error)
    }
  }, [hasAniwatchId, aniwatchId, aniwatchData, hasAnimepaheSession, animepaheSession, animepaheData, episode, season, params.id])

  const loadAnimeStream = useCallback(
    async (
      episodeNumber: number,
      options?: { category?: 'sub' | 'dub' | 'raw'; serverName?: string }
    ) => {
      if (!hasAniwatchId || !aniwatchId) return
      const episodeKey = animeEpisodeMap[episodeNumber]
      if (!episodeKey) {
        console.warn('No Aniwatch episode id for episode', episodeNumber)
        return
      }

      setStreamingLoading(true)
      setStreamingError(null)
      setAnimeStream(null)

      try {
        const serverResponse = await fetch(
          `/api/aniwatch/episode/servers?episodeId=${encodeURIComponent(episodeKey)}`
        )
        if (!serverResponse.ok) {
          throw new Error('Failed to load anime streaming servers')
        }
        const serverJson = await serverResponse.json()
        console.log('🔍 Server response:', JSON.stringify(serverJson, null, 2))

        const serverData = serverJson.data || serverJson
        if (!serverData || (typeof serverData === 'object' && Object.keys(serverData).length === 0)) {
          console.error('❌ Empty server data:', serverData)
          throw new Error('No server data returned from Aniwatch API')
        }

        const categoryPriority: Array<'sub' | 'dub' | 'raw'> = ['sub', 'dub', 'raw']
        const initialCategory =
          options?.category ||
          categoryPriority.find((cat) => (serverData[cat] || []).length > 0) ||
          'sub'

        const preferredCategory = options?.category
        let overrideServer = options?.serverName || null

        const orderedCategories: Array<'sub' | 'dub' | 'raw'> = []
        const seen = new Set<string>()
        ;[preferredCategory || initialCategory, ...categoryPriority].forEach((cat) => {
          if (!seen.has(cat) && (serverData[cat] || []).length > 0) {
            seen.add(cat)
            orderedCategories.push(cat)
          }
        })

        const attempted: string[] = []

        const tryFetchSources = async (serverName: string, category: 'sub' | 'dub' | 'raw') => {
          const sourceResponse = await fetch(
            `/api/aniwatch/episode/sources?episodeId=${encodeURIComponent(
              episodeKey
            )}&server=${encodeURIComponent(serverName)}&category=${category}`
          )

          if (!sourceResponse.ok) {
            const errorPayload = await sourceResponse.text()
            throw new Error(
              `${serverName.toUpperCase()} (${category}): ${sourceResponse.status} ${errorPayload}`
            )
          }

          const sourceJson = await sourceResponse.json()
          const sources = sourceJson?.sources || []
          const tracks = sourceJson?.tracks || []
          const streamSource =
            sources.find(
              (item: any) =>
                (item.proxyUrl || item.url) &&
                (item.isM3U8 || item.type === 'hls' || item.url?.includes('.m3u8'))
            ) || sources[0]

          if (!streamSource) {
            throw new Error(`${serverName.toUpperCase()} (${category}): No playable source returned`)
          }

          const streamUrl = streamSource.proxyUrl || streamSource.url
          console.log('🎬 Aniwatch M3U8 Link:')
          console.log('  Original URL:', streamSource.url)
          console.log('  Proxy URL:', streamSource.proxyUrl)
          console.log('  Using URL:', streamUrl)

          return {
            url: streamUrl,
            tracks: tracks
              .map((track: any, index: number) => ({
                src: track.proxyUrl || track.url,
                label:
                  track.lang === 'thumbnails'
                    ? 'Preview'
                    : track.lang || `Subtitle ${index + 1}`,
                kind: track.lang === 'thumbnails' ? 'metadata' : 'subtitles',
                lang:
                  track.lang && track.lang !== 'thumbnails'
                    ? track.lang.slice(0, 2).toLowerCase()
                    : undefined
              }))
              .filter((track: any) => track.src),
            serverName,
            category
          }
        }

        for (const category of orderedCategories) {
          const servers: Array<{ serverName: string }> = serverData[category] || []
          for (const serverEntry of servers) {
            const serverName = overrideServer || serverEntry.serverName
            try {
              const stream = await tryFetchSources(serverName, category)
              setAnimeStream(stream)
              setIsAnime(true)
              setStreamingError(null)
              return
            } catch (attemptError) {
              console.warn('Anime server attempt failed:', attemptError)
              attempted.push(
                attemptError instanceof Error ? attemptError.message : String(attemptError)
              )
              overrideServer = null
            }
          }
        }

        throw new Error(
          attempted.length
            ? `All anime servers failed:\n${attempted.join('\n')}`
            : 'No playable anime servers available right now.'
        )
      } catch (error) {
        console.error('Failed to load anime stream:', error)
        setStreamingError(
          error instanceof Error
            ? error.message
            : 'Unable to load anime stream right now. Please try again or switch episodes.'
        )
      } finally {
        setStreamingLoading(false)
      }
    },
    [hasAniwatchId, aniwatchId, animeEpisodeMap]
  )

  const loadAnimepaheStream = useCallback(
    async (episodeNumber: number) => {
      const sessionToUse = animepaheSession || animepaheData?.session
      if (!sessionToUse) {
        console.log('🚫 Skipping Animepahe stream load: no session')
        return
      }
      const episodeData = animepaheEpisodeMap[episodeNumber]
      if (!episodeData) {
        console.warn('⚠️ No Animepahe episode data for episode', episodeNumber, 'Map:', animepaheEpisodeMap)
        return
      }

      console.log('🎬 Loading Animepahe stream for episode', episodeNumber, 'Data:', episodeData)
      setStreamingLoading(true)
      setStreamingError(null)
      setAnimeStream(null)

      try {
        const apiUrl = `/api/animepahe/episode/sources?session=${encodeURIComponent(episodeData.session)}&episodeId=${encodeURIComponent(episodeData.episodeId)}`
        console.log('🌐 Fetching Animepahe sources from:', apiUrl)
        const sourceResponse = await fetch(apiUrl)

        if (!sourceResponse.ok) {
          const errorText = await sourceResponse.text()
          console.error('❌ Animepahe sources API error:', sourceResponse.status, errorText)
          throw new Error(`Failed to load Animepahe streaming sources: ${sourceResponse.status} ${errorText}`)
        }

        const sourceJson = await sourceResponse.json()
        console.log('📦 Animepahe sources response:', sourceJson)
        const sources = sourceJson?.sources || []
        const tracks = sourceJson?.tracks || []

        if (sources.length === 0) {
          throw new Error('No sources returned from Animepahe API')
        }

        // Find the best quality m3u8 source (prefer 1080p > 720p > 360p)
        const qualityOrder = ['1080', '720', '360', 'auto']
        const streamSource = qualityOrder
          .map((quality) =>
            sources.find(
              (item: any) =>
                item.isM3U8 &&
                (item.quality === quality || item.resolution === quality)
            )
          )
          .find((source) => source) || sources.find((item: any) => item.isM3U8) || sources[0]

        if (!streamSource) {
          console.error('❌ No playable source found. Available sources:', sources)
          throw new Error('No playable source returned from Animepahe')
        }

              console.log('✅ Selected stream source:', streamSource)

               // Use proxy URL for vault-*.owocdn.top streams to handle referer requirements
               // The Cloudflare Worker sets Referer: https://kwik.cx/ for key/segment requests
               let streamUrl = streamSource.proxyUrl || streamSource.url
               
               // Ensure URL is absolute for Vidstack
               if (streamUrl && !streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
                 // Convert relative URL to absolute
                 streamUrl = `${window.location.origin}${streamUrl}`
                 console.warn('⚠️ Converted relative URL to absolute:', streamUrl)
               }
               
               console.log('🎬 Animepahe M3U8 Link:')
               console.log('  Original URL:', streamSource.url)
               console.log('  Proxy URL:', streamSource.proxyUrl)
               console.log('  Using URL (absolute):', streamUrl)
              if (!streamSource.proxyUrl && streamSource.url.includes('vault-') && streamSource.url.includes('owocdn.top')) {
                console.warn('⚠️ Vault stream without proxy - key requests may fail with 403')
              }
        
        setAnimeStream({
          url: streamUrl,
          tracks: tracks.map((track: any, index: number) => ({
            src: track.proxyUrl || track.url || track.src,
            label: track.label || `Subtitle ${index + 1}`,
            kind: track.kind || 'subtitles',
            lang: track.lang || track.srcLang
          })).filter((track: any) => track.src),
          serverName: 'animepahe',
          category: 'sub'
        })
        setIsAnime(true)
        setStreamingError(null)
      } catch (error) {
        console.error('Failed to load Animepahe stream:', error)
        setStreamingError(
          error instanceof Error
            ? error.message
            : 'Unable to load Animepahe stream right now. Please try again or switch episodes.'
        )
      } finally {
        setStreamingLoading(false)
      }
    },
    [hasAnimepaheSession, animepaheSession, animepaheData, animepaheEpisodeMap]
  )


  useEffect(() => {
    console.log('🔄 Stream loading effect triggered:', {
      selectedServer,
      useAnimepahe,
      useAniwatch,
      hasAnimepaheSession,
      hasAniwatchId,
      animepaheData: !!animepaheData,
      aniwatchData: !!aniwatchData,
      episode,
      animepaheEpisodeMapKeys: Object.keys(animepaheEpisodeMap),
      animeEpisodeMapKeys: Object.keys(animeEpisodeMap)
    })
    if (useAnimepahe && (hasAnimepaheSession || animepaheData)) {
      // If the requested episode doesn't exist, use the first available episode (highest number)
      let episodeToLoad = episode
      if (!animepaheEpisodeMap[episode]) {
        const availableEpisodes = Object.keys(animepaheEpisodeMap).map(Number).sort((a, b) => b - a)
        if (availableEpisodes.length > 0) {
          episodeToLoad = availableEpisodes[0] // Use the highest episode number available
          // Only adjust once to prevent infinite loop
          if (episodeAdjustmentRef.current !== episodeToLoad && episodeAdjustmentRef.current !== episode) {
            console.log(`⚠️ Episode ${episode} not found in map. Using first available episode: ${episodeToLoad}`)
            episodeAdjustmentRef.current = episodeToLoad
            // Update episode state, but prevent the effect from running again immediately
            setEpisode(episodeToLoad)
            return // Exit early - the effect will run again with the new episode number
          } else if (episodeAdjustmentRef.current === episodeToLoad) {
            // Already adjusted, just load the stream
            episodeToLoad = episodeAdjustmentRef.current
          }
        } else {
          console.log('⏳ Waiting for episode map to populate for episode', episode)
          return
        }
      } else {
        // Episode exists in map, reset the adjustment ref
        episodeAdjustmentRef.current = null
      }
      console.log('▶️ Loading Animepahe stream for episode', episodeToLoad)
      loadAnimepaheStream(episodeToLoad)
    } else if (useAniwatch && (hasAniwatchId || aniwatchData)) {
      if (!animeEpisodeMap[episode]) {
        console.log('⏳ Waiting for Aniwatch episode map to populate for episode', episode)
        return
      }
      loadAnimeStream(episode)
    }
  }, [selectedServer, useAnimepahe, useAniwatch, hasAnimepaheSession, hasAniwatchId, animepaheData, aniwatchData, animepaheEpisodeMap, animeEpisodeMap, episode, loadAnimepaheStream, loadAnimeStream])

  const report = async () => {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Streaming Issue',
          details: `Streaming failed for ${type} ${params.id}`,
          tmdbId: params.id,
          type: type
        })
      })

      if (!response.ok) throw new Error('Report failed')
      showSuccess('Issue reported successfully')
    } catch (error) {
      console.error('Error reporting issue:', error)
      showError('Failed to report issue')
    }
  }

  // Load data on mount and when server data changes
  useEffect(() => {
    load()
  }, [params.id, type, anilistId, aniwatchData, animepaheData])

  // Load episode data when season/episode changes
  useEffect(() => {
    if (!isTv || !params.id) return // Skip if not TV show
    
    // For anime, use fetchEpisodeData which handles Aniwatch and Animepahe data
    // For regular TV shows, fetch from TMDB
    if (hasAniwatchId || hasAnimepaheSession) {
      fetchEpisodeData()
    } else {
      // Only call TMDB if params.id is numeric (TMDB ID)
      const numericId = parseInt(params.id)
      if (isNaN(numericId)) {
        console.log('⏭️ Skipping TMDB episode fetch for non-numeric ID:', params.id)
        return
      }

      const loadEpisodeData = async () => {
        try {
          console.log(`📺 Fetching episode data: S${season} E${episode}`)
          const response = await fetch(`/api/tmdb/episodes?id=${numericId}&season=${season}`)
          if (!response.ok) throw new Error('Failed to fetch episode data')
          
          const data = await response.json()
          const currentEp = data.episodes.find((ep: any) => ep.episode_number === episode)
          
          if (currentEp) {
            console.log(`✅ Found episode data: ${currentEp.name}`)
            setCurrentEpisodeData({
              ...currentEp,
              nextEpisode: currentEp.episode_number < data.episodes.length ? currentEp.episode_number + 1 : null,
              prevEpisode: currentEp.episode_number > 1 ? currentEp.episode_number - 1 : null
            })
          } else {
            console.log(`⚠️ Episode not found: S${season} E${episode}`)
          }
        } catch (error) {
          console.error('Error fetching episode data:', error)
        }
      }
      
      loadEpisodeData()
    }
  }, [season, episode, params.id, isTv, hasAniwatchId, hasAnimepaheSession, fetchEpisodeData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="flex">
        <div className="w-16 bg-neutral-900/70"></div>
        <div className="flex-1 p-6">
          {/* Popup Blocker Banner */}
          {showBanner && (
            <PopupBlockerBanner onClose={() => setShowBanner(false)} />
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Streaming Status - Above Player */}
              <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    {/* Server Toggle - Show when viewing anime (any server available) */}
                    {(hasAniwatchId || hasAnimepaheSession || isAnime) && (
                      <div className="flex items-center gap-2">
                        <label className="text-white text-xs">Server:</label>
                        <div className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1 border border-neutral-700">
                          <button
                            onClick={() => handleServerSwitch('aniwatch')}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                              selectedServer === 'aniwatch'
                                ? 'bg-blue-600 text-white'
                                : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                            }`}
                          >
                            Aniwatch
                            {!hasAniwatchId && !aniwatchData && (
                              <span className="ml-1 text-[10px] opacity-70">(searching...)</span>
                            )}
                          </button>
                          <button
                            onClick={() => handleServerSwitch('animepahe')}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                              selectedServer === 'animepahe'
                                ? 'bg-blue-600 text-white'
                                : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                            }`}
                          >
                            Animepahe
                            {!hasAnimepaheSession && !animepaheData && (
                              <span className="ml-1 text-[10px] opacity-70">(searching...)</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    <label className="text-white">Streaming Service</label>
                    {streamingLoading && (
                      <div className="flex items-center gap-2 text-blue-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                        <span>Loading...</span>
                      </div>
                    )}
                    {!hasAniwatchId && streamingResult && (
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          streamingResult.service === 'vidfast'
                            ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                            : 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                        }`}>
                          Reminiscent.fm Player
                        </span>
                        {streamingResult.fallbackUsed && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-600/30">
                            Fallback
                          </span>
                        )}
                      </div>
                    )}
                    {(useAniwatch || useAnimepahe) && animeStream && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2 py-1 rounded font-medium bg-purple-600/20 text-purple-300 border border-purple-500/40">
                          🎌 Direct {selectedServer === 'aniwatch' ? 'Aniwatch' : 'Animepahe'} Stream
                        </span>
                        <span className="px-2 py-1 rounded font-medium bg-blue-600/20 text-blue-300 border border-blue-500/40">
                          Server: {animeStream.serverName.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 rounded font-medium bg-neutral-700/40 text-neutral-200 border border-neutral-500/50">
                          {animeStream.category.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {streamingError && (
                      <div className="text-red-400 text-xs">
                        {streamingError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Video Player */}
              <VideoPlayer
                mode={useAniwatch || useAnimepahe ? 'hls' : 'embed'}
                src={!(useAniwatch || useAnimepahe) ? embedSrc : undefined}
                hlsSrc={(useAniwatch || useAnimepahe) ? animeStream?.url : undefined}
                hlsTracks={(useAniwatch || useAnimepahe) ? animeStream?.tracks : undefined}
                poster={
                  showData?.backdrop_path
                    ? getPosterUrl(showData.backdrop_path, 'w1280') || undefined
                    : showData?.poster_path
                    ? getPosterUrl(showData.poster_path, 'w780') || undefined
                    : undefined
                }
                title={showData?.title || showData?.name || 'Loading...'}
                blurPlayer={blurPlayer}
                onError={() => {
                  console.log('🚨 Video player error - likely codec incompatibility')
                  // Clear the stream to stop retries
                  setAnimeStream(null)
                  
                  // Automatically switch to the other server if available
                  if (useAnimepahe && aniwatchData?.id) {
                    console.log('🔄 Animepahe codec error, automatically switching to Aniwatch...')
                    setSelectedServer('aniwatch')
                    setStreamingError('Animepahe stream has codec compatibility issues. Switched to Aniwatch.')
                  } else if (useAniwatch && animepaheData?.session) {
                    console.log('🔄 Aniwatch error, attempting to switch to Animepahe...')
                    setSelectedServer('animepahe')
                    setStreamingError('Aniwatch stream failed. Switched to Animepahe.')
                  } else {
                    setStreamingError('Streaming service unavailable. The video codec may not be supported by your browser. Please try a different episode or server.')
                  }
                }}
                onLoad={() => {
                  console.log('✅ Video player loaded successfully')
                  setStreamingError(null)
                }}
                onPlayerStart={() => {
                  setBlurPlayer(false)
                  setUserInteracted(true)
                }}
                onNextEpisode={() => {
                  if (isTv && currentEpisodeData?.nextEpisode) {
                    setEpisode(currentEpisodeData.nextEpisode)
                  }
                }}
                onPrevEpisode={() => {
                  if (isTv && currentEpisodeData?.prevEpisode) {
                    setEpisode(currentEpisodeData.prevEpisode)
                  }
                }}
                hasNextEpisode={isTv && !!currentEpisodeData?.nextEpisode}
                hasPrevEpisode={isTv && !!currentEpisodeData?.prevEpisode}
              />

              {/* Error Modal */}
              {streamingError && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-red-400 text-lg">⚠️</div>
                    <div>
                      <h3 className="text-red-400 font-medium">Streaming Error</h3>
                      <p className="text-red-300 text-sm mt-1">{streamingError}</p>
                    </div>
                    <button
                      onClick={report}
                      className="ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    >
                      Report Issue
                    </button>
                  </div>
                </div>
              )}

              {/* Episode Details Window */}
              {isTv && currentEpisodeData && (
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-6">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {episode}. {currentEpisodeData.name}
                    </h2>
                    <p className="text-neutral-400 text-sm">
                      {currentEpisodeData.air_date ? new Date(currentEpisodeData.air_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'Release date not available'}
                    </p>
                  </div>
                  
                  {currentEpisodeData.overview && (
                    <div className="text-neutral-300 leading-relaxed">
                      <p>{currentEpisodeData.overview}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 mt-4 text-sm text-neutral-400">
                    {currentEpisodeData.runtime && (
                      <span>Duration: {Math.floor(currentEpisodeData.runtime / 60)}h {currentEpisodeData.runtime % 60}m</span>
                    )}
                    {currentEpisodeData.vote_average > 0 && (
                      <span>Rating: {currentEpisodeData.vote_average.toFixed(1)}/10</span>
                    )}
                  </div>
                </div>
              )}

              {/* Show Details - Show for all content, including anime */}
              {showData && (
                <ShowDetails
                  tmdbId={params.id}
                  type={type as 'movie' | 'tv'}
                  currentEpisode={isTv ? episode : undefined}
                  currentSeason={isTv ? season : undefined}
                  isAnime={hasAniwatchId || hasAnilistId}
                  showData={showData}
                />
              )}
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Episode List for TV Shows - Show for anime too, but with AniList data */}
              {isTv && (
                <EpisodeList
                  tmdbId={hasAniwatchId || hasAnimepaheSession ? (aniwatchId || animepaheSession || params.id) : params.id}
                  season={season}
                  currentEpisode={episode}
                  onEpisodeSelect={setEpisode}
                  onSeasonChange={setSeason}
                  onBlurToggle={setBlurPlayer}
                  blurPlayer={blurPlayer}
                  isAnime={hasAniwatchId || hasAnimepaheSession}
                  totalEpisodes={showData?.episodes || showData?.number_of_episodes}
                  aniwatchId={hasAniwatchId ? aniwatchId : undefined}
                />
              )}

              {/* Related Content - Show for all content */}
              <Related
                id={params.id}
                type={type as 'movie' | 'tv'}
                items={hasAniwatchId ? relatedAnime : undefined}
                skipFetch={hasAniwatchId || hasAnimepaheSession}
              />
              
              {/* Recommendations - Show for all content */}
              <Recommendations
                id={params.id}
                type={type as 'movie' | 'tv'}
                items={hasAniwatchId ? recommendedAnime : undefined}
                skipFetch={hasAniwatchId || hasAnimepaheSession}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}