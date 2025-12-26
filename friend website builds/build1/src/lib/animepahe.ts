const DEFAULT_ANIMEPAHE_BASE = 'https://animepaheapitest1.vercel.app'

export function getAnimepaheBaseUrl() {
  const envUrl =
    process.env.ANIMEPAHE_API_BASE_URL ||
    process.env.NEXT_PUBLIC_ANIMEPAHE_API_BASE ||
    DEFAULT_ANIMEPAHE_BASE

  return envUrl.replace(/\/$/, '')
}

interface FetchOptions {
  searchParams?: Record<string, string | number | undefined>
  init?: RequestInit
  revalidate?: number
}

async function requestAnimepahe<T>(
  path: string,
  { searchParams, init, revalidate = 60 }: FetchOptions = {}
): Promise<T> {
  const baseUrl = getAnimepaheBaseUrl()
  const url = new URL(`${baseUrl}${path}`)

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const fullUrl = url.toString()
  console.log('🌐 Animepahe API request:', fullUrl)

  // Add timeout to prevent hanging requests (15 seconds)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  
  try {
    const response = await fetch(fullUrl, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {})
      },
      next: { revalidate }
    })
    
    clearTimeout(timeoutId)

    const responseText = await response.text()
    console.log('📡 Animepahe API response status:', response.status, response.statusText)
    console.log('📦 Animepahe API response preview:', responseText.substring(0, 500))

    if (!response.ok) {
      throw new Error(
        `Animepahe API error (${response.status} ${response.statusText}): ${responseText}`
      )
    }

    try {
      const json = JSON.parse(responseText)
      return json as T
    } catch (e) {
      console.error('❌ Failed to parse Animepahe API response as JSON:', e)
      throw new Error(`Invalid JSON response from Animepahe API: ${responseText.substring(0, 200)}`)
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Animepahe API request timed out after 15 seconds')
    }
    throw error
  }
}

export function searchAnimepahe(query: string, page: number = 1) {
  return requestAnimepahe('/api/search', {
    searchParams: { q: query, page },
    revalidate: 300
  })
}

export function getAnimepaheDetails(session: string) {
  return requestAnimepahe(`/api/${session}`, {
    revalidate: 600
  })
}

export function getAnimepaheReleases(
  session: string,
  sort: string = 'episode_desc',
  page: number = 1
) {
  return requestAnimepahe(`/api/${session}/releases`, {
    searchParams: { sort, page },
    revalidate: 120
  })
}

export function getAnimepahePlay(
  session: string,
  episodeId: string
) {
  // HeroX Animepahe API format: /api/play/:session?episodeId=...
  return requestAnimepahe(`/api/play/${session}`, {
    searchParams: { 
      episodeId
    },
    revalidate: 60
  })
}

export function getAnimepaheAiring(page: number = 1) {
  return requestAnimepahe('/api/airing', {
    searchParams: { page },
    revalidate: 300
  })
}

export function getAnimepaheAnimeList(tab?: string) {
  return requestAnimepahe('/api/anime', {
    searchParams: tab ? { tab } : undefined,
    revalidate: 3600
  })
}

// Check if the external API is warm by checking the queue endpoint
export async function isAnimepaheApiWarm(): Promise<boolean> {
  try {
    const baseUrl = getAnimepaheBaseUrl()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout for warm check
    
    const response = await fetch(`${baseUrl}/api/queue`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      // If queue endpoint responds quickly (< 1 second), API is likely warm
      return true
    }
    return false
  } catch (error: any) {
    // If queue check fails or times out, assume API is cold
    return false
  }
}

// Pre-warm the API by making a lightweight request
export async function preWarmAnimepaheApi(): Promise<void> {
  try {
    // Make a quick request to wake up the serverless function
    // Using queue endpoint as it's lightweight
    const baseUrl = getAnimepaheBaseUrl()
    await fetch(`${baseUrl}/api/queue`, {
      headers: { Accept: 'application/json' }
    })
    console.log('🔥 Pre-warmed Animepahe API')
  } catch (error) {
    // Silently fail - pre-warming is best effort
    console.log('⚠️ Pre-warming failed (non-critical):', error)
  }
}

