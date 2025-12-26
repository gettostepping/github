import { NextRequest, NextResponse } from 'next/server'
import { getAnimepahePlay } from '@/lib/animepahe'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

function buildProxyUrl(url?: string | null, referer?: string | null) {
  if (!url) return null
  
  // Use Cloudflare Worker for vault-*.owocdn.top streams
  // The worker sets the correct kwik.cx referer that the CDN expects
  const isVaultStream = url.includes('vault-') && url.includes('owocdn.top')
  if (isVaultStream) {
    const workerUrl = 'https://hls-proxy1.reminiscent-bot.workers.dev'
    // Return absolute URL for Vidstack
    return `${workerUrl}?url=${encodeURIComponent(url)}`
  }
  
  // Use our own proxy for other streams (same as Aniwatch)
  // Return relative URL - will be converted to absolute in the component
  const params = new URLSearchParams()
  params.set('url', url)
  if (referer) {
    params.set('referer', referer)
  }
  return `/api/proxy/hls?${params.toString()}`
}

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const session = searchParams.get('session')
  const episodeId = searchParams.get('episodeId')

  if (!session || !episodeId) {
    return NextResponse.json(
      { error: 'missing_params', message: 'Missing session or episodeId' },
      { status: 400 }
    )
  }

  try {
    const data: any = await getAnimepahePlay(session, episodeId)

    // Extract m3u8 sources from the response
    // Animepahe API returns sources array directly
    const sources: any[] = []
    const tracks: any[] = []

    // Animepahe response structure: { sources: [...], downloads: [...] }
    if (data?.sources && Array.isArray(data.sources)) {
      data.sources.forEach((source: any) => {
        if (source.url && source.isM3U8 && source.url.includes('.m3u8')) {
          // Use referer from API response if available, otherwise default to animepahe.si
          const referer = source.referer || source.referrer || 'https://animepahe.si'
          sources.push({
            url: source.url,
            quality: source.resolution || 'auto',
            isM3U8: true,
            // Use Cloudflare Worker for vault streams, local proxy for others
            proxyUrl: buildProxyUrl(source.url, referer)
          })
        }
      })
    }

    // Check for subtitles/tracks
    if (data?.tracks || data?.subtitles) {
      const subtitleData = data.tracks || data.subtitles
      if (Array.isArray(subtitleData)) {
        subtitleData.forEach((track: any) => {
          tracks.push({
            src: track.url || track.src,
            label: track.label || track.language || 'Unknown',
            kind: 'subtitles',
            lang: track.lang || track.language || 'en',
            default: track.default || false,
            proxyUrl: buildProxyUrl(track.url || track.src, 'https://animepahe.si')
          })
        })
      }
    }

    return NextResponse.json({
      sources,
      tracks,
      raw: data // Include raw response for debugging
    })
  } catch (error: any) {
    console.error('Animepahe episode sources error:', error)
    return NextResponse.json(
      { error: 'animepahe_sources_error', message: error?.message },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

