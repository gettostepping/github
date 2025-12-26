import { NextRequest, NextResponse } from 'next/server'
import { getAniwatchEpisodeSources } from '@/lib/aniwatch'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

function buildProxyUrl(url?: string | null, referer?: string | null) {
  if (!url) return null
  const params = new URLSearchParams()
  params.set('url', url)
  if (referer) {
    params.set('referer', referer)
  }
  return `/api/proxy/hls?${params.toString()}`
}

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const episodeId = searchParams.get('episodeId')
  const server = searchParams.get('server') || undefined
  const category = searchParams.get('category') as 'sub' | 'dub' | 'raw' | null

  if (!episodeId) {
    return NextResponse.json(
      { error: 'missing_episode_id', message: 'Missing animeEpisodeId' },
      { status: 400 }
    )
  }

  try {
    const data: any = await getAniwatchEpisodeSources(
      episodeId,
      server || undefined,
      category || undefined
    )

    const referer = data?.headers?.Referer || null
    const sources = (data?.sources || []).map((source: any) => ({
      ...source,
      proxyUrl: buildProxyUrl(source.url, referer)
    }))
    const tracks = (data?.tracks || []).map((track: any) => ({
      ...track,
      proxyUrl: buildProxyUrl(track.url, referer)
    }))

    return NextResponse.json({
      ...data,
      sources,
      tracks
    })
  } catch (error: any) {
    console.error('Aniwatch episode sources error:', error)
    return NextResponse.json(
      { error: 'aniwatch_sources_error', message: error?.message },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)
