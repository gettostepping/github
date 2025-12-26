import { NextRequest, NextResponse } from 'next/server'
import { getAniwatchEpisodeServers } from '@/lib/aniwatch'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const episodeId = searchParams.get('episodeId')

  if (!episodeId) {
    return NextResponse.json(
      { error: 'missing_episode_id', message: 'Missing animeEpisodeId' },
      { status: 400 }
    )
  }

  try {
    const data = await getAniwatchEpisodeServers(episodeId)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Aniwatch episode servers error:', error)
    return NextResponse.json(
      { error: 'aniwatch_servers_error', message: error?.message },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

