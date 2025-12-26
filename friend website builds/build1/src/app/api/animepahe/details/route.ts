import { NextRequest, NextResponse } from 'next/server'
import { getAnimepaheDetails } from '@/lib/animepahe'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const session = searchParams.get('session') || searchParams.get('id')

  if (!session) {
    return NextResponse.json(
      { error: 'missing_session', message: 'Missing session ID' },
      { status: 400 }
    )
  }

  try {
    const data: any = await getAnimepaheDetails(session)

    // Transform Animepahe details to match Aniwatch format
    const anime = data?.data || data
    const transformed = {
      id: anime.id || null,
      title: anime.title || 'Unknown',
      poster: anime.poster || null,
      banner: anime.banner || null,
      synopsis: anime.synopsis || anime.description || '',
      type: anime.type || 'TV',
      status: anime.status || 'Unknown',
      episodes: anime.episodes || null,
      score: anime.score || 0,
      year: anime.year || null,
      season: anime.season || null,
      session: session,
      info: {
        anilistId: anime.ids?.anilist_id || anime.ids?.anilist || null,
        malId: anime.ids?.mal_id || null
      }
    }

    return NextResponse.json({
      anime: transformed,
      raw: data // Include raw response for debugging
    })
  } catch (error: any) {
    console.error('Animepahe details error:', error)
    return NextResponse.json(
      { error: 'animepahe_details_error', message: error?.message },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

