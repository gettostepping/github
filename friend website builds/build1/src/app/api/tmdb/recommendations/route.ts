import { NextRequest, NextResponse } from 'next/server'
import { tmdbGet } from '@/lib/tmdb'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

async function getHandler(req: NextRequest) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const type = url.searchParams.get('type') || 'movie'
  if (!id) return NextResponse.json({ results: [] })
  
  // Validate that id is numeric for TMDB API
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
  }
  const endpoint = type === 'tv' ? `/tv/${id}/recommendations` : `/movie/${id}/recommendations`
  try {
    const data = await tmdbGet<any>(endpoint)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: 'tmdb_error' }, { status: 502 })
  }
}

export const GET = withRequestLogging(getHandler)


