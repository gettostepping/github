import { NextRequest, NextResponse } from 'next/server'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

export const dynamic = 'force-dynamic'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

async function getHandler(request: NextRequest) {
  try {
    console.log('🔍 Seasons API - request.url:', request.url)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Validate that id is numeric for TMDB API
    if (!/^\d+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`
    )

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      seasons: data.seasons || [],
      name: data.name,
      overview: data.overview,
      number_of_seasons: data.number_of_seasons
    })
  } catch (error) {
    console.error('Error fetching seasons:', error)
    return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)