import { NextRequest, NextResponse } from 'next/server'
import { getAnimeInfo } from '@/lib/consumet'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

// Helper function to fetch with auto-retry on connection errors
async function fetchWithRetry(
  fetchFn: () => Promise<any>,
  maxRetries: number = 1,
  retryDelay: number = 500
): Promise<any> {
  let lastError: any = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Anime info retry attempt ${attempt}/${maxRetries}...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      
      const result = await fetchFn()
      if (attempt > 0) {
        console.log(`✅ Anime info retry succeeded on attempt ${attempt}`)
      }
      return result
    } catch (error: any) {
      lastError = error
      const isRetryable = 
        error?.message?.includes('ECONNRESET') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('timed out') ||
        error?.message?.includes('network') ||
        error?.name === 'AbortError'
      
      if (!isRetryable || attempt >= maxRetries) {
        throw error
      }
      
      console.log(`⚠️ Retryable anime info error on attempt ${attempt + 1}: ${error.message}`)
    }
  }
  
  throw lastError
}

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const animeId = searchParams.get('animeId')
  const episodePage = searchParams.get('episodePage')
    ? parseInt(searchParams.get('episodePage')!, 10)
    : -1

  if (!animeId) {
    return NextResponse.json(
      { error: 'missing_anime_id', message: 'Missing animeId parameter' },
      { status: 400 }
    )
  }

  try {
    const info = await fetchWithRetry(
      () => getAnimeInfo(animeId, episodePage),
      1, // Retry once on connection errors
      500 // 500ms delay before retry
    )
    
    // Log image fields for debugging
    console.log('📸 Anime info image fields:', {
      image: info.image,
      cover: info.cover,
      poster: info.poster,
      thumbnail: info.thumbnail,
      imageKeys: Object.keys(info).filter(k => k.toLowerCase().includes('image') || k.toLowerCase().includes('cover') || k.toLowerCase().includes('poster'))
    })
    
    return NextResponse.json(info)
  } catch (error: any) {
    console.error('Consumet get anime info error:', error)
    return NextResponse.json(
      { error: 'consumet_anime_info_error', message: error?.message || 'Failed to fetch anime info' },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

