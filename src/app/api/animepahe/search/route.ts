import { NextRequest, NextResponse } from 'next/server'
import { searchAnimepahe } from '@/lib/animepahe'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const page = searchParams.get('page') || '1'

  if (!query) {
    return NextResponse.json(
      { error: 'missing_query', message: 'Missing query parameter' },
      { status: 400 }
    )
  }

  try {
    console.log('🔍 Animepahe search API called with query:', query, 'page:', page)
    const data = await searchAnimepahe(query, parseInt(page, 10))
    console.log('📦 Animepahe search API response:', JSON.stringify(data).substring(0, 500))
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('❌ Animepahe search error:', error)
    return NextResponse.json(
      { error: 'animepahe_search_error', message: error?.message },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

