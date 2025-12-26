import { NextRequest, NextResponse } from 'next/server'
import { tmdbGet } from '@/lib/tmdb'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'movie'
  const withGenres = searchParams.get('with_genres')
  const withOriginCountry = searchParams.get('with_origin_country')
  const sortBy = searchParams.get('sort_by')
  
  const endpoint = type === 'tv' ? '/discover/tv' : '/discover/movie'
  
  try {
    const params: Record<string, any> = {
      sort_by: sortBy || 'popularity.desc',
      include_adult: false,
      language: 'en-US'
    }
    
    if (withGenres) {
      params.with_genres = withGenres
    }
    
    if (withOriginCountry) {
      params.with_origin_country = withOriginCountry
    }
    
    const data = await tmdbGet<any>(endpoint, params)
    return NextResponse.json(data)
  } catch (e: any) {
    console.error('TMDB discover error:', e)
    return NextResponse.json({ error: 'tmdb_error' }, { status: 502 })
  }
}

export const GET = withRequestLogging(getHandler)

