import { NextRequest, NextResponse } from 'next/server'
import { ANIME } from '@consumet/extensions'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const episodeId = searchParams.get('episodeId')
  const subOrDub = searchParams.get('subOrDub') || 'sub'
  const server = searchParams.get('server') || 'megaup'

  if (!episodeId) {
    return NextResponse.json(
      { error: 'missing_episode_id', message: 'Missing episodeId parameter' },
      { status: 400 }
    )
  }

  try {
    const animekai = new ANIME.AnimeKai()
    
    // Get servers first
    const subOrDubValue = subOrDub === 'dub' ? 'dub' : 'sub'
    // @ts-ignore - Library type definition issue (SubOrSub vs SubOrDub)
    const servers = await animekai.fetchEpisodeServers(episodeId, subOrDubValue)
    
    if (!servers || servers.length === 0) {
      return NextResponse.json(
        { error: 'no_servers', message: 'No servers available for this episode' },
        { status: 404 }
      )
    }

    // Return server URLs for client-side fetching
    // The client will fetch these directly from the browser to bypass Cloudflare
    return NextResponse.json({
      servers: servers.map((s: any) => ({
        name: s.name,
        url: s.url,
        intro: s.intro,
        outro: s.outro
      })),
      episodeId,
      subOrDub,
      note: 'Fetch these server URLs from the client-side browser to bypass Cloudflare protection'
    })
  } catch (error: any) {
    console.error('AnimeKai servers error:', error)
    return NextResponse.json(
      { error: 'animekai_servers_error', message: error?.message || 'Failed to fetch servers' },
      { status: 502 }
    )
  }
}

export const GET = getHandler



