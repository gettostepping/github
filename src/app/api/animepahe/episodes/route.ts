import { NextRequest, NextResponse } from 'next/server'
import { getAnimepaheReleases } from '@/lib/animepahe'
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
    const data: any = await getAnimepaheReleases(session, 'episode_desc', 1)

    // Transform Animepahe releases format to match Aniwatch format
    const episodes = (data?.data || []).map((ep: any) => ({
      number: ep.episode || 1,
      episodeId: ep.session || ep.id,
      title: ep.title || `Episode ${ep.episode || 1}`,
      session: ep.session || ep.id,
      snapshot: ep.snapshot || null,
      duration: ep.duration || null
    }))

    return NextResponse.json({
      episodes,
      totalEpisodes: episodes.length,
      raw: data // Include raw response for debugging
    })
  } catch (error: any) {
    console.error('Animepahe episodes error:', error)
    return NextResponse.json(
      { error: 'animepahe_episodes_error', message: error?.message },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

