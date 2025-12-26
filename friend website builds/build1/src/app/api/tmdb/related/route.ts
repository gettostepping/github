import { NextRequest, NextResponse } from 'next/server'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

export const dynamic = 'force-dynamic'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

async function getHandler(request: NextRequest) {
  try {
    console.log('🔍 Related API - request.url:', request.url)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Validate that id is numeric for TMDB API
    if (!/^\d+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const endpoint = type === 'tv' ? 'similar' : 'similar'
    const response = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}/${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    )

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      results: data.results || [],
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    })
  } catch (error) {
    console.error('Error fetching related content:', error)
    return NextResponse.json({ error: 'Failed to fetch related content' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)