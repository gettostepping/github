import { NextResponse } from 'next/server'
import { tmdbGet } from '@/lib/tmdb'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'
import { NextRequest } from 'next/server'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'all'
  const timeWindow = searchParams.get('time_window') || 'week'
  
  try {
    let endpoint = '/trending/all/week'
    if (type === 'movie') {
      endpoint = `/trending/movie/${timeWindow}`
    } else if (type === 'tv') {
      endpoint = `/trending/tv/${timeWindow}`
    } else {
      endpoint = `/trending/all/${timeWindow}`
    }
    
    const data = await tmdbGet<any>(endpoint)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: 'tmdb_error' }, { status: 502 })
  }
}

export const GET = withRequestLogging(getHandler)


