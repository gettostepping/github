import { cache } from 'react'

const DEFAULT_ANIWATCH_BASE = 'https://aniwatch-hianimeapi1.vercel.app'

export function getAniwatchBaseUrl() {
  const envUrl =
    process.env.ANIWATCH_API_BASE_URL ||
    process.env.NEXT_PUBLIC_ANIWATCH_API_BASE ||
    DEFAULT_ANIWATCH_BASE

  return envUrl.replace(/\/$/, '')
}

interface FetchOptions {
  searchParams?: Record<string, string | number | undefined>
  init?: RequestInit
  revalidate?: number
}

async function requestAniwatch<T>(
  path: string,
  { searchParams, init, revalidate = 60 }: FetchOptions = {}
): Promise<T> {
  const baseUrl = getAniwatchBaseUrl()
  const url = new URL(`${baseUrl}${path}`)

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {})
    },
    next: { revalidate }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `Aniwatch API error (${response.status} ${response.statusText}): ${text}`
    )
  }

  const json = await response.json()
  return (json.data ?? json) as T
}

export const getAniwatchHome = cache(() =>
  requestAniwatch('/api/v2/hianime/home', { revalidate: 300 })
)

export function getAniwatchCategory(
  slug: string,
  page: number = 1
) {
  return requestAniwatch('/api/v2/hianime/category/' + slug, {
    searchParams: { page },
    revalidate: 600
  })
}

export function searchAniwatch(query: string, page: number = 1) {
  return requestAniwatch('/api/v2/hianime/search', {
    searchParams: { q: query, page },
    revalidate: 300
  })
}

export function getAniwatchDetails(id: string) {
  return requestAniwatch('/api/v2/hianime/anime/' + id, {
    revalidate: 600
  })
}

export function getAniwatchEpisodes(id: string) {
  return requestAniwatch(`/api/v2/hianime/anime/${id}/episodes`, {
    revalidate: 120
  })
}

export function getAniwatchSchedule(date: string) {
  return requestAniwatch('/api/v2/hianime/schedule', {
    searchParams: { date },
    revalidate: 600
  })
}

export function getAniwatchEpisodeServers(animeEpisodeId: string) {
  return requestAniwatch('/api/v2/hianime/episode/servers', {
    searchParams: { animeEpisodeId },
    revalidate: 60
  })
}

export function getAniwatchEpisodeSources(
  animeEpisodeId: string,
  server?: string,
  category?: 'sub' | 'dub' | 'raw'
) {
  return requestAniwatch('/api/v2/hianime/episode/sources', {
    searchParams: {
      animeEpisodeId,
      server,
      category
    },
    revalidate: 60
  })
}

