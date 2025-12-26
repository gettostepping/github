// Central streaming service with intelligent fallback
import { isAnimeContent } from './anime-utils'
import { getVidFastUrl, setupVidFastEventListeners } from './vidfast'

export interface StreamingOptions {
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
  color?: string
  overlay?: boolean
  episodeSelector?: boolean
  autoplayNextEpisode?: boolean
  dub?: boolean
}

export interface StreamingResult {
  url: string
  service: 'vidfast'
  isAnime: boolean
  fallbackUsed: boolean
}

// Main function to get streaming URL with intelligent fallback
export async function getStreamingUrl(
  tmdbId: string,
  type: 'movie' | 'tv' | 'anime',
  season?: number,
  episode?: number,
  tmdbData?: any,
  options: StreamingOptions = {},
  anilistId?: number
): Promise<StreamingResult | null> {
  try {
    console.log('🎬 Getting streaming URL for:', { tmdbId, type, season, episode })

    // Detect if content is anime
    const isAnime = type === 'anime' || (tmdbData && isAnimeContent(tmdbData))
    console.log('🎌 Is anime:', isAnime)

    // Determine service priority based on content type
    // All content uses VidFast embeds now
    const services: Array<'vidfast'> = ['vidfast']

    console.log('🔧 Service priority:', services)

    // Try each service in order
    for (let i = 0; i < services.length; i++) {
      const service = services[i]
      const isFallback = i > 0

      try {
        console.log(`🔍 Trying ${service}${isFallback ? ' (fallback)' : ''}...`)

        let url: string | null = null

        if (service === 'vidfast') {
          url = await getVidFastUrl(tmdbId, type, season, episode, {
            autoPlay: options.autoPlay ?? true,
            title: options.title ?? true,
            poster: options.poster ?? true,
            theme: options.theme,
            server: options.server,
            hideServer: options.hideServer,
            fullscreenButton: options.fullscreenButton,
            chromecast: options.chromecast,
            sub: options.sub,
            startAt: options.startAt,
            nextButton: options.nextButton ?? (type === 'tv'),
            autoNext: options.autoNext ?? (type === 'tv')
          })
        }

        if (url) {
          console.log(`✅ ${service} URL found:`, url)
          return {
            url,
            service: service,
            isAnime,
            fallbackUsed: isFallback
          }
        } else {
          console.log(`❌ ${service} failed to generate URL`)
        }
      } catch (error) {
        console.error(`❌ ${service} error:`, error)
      }
    }

    console.log('❌ All streaming services failed')
    return null
  } catch (error) {
    console.error('❌ Error in getStreamingUrl:', error)
    return null
  }
}

// Get all available streaming options with priorities
export async function getStreamingOptions(
  tmdbId: string,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number,
  tmdbData?: any,
  options: StreamingOptions = {}
): Promise<Array<StreamingResult & { priority: number }>> {
  const results: Array<StreamingResult & { priority: number }> = []

  try {
    const isAnime = isAnimeContent(tmdbData)
    const services: Array<'vidfast'> = ['vidfast']

    for (let i = 0; i < services.length; i++) {
      const service = services[i]
      const priority = i + 1

      try {
        let url: string | null = null

        if (service === 'vidfast') {
          url = await getVidFastUrl(tmdbId, type, season, episode, options)
        }

        if (url) {
          results.push({
            url,
            service: service,
            isAnime,
            fallbackUsed: false,
            priority
          })
        }
      } catch (error) {
        console.error(`Error getting ${service} URL:`, error)
      }
    }
  } catch (error) {
    console.error('Error getting streaming options:', error)
  }

  return results
}

// Setup event listeners for both services
export function setupStreamingEventListeners() {
  setupVidFastEventListeners()
}

// Get service status
export async function getServiceStatus() {
  try {
    const vidfastStatus = await import('./vidfast').then(m => m.getServerStatus())
    return {
      vidfast: vidfastStatus
    }
  } catch (error) {
    console.error('Error getting service status:', error)
    return {
      vidfast: null
    }
  }
}
