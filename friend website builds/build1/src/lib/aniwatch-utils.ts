interface AniwatchEpisodesInfo {
  sub?: number | null
  dub?: number | null
}

interface AniwatchAnimeSummary {
  id: string
  name: string
  jname?: string
  poster?: string
  description?: string
  duration?: string
  rating?: string | null
  type?: string
  rank?: number
  episodes?: AniwatchEpisodesInfo
}

export function convertAniwatchListToCards(
  items: AniwatchAnimeSummary[] = []
) {
  return items.map((item) => convertAniwatchAnimeToCard(item))
}

export function convertAniwatchAnimeToCard(item: AniwatchAnimeSummary) {
  const ratingValue = item.rating
    ? parseFloat(String(item.rating).replace(/[^0-9.]/g, ''))
    : undefined

  // Handle poster URL - ensure it's a valid URL or use placeholder
  let posterPath = '/placeholder.png'
  if (item.poster) {
    // If it's already a full URL, use it
    if (item.poster.startsWith('http://') || item.poster.startsWith('https://')) {
      posterPath = item.poster
    } 
    // If it's a relative path that doesn't start with /, it might be from Aniwatch CDN
    else if (!item.poster.startsWith('/')) {
      // Aniwatch might return relative paths - try to construct full URL
      // But if it's empty or just whitespace, use placeholder
      const trimmed = item.poster.trim()
      if (trimmed && trimmed.length > 0) {
        posterPath = trimmed.startsWith('http') ? trimmed : `https://aniwatch.to${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
      }
    }
    // If it starts with /, it might be a valid path
    else if (item.poster.startsWith('/') && item.poster !== '/') {
      posterPath = item.poster
    }
  }

  return {
    id: item.id,
    name: item.name,
    title: item.name,
    overview: item.description || '',
    poster_path: posterPath,
    media_type: 'tv',
    first_air_date: undefined,
    vote_average: ratingValue && !Number.isNaN(ratingValue) ? ratingValue / 10 : 0,
    vote_count: 0,
    aniwatch_id: item.id,
    episodes_sub: item.episodes?.sub ?? null,
    episodes_dub: item.episodes?.dub ?? null,
    item_type: item.type ?? 'TV',
    rank: item.rank
  }
}

export function sanitizeHtmlDescription(description?: string) {
  if (!description) return ''
  // Remove simple HTML tags and decode HTML entities
  return description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

export function parseDuration(duration?: string) {
  if (!duration) return null
  const match = duration.match(/(\d+)\s*h/i)
  const minutesMatch = duration.match(/(\d+)\s*m/i)
  const hours = match ? parseInt(match[1], 10) : 0
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0
  if (!hours && !minutes) return null
  return hours * 60 + minutes
}

export function convertAniwatchDetailToShowData(anime: any) {
  const info = anime?.info || {}
  const moreInfo = anime?.moreInfo || {}
  const runtimeMinutes = parseDuration(info.stats?.duration)

  return {
    id: info.id,
    title: info.name,
    name: info.name,
    overview: sanitizeHtmlDescription(info.description),
    poster_path: info.poster || '/placeholder.png',
    backdrop_path: info.poster || '/placeholder.png',
    vote_average: 0,
    vote_count: 0,
    genres: (moreInfo.genres || []).map((genre: string, index: number) => ({
      id: index,
      name: genre
    })),
    production_companies: (moreInfo.producers || []).map(
      (producer: string, index: number) => ({
        id: index,
        name: producer
      })
    ),
    production_countries: [
      {
        iso_3166_1: 'JP',
        name: 'Japan'
      }
    ],
    spoken_languages: [
      {
        iso_639_1: 'ja',
        name: 'Japanese'
      }
    ],
    status: moreInfo.status || 'Unknown',
    release_date: moreInfo.aired || '',
    first_air_date: moreInfo.aired || '',
    last_air_date: undefined,
    runtime: runtimeMinutes || undefined,
    episode_run_time: runtimeMinutes ? [runtimeMinutes] : undefined,
    number_of_episodes:
      info.stats?.episodes?.sub ??
      info.stats?.episodes?.dub ??
      anime?.episodes?.totalEpisodes ??
      0,
    number_of_seasons: anime?.seasons?.length || 1,
    adult: info.stats?.rating === '18+',
    homepage: undefined,
    original_language: 'ja',
    original_title: moreInfo.japanese || info.name,
    original_name: moreInfo.japanese || info.name,
    popularity: 0,
    revenue: undefined,
    budget: undefined,
    tagline: undefined,
    anilist_id: info.anilistId,
    aniwatch_id: info.id,
    related: anime?.relatedAnimes || [],
    recommended: anime?.recommendedAnimes || []
  }
}

export function formatAniwatchCategoryResponse(data: any) {
  if (!data) {
    return []
  }
  const list = data.animes || data?.data?.animes || []
  return convertAniwatchListToCards(list)
}

