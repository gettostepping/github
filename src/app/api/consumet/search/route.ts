import { NextRequest, NextResponse } from 'next/server'
import { searchAnime } from '@/lib/consumet'
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
        console.log(`🔄 Search retry attempt ${attempt}/${maxRetries}...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      
      const result = await fetchFn()
      if (attempt > 0) {
        console.log(`✅ Search retry succeeded on attempt ${attempt}`)
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
      
      console.log(`⚠️ Retryable search error on attempt ${attempt + 1}: ${error.message}`)
    }
  }
  
  throw lastError
}

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1', 10)

  if (!query) {
    return NextResponse.json(
      { error: 'missing_query', message: 'Missing search query parameter' },
      { status: 400 }
    )
  }

  try {
    const results = await fetchWithRetry(
      () => searchAnime(query, page),
      1, // Retry once on connection errors
      500 // 500ms delay before retry
    )
    
    // Log first result structure to debug image field
    if (results.results && results.results.length > 0) {
      const firstResult = results.results[0]
      console.log('📸 First search result structure:', {
        keys: Object.keys(firstResult),
        image: firstResult.image,
        cover: firstResult.cover,
        poster: firstResult.poster,
        thumbnail: firstResult.thumbnail,
        fullResult: JSON.stringify(firstResult).substring(0, 500)
      })
    }
    
    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Consumet search error:', error)
    return NextResponse.json(
      { error: 'consumet_search_error', message: error?.message || 'Failed to search anime' },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

