import { NextRequest, NextResponse } from 'next/server'
import { getAnimeInfo } from '@/lib/consumet'
import { getAnimepahePlay } from '@/lib/animepahe'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

// Helper function to fetch with auto-retry on 502/timeout
async function fetchWithRetry(
  fetchFn: () => Promise<any>,
  maxRetries: number = 1,
  retryDelay: number = 500
): Promise<any> {
  let lastError: any = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries}...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      
      const result = await fetchFn()
      if (attempt > 0) {
        console.log(`✅ Retry succeeded on attempt ${attempt}`)
      }
      return result
    } catch (error: any) {
      lastError = error
      const isRetryable = 
        error?.message?.includes('502') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('timed out') ||
        error?.name === 'AbortError'
      
      if (!isRetryable || attempt >= maxRetries) {
        throw error
      }
      
      console.log(`⚠️ Retryable error on attempt ${attempt + 1}: ${error.message}`)
    }
  }
  
  throw lastError
}

// Simple in-memory cache for episode sources
const episodeCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

function getCachedSources(session: string, episodeHash: string): any | null {
  const key = `${session}:${episodeHash}`
  const cached = episodeCache.get(key)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('✅ Cache HIT for episode sources:', { session, episodeHash })
    return cached.data
  }
  
  if (cached) {
    // Expired, remove it
    episodeCache.delete(key)
  }
  
  console.log('❌ Cache MISS for episode sources:', { session, episodeHash })
  return null
}

function setCachedSources(session: string, episodeHash: string, data: any) {
  const key = `${session}:${episodeHash}`
  episodeCache.set(key, {
    data,
    timestamp: Date.now()
  })
  console.log('💾 Cached episode sources:', { session, episodeHash })
  
  // Clean up old entries periodically (keep cache size reasonable)
  if (episodeCache.size > 1000) {
    const now = Date.now()
    for (const [key, value] of episodeCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        episodeCache.delete(key)
      }
    }
  }
}

function buildProxyUrl(url?: string | null, referer?: string | null) {
  if (!url) return null
  
  // Use Cloudflare Worker for vault-*.owocdn.top and vault-*.uwucdn.top streams
  const isVaultStream = url.includes('vault-') && (url.includes('owocdn.top') || url.includes('uwucdn.top'))
  if (isVaultStream) {
    const workerUrl = 'https://hls-proxy1.reminiscent-bot.workers.dev'
    return `${workerUrl}?url=${encodeURIComponent(url)}`
  }
  
  // Use our own proxy for other streams
  const params = new URLSearchParams()
  params.set('url', url)
  if (referer) {
    params.set('referer', referer)
  }
  return `/api/proxy/hls?${params.toString()}`
}

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const episodeId = searchParams.get('episodeId')
  const animeId = searchParams.get('animeId')
  const episodeUrl = searchParams.get('episodeUrl') // NEW: Accept episode URL directly
  const checkWarm = searchParams.get('checkWarm') // Check if API is warm (for pre-warming)
  const bestOnly = searchParams.get('bestOnly') === 'true' // Return only best quality source
  
  // Handle warm check request (lightweight HEAD request)
  if (checkWarm === 'true') {
    try {
      const { isAnimepaheApiWarm } = await import('@/lib/animepahe')
      const isWarm = await isAnimepaheApiWarm()
      return new NextResponse(null, { status: isWarm ? 200 : 503 })
    } catch (error) {
      return new NextResponse(null, { status: 503 }) // Assume cold if check fails
    }
  }

  // Extract session and episodeId from the URL
  // Format: https://animepahe.si/play/{session}/{episodeHash}
  let session: string | null = null
  let episodeHash: string | null = null

  // If episodeUrl is provided, use it directly (FASTEST - no API call needed)
  if (episodeUrl) {
    const urlMatch = episodeUrl.match(/\/play\/([^\/]+)\/([^\/]+)/)
    if (urlMatch) {
      session = urlMatch[1]
      episodeHash = urlMatch[2]
      console.log('✅ Using provided episode URL:', { session, episodeHash })
    }
  }

  // Fallback: If no episodeUrl, try to extract from episodeId or fetch anime info
  if (!session || !episodeHash) {
    if (!episodeId) {
      return NextResponse.json(
        { error: 'missing_episode_id', message: 'Missing episodeId or episodeUrl parameter' },
        { status: 400 }
      )
    }

    // Try to extract session and hash from episodeId if it's in combined format
    // Format: {animeId}/{episodeHash}
    if (episodeId.includes('/')) {
      const parts = episodeId.split('/')
      if (parts.length >= 2) {
        session = parts[0]
        episodeHash = parts[parts.length - 1]
        console.log('✅ Extracted from episodeId:', { session, episodeHash })
      }
    }

    // Last resort: Fetch anime info (SLOW - only if we have no other option)
    if (!session || !episodeHash) {
      if (!animeId) {
        return NextResponse.json(
          { error: 'missing_params', message: 'Need either episodeUrl, or animeId+episodeId' },
          { status: 400 }
        )
      }

      console.log('⚠️ Falling back to fetching anime info (slow)...', { animeId, episodeId })
      try {
        const animeInfo = await getAnimeInfo(animeId, -1)
        
        // Find the episode by matching the episodeId
        const episode = animeInfo.episodes?.find((ep: any) => {
          if (ep.id === episodeId) return true
          if (ep.id.includes('/') && ep.id.split('/').pop() === episodeId) return true
          if (ep.id.includes(episodeId)) return true
          return false
        })

        if (!episode || !episode.url) {
          return NextResponse.json(
            { error: 'episode_not_found', message: 'Episode not found or missing URL' },
            { status: 404 }
          )
        }

        const urlMatch = episode.url.match(/\/play\/([^\/]+)\/([^\/]+)/)
        if (!urlMatch) {
          return NextResponse.json(
            { error: 'invalid_episode_url', message: 'Could not parse episode URL', episodeUrl: episode.url },
            { status: 400 }
          )
        }

        session = urlMatch[1]
        episodeHash = urlMatch[2]
        console.log('✅ Extracted from fetched episode URL:', { session, episodeHash })
      } catch (error: any) {
        return NextResponse.json(
          { error: 'failed_to_fetch_anime_info', message: error?.message || 'Failed to fetch anime info' },
          { status: 502 }
        )
      }
    }
  }

  // Now we should have session and episodeHash
  if (!session || !episodeHash) {
    return NextResponse.json(
      { error: 'missing_params', message: 'Could not extract session and episodeHash' },
      { status: 400 }
    )
  }

  try {
    // Check cache first
    let data = getCachedSources(session, episodeHash)
    
    if (!data) {
      // Cache miss - fetch from API with auto-retry
      // Note: The external API (animepaheapitest1.vercel.app) may have cold starts
      // Auto-retry will handle 502 errors and timeouts
      console.log('📡 Fetching episode sources from external API (this may take 5-10 seconds)...', { session, episodeHash })
      const apiStartTime = Date.now()
      
      try {
        data = await fetchWithRetry(
          () => getAnimepahePlay(session, episodeHash),
          1, // Retry once on 502/timeout
          500 // 500ms delay before retry
        )
        const apiTime = Date.now() - apiStartTime
        console.log(`⏱️ External API responded in ${(apiTime / 1000).toFixed(1)}s`)
        
        // Cache the result for future requests
        setCachedSources(session, episodeHash, data)
      } catch (error: any) {
        // If retry also failed, throw the error
        console.error('❌ Failed to fetch episode sources after retry:', error)
        throw error
      }
    }

    // Process sources and tracks (same format as existing AnimePahe API)
    const sources: any[] = []
    const tracks: any[] = []

    if (data?.sources && Array.isArray(data.sources)) {
      const allSources: any[] = []
      data.sources.forEach((source: any) => {
        if (source.url && source.isM3U8 && source.url.includes('.m3u8')) {
          const referer = source.referer || source.referrer || 'https://animepahe.si'
          allSources.push({
            url: source.url,
            quality: source.resolution || source.quality || 'auto',
            isM3U8: true,
            proxyUrl: buildProxyUrl(source.url, referer)
          })
        }
      })
      
      // If bestOnly is true, return only the highest quality source
      if (bestOnly && allSources.length > 0) {
        const qualityOrder = ['1080', '720', '360', 'auto']
        const bestSource = qualityOrder
          .map((quality) => allSources.find((s: any) => s.quality === quality))
          .find((source) => source !== undefined) || allSources[0]
        sources.push(bestSource)
      } else {
        sources.push(...allSources)
      }
    }

    if (data?.tracks || data?.subtitles) {
      const subtitleData = data.tracks || data.subtitles
      if (Array.isArray(subtitleData)) {
        subtitleData.forEach((track: any) => {
          tracks.push({
            src: track.url || track.src,
            label: track.label || track.language || 'Unknown',
            kind: 'subtitles',
            lang: track.lang || track.language || 'en',
            default: track.default || false,
            proxyUrl: buildProxyUrl(track.url || track.src, 'https://animepahe.si')
          })
        })
      }
    }

    return NextResponse.json({
      sources,
      tracks,
      headers: {
        Referer: 'https://animepahe.si'
      }
    })
  } catch (error: any) {
    console.error('Consumet episode sources API route error:', error)
    return NextResponse.json(
      { error: 'consumet_sources_error', message: error?.message || 'Failed to fetch episode sources' },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)
export const HEAD = withRequestLogging(getHandler) // Support HEAD for warm checks
