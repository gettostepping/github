'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MediaPlayer, MediaProvider, type MediaProviderAdapter } from '@vidstack/react'
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default'
import { isHLSProvider } from '@vidstack/react'
import '@vidstack/react/player/styles/base.css'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPause, faRotateRight, faTrash, faFileDownload, faPauseCircle, faPlayCircle, faSearch } from '@fortawesome/free-solid-svg-icons'

interface AdminData {
  isDeveloper: boolean
  isOwner: boolean
}

interface LogEntry {
  timestamp: number
  message: string
  type?: 'info' | 'error' | 'success' | 'warning'
}

export default function HLSPlayerTestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [hlsUrl, setHlsUrl] = useState('')
  const [loadedUrl, setLoadedUrl] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [logPaused, setLogPaused] = useState(false)
  const [pendingLogs, setPendingLogs] = useState<LogEntry[]>([])
  const mediaPlayerRef = useRef<any>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const lastLogTime = useRef<Map<string, number>>(new Map())
  
  // Anime selection state
  const [animeSearchQuery, setAnimeSearchQuery] = useState('')
  const [animeSearchResults, setAnimeSearchResults] = useState<any[]>([])
  const [selectedAnime, setSelectedAnime] = useState<any>(null)
  const [selectedEpisode, setSelectedEpisode] = useState(1)
  const [animeEpisodes, setAnimeEpisodes] = useState<any[]>([])
  const [loadingAnime, setLoadingAnime] = useState(false)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)
  const [loadingStream, setLoadingStream] = useState(false)
  const [availableSources, setAvailableSources] = useState<any[]>([]) // Store all sources for quality selection
  const [currentQuality, setCurrentQuality] = useState<string>('') // Current quality (1080, 720, 360, auto)
  const [isDub, setIsDub] = useState(false) // Dub/sub toggle (false = sub, true = dub) - defaults to sub
  const [selectedProvider, setSelectedProvider] = useState<'animepahe' | 'animekai'>('animepahe') // Provider toggle (defaults to AnimePahe)
  const [megaUpRefererUrl, setMegaUpRefererUrl] = useState<string | null>(null) // Store MegaUp /e/ URL for referer header
  

  // Check developer/owner access
  useEffect(() => {
    async function checkAccess() {
      if (status === 'authenticated') {
        try {
          const res = await fetch('/api/admin/check')
          if (res.ok) {
            const data = await res.json()
            setAdminData(data)
            // Only allow developers or owners
            if (data.isDeveloper || data.isOwner) {
              setCheckingAccess(false)
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
  }, [status])

  // Pre-warm search API on page load (non-blocking)
  useEffect(() => {
    if (status === 'authenticated' && !checkingAccess) {
      // Pre-warm by making a lightweight search (non-blocking, silent)
      const preWarmSearch = async () => {
        try {
          // Make a quick search to warm up the Consumet library connection
          await fetch('/api/consumet/search?q=a', {
            method: 'GET'
          })
          addLog('🔥 Search API pre-warmed', 'success')
        } catch (error) {
          // Silently fail - pre-warming is best effort
        }
      }
      
      // Delay pre-warm slightly to not interfere with page load
      const timer = setTimeout(preWarmSearch, 1000)
      return () => clearTimeout(timer)
    }
  }, [status, checkingAccess])

  // Auto-scroll logs to bottom (only when not paused)
  useEffect(() => {
    if (logContainerRef.current && !logPaused) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, logPaused])

  const addLog = (message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info', throttleMs: number = 0) => {
    const timestamp = Date.now()
    
    // Throttle repetitive messages
    if (throttleMs > 0) {
      const lastTime = lastLogTime.current.get(message) || 0
      if (timestamp - lastTime < throttleMs) {
        return // Skip this log if it's too soon
      }
      lastLogTime.current.set(message, timestamp)
    }
    
    const baseTimestamp = logs[0]?.timestamp || timestamp
    const elapsed = ((timestamp - baseTimestamp) / 1000).toFixed(3)
    const logEntry: LogEntry = { timestamp, message: `${elapsed} | ${message}`, type }
    
    if (logPaused) {
      // Store in pending logs when paused
      setPendingLogs(prev => [...prev, logEntry])
    } else {
      // Add directly to logs when not paused
      setLogs(prev => [...prev, logEntry])
    }
  }
  
  const handleToggleLogPause = () => {
    if (logPaused) {
      // Resuming - add all pending logs
      const pendingCount = pendingLogs.length
      setLogPaused(false)
      if (pendingLogs.length > 0) {
        const timestamp = Date.now()
        const baseTimestamp = logs[0]?.timestamp || timestamp
        const elapsed = ((timestamp - baseTimestamp) / 1000).toFixed(3)
        const resumeMessage: LogEntry = { timestamp, message: `${elapsed} | Log resumed (${pendingCount} messages queued)`, type: 'success' }
        setLogs(prev => [...prev, ...pendingLogs, resumeMessage])
        setPendingLogs([])
      } else {
        const timestamp = Date.now()
        const baseTimestamp = logs[0]?.timestamp || timestamp
        const elapsed = ((timestamp - baseTimestamp) / 1000).toFixed(3)
        setLogs(prev => [...prev, { timestamp, message: `${elapsed} | Log resumed`, type: 'success' }])
      }
    } else {
      // Pausing - add pause message directly (before setting paused state)
      const timestamp = Date.now()
      const baseTimestamp = logs[0]?.timestamp || timestamp
      const elapsed = ((timestamp - baseTimestamp) / 1000).toFixed(3)
      setLogs(prev => [...prev, { timestamp, message: `${elapsed} | Log paused - new messages will be queued`, type: 'warning' }])
      setLogPaused(true)
    }
  }

  const handleLoad = () => {
    if (!hlsUrl.trim()) {
      addLog('Please enter a valid HLS URL', 'error')
      return
    }
    setLoadedUrl(hlsUrl)
    addLog(`Loading HLS stream: ${hlsUrl}`, 'info')
    addLog('HLS: Initializing player...', 'info')
  }

  const handlePlay = () => {
    if (mediaPlayerRef.current) {
      const player = mediaPlayerRef.current
      // Try different ways to access the play method
      if (player.play) {
        player.play()
      } else if (player.media?.play) {
        player.media.play()
      } else if (player.querySelector?.('video')?.play) {
        player.querySelector('video')?.play()
      }
      setIsPlaying(true)
      addLog('Player: Play requested', 'info')
    }
  }

  const handlePause = () => {
    if (mediaPlayerRef.current) {
      const player = mediaPlayerRef.current
      // Try different ways to access the pause method
      if (player.pause) {
        player.pause()
      } else if (player.media?.pause) {
        player.media.pause()
      } else if (player.querySelector?.('video')?.pause) {
        player.querySelector('video')?.pause()
      }
      setIsPlaying(false)
      addLog('Player: Pause requested', 'info')
    }
  }

  const handleReload = () => {
    if (loadedUrl) {
      addLog('Player: Reloading stream...', 'info')
      setLoadedUrl('')
      setTimeout(() => {
        setLoadedUrl(hlsUrl)
        addLog('Player: Stream reloaded', 'success')
      }, 100)
    }
  }

  const handleClearLog = () => {
    setLogs([])
    setPendingLogs([])
    setLogPaused(false)
    addLog('Log cleared', 'info')
  }

  const handleFetchManifest = async () => {
    if (!loadedUrl) {
      addLog('No stream loaded. Please load a stream first.', 'warning')
      return
    }

    try {
      addLog(`Fetching manifest: ${loadedUrl}`, 'info')
      const response = await fetch(loadedUrl, { method: 'GET' })
      if (response.ok) {
        const text = await response.text()
        addLog('Manifest fetched successfully', 'success')
        addLog(`Manifest content (first 500 chars):\n${text.substring(0, 500)}`, 'info')
      } else {
        addLog(`Failed to fetch manifest: ${response.status} ${response.statusText}`, 'error')
      }
    } catch (error: any) {
      addLog(`Error fetching manifest: ${error.message}`, 'error')
    }
  }

  // Anime search handler
  const handleAnimeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!animeSearchQuery.trim()) {
      setAnimeSearchResults([])
      return
    }

    setLoadingAnime(true)
    const searchStartTime = Date.now()
    let retryCount = 0
    const maxRetries = 1
    
    while (retryCount <= maxRetries) {
      try {
        addLog(`Searching anime: ${animeSearchQuery}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`, 'info')
        const response = await fetch(`/api/consumet/search?q=${encodeURIComponent(animeSearchQuery)}`)
        
        if (response.ok) {
          const data = await response.json()
          const results = data.results || []
          
          // Log full result structure for debugging
          if (results.length > 0) {
            const firstResult = results[0]
            addLog(`Sample result keys: ${Object.keys(firstResult).join(', ')}`, 'info')
            addLog(`Sample result - Image: ${firstResult.image || firstResult.cover || firstResult.poster || 'MISSING'}`, 'info')
            addLog(`Full sample result: ${JSON.stringify(firstResult, null, 2).substring(0, 500)}`, 'info')
          }
          
        setAnimeSearchResults(results)
        const searchTime = Date.now() - searchStartTime
        addLog(`Found ${results.length} anime results${retryCount > 0 ? ` (after retry)` : ''}`, 'success')
        
        // Pre-warm anime info API for first result (non-blocking)
        if (results.length > 0) {
          const firstAnime = results[0]
          preWarmAnimeInfo(firstAnime.id)
        }
        
        break // Success, exit retry loop
        } else if (retryCount < maxRetries && (response.status === 502 || response.status === 503)) {
          // Retry on 502/503
          retryCount++
          addLog(`🔄 Search failed with ${response.status}, retrying (attempt ${retryCount}/${maxRetries})...`, 'warning')
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        } else {
          addLog(`Failed to search anime: ${response.status}`, 'error')
          break
        }
      } catch (error: any) {
        // Retry on network errors
        if (retryCount < maxRetries && (error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('ECONNRESET'))) {
          retryCount++
          addLog(`🔄 Search error, retrying (attempt ${retryCount}/${maxRetries}): ${error.message}`, 'warning')
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        } else {
          addLog(`Error searching anime: ${error.message}`, 'error')
          break
        }
      }
    }
    
    setLoadingAnime(false)
  }

  // Helper function to extract year from various date formats
  const extractYear = (dateValue: any): number | null => {
    if (!dateValue) return null
    
    // If it's already a number and looks like a year
    if (typeof dateValue === 'number') {
      if (dateValue >= 1900 && dateValue <= new Date().getFullYear() + 1) {
        return dateValue
      }
      return null
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      // Try to extract year from string (e.g., "2004", "2004-10-05", "Oct 5, 2004")
      const yearMatch = dateValue.match(/\b(19|20)\d{2}\b/)
      if (yearMatch) {
        const year = parseInt(yearMatch[0], 10)
        if (year >= 1900 && year <= new Date().getFullYear() + 1) {
          return year
        }
      }
      
      // Try Date parsing as fallback
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        if (year >= 1900 && year <= new Date().getFullYear() + 1) {
          return year
        }
      }
    }
    
    return null
  }

  // Handle anime selection
  const handleAnimeSelect = async (anime: any) => {
    setSelectedAnime(anime)
    setSelectedEpisode(1)
    setAnimeEpisodes([])
    setLoadingEpisodes(true)
    addLog(`Loading anime: ${anime.title}`, 'info')

    try {
      // Fetch anime info and episodes using the new API route with auto-retry
      let response: Response | null = null
      let retryCount = 0
      const maxRetries = 1
      
      while (retryCount <= maxRetries) {
        try {
          response = await fetch(`/api/consumet/anime?animeId=${anime.id}`)
          
          if (response.ok) {
            break // Success, exit retry loop
          } else if (retryCount < maxRetries && (response.status === 502 || response.status === 503)) {
            // Retry on 502/503
            retryCount++
            addLog(`🔄 Anime info failed with ${response.status}, retrying (attempt ${retryCount}/${maxRetries})...`, 'warning')
            await new Promise(resolve => setTimeout(resolve, 500))
            continue
          } else {
            throw new Error(`Failed to load anime info: ${response.status}`)
          }
        } catch (error: any) {
          // Retry on network errors
          if (retryCount < maxRetries && (error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('ECONNRESET'))) {
            retryCount++
            addLog(`🔄 Anime info error, retrying (attempt ${retryCount}/${maxRetries}): ${error.message}`, 'warning')
            await new Promise(resolve => setTimeout(resolve, 500))
            continue
          } else {
            throw error
          }
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`Failed to load anime info: ${response?.status || 'unknown'}`)
      }
      
      const data = await response.json()
      let episodes = data.episodes || []
      
      // Log episode structure to help identify dub/sub episodes
      if (episodes.length > 0) {
        const sampleEp = episodes[0]
        addLog(`Sample episode keys: ${Object.keys(sampleEp).join(', ')}`, 'info')
        addLog(`Sample episode: number=${sampleEp.number}, title=${sampleEp.title || 'N/A'}, id=${sampleEp.id?.substring(0, 50) || 'N/A'}`, 'info')
        
        // Check if episodes have dub indicators
        const dubEpisodes = episodes.filter((ep: any) => {
          const title = (ep.title || '').toLowerCase()
          const id = (ep.id || '').toLowerCase()
          return title.includes('dub') || title.includes('english') || id.includes('dub')
        })
        if (dubEpisodes.length > 0) {
          addLog(`Found ${dubEpisodes.length} potential dub episodes`, 'info')
        }
      }
      
      // Normalize episode numbers for new seasons
      // If episodes start at a number > 1 and count is a typical season length (12, 13, 24, etc.),
      // normalize them to start from 1 (for Season 2, 3, etc.)
      if (episodes.length > 0) {
        const firstEpisodeNumber = episodes[0]?.number
        const lastEpisodeNumber = episodes[episodes.length - 1]?.number
        const episodeCount = episodes.length
        
        // Check if this looks like a new season (starts > 1, typical season length)
        const isTypicalSeasonLength = episodeCount === 12 || episodeCount === 13 || episodeCount === 24 || episodeCount === 25 || episodeCount === 26
        const isLikelyNewSeason = firstEpisodeNumber > 1 && isTypicalSeasonLength
        
        // Also check if title suggests it's a new season
        const titleSuggestsNewSeason = anime.title?.toLowerCase().includes('season 2') || 
                                      anime.title?.toLowerCase().includes('season 3') ||
                                      anime.title?.toLowerCase().includes('2nd season') ||
                                      anime.title?.toLowerCase().includes('3rd season')
        
        if (isLikelyNewSeason || titleSuggestsNewSeason) {
          // Normalize episode numbers to start from 1
          const offset = firstEpisodeNumber - 1
          episodes = episodes.map((ep: any) => ({
            ...ep,
            number: ep.number - offset,
            originalNumber: ep.number // Keep original for API calls
          }))
          addLog(`Normalized episode numbers from ${firstEpisodeNumber}-${lastEpisodeNumber} to 1-${episodes.length} (new season detected)`, 'info')
        }
      }
      
      // Extract year using helper function
      const year = data.year || anime.year || extractYear(data.releaseDate) || extractYear(anime.releaseDate)
      
      // Merge additional data from anime info
      const updatedAnime = {
        ...anime,
        image: data.image || data.cover || data.poster || anime.image,
        description: data.description || anime.description,
        genres: data.genres || anime.genres || [],
        status: data.status || anime.status,
        rating: data.rating || data.score || anime.rating || anime.score,
        totalEpisodes: data.totalEpisodes || episodes.length || anime.totalEpisodes,
        year: year
      }
      setSelectedAnime(updatedAnime)
      
      // Also update in search results for future reference
      setAnimeSearchResults(prev => 
        prev.map(item => 
          item.id === anime.id ? updatedAnime : item
        )
      )
      
      setAnimeEpisodes(episodes)
      addLog(`Loaded ${episodes.length} episodes`, 'success')
      
      // Pre-warm the API if it's cold (check and pre-warm in background)
      if (episodes.length > 0) {
        const firstEpisode = episodes[0]
        if (firstEpisode?.url) {
          // Check if API is warm, and pre-warm if needed (non-blocking)
          checkAndPreWarmApi(firstEpisode.url)
        }
        
        // Auto-play episode when anime is selected
        // Check if we have a saved last episode for this anime
        const savedProgress = getSavedProgress(anime.id)
        if (savedProgress && savedProgress.lastEpisode) {
          // Load the last watched episode
          const lastEpisode = episodes.find((ep: any) => ep.number === savedProgress.lastEpisode)
          if (lastEpisode) {
            addLog(`Resuming from episode ${savedProgress.lastEpisode} (last watched)`, 'info')
            setSelectedEpisode(savedProgress.lastEpisode)
            // Auto-load the episode (will restore position in handleEpisodeSelect)
            // Pass both episode and anime objects directly to avoid state timing issues
            setTimeout(() => {
              handleEpisodeSelectWithEpisode(lastEpisode, updatedAnime, savedProgress.currentTime)
            }, 500)
          } else {
            // Last episode not found, play first episode
            addLog('Last episode not found, playing first episode', 'info')
            setTimeout(() => {
              handleEpisodeSelectWithEpisode(episodes[0], updatedAnime)
            }, 500)
          }
        } else {
          // No saved progress, play first episode
          addLog('Auto-playing first episode', 'info')
          setTimeout(() => {
            handleEpisodeSelectWithEpisode(episodes[0], updatedAnime)
          }, 500)
        }
      }
    } catch (error: any) {
      addLog(`Error loading episodes: ${error.message}`, 'error')
    } finally {
      setLoadingEpisodes(false)
    }
  }

  // Pre-warm anime info API (non-blocking)
  const preWarmAnimeInfo = async (animeId: string) => {
    try {
      // Make a lightweight request to warm up the anime info endpoint
      await fetch(`/api/consumet/anime?animeId=${encodeURIComponent(animeId)}`, {
        method: 'GET'
      })
      addLog('🔥 Anime info API pre-warmed', 'success')
    } catch (error) {
      // Silently fail - pre-warming is best effort
    }
  }

  // Save playback progress to localStorage
  const saveProgress = (animeId: string, episodeNumber: number, currentTime: number, duration: number) => {
    try {
      const progress = {
        animeId,
        lastEpisode: episodeNumber,
        currentTime,
        duration,
        timestamp: Date.now()
      }
      localStorage.setItem(`anime_progress_${animeId}`, JSON.stringify(progress))
    } catch (error) {
      // Silently fail if localStorage is unavailable
    }
  }

  // Get saved playback progress from localStorage
  const getSavedProgress = (animeId: string): { lastEpisode: number; currentTime: number; duration: number } | null => {
    try {
      const saved = localStorage.getItem(`anime_progress_${animeId}`)
      if (saved) {
        const progress = JSON.parse(saved)
        // Only use saved progress if it's less than 7 days old
        if (Date.now() - progress.timestamp < 7 * 24 * 60 * 60 * 1000) {
          return progress
        }
      }
    } catch (error) {
      // Silently fail if localStorage is unavailable
    }
    return null
  }

  // Check if API is warm and pre-warm if needed
  const checkAndPreWarmApi = async (episodeUrl: string) => {
    try {
      // Check if API is warm by calling our check endpoint
      const checkResponse = await fetch('/api/consumet/episode/sources?checkWarm=true', {
        method: 'GET' // Use GET for warm check
      })
      
      // If check fails or returns 503, assume cold and pre-warm
      const isWarm = checkResponse.ok && checkResponse.status === 200
      
      if (!isWarm) {
        addLog('🔥 API is cold, pre-warming...', 'info')
        // Pre-warm by making a lightweight request to the first episode
        // This will wake up the serverless function
        fetch(`/api/consumet/episode/sources?episodeUrl=${encodeURIComponent(episodeUrl)}`, {
          method: 'GET'
        }).catch(() => {
          // Silently fail - pre-warming is best effort
        })
      } else {
        addLog('✅ API is already warm', 'success')
      }
    } catch (error) {
      // Silently fail - pre-warming is best effort
      // If check fails, try to pre-warm anyway
      try {
        fetch(`/api/consumet/episode/sources?episodeUrl=${encodeURIComponent(episodeUrl)}`, {
          method: 'GET'
        }).catch(() => {})
      } catch (e) {
        // Ignore
      }
    }
  }

  // Handle episode selection with episode object (for auto-play, avoids state timing issues)
  const handleEpisodeSelectWithEpisode = async (episode: any, anime: any, resumeTime?: number) => {
    if (!episode || !episode.id) {
      addLog(`No episode data found`, 'error')
      return
    }
    
    if (!anime || !anime.id) {
      addLog('No anime data provided', 'error')
      return
    }
    
    setSelectedEpisode(episode.number)
    setLoadingStream(true)
    const startTime = Date.now()
    addLog(`Loading episode ${episode.number}...`, 'info')
    
    // Store resume time for later use when player loads
    // Only restore if we have a valid resume time and it's not near the end (within 10 seconds)
    if (resumeTime !== undefined && resumeTime > 0) {
      // Check if we have duration info to determine if we're near the end
      const savedProgress = getSavedProgress(anime.id)
      if (savedProgress && savedProgress.duration) {
        // Only restore if we're not within 10 seconds of the end
        if (resumeTime < savedProgress.duration - 10) {
          (window as any).__resumeTime = resumeTime
          addLog(`Will resume at ${resumeTime.toFixed(1)}s`, 'info')
        } else {
          addLog('Saved position is near end, starting from beginning', 'info')
        }
      } else {
        // No duration info, restore anyway
        (window as any).__resumeTime = resumeTime
        addLog(`Will resume at ${resumeTime.toFixed(1)}s`, 'info')
      }
    }
    
    // Continue with episode loading using the episode and anime objects directly
    await loadEpisodeStream(episode, episode.number, anime)
  }

  // Handle episode selection and load stream (with episode number - for manual clicks)
  const handleEpisodeSelect = async (episodeNumber: number, resumeTime?: number) => {
    setSelectedEpisode(episodeNumber)
    setLoadingStream(true)
    const startTime = Date.now()
    addLog(`Loading episode ${episodeNumber}...`, 'info')
    
    // Store resume time for later use when player loads
    // Only restore if we have a valid resume time and it's not near the end (within 10 seconds)
    if (resumeTime !== undefined && resumeTime > 0) {
      // Check if we have duration info to determine if we're near the end
      const savedProgress = selectedAnime ? getSavedProgress(selectedAnime.id) : null
      if (savedProgress && savedProgress.duration) {
        // Only restore if we're not within 10 seconds of the end
        if (resumeTime < savedProgress.duration - 10) {
          (window as any).__resumeTime = resumeTime
          addLog(`Will resume at ${resumeTime.toFixed(1)}s`, 'info')
        } else {
          addLog('Saved position is near end, starting from beginning', 'info')
        }
      } else {
        // No duration info, restore anyway
        (window as any).__resumeTime = resumeTime
        addLog(`Will resume at ${resumeTime.toFixed(1)}s`, 'info')
      }
    }

    // Find the episode in the episodes array
    const episode = animeEpisodes.find((ep: any) => ep.number === episodeNumber)
    if (!episode || !episode.id) {
      addLog(`No episode data found for episode ${episodeNumber}`, 'error')
      setLoadingStream(false)
      return
    }
    
    // Continue with episode loading
    await loadEpisodeStream(episode, episodeNumber)
  }

  // Load episode stream (extracted common logic)
  const loadEpisodeStream = async (episode: any, episodeNumber: number, anime?: any, provider?: 'animepahe' | 'animekai') => {
    // Use anime parameter if provided, otherwise fall back to selectedAnime state
    const animeToUse = anime || selectedAnime
    // Use provider parameter if provided, otherwise fall back to selectedProvider state
    const providerToUse = provider || selectedProvider
    
    // Use original episode number for API calls if available (for normalized seasons)
    const apiEpisodeNumber = episode.originalNumber || episode.number
    if (episode.originalNumber && episode.originalNumber !== episode.number) {
      addLog(`Using original episode number ${episode.originalNumber} for API call (display: ${episode.number})`, 'info')
    }

    if (!animeToUse || !animeToUse.id) {
      addLog('No anime selected', 'error')
      setLoadingStream(false)
      return
    }

    try {
      // Helper function to build proxy URL for M3U8 streams
      const buildProxyUrl = (url: string, referer?: string) => {
        if (!url) return null
        
        // Use Cloudflare Worker for vault streams (same as AnimePahe)
        const isVaultStream = url.includes('vault-') && (url.includes('owocdn.top') || url.includes('uwucdn.top'))
        if (isVaultStream) {
          const workerUrl = 'https://hls-proxy1.reminiscent-bot.workers.dev'
          return `${workerUrl}?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer || 'https://kwik.cx/')}`
        }
        
        // Use local proxy for other streams
        const params = new URLSearchParams()
        params.set('url', url)
        if (referer) {
          params.set('referer', referer)
        }
        return `/api/proxy/hls?${params.toString()}`
      }
      
      // Check which provider to use
      if (providerToUse === 'animekai') {
        // Use AnimeKai provider
        addLog(`🌐 Loading from AnimeKai provider...`, 'info')
        const animeTitle = animeToUse.title || animeToUse.name || 'Unknown'
        const subOrDub = isDub ? 'dub' : 'sub'
        
        const result = await fetchAnimeKaiSourcesClientSide(animeTitle, episodeNumber, subOrDub)
        
        if (!result.success || !result.sources || result.sources.length === 0) {
          throw new Error(result.note || 'Failed to load from AnimeKai')
        }
        
        // If we have a MegaUp /e/ URL, visit it in a hidden iframe to establish cookies
        const megaUpReferer = result.megaUpReferer || result.sources[0]?.megaUpReferer
        if (megaUpReferer && (megaUpReferer.includes('megaup.cc') || megaUpReferer.includes('megaup.live') || megaUpReferer.includes('4spromax.site'))) {
          addLog(`🍪 Establishing MegaUp session by visiting ${megaUpReferer}...`, 'info')
          try {
            // Create a hidden iframe to visit the /e/ URL and establish cookies
            const iframe = document.createElement('iframe')
            iframe.style.display = 'none'
            iframe.style.width = '0'
            iframe.style.height = '0'
            iframe.style.position = 'absolute'
            iframe.style.left = '-9999px'
            iframe.src = megaUpReferer
            document.body.appendChild(iframe)
            
            // Wait for iframe to load and set cookies (MegaUp might set cookies via JavaScript)
            // Use both onload and a timeout to ensure cookies are set
            await new Promise<void>((resolve) => {
              let resolved = false
              
              const resolveOnce = () => {
                if (!resolved) {
                  resolved = true
                  resolve()
                }
              }
              
              // Wait for iframe to load
              iframe.onload = () => {
                // Give extra time for JavaScript to execute and set cookies
                setTimeout(resolveOnce, 3000) // Increased to 3 seconds
              }
              
              // Fallback timeout in case onload never fires
              setTimeout(() => {
                resolveOnce()
              }, 5000)
            })
            
            // Remove iframe after a delay
            setTimeout(() => {
              if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe)
              }
            }, 10000) // Increased delay before removal
            
            addLog(`✅ MegaUp session established (cookies should be set)`, 'success')
          } catch (err: any) {
            addLog(`⚠️ Failed to establish MegaUp session: ${err.message}`, 'warning')
            // Continue anyway - might still work
          }
        }
        
        // Process AnimeKai sources and build proxy URLs
        // First, get the MegaUp /e/ URL referer if available (from extractor result)
        const megaUpRefererUrlValue = result.megaUpReferer || result.sources[0]?.megaUpReferer
        // Store MegaUp referer URL for HLS.js xhrSetup
        if (megaUpRefererUrlValue) {
          setMegaUpRefererUrl(megaUpRefererUrlValue)
        }
        
        const sources = result.sources.map((s: any) => {
          const sourceUrl = s.url
          // Determine referer based on the source URL domain
          // For MegaUp CDN domains, use the original /e/ URL as referer if available
          // This is what the MegaUp CDN expects (the landing page URL)
          let referer = 'https://animekai.to/'
          
          // Check if this is a MegaUp CDN domain
          const isMegaUpCdn = sourceUrl.includes('megaup.cc') || 
                              sourceUrl.includes('megaup.live') || 
                              sourceUrl.includes('4spromax.site') ||
                              sourceUrl.includes('pro25zone.site') ||
                              sourceUrl.includes('dev23app.site')
          
          if (isMegaUpCdn) {
            // Use the original MegaUp /e/ URL as referer if available (from extractor result)
            if (s.megaUpReferer || megaUpRefererUrlValue) {
              referer = s.megaUpReferer || megaUpRefererUrlValue
              addLog(`🔗 Using MegaUp /e/ URL as referer for ${sourceUrl.substring(0, 50)}...: ${referer}`, 'info')
            } else {
              // Fallback to CDN origin if /e/ URL not available
              try {
                referer = new URL(sourceUrl).origin + '/'
                addLog(`⚠️ MegaUp /e/ URL not found, using CDN origin as referer: ${referer}`, 'warning')
              } catch {
                // If URL parsing fails, keep default referer
                addLog(`⚠️ Failed to parse source URL, using default referer: ${referer}`, 'warning')
              }
            }
          } else if (megaUpRefererUrlValue && (sourceUrl.includes('.m3u8') || s.isM3U8)) {
            // Even if source URL doesn't match MegaUp CDN domains, if we have a MegaUp referer
            // and this is an M3U8 manifest, use it (the manifest might be from a different domain)
            referer = megaUpRefererUrlValue
            addLog(`🔗 Using MegaUp /e/ URL as referer for M3U8 manifest: ${referer}`, 'info')
          }
          
          return {
            ...s,
            url: sourceUrl,
            isM3U8: s.isM3U8 || sourceUrl?.includes('.m3u8'),
            quality: s.quality || 'auto',
            // Build proxy URL for M3U8 streams
            proxyUrl: (s.isM3U8 || sourceUrl?.includes('.m3u8')) ? buildProxyUrl(sourceUrl, referer) : sourceUrl
          }
        })
        
        // Store all sources for quality selection
        setAvailableSources(sources)
        
        // Filter M3U8 sources
        const m3u8Sources = sources.filter((s: any) => s.isM3U8)
        
        if (m3u8Sources.length === 0) {
          throw new Error('No M3U8 sources available from AnimeKai')
        }
        
        // Use the first (and usually only) source from AnimeKai
        const bestSource = m3u8Sources[0]
        setCurrentQuality(bestSource.quality || 'auto')
        
        // Use proxy URL if available, otherwise fall back to direct URL
        const streamUrl = bestSource.proxyUrl || bestSource.url
        if (!streamUrl) {
          throw new Error('No valid stream URL found')
        }
        
        // Ensure URL is absolute
        const absoluteUrl = streamUrl.startsWith('http://') || streamUrl.startsWith('https://') 
          ? streamUrl 
          : `${window.location.origin}${streamUrl}`
        
        setLoadedUrl(absoluteUrl)
        setHlsUrl(absoluteUrl)
        
        addLog(`✅ Loaded episode ${episodeNumber} from AnimeKai (quality: ${bestSource.quality || 'auto'})`, 'success')
        addLog(`📺 Stream URL: ${absoluteUrl.substring(0, 100)}...`, 'info')
        return
      }
      
      // Default: Use AnimePahe provider
      addLog(`📺 Loading from AnimePahe provider...`, 'info')
      
      // Pass episodeUrl directly if available (FASTEST - avoids fetching all episodes)
      // Fallback to episodeId + animeId if URL not available
      // Note: We keep all sources (not bestOnly) so users can select quality later
      const params = new URLSearchParams()
      if (episode.url) {
        params.set('episodeUrl', episode.url)
        addLog('Using episode URL directly (fast path)', 'info')
        addLog('⚠️ Note: External API may take 5-10 seconds to respond', 'warning')
      } else {
        params.set('episodeId', episode.id)
        params.set('animeId', animeToUse.id)
        addLog('Using episodeId + animeId (slower fallback)', 'info')
      }
      
      // Add dub preference if available (though API might not support it directly)
      // This is mainly for logging/debugging
      if (isDub) {
        addLog('Requesting dub version (if available)', 'info')
      }
      
      addLog('📡 Requesting episode sources from API...', 'info')
      const fetchStartTime = Date.now()
      
      // Auto-retry logic for 502/timeout errors
      let response: Response | null = null
      let retryCount = 0
      const maxRetries = 1
      
      while (retryCount <= maxRetries) {
        try {
          const attemptStartTime = Date.now()
          response = await fetch(`/api/consumet/episode/sources?${params.toString()}`)
          const headersTime = Date.now() - attemptStartTime
          
          // If successful or non-retryable error, break
          if (response.ok || (response.status !== 502 && response.status !== 503)) {
            // Note: response.json() will download the body, so we'll measure that separately
            if (headersTime < 100) {
              addLog(`⏱️ API headers received in ${(headersTime / 1000).toFixed(3)}s (body download happens during JSON parsing)`, 'info')
            } else {
              addLog(`⏱️ API request took ${(headersTime / 1000).toFixed(1)}s`, headersTime > 3000 ? 'warning' : 'info')
            }
            break
          }
          
          // If 502/503 and we have retries left, retry
          if (retryCount < maxRetries && (response.status === 502 || response.status === 503)) {
            retryCount++
            addLog(`🔄 Retrying (attempt ${retryCount}/${maxRetries})...`, 'warning')
            await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms before retry
            continue
          }
          
          // No more retries or non-retryable error
          throw new Error(`Failed to load sources: ${response.status}`)
        } catch (error: any) {
          // If it's a network error and we have retries left, retry
          if (retryCount < maxRetries && (error.message?.includes('timeout') || error.message?.includes('network'))) {
            retryCount++
            addLog(`🔄 Retrying after error (attempt ${retryCount}/${maxRetries})...`, 'warning')
            await new Promise(resolve => setTimeout(resolve, 500))
            continue
          }
          throw error
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`Failed to load sources: ${response?.status || 'unknown'}`)
      }

      const parseStartTime = Date.now()
      const data = await response.json()
      const parseTime = Date.now() - parseStartTime
      addLog(`⏱️ JSON parsing took ${(parseTime / 1000).toFixed(3)}s`, 'info')
      
      const processStartTime = Date.now()
      const sources = data.sources || []
      
      if (sources.length === 0) {
        throw new Error('No sources available')
      }

      const findSourceStartTime = Date.now()
      
      // Store all sources for quality selection
      setAvailableSources(sources)
      
      // Filter M3U8 sources and prepare them for Vidstack
      const m3u8Sources = sources.filter((s: any) => s.isM3U8)
      
      if (m3u8Sources.length === 0) {
        throw new Error('No M3U8 sources available')
      }
      
      // Find the best quality for initial load (prefer 1080p > 720p > 360p)
      const qualityOrder = ['1080', '720', '360', 'auto']
      const bestSource = qualityOrder
        .map((quality) => m3u8Sources.find((s: any) => s.quality === quality))
        .find((source) => source) || m3u8Sources[0]
      
      const findSourceTime = Date.now() - findSourceStartTime
      addLog(`⏱️ Finding best source took ${(findSourceTime / 1000).toFixed(3)}s`, 'info')
      addLog(`📊 Available qualities: ${m3u8Sources.map((s: any) => s.quality).join(', ')}`, 'info')
      
      // Set current quality
      setCurrentQuality(bestSource.quality || 'auto')
      
      // Use only the best quality source - HLS.js will detect quality levels from master playlist
      // This prevents multiple HLS instances and MediaSource conflicts
      const setStateStartTime = Date.now()
      const streamUrl = bestSource.proxyUrl || bestSource.url
      setLoadedUrl(streamUrl)
      setHlsUrl(streamUrl)
      
      // Using single source prevents multiple HLS instances and MediaSource conflicts
      
      const setStateTime = Date.now() - setStateStartTime
      addLog(`⏱️ Setting state took ${(setStateTime / 1000).toFixed(3)}s`, 'info')
      
      const processTime = Date.now() - processStartTime
      addLog(`⏱️ Total processing took ${(processTime / 1000).toFixed(3)}s`, 'info')
      
      addLog(`Loaded episode ${episodeNumber} stream (quality: ${bestSource.quality || 'auto'})`, 'success')
      addLog(`📊 Available qualities: ${m3u8Sources.map((s: any) => s.quality).join(', ')}`, 'info')
      addLog(`Using best quality (${bestSource.quality || 'auto'}) - HLS.js will detect levels from master playlist`, 'info')
    } catch (error: any) {
      addLog(`Error loading episode stream: ${error.message}`, 'error')
    } finally {
      setLoadingStream(false)
    }
  }

  // Change quality
  const changeQuality = async (quality: string) => {
    if (!selectedAnime || !selectedEpisode || availableSources.length === 0) {
      return
    }
    
    const newSource = availableSources.find((s: any) => s.isM3U8 && s.quality === quality)
    if (!newSource) {
      addLog(`Quality ${quality} not available`, 'warning')
      return
    }
    
    // Save current playback position before switching
    let currentTime = 0
    if (mediaPlayerRef.current) {
      try {
        currentTime = mediaPlayerRef.current.currentTime || 0
        if (currentTime > 0) {
          (window as any).__resumeTime = currentTime
          addLog(`Saved current position: ${currentTime.toFixed(1)}s`, 'info')
        }
      } catch (err: any) {
        // Ignore
      }
    }
    
    // Destroy existing HLS instance to prevent MediaSource conflicts
    // This is critical - multiple HLS instances cause MediaSource errors
    if (mediaPlayerRef.current) {
      try {
        // Access the provider through Vidstack's internal API
        const player = mediaPlayerRef.current as any
        const provider = player.$provider?.()
        if (provider && isHLSProvider(provider)) {
          const hls = (provider as any).instance
          if (hls && typeof hls.destroy === 'function') {
            hls.destroy()
            addLog('Destroyed previous HLS instance before quality switch', 'info')
            // Wait a moment for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      } catch (err: any) {
        // Ignore errors during cleanup - continue with quality switch
        addLog(`Cleanup warning: ${err.message}`, 'warning')
      }
    }
    
    setCurrentQuality(quality)
    const streamUrl = newSource.proxyUrl || newSource.url
    setLoadedUrl(streamUrl)
    setHlsUrl(streamUrl)
    
    addLog(`Switched to ${quality}p quality`, 'success')
  }

  // Client-side AnimeKai source fetching (bypasses Cloudflare)
  const fetchAnimeKaiSourcesClientSide = async (animeTitle: string, episodeNumber: number, subOrDub: 'sub' | 'dub' = 'sub') => {
    try {
      addLog('🌐 Testing AnimeKai client-side fetch...', 'info')
      addLog(`Searching AnimeKai for: ${animeTitle}`, 'info')
      
      // Step 1: Search for anime in AnimeKai
      const searchResponse = await fetch(`/api/consumet/animekai/test?test=search&q=${encodeURIComponent(animeTitle)}`)
      if (!searchResponse.ok) {
        throw new Error(`Failed to search AnimeKai: ${searchResponse.status}`)
      }
      
      const searchData = await searchResponse.json()
      if (!searchData.success || !searchData.data?.results || searchData.data.results.length === 0) {
        throw new Error('Anime not found in AnimeKai')
      }
      
      const animeKaiAnime = searchData.data.results[0]
      addLog(`Found in AnimeKai: ${animeKaiAnime.title} (${animeKaiAnime.id})`, 'success')
      
      // Step 2: Get anime info to get episodes
      const infoResponse = await fetch(`/api/consumet/animekai/test?test=info&animeId=${encodeURIComponent(animeKaiAnime.id)}`)
      if (!infoResponse.ok) {
        throw new Error(`Failed to get anime info: ${infoResponse.status}`)
      }
      
      const infoData = await infoResponse.json()
      if (!infoData.success || !infoData.data?.episodes) {
        throw new Error('Failed to get episodes from AnimeKai')
      }
      
      const episodes = infoData.data.episodes
      const targetEpisode = episodes.find((ep: any) => ep.number === episodeNumber)
      
      if (!targetEpisode) {
        throw new Error(`Episode ${episodeNumber} not found in AnimeKai`)
      }
      
      addLog(`Found episode ${episodeNumber} in AnimeKai: ${targetEpisode.id}`, 'success')
      
      // Step 3: Get server URLs from API (this works server-side)
      const serversResponse = await fetch(`/api/consumet/animekai/sources?episodeId=${encodeURIComponent(targetEpisode.id)}&subOrDub=${subOrDub}`)
      if (!serversResponse.ok) {
        const errorData = await serversResponse.json().catch(() => ({}))
        throw new Error(`Failed to get servers: ${serversResponse.status} - ${errorData.message || 'Unknown error'}`)
      }
      
      const serversData = await serversResponse.json()
      const servers = serversData.servers || []
      
      if (servers.length === 0) {
        throw new Error('No servers available')
      }
      
      addLog(`Found ${servers.length} servers, fetching from browser...`, 'info')
      
      // Step 2: Try to fetch sources using the library's method (might work with proper setup)
      // First, try the library method - it might handle Cloudflare better than we think
      try {
        addLog('Trying library method with proper episode ID...', 'info')
        const sourcesResponse = await fetch(`/api/consumet/animekai/test?test=sources&episodeId=${encodeURIComponent(targetEpisode.id)}&subOrDub=${subOrDub}`)
        const sourcesData = await sourcesResponse.json()
        
        if (sourcesData.success && sourcesData.data) {
          addLog('✅ Library method worked!', 'success')
          // Format sources for consistency
          const sources = sourcesData.data.sources || []
          const formattedSources = sources.map((s: any) => ({
            url: s.url,
            isM3U8: s.isM3U8 || s.url?.includes('.m3u8'),
            quality: s.quality || 'auto',
            proxyUrl: s.proxyUrl || s.url
          }))
          return {
            success: true,
            method: 'library',
            sources: formattedSources,
            tracks: sourcesData.data.tracks || [],
            download: sourcesData.data.download
          }
        } else {
          addLog(`Library method failed: ${sourcesData.error || 'Unknown'}`, 'warning')
        }
      } catch (err: any) {
        addLog(`Library method error: ${err.message}`, 'warning')
      }
      
      // Step 3: Try MegaUp extractor method (server-side via API route)
      addLog('Trying MegaUp extractor method (server-side via Cloudflare Worker)...', 'info')
      for (const server of servers) {
        try {
          // Convert /e/ URL to /media/ URL (as per MegaUp extractor)
          const mediaUrl = server.url.replace('/e/', '/media/')
          addLog(`Fetching /media/ URL via Cloudflare Worker: ${mediaUrl}`, 'info')
          addLog(`Original /e/ URL: ${server.url}`, 'info')
          
          // Use our server-side API route to handle the extraction
          // Pass both the /media/ URL and the original /e/ URL for referer detection
          const extractResponse = await fetch(`/api/consumet/animekai/megaup-extract?url=${encodeURIComponent(mediaUrl)}&eUrl=${encodeURIComponent(server.url)}&referer=${encodeURIComponent(new URL(server.url).origin + '/')}`)
          
          if (extractResponse.ok) {
            const extractData = await extractResponse.json()
            
            if (extractData.success && extractData.sources && extractData.sources.length > 0) {
              addLog(`✅ Found ${extractData.sources.length} video sources via MegaUp extractor!`, 'success')
              // Format sources for consistency with AnimePahe format
              // Store the original MegaUp /e/ URL for referer purposes
              const formattedSources = extractData.sources.map((s: any) => ({
                url: s.url,
                isM3U8: s.isM3U8 || s.url?.includes('.m3u8'),
                quality: s.quality || 'auto',
                proxyUrl: s.proxyUrl || s.url, // Use direct URL (no proxy needed for AnimeKai)
                megaUpReferer: server.url // Store original /e/ URL for referer
              }))
              return {
                success: true,
                server: server.name,
                method: 'megaup-extractor',
                sources: formattedSources,
                tracks: extractData.tracks || [],
                download: extractData.download,
                headers: extractData.headers || {},
                megaUpReferer: server.url // Also store at top level for easy access
              }
            } else {
              addLog(`Extractor returned but no sources: ${JSON.stringify(extractData)}`, 'warning')
            }
          } else {
            const errorData = await extractResponse.json().catch(() => ({}))
            addLog(`❌ Extractor API returned ${extractResponse.status}: ${errorData.error || 'Unknown error'}`, 'warning')
            if (errorData.note) {
              addLog(`Note: ${errorData.note}`, 'info')
            }
            if (errorData.responsePreview) {
              addLog(`Response preview: ${errorData.responsePreview.substring(0, 200)}`, 'info')
            }
          }
        } catch (err: any) {
          addLog(`Error with MegaUp extractor for ${server.name}: ${err.message}`, 'warning')
        }
      }
      
      // Step 4: Return server info for manual inspection
      return {
        success: false,
        servers: servers,
        note: 'All methods failed - servers may require JavaScript execution or different approach'
      }
      
      throw new Error('All servers failed')
    } catch (error: any) {
      addLog(`AnimeKai client-side fetch error: ${error.message}`, 'error')
      throw error
    }
  }

  // Helper function to check if an episode is dub or sub
  const isDubEpisode = (episode: any): boolean => {
    // Check various indicators that an episode might be dubbed
    const title = (episode.title || '').toLowerCase()
    const id = (episode.id || '').toLowerCase()
    
    // Common indicators for dub episodes
    return title.includes('dub') || 
           title.includes('english') ||
           id.includes('dub') ||
           episode.isDub === true ||
           episode.dub === true
  }
  
  // Helper function to find corresponding dub/sub episode
  const findCorrespondingEpisode = (episodeNumber: number, wantDub: boolean): any => {
    // First, try to find an episode with the same number that matches dub/sub preference
    const matchingEpisodes = animeEpisodes.filter((ep: any) => {
      const epNumber = ep.originalNumber || ep.number
      return epNumber === episodeNumber
    })
    
    if (matchingEpisodes.length === 0) {
      // Fallback: just find by display number
      return animeEpisodes.find((ep: any) => ep.number === episodeNumber)
    }
    
    // If we have multiple episodes with the same number, find the one matching dub/sub
    const matching = matchingEpisodes.find((ep: any) => isDubEpisode(ep) === wantDub)
    if (matching) {
      return matching
    }
    
    // If no exact match, return the first one (fallback)
    return matchingEpisodes[0]
  }
  
  // Toggle dub/sub and reload current episode
  const toggleDubSub = async () => {
    const newIsDub = !isDub
    setIsDub(newIsDub)
    addLog(`Switched to ${newIsDub ? 'Dub' : 'Sub'}`, 'info')
    
    // Find and load the corresponding dub/sub episode
    if (selectedAnime && selectedEpisode && animeEpisodes.length > 0) {
      // Get the current episode to find its original number
      const currentEpisode = animeEpisodes.find((ep: any) => ep.number === selectedEpisode)
      if (currentEpisode) {
        const originalNumber = currentEpisode.originalNumber || currentEpisode.number
        
        // Find the corresponding dub/sub episode
        const targetEpisode = findCorrespondingEpisode(originalNumber, newIsDub)
        
        if (targetEpisode && targetEpisode.id) {
          addLog(`Loading episode ${targetEpisode.number} (${newIsDub ? 'Dub' : 'Sub'})...`, 'info')
          // Update selected episode number if it changed
          if (targetEpisode.number !== selectedEpisode) {
            setSelectedEpisode(targetEpisode.number)
          }
          // Load the episode stream
          await loadEpisodeStream(targetEpisode, targetEpisode.number, selectedAnime)
        } else {
          addLog(`No ${newIsDub ? 'dub' : 'sub'} version found for episode ${selectedEpisode}, reloading current episode`, 'warning')
          // Fallback: reload current episode
          await loadEpisodeStream(currentEpisode, selectedEpisode, selectedAnime)
        }
      } else {
        addLog('Current episode not found, cannot reload', 'warning')
      }
    } else {
      addLog('No episode selected, toggle saved for next load', 'info')
    }
  }


  // Show loading spinner while session is being checked
  if (status === 'loading' || checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading...</p>
        </div>
      </main>
    )
  }

  // Check if user is not signed in
  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  // Check if user has access (developer or owner)
  const hasAccess = adminData && (adminData.isDeveloper || adminData.isOwner)

  if (!hasAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-neutral-400">Only Developers and Owners can access this page.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Direct HLS.js Debug Player</h1>
          <p className="text-neutral-400">Test HLS streams with Vidstack player and debug logging</p>
        </div>

        {/* URL Input */}
        <div className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={hlsUrl}
              onChange={(e) => setHlsUrl(e.target.value)}
              placeholder="Enter HLS stream URL (.m3u8)"
              className="flex-1 rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLoad()
                }
              }}
            />
            <button
              onClick={handleLoad}
              className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-md transition-colors"
            >
              Load
            </button>
          </div>
        </div>

        {/* Video Player */}
        {loadedUrl && (
          <div className="mb-6 bg-neutral-800 rounded-lg overflow-hidden relative">
            <MediaPlayer
              ref={mediaPlayerRef}
              src={loadedUrl ? {
                src: loadedUrl,
                type: 'application/x-mpegurl'
              } : undefined}
              autoplay
              playsInline
              load="eager"
              onPlay={() => {
                setIsPlaying(true)
                addLog('Player: Playing', 'success', 500) // Throttle to once per 500ms
              }}
              onPause={() => {
                setIsPlaying(false)
                addLog('Player: Paused', 'info')
              }}
              onLoadStart={() => {
                addLog('HLS: Loading started', 'info', 200) // Throttle to once per 200ms
              }}
              onLoadedMetadata={() => {
                addLog('HLS: Metadata loaded', 'success', 200) // Throttle to once per 200ms
                // Restore playback position IMMEDIATELY - no delay to prevent flash of beginning
                if (mediaPlayerRef.current && (window as any).__resumeTime !== undefined) {
                  const resumeTime = (window as any).__resumeTime
                  const player = mediaPlayerRef.current
                  // Seek immediately - no setTimeout delay
                  try {
                    if (player && player.currentTime !== undefined) {
                      if (player.duration && player.duration > 0) {
                        // Ensure resume time is within valid range
                        const validResumeTime = Math.min(Math.max(0, resumeTime), player.duration - 0.5)
                        player.currentTime = validResumeTime
                        addLog(`Resuming playback at ${validResumeTime.toFixed(1)}s (duration: ${player.duration.toFixed(1)}s)`, 'success')
                        delete (window as any).__resumeTime
                      } else {
                        // Duration not available yet, will try again in onCanPlay
                        addLog(`Waiting for duration to resume at ${resumeTime.toFixed(1)}s...`, 'info')
                      }
                    }
                  } catch (err: any) {
                    addLog(`Error resuming playback: ${err.message}`, 'warning')
                  }
                }
                // Try to start playback after metadata loads
                if (mediaPlayerRef.current) {
                  const player = mediaPlayerRef.current
                  setTimeout(() => {
                    try {
                      player.play().catch((err: any) => {
                        addLog(`Autoplay blocked: ${err.message}`, 'warning')
                      })
                    } catch (err: any) {
                      // Ignore
                    }
                  }, 100)
                }
              }}
              onLoadedData={() => {
                addLog('HLS: Data loaded', 'success', 200) // Throttle to once per 200ms
              }}
              onCanPlay={() => {
                addLog('HLS: Can play - video ready', 'success')
                // Restore playback position if available (fallback if onLoadedMetadata didn't work)
                // Seek IMMEDIATELY - no delay to prevent flash of beginning
                if (mediaPlayerRef.current && (window as any).__resumeTime !== undefined) {
                  const resumeTime = (window as any).__resumeTime
                  const player = mediaPlayerRef.current
                  // Seek immediately - no setTimeout delay
                  try {
                    if (player && player.currentTime !== undefined) {
                      if (player.duration && player.duration > 0) {
                        // Ensure resume time is within valid range
                        const validResumeTime = Math.min(Math.max(0, resumeTime), player.duration - 0.5)
                        player.currentTime = validResumeTime
                        addLog(`Resuming playback at ${validResumeTime.toFixed(1)}s (duration: ${player.duration.toFixed(1)}s)`, 'success')
                        delete (window as any).__resumeTime
                      } else {
                        // If duration not available yet, try again immediately
                        requestAnimationFrame(() => {
                          if (player.duration && player.duration > 0) {
                            const validResumeTime = Math.min(Math.max(0, resumeTime), player.duration - 0.5)
                            player.currentTime = validResumeTime
                            addLog(`Resuming playback at ${validResumeTime.toFixed(1)}s (delayed)`, 'success')
                            delete (window as any).__resumeTime
                          }
                        })
                      }
                    }
                  } catch (err: any) {
                    addLog(`Error resuming playback: ${err.message}`, 'warning')
                  }
                }
                // Ensure playback starts when video is ready
                if (mediaPlayerRef.current && !isPlaying) {
                  setTimeout(() => {
                    try {
                      mediaPlayerRef.current?.play().catch((err: any) => {
                        addLog(`Autoplay blocked: ${err.message}`, 'warning')
                      })
                    } catch (err: any) {
                      // Ignore
                    }
                  }, 200)
                }
              }}
              onTimeUpdate={() => {
                // Save playback progress periodically
                if (mediaPlayerRef.current && selectedAnime && selectedEpisode) {
                  const player = mediaPlayerRef.current
                  try {
                    const currentTime = player.currentTime || 0
                    const duration = player.duration || 0
                    // Only save if we have valid duration and we're past 5 seconds (to avoid saving at start)
                    if (duration > 0 && currentTime > 5) {
                      // Throttle saves to every 5 seconds
                      const lastSaveKey = `last_save_${selectedAnime.id}_${selectedEpisode}`
                      const lastSave = (window as any)[lastSaveKey] || 0
                      if (Date.now() - lastSave > 5000) {
                        saveProgress(selectedAnime.id, selectedEpisode, currentTime, duration)
                        ;(window as any)[lastSaveKey] = Date.now()
                      }
                    }
                  } catch (err: any) {
                    // Ignore errors
                  }
                }
              }}
              onWaiting={() => {
                addLog('HLS: Buffering...', 'warning', 500) // Throttle to once per 500ms
              }}
              onStalled={() => {
                addLog('HLS: Stalled', 'warning')
              }}
              onError={(error: any) => {
                addLog(`HLS: Error - ${error?.message || 'Unknown error'}`, 'error')
              }}
              onProviderChange={(provider: MediaProviderAdapter | null) => {
                // Configure provider with dynamic HLS.js import
                if (isHLSProvider(provider)) {
                  addLog('HLS: Provider detected, configuring with dynamic import...', 'info')
                  // Dynamically import hls.js to reduce spam and improve performance
                  provider.library = () => import('hls.js')
                  
                  // Configure HLS.js with ULTRA-AGGRESSIVE buffering for smooth playback
                  provider.config = {
                    // ULTRA-AGGRESSIVE BUFFERING - Buffer 10 minutes ahead for smooth seeking
                    maxBufferLength: 600, // Maximum buffer length in seconds (10 minutes - increased from 300)
                    maxMaxBufferLength: 1200, // Absolute maximum buffer length (20 minutes - increased from 600)
                    maxBufferSize: 500 * 1000 * 1000, // Maximum buffer size in bytes (500MB - increased from 200MB)
                    maxBufferHole: 0.5, // Maximum buffer hole in seconds (default: 0.5)
                    
                    // Buffer strategy - very aggressive prefetching
                    maxLoadingDelay: 2, // Maximum loading delay in seconds (reduced from 4 for faster buffering)
                    minAutoBitrate: 0, // Minimum auto bitrate (default: 0) - set to 0 to allow highest quality
                    initialLiveManifestSize: 1, // For live streams
                    
                    // Quality selection - prefer highest quality
                    abrBandWidthFactor: 0.95, // Use 95% of available bandwidth (more aggressive)
                    abrBandWidthUpFactor: 0.7, // Switch up quality when 70% of bandwidth available
                    abrMaxWithRealBitrate: false, // Don't limit based on real bitrate
                    capLevelToPlayerSize: false, // Don't cap quality to player size (use highest available)
                    
                    // Fragment loading settings - VERY INCREASED for slow CDN/seeking
                    fragLoadingTimeOut: 60000, // Fragment loading timeout in ms (60 seconds - increased from 30)
                    manifestLoadingTimeOut: 30000, // Manifest loading timeout in ms (30 seconds - increased from 15)
                    levelLoadingTimeOut: 30000, // Level loading timeout in ms (30 seconds - increased from 15)
                    
                    // Retry settings - maximum retries for seeks
                    fragLoadingMaxRetry: 10, // Max retries for fragment loading (increased from 8)
                    manifestLoadingMaxRetry: 6, // Max retries for manifest loading (increased from 4)
                    levelLoadingMaxRetry: 6, // Max retries for level loading (increased from 4)
                    
                    // Network settings - very long timeout for seeks
                    // maxFragLoadingTimeOut removed - not a valid HLS.js config property
                    startFragPrefetch: true, // Prefetch start fragment (default: false)
                    
                    // Buffer management - better seek handling
                    nudgeOffset: 0.1, // Nudge offset in seconds (default: 0.1)
                    nudgeMaxRetry: 8, // Max nudge retries (increased from 5)
                    
                    // Seek settings - improve seek performance
                    // seekHole and seekDurationLimit removed - not valid HLS.js config properties
                    
                    // Low latency mode (disabled for better buffering)
                    lowLatencyMode: false,
                    
                    // Aggressive buffering - start loading immediately and keep ahead
                    liveSyncDurationCount: 3, // For live streams (not applicable here)
                    liveMaxLatencyDurationCount: Infinity, // For live streams
                    
                    // Preload more aggressively
                    abrEwmaFastLive: 3.0, // Fast ABR for live (not applicable)
                    abrEwmaSlowLive: 9.0, // Slow ABR for live (not applicable)
                    abrEwmaFastVoD: 3.0, // Fast ABR for VoD (reduced from default for faster adaptation)
                    abrEwmaSlowVoD: 9.0, // Slow ABR for VoD (reduced from default for faster adaptation)
                    
                    // Custom XHR setup to set referer header for MegaUp fragments
                    xhrSetup: (xhr: XMLHttpRequest, url: string) => {
                      // Check if this is a MegaUp CDN fragment request
                      const isMegaUpFragment = url.includes('pro25zone.site') || 
                                              url.includes('megaup.cc') || 
                                              url.includes('megaup.live') ||
                                              url.includes('4spromax.site') ||
                                              url.includes('dev23app.site')
                      
                      // If it's a MegaUp fragment and we have the /e/ URL, set it as referer
                      if (isMegaUpFragment && !url.includes('.m3u8') && !url.includes('.key') && megaUpRefererUrl) {
                        xhr.setRequestHeader('Referer', megaUpRefererUrl)
                        // Add additional browser-like headers to avoid bot detection
                        xhr.setRequestHeader('Accept', '*/*')
                        xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9')
                        xhr.setRequestHeader('Sec-Fetch-Dest', 'video')
                        xhr.setRequestHeader('Sec-Fetch-Mode', 'cors')
                        xhr.setRequestHeader('Sec-Fetch-Site', 'cross-site')
                        // Only log first few times to reduce spam
                        if (Math.random() < 0.1) { // Log ~10% of requests
                          addLog(`🔗 Set Referer header for MegaUp fragment`, 'info')
                        }
                      }
                    }
                  }
                  
                  addLog('HLS: Provider configured with optimized buffer settings', 'success')
                  
                  // Try to access HLS.js instance for detailed logging and additional config
                  try {
                    // Wait a bit for the provider to initialize
                    setTimeout(() => {
                      const hls = (provider as any).instance
                      if (hls && typeof hls.on === 'function') {
                        // Apply additional buffer settings if config wasn't applied
                        if (hls.config) {
                          // ULTRA-AGGRESSIVE BUFFERING - Ensure maximum buffer settings
                          hls.config.maxBufferLength = Math.max(hls.config.maxBufferLength || 30, 600) // 10 minutes
                          hls.config.maxMaxBufferLength = Math.max(hls.config.maxMaxBufferLength || 600, 1200) // 20 minutes
                          hls.config.maxBufferSize = Math.max(hls.config.maxBufferSize || 0, 500 * 1000 * 1000) // 500MB
                          
                          // Increase timeouts for better seek handling
                          hls.config.fragLoadingTimeOut = Math.max(hls.config.fragLoadingTimeOut || 20000, 60000) // 60 seconds
                          hls.config.manifestLoadingTimeOut = Math.max(hls.config.manifestLoadingTimeOut || 10000, 30000) // 30 seconds
                          hls.config.levelLoadingTimeOut = Math.max(hls.config.levelLoadingTimeOut || 10000, 30000) // 30 seconds
                          hls.config.fragLoadingMaxRetry = Math.max(hls.config.fragLoadingMaxRetry || 6, 10)
                          hls.config.manifestLoadingMaxRetry = Math.max(hls.config.manifestLoadingMaxRetry || 4, 6)
                          hls.config.levelLoadingMaxRetry = Math.max(hls.config.levelLoadingMaxRetry || 4, 6)
                          hls.config.nudgeMaxRetry = Math.max(hls.config.nudgeMaxRetry || 3, 8)
                          
                          // Enable aggressive prefetching
                          hls.config.startFragPrefetch = true
                          hls.config.maxLoadingDelay = Math.min(hls.config.maxLoadingDelay || 4, 2) // Faster buffering
                          
                          // Quality selection - prefer highest quality
                          hls.config.minAutoBitrate = 0 // Allow highest quality
                          hls.config.abrBandWidthFactor = 0.95 // Use 95% of bandwidth
                          hls.config.abrBandWidthUpFactor = 0.7 // Switch up when 70% available
                          hls.config.abrMaxWithRealBitrate = false // Don't limit
                          hls.config.capLevelToPlayerSize = false // Don't cap to player size
                          
                          addLog('HLS: Ultra-aggressive buffer settings applied (10 min ahead, 500MB)', 'success')
                          addLog('HLS: Quality settings configured to prefer highest quality', 'success')
                        }
                        
                        // Set resume position IMMEDIATELY when media element is available (before playback starts)
                        if ((window as any).__resumeTime !== undefined && hls.media) {
                          const resumeTime = (window as any).__resumeTime
                          try {
                            // Set currentTime immediately on the media element to prevent flash of beginning
                            if (hls.media.currentTime !== undefined) {
                              hls.media.currentTime = resumeTime
                              addLog(`HLS: Set resume position to ${resumeTime.toFixed(1)}s (early)`, 'info')
                            }
                          } catch (err: any) {
                            // Ignore - will try again in event handlers
                          }
                        }
                        
                        // Also listen for when media element is attached
                        hls.on('mediaAttaching', () => {
                          if ((window as any).__resumeTime !== undefined && hls.media) {
                            const resumeTime = (window as any).__resumeTime
                            try {
                              // Set currentTime as soon as media is attached
                              if (hls.media.currentTime !== undefined) {
                                hls.media.currentTime = resumeTime
                                addLog(`HLS: Set resume position to ${resumeTime.toFixed(1)}s (on media attach)`, 'info')
                              }
                            } catch (err: any) {
                              // Ignore
                            }
                          }
                        })
                        
                        // Force highest quality level after levels are loaded
                        hls.on('hlsLevelsLoaded', () => {
                          if (hls.levels && hls.levels.length > 0) {
                            // Find highest quality level (by height, then bitrate)
                            const highestLevel = hls.levels.reduce((prev: any, current: any) => {
                              const prevValue = prev.height || prev.bitrate || 0
                              const currentValue = current.height || current.bitrate || 0
                              return currentValue > prevValue ? current : prev
                            })
                            const highestLevelIndex = hls.levels.indexOf(highestLevel)
                            if (highestLevelIndex >= 0 && highestLevelIndex !== hls.currentLevel) {
                              hls.currentLevel = highestLevelIndex
                              const qualityLabel = highestLevel.height ? `${highestLevel.height}p` : highestLevel.bitrate ? `${Math.round(highestLevel.bitrate / 1000)}kbps` : 'highest'
                              addLog(`HLS: Set to highest quality level (${qualityLabel})`, 'success')
                            }
                          }
                        })
                        
                        // Force aggressive buffering by starting to load ahead immediately
                        // This ensures we start buffering as much as possible right away
                        if (hls.startLoad) {
                          // Start loading immediately and keep loading ahead
                          hls.startLoad(-1) // Load from beginning
                          addLog('HLS: Starting aggressive buffering...', 'info')
                          
                          // Force continuous buffering - keep loading ahead even when paused
                          // This ensures we buffer aggressively regardless of playback state
                          const forceBufferAhead = () => {
                            if (hls && hls.media) {
                              const buffered = hls.media.buffered
                              if (buffered.length > 0) {
                                const currentTime = hls.media.currentTime || 0
                                const bufferedEnd = buffered.end(buffered.length - 1)
                                const bufferAhead = bufferedEnd - currentTime
                                
                                // If buffer is less than 5 minutes, keep loading
                                if (bufferAhead < 300 && hls.media.readyState < 4) {
                                  hls.startLoad()
                                }
                              } else {
                                // No buffer yet, keep loading
                                hls.startLoad()
                              }
                            }
                          }
                          
                          // Check buffer every 2 seconds and force buffering if needed
                          const bufferCheckInterval = setInterval(() => {
                            if (hls && hls.media) {
                              forceBufferAhead()
                            } else {
                              clearInterval(bufferCheckInterval)
                            }
                          }, 2000)
                          
                          // Clean up interval when HLS instance is destroyed
                          hls.on('destroying', () => {
                            clearInterval(bufferCheckInterval)
                          })
                        }
                        
                        // HLS.js event listeners
                        hls.on('hlsManifestLoaded', () => {
                          addLog('HLS: Manifest loaded', 'success')
                        })
                        
                        hls.on('hlsLevelLoaded', (event: any, data: any) => {
                          addLog(`HLS: Level ${data?.level || 'unknown'} loaded`, 'info')
                        })
                        
                        hls.on('hlsFragLoading', (event: any, data: any) => {
                          const frag = data?.frag
                          if (frag) {
                            addLog(`HLS: Loading fragment ${frag.sn}`, 'info', 300) // Throttle fragment logs
                          }
                        })
                        
                        hls.on('hlsFragLoaded', (event: any, data: any) => {
                          const frag = data?.frag
                          if (frag) {
                            addLog(`HLS: Fragment ${frag.sn} (level ${frag.level}) loaded`, 'info', 300)
                            // Log fragment URL if available (throttled)
                            if (frag.url) {
                              addLog(`HLS requesting: ${frag.url}`, 'info', 500)
                            }
                          }
                        })
                        
                        hls.on('hlsFragParsed', (event: any, data: any) => {
                          const frag = data?.frag
                          if (frag) {
                            addLog(`HLS: Fragment ${frag.sn} parsed`, 'info', 300)
                          }
                        })
                        
                        hls.on('hlsKeyLoading', (event: any, data: any) => {
                          const key = data?.key
                          if (key?.uri) {
                            addLog(`HLS: Loading encryption key: ${key.uri}`, 'info')
                          }
                        })
                        
                        hls.on('hlsKeyLoaded', () => {
                          addLog('HLS: Encryption key loaded successfully', 'success')
                        })
                        
                        hls.on('hlsError', (event: any, data: any) => {
                          // Handle different error types appropriately
                          if (data?.details === 'bufferStalledError') {
                            addLog(`HLS: Buffer stalling (recovering...)`, 'warning', 1000)
                          } else if (data?.details === 'fragLoadTimeOut') {
                            addLog(`HLS: Fragment load timeout (retrying...)`, 'warning', 2000)
                          } else if (data?.details === 'bufferNudgeOnStall') {
                            // This is HLS trying to recover - not really an error
                            // Don't log it to avoid spam
                          } else if (data?.fatal === false) {
                            // Non-fatal errors - log as warning
                            addLog(`HLS: ${data?.type || 'error'} - ${data?.details || 'no details'} (non-fatal)`, 'warning', 2000)
                          } else {
                            // Fatal errors - log as error
                            addLog(`HLS: Fatal error - ${data?.type || 'unknown'} (${data?.details || 'no details'})`, 'error')
                          }
                        })
                        
                        addLog('HLS: Event listeners attached', 'success')
                      }
                    }, 100)
                  } catch (error: any) {
                    addLog(`HLS: Could not attach event listeners - ${error?.message}`, 'warning')
                  }
                } else if (provider?.type) {
                  addLog(`Provider type: ${provider.type}`, 'info')
                }
              }}
            >
              <MediaProvider />
              <DefaultVideoLayout icons={defaultLayoutIcons} />
            </MediaPlayer>
          </div>
        )}

        {/* Control Buttons */}
        <div className="mb-6 flex gap-3 flex-wrap items-center">
          <button
            onClick={handlePlay}
            disabled={!loadedUrl}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faPlay} />
            Play
          </button>
          <button
            onClick={handlePause}
            disabled={!loadedUrl}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faPause} />
            Pause
          </button>
          <button
            onClick={handleReload}
            disabled={!loadedUrl}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faRotateRight} />
            Reload
          </button>
          <button
            onClick={handleFetchManifest}
            disabled={!loadedUrl}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faFileDownload} />
            Fetch Manifest
          </button>
          <button
            onClick={async () => {
              if (!selectedAnime || !selectedEpisode) {
                addLog('No episode selected for AnimeKai test', 'warning')
                return
              }
              try {
                const result = await fetchAnimeKaiSourcesClientSide(
                  selectedAnime.title || selectedAnime.name || 'Unknown',
                  selectedEpisode,
                  isDub ? 'dub' : 'sub'
                )
                addLog(`✅ AnimeKai client-side fetch result: ${JSON.stringify(result, null, 2)}`, 'success')
              } catch (error: any) {
                addLog(`❌ AnimeKai client-side fetch failed: ${error.message}`, 'error')
              }
            }}
            disabled={!selectedAnime || !selectedEpisode}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faSearch} />
            Test AnimeKai (Client)
          </button>
          <button
            onClick={handleClearLog}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faTrash} />
            Clear Log
          </button>
          
          {/* Quality Selector */}
          {availableSources.length > 0 && (
            <div className="relative group">
              <select
                value={currentQuality || 'auto'}
                onChange={(e) => changeQuality(e.target.value)}
                className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white text-sm font-medium appearance-none cursor-pointer hover:bg-neutral-700 transition-colors pr-8"
              >
                {['1080', '720', '360', 'auto'].map((quality) => {
                  const hasQuality = availableSources.some((s: any) => s.isM3U8 && s.quality === quality)
                  if (!hasQuality) return null
                  return (
                    <option key={quality} value={quality}>
                      {quality === 'auto' ? 'Auto' : `${quality}p`}
                    </option>
                  )
                })}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          
          {/* Dub/Sub Toggle Switch */}
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md">
            <span className="text-sm text-neutral-300 font-medium">Sub</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDub}
                onChange={toggleDubSub}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
            <span className="text-sm text-neutral-300 font-medium">Dub</span>
          </div>
          
          {/* Provider Toggle (AnimePahe / AnimeKai) */}
          {selectedAnime && (
            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md">
              <label className="text-sm text-neutral-300 font-medium">Provider:</label>
              <div className="flex items-center gap-1 bg-neutral-900/50 rounded-lg p-1">
                <button
                  onClick={async () => {
                    if (selectedProvider === 'animepahe') return
                    setSelectedProvider('animepahe')
                    setMegaUpRefererUrl(null) // Clear MegaUp referer when switching to AnimePahe
                    addLog('Switched to AnimePahe provider', 'info')
                    // Reload current episode with new provider (pass provider explicitly to avoid state timing issues)
                    if (selectedAnime && selectedEpisode) {
                      // First, try to find episode in current episodes list
                      let episode = animeEpisodes.find((ep: any) => ep.number === selectedEpisode)
                      
                      // If not found, reload anime info to get AnimePahe episodes
                      if (!episode) {
                        addLog(`⚠️ Episode ${selectedEpisode} not found in current list, reloading anime info for AnimePahe...`, 'warning')
                        setLoadingEpisodes(true)
                        try {
                          // Fetch anime info with retry logic (same as handleAnimeSelect)
                          let response: Response | null = null
                          let retryCount = 0
                          const maxRetries = 1
                          
                          while (retryCount <= maxRetries) {
                            try {
                              response = await fetch(`/api/consumet/anime?animeId=${selectedAnime.id}`)
                              
                              if (response.ok) {
                                break
                              } else if (retryCount < maxRetries && (response.status === 502 || response.status === 503)) {
                                retryCount++
                                addLog(`🔄 Anime info failed with ${response.status}, retrying (attempt ${retryCount}/${maxRetries})...`, 'warning')
                                await new Promise(resolve => setTimeout(resolve, 500))
                                continue
                              } else {
                                throw new Error(`Failed to load anime info: ${response.status}`)
                              }
                            } catch (error: any) {
                              if (retryCount < maxRetries && (error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('ECONNRESET'))) {
                                retryCount++
                                addLog(`🔄 Anime info error, retrying (attempt ${retryCount}/${maxRetries}): ${error.message}`, 'warning')
                                await new Promise(resolve => setTimeout(resolve, 500))
                                continue
                              } else {
                                throw error
                              }
                            }
                          }
                          
                          if (!response || !response.ok) {
                            throw new Error(`Failed to load anime info: ${response?.status || 'unknown'}`)
                          }
                          
                          const data = await response.json()
                          let episodes = data.episodes || []
                          
                          // Normalize episode numbers (same logic as handleAnimeSelect)
                          if (episodes.length > 0) {
                            const firstEpisodeNumber = episodes[0]?.number
                            const episodeCount = episodes.length
                            const isTypicalSeasonLength = episodeCount === 12 || episodeCount === 13 || episodeCount === 24 || episodeCount === 25 || episodeCount === 26
                            const isLikelyNewSeason = firstEpisodeNumber > 1 && isTypicalSeasonLength
                            const titleSuggestsNewSeason = selectedAnime.title?.toLowerCase().includes('season 2') || 
                                                          selectedAnime.title?.toLowerCase().includes('season 3') ||
                                                          selectedAnime.title?.toLowerCase().includes('2nd season') ||
                                                          selectedAnime.title?.toLowerCase().includes('3rd season')
                            
                            if (isLikelyNewSeason || titleSuggestsNewSeason) {
                              const offset = firstEpisodeNumber - 1
                              episodes = episodes.map((ep: any) => ({
                                ...ep,
                                number: ep.number - offset,
                                originalNumber: ep.number
                              }))
                            }
                          }
                          
                          // Update animeEpisodes state
                          setAnimeEpisodes(episodes)
                          setLoadingEpisodes(false)
                          
                          // Now find the episode in the updated list
                          episode = episodes.find((ep: any) => ep.number === selectedEpisode)
                          
                          if (!episode) {
                            addLog(`❌ Episode ${selectedEpisode} not found even after reloading anime info for AnimePahe.`, 'error')
                            setLoadingEpisodes(false)
                            return
                          }
                        } catch (err: any) {
                          addLog(`❌ Failed to reload anime info: ${err.message}`, 'error')
                          setLoadingEpisodes(false)
                          return
                        }
                      }
                      
                      // Load episode stream with the found episode
                      if (episode) {
                        await loadEpisodeStream(episode, selectedEpisode, selectedAnime, 'animepahe')
                      }
                    } else {
                      addLog('No anime or episode selected, cannot reload stream for AnimePahe.', 'warning')
                    }
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    selectedProvider === 'animepahe'
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                  }`}
                >
                  AnimePahe
                </button>
                <button
                  onClick={async () => {
                    if (selectedProvider === 'animekai') return
                    setSelectedProvider('animekai')
                    addLog('Switched to AnimeKai provider', 'info')
                    // Reload current episode with new provider (pass provider explicitly to avoid state timing issues)
                    if (selectedAnime && selectedEpisode) {
                      // For AnimeKai, we don't need the episode object from animeEpisodes
                      // We search by anime title and episode number
                      // But we can use the episode from animeEpisodes if available for consistency
                      let episode = animeEpisodes.find((ep: any) => ep.number === selectedEpisode)
                      
                      if (!episode) {
                        addLog(`⚠️ Episode ${selectedEpisode} not found in current list for AnimeKai, creating minimal episode object.`, 'warning')
                        // For AnimeKai, we can create a minimal episode object since we search by title
                        episode = {
                          number: selectedEpisode,
                          id: `${selectedAnime.id}-ep-${selectedEpisode}`,
                          title: `Episode ${selectedEpisode}`,
                          url: undefined // AnimeKai doesn't use episode URLs
                        }
                      }
                      
                      await loadEpisodeStream(episode, selectedEpisode, selectedAnime, 'animekai')
                    } else {
                      addLog('No anime or episode selected, cannot reload stream for AnimeKai.', 'warning')
                    }
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    selectedProvider === 'animekai'
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                  }`}
                >
                  AnimeKai
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Developer Log */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
          <div className="bg-neutral-900 px-4 py-2 border-b border-neutral-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Developer Log</h2>
            <div className="flex items-center gap-3">
              {logPaused && pendingLogs.length > 0 && (
                <span className="text-xs text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded">
                  {pendingLogs.length} queued
                </span>
              )}
              <button
                onClick={handleToggleLogPause}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${
                  logPaused
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
                title={logPaused ? 'Resume logging' : 'Pause logging'}
              >
                <FontAwesomeIcon icon={logPaused ? faPlayCircle : faPauseCircle} />
                {logPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
          <div
            ref={logContainerRef}
            className="h-96 overflow-y-auto p-4 font-mono text-sm"
            style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4' }}
          >
            {logs.length === 0 ? (
              <div className="text-neutral-500">No logs yet. Load a stream to see debug information.</div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'success'
                      ? 'text-green-400'
                      : log.type === 'warning'
                      ? 'text-yellow-400'
                      : 'text-neutral-300'
                  }`}
                >
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Anime Selection Section */}
        <div className="mt-12 space-y-6">
          <div className="border-t border-neutral-700 pt-8">
            <h2 className="text-2xl font-bold text-white mb-6">Anime Selection (Consumet - AnimePahe)</h2>
            
            {/* Anime Search */}
            <div className="mb-6">
              <form onSubmit={handleAnimeSearch} className="flex gap-3">
                <input
                  type="text"
                  value={animeSearchQuery}
                  onChange={(e) => setAnimeSearchQuery(e.target.value)}
                  placeholder="Search anime (e.g., Naruto, One Piece)"
                  className="flex-1 rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  disabled={loadingAnime}
                  className="px-6 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-700 text-white font-semibold rounded-md transition-colors flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faSearch} />
                  {loadingAnime ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Search Results */}
            {animeSearchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">Search Results</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {animeSearchResults.map((anime) => (
                    <button
                      key={anime.id}
                      onClick={() => handleAnimeSelect(anime)}
                      className="group bg-neutral-800/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 overflow-hidden hover:bg-neutral-700/50 transition-all duration-300 hover:scale-105 text-left"
                    >
                      <div className="aspect-[3/4] relative overflow-hidden bg-neutral-700">
                        {anime.image ? (
                          <img
                            src={anime.image.startsWith('http') ? `/api/proxy/image?url=${encodeURIComponent(anime.image)}` : anime.image}
                            alt={anime.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              // If image fails to load, use placeholder
                              const target = e.target as HTMLImageElement
                              if (target.src !== '/placeholder.png' && !target.src.includes('placeholder')) {
                                target.src = '/placeholder.png'
                              }
                            }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-neutral-700 flex items-center justify-center">
                            <span className="text-neutral-500 text-xs">No Image</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="p-4 min-h-[100px] flex flex-col justify-between">
                        <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 group-hover:text-brand-400 transition-colors h-10">
                          {anime.title}
                        </h3>
                        <div className="space-y-2 mt-auto">
                          {/* Rating and Year */}
                          <div className="flex items-center justify-between text-xs text-neutral-400">
                            {(() => {
                              // Use the same extractYear helper logic inline
                              const extractYear = (dateValue: any): number | null => {
                                if (!dateValue) return null
                                if (typeof dateValue === 'number' && dateValue >= 1900 && dateValue <= new Date().getFullYear() + 1) {
                                  return dateValue
                                }
                                if (typeof dateValue === 'string') {
                                  const yearMatch = dateValue.match(/\b(19|20)\d{2}\b/)
                                  if (yearMatch) {
                                    const year = parseInt(yearMatch[0], 10)
                                    if (year >= 1900 && year <= new Date().getFullYear() + 1) return year
                                  }
                                  const date = new Date(dateValue)
                                  if (!isNaN(date.getTime())) {
                                    const year = date.getFullYear()
                                    if (year >= 1900 && year <= new Date().getFullYear() + 1) return year
                                  }
                                }
                                return null
                              }
                              const year = anime.year || extractYear(anime.releaseDate)
                              const rating = anime.rating || anime.score
                              return (
                                <>
                                  {year && <span>{year}</span>}
                                  {rating && <span>★ {typeof rating === 'number' ? rating.toFixed(1) : rating}</span>}
                                </>
                              )
                            })()}
                          </div>
                          
                          {/* Status, Type, and Episode Count */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {anime.status && (
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                anime.status.toLowerCase().includes('ongoing') || anime.status.toLowerCase().includes('airing')
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : anime.status.toLowerCase().includes('completed') || anime.status.toLowerCase().includes('finished')
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-neutral-700 text-neutral-300'
                              }`}>
                                {anime.status}
                              </span>
                            )}
                            {anime.type && (
                              <span className="bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded text-xs">
                                {anime.type}
                              </span>
                            )}
                            {anime.totalEpisodes && (
                              <span className="text-neutral-500 text-xs">
                                {anime.totalEpisodes} {anime.totalEpisodes === 1 ? 'ep' : 'eps'}
                              </span>
                            )}
                          </div>
                          
                          {/* Genres (first 2) */}
                          {anime.genres && anime.genres.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {anime.genres.slice(0, 2).map((genre: string, idx: number) => (
                                <span key={idx} className="text-neutral-500 text-xs">
                                  {genre}
                                </span>
                              ))}
                              {anime.genres.length > 2 && (
                                <span className="text-neutral-600 text-xs">+{anime.genres.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-sm text-neutral-400">
                  Click on an anime to load episodes
                </div>
              </div>
            )}

            {/* Selected Anime and Episode List */}
            {selectedAnime && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Selected Anime Info */}
                <div className="lg:col-span-1">
                  <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
                    {selectedAnime.image ? (
                      <div className="relative w-full aspect-[3/4] bg-neutral-700 overflow-hidden">
                        <img
                          src={selectedAnime.image.startsWith('http') ? `/api/proxy/image?url=${encodeURIComponent(selectedAnime.image)}` : selectedAnime.image}
                          alt={selectedAnime.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{ objectPosition: 'center top' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const placeholder = target.parentElement?.querySelector('.image-placeholder') as HTMLElement
                            if (placeholder) {
                              placeholder.style.display = 'flex'
                            }
                          }}
                        />
                        <div className="image-placeholder hidden absolute inset-0 w-full h-full bg-neutral-700 flex items-center justify-center">
                          <span className="text-neutral-500 text-sm">No Image</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-[3/4] bg-neutral-700 flex items-center justify-center">
                        <span className="text-neutral-500 text-sm">No Image</span>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-xl font-bold text-white mb-2">{selectedAnime.title}</h3>
                      {selectedAnime.description && (
                        <p className="text-neutral-400 text-sm mb-4 line-clamp-4">{selectedAnime.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedAnime.genres?.map((genre: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-neutral-700 text-neutral-300 text-xs rounded">
                            {genre}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAnime(null)
                          setAnimeEpisodes([])
                          setSelectedEpisode(1)
                        }}
                        className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md transition-colors"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>

                {/* Episode List */}
                <div className="lg:col-span-2">
                  {loadingEpisodes ? (
                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-8 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-4"></div>
                        <p className="text-neutral-400">Loading episodes...</p>
                      </div>
                    </div>
                  ) : animeEpisodes.length > 0 ? (
                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        {(() => {
                          const firstEp = animeEpisodes[0]?.number
                          const lastEp = animeEpisodes[animeEpisodes.length - 1]?.number
                          const totalEpisodes = selectedAnime?.totalEpisodes
                          
                          if (firstEp && lastEp) {
                            if (totalEpisodes && totalEpisodes > animeEpisodes.length) {
                              return `Episodes ${firstEp}-${lastEp} of ${totalEpisodes} (${animeEpisodes.length} loaded)`
                            } else if (firstEp === 1 && lastEp === animeEpisodes.length) {
                              return `Episodes (${animeEpisodes.length})`
                            } else {
                              return `Episodes ${firstEp}-${lastEp} (${animeEpisodes.length})`
                            }
                          }
                          return `Episodes (${animeEpisodes.length})`
                        })()}
                      </h3>
                      <div className="max-h-[600px] overflow-y-auto">
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                          {animeEpisodes.map((episode: any) => (
                            <button
                              key={episode.number}
                              onClick={() => handleEpisodeSelect(episode.number)}
                              disabled={loadingStream}
                              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                selectedEpisode === episode.number
                                  ? 'bg-brand-500 text-white'
                                  : loadingStream
                                  ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                                  : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'
                              }`}
                            >
                              {episode.number}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-8 text-center">
                      <p className="text-neutral-400">No episodes available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading Stream Indicator */}
            {loadingStream && (
              <div className="mt-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400"></div>
                <span className="text-yellow-400">Loading episode stream...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

