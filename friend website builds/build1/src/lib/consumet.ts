import { ANIME } from '@consumet/extensions'

// Create AnimePahe instance
let animepaheInstance: any = null

function getAnimePahe() {
  if (!animepaheInstance) {
    animepaheInstance = new ANIME.AnimePahe()
  }
  return animepaheInstance
}

/**
 * Search for anime using Consumet AnimePahe provider
 * @param query - Search query string
 * @param page - Page number (default: 1)
 * @returns Promise with search results
 */
export async function searchAnime(query: string, page: number = 1) {
  try {
    console.log('🔍 Consumet search:', { query, page })
    const animepahe = getAnimePahe()
    const results = await animepahe.search(query, page)
    console.log('✅ Consumet search success:', {
      resultsCount: results.results?.length || 0,
      hasNextPage: !!results.hasNextPage
    })
    return results
  } catch (error) {
    console.error('❌ Consumet search error:', error)
    throw error
  }
}

/**
 * Get anime information including episodes
 * @param animeId - Anime ID from search results
 * @param episodePage - Episode page number (default: -1 to get all episodes)
 * @returns Promise with anime info and episodes
 */
export async function getAnimeInfo(animeId: string, episodePage: number = -1) {
  try {
    console.log('📺 Consumet get anime info:', { animeId, episodePage })
    const animepahe = getAnimePahe()
    const info = await animepahe.fetchAnimeInfo(animeId, episodePage)
    console.log('✅ Consumet get anime info success:', {
      title: info.title,
      episodesCount: info.episodes?.length || 0,
      firstEpisodeId: info.episodes?.[0]?.id || null,
      firstEpisodeIdFormat: info.episodes?.[0]?.id?.includes('/') ? 'combined' : 'hash only'
    })
    return info
  } catch (error) {
    console.error('❌ Consumet get anime info error:', error)
    throw error
  }
}

/**
 * Get episode streaming sources
 * @param episodeId - Episode ID from anime info (may be in format "animeId/episodeHash" or just "episodeHash")
 * @returns Promise with streaming sources and headers
 */
export async function getEpisodeSources(episodeId: string) {
  try {
    console.log('🎬 Consumet get episode sources:', { 
      originalEpisodeId: episodeId,
      isCombinedFormat: episodeId.includes('/')
    })
    
    // Extract just the hash if episodeId is in combined format "animeId/episodeHash"
    // According to docs, fetchEpisodeSources expects just the episode hash
    let episodeHash = episodeId
    if (episodeId.includes('/')) {
      // Split and take the last part (the hash)
      const parts = episodeId.split('/')
      episodeHash = parts[parts.length - 1]
      console.log(`🔗 Extracted episode hash: ${episodeHash} (from: ${episodeId})`)
    }
    
    const animepahe = getAnimePahe()
    console.log(`📡 Calling fetchEpisodeSources with hash: ${episodeHash}`)
    const sources = await animepahe.fetchEpisodeSources(episodeHash)
    console.log('✅ Consumet get episode sources success:', {
      sourcesCount: sources.sources?.length || 0,
      hasReferer: !!sources.headers?.Referer,
      referer: sources.headers?.Referer || null
    })
    return sources
  } catch (error) {
    console.error('❌ Consumet get episode sources error:', error)
    console.error('❌ Episode ID that failed:', episodeId)
    throw error
  }
}

