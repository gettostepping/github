import { NextRequest, NextResponse } from 'next/server'
import { searchAnimepahe, getAnimepaheReleases, getAnimepahePlay } from '@/lib/animepahe'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const testType = searchParams.get('type') || 'search'
  const query = searchParams.get('q') || 'one piece'
  const session = searchParams.get('session')
  const episodeId = searchParams.get('episodeId')

  try {
    let result: any = {}

    switch (testType) {
      case 'search':
        console.log('🔍 Testing Animepahe search:', query)
        result = await searchAnimepahe(query)
        return NextResponse.json({
          success: true,
          type: 'search',
          query,
          result: result
        })

      case 'releases':
        if (!session) {
          return NextResponse.json(
            { error: 'Missing session parameter' },
            { status: 400 }
          )
        }
        console.log('📋 Testing Animepahe releases:', session)
        result = await getAnimepaheReleases(session)
        return NextResponse.json({
          success: true,
          type: 'releases',
          session,
          result: result
        })

      case 'play':
        if (!session || !episodeId) {
          return NextResponse.json(
            { error: 'Missing session or episodeId parameter' },
            { status: 400 }
          )
        }
        console.log('🎬 Testing Animepahe play:', { session, episodeId })
        result = await getAnimepahePlay(session, episodeId)
        
        // Check if result contains m3u8 links
        const hasM3U8 = JSON.stringify(result).includes('.m3u8')
        const sources = result?.data || result?.sources || []
        const m3u8Sources = sources.filter((s: any) => 
          s.url?.includes('.m3u8') || s.src?.includes('.m3u8')
        )

        return NextResponse.json({
          success: true,
          type: 'play',
          session,
          episodeId,
          hasM3U8,
          m3u8Sources,
          result: result
        })

      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: search, releases, or play' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Animepahe test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

export const GET = getHandler

