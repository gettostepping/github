import { NextRequest, NextResponse } from 'next/server'
import { searchAniwatch } from '@/lib/aniwatch'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1', 10)

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  try {
    const data = await searchAniwatch(query, page)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Aniwatch search error:', error)
    return NextResponse.json(
      { error: 'aniwatch_search_error', message: error?.message },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

