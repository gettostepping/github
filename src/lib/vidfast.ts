// VidFast.pro service integration
export interface VidFastServer {
  name: string
  status: 'online' | 'offline' | 'degraded'
  load: number
  responseTime?: number
  uptime?: number
  lastUpdated?: string
}

export interface VidFastStatus {
  status?: string
  servers: VidFastServer[]
  lastChecked?: string
}

// Cache for server status
let statusCache: { data: VidFastStatus | null; timestamp: number } = {
  data: null,
  timestamp: 0
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Get server status from VidFast
export async function getServerStatus(): Promise<VidFastStatus | null> {
  // Skip status checking due to CORS issues
  // Return a default status that allows VidFast to auto-select servers
  return {
    status: 'online',
    servers: [
      { name: 'auto', status: 'online', load: 0.0 }
    ],
    lastChecked: new Date().toISOString()
  }
}

// Get the best available server
async function getBestServer(): Promise<string> {
  try {
    const status = await getServerStatus()
    if (!status) return 'auto'

    // Find operational servers
    const operationalServers = status.servers.filter(
      server => server.status === 'online'
    )

    if (operationalServers.length === 0) {
      return 'auto' // Let VidFast choose
    }

    // Sort by load (lower is better)
    const bestServer = operationalServers.sort((a, b) => a.load - b.load)[0]

    return bestServer.name.toLowerCase()
  } catch (error) {
    console.error('Error getting best server:', error)
    return 'auto'
  }
}

// Generate VidFast movie URL
export function generateVidFastMovieUrl(tmdbId: string, options: {
  autoPlay?: boolean
  title?: boolean
  poster?: boolean
  theme?: string
  server?: string
  hideServer?: boolean
  fullscreenButton?: boolean
  chromecast?: boolean
  sub?: string
  startAt?: number
} = {}): string {
  const baseUrl = 'https://vidfast.pro/movie'
  const params = new URLSearchParams()

  // Add options
  if (options.autoPlay !== undefined) params.set('autoPlay', options.autoPlay.toString())
  if (options.title !== undefined) params.set('title', options.title.toString())
  if (options.poster !== undefined) params.set('poster', options.poster.toString())
  if (options.theme) params.set('theme', options.theme)
  if (options.server) params.set('server', options.server)
  if (options.hideServer !== undefined) params.set('hideServer', options.hideServer.toString())
  if (options.fullscreenButton !== undefined) params.set('fullscreenButton', options.fullscreenButton.toString())
  if (options.chromecast !== undefined) params.set('chromecast', options.chromecast.toString())
  if (options.sub) params.set('sub', options.sub)
  if (options.startAt !== undefined) params.set('startAt', options.startAt.toString())
  
  // Always unmute the player to avoid uBlock Origin issues
  params.set('muted', 'false')
  // Add additional parameters to make it less likely to be blocked
  params.set('allowFullscreen', 'true')
  params.set('allow', 'autoplay; fullscreen; encrypted-media')

  const queryString = params.toString()
  return `${baseUrl}/${tmdbId}${queryString ? `?${queryString}` : ''}`
}

// Generate VidFast TV URL
export function generateVidFastTVUrl(tmdbId: string, season: number, episode: number, options: {
  autoPlay?: boolean
  title?: boolean
  poster?: boolean
  theme?: string
  server?: string
  hideServer?: boolean
  fullscreenButton?: boolean
  chromecast?: boolean
  sub?: string
  startAt?: number
  nextButton?: boolean
  autoNext?: boolean
} = {}): string {
  const baseUrl = 'https://vidfast.pro/tv'
  const params = new URLSearchParams()

  // Add options
  if (options.autoPlay !== undefined) params.set('autoPlay', options.autoPlay.toString())
  if (options.title !== undefined) params.set('title', options.title.toString())
  if (options.poster !== undefined) params.set('poster', options.poster.toString())
  if (options.theme) params.set('theme', options.theme)
  if (options.server) params.set('server', options.server)
  if (options.hideServer !== undefined) params.set('hideServer', options.hideServer.toString())
  if (options.fullscreenButton !== undefined) params.set('fullscreenButton', options.fullscreenButton.toString())
  if (options.chromecast !== undefined) params.set('chromecast', options.chromecast.toString())
  if (options.sub) params.set('sub', options.sub)
  if (options.startAt !== undefined) params.set('startAt', options.startAt.toString())
  if (options.nextButton !== undefined) params.set('nextButton', options.nextButton.toString())
  if (options.autoNext !== undefined) params.set('autoNext', options.autoNext.toString())
  
  // Always unmute the player to avoid uBlock Origin issues
  params.set('muted', 'false')
  // Add additional parameters to make it less likely to be blocked
  params.set('allowFullscreen', 'true')
  params.set('allow', 'autoplay; fullscreen; encrypted-media')

  const queryString = params.toString()
  return `${baseUrl}/${tmdbId}/${season}/${episode}${queryString ? `?${queryString}` : ''}`
}

// Test if VidFast URL is accessible
export async function testVidFastUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    return response.ok
  } catch (error) {
    console.error('Error testing VidFast URL:', error)
    return false
  }
}

// Get VidFast URL with fallback logic
export async function getVidFastUrl(
  tmdbId: string, 
  type: 'movie' | 'tv' | 'anime', 
  season?: number, 
  episode?: number,
  options: any = {}
): Promise<string | null> {
  try {
    // Get best server
    const server = await getBestServer()
    
    // Generate URL
    let url: string
    console.log('VidFast getVidFastUrl - type:', type, 'tmdbId:', tmdbId, 'season:', season, 'episode:', episode)
    
    if (type === 'movie') {
      console.log('VidFast: Generating movie URL')
      url = generateVidFastMovieUrl(tmdbId, {
        ...options,
        server: server !== 'auto' ? server : undefined
      })
    } else if (type === 'anime') {
      console.log('VidFast: Generating anime URL (treating as TV show)')
      // For anime, use default season 1, episode 1 if not provided
      const animeSeason = season || 1
      const animeEpisode = episode || 1
      url = generateVidFastTVUrl(tmdbId, animeSeason, animeEpisode, {
        ...options,
        server: server !== 'auto' ? server : undefined
      })
    } else {
      console.log('VidFast: Generating TV show URL')
      if (!season || !episode) {
        throw new Error('Season and episode required for TV shows')
      }
      url = generateVidFastTVUrl(tmdbId, season, episode, {
        ...options,
        server: server !== 'auto' ? server : undefined
      })
    }

    // Skip URL testing due to CORS restrictions
    // The iframe will handle loading and show appropriate errors
    console.log('VidFast URL generated:', url)

    return url
  } catch (error) {
    console.error('Error getting VidFast URL:', error)
    return null
  }
}

// Setup VidFast event listeners
export function setupVidFastEventListeners() {
  const vidfastOrigins = [
    'https://vidfast.pro',
    'https://vidfast.in',
    'https://vidfast.io',
    'https://vidfast.me',
    'https://vidfast.net',
    'https://vidfast.pm',
    'https://vidfast.xyz'
  ]

  window.addEventListener('message', ({ origin, data }) => {
    if (!vidfastOrigins.includes(origin) || !data) {
      return
    }

    if (data.type === 'PLAYER_EVENT') {
      const { event, currentTime, duration } = data.data
      console.log(`VidFast player ${event} at ${currentTime}s of ${duration}s`)
    }

    if (data.type === 'MEDIA_DATA') {
      localStorage.setItem('vidFastProgress', JSON.stringify(data.data))
    }
  })
}
