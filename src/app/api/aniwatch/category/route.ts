import { NextRequest, NextResponse } from 'next/server'
import { getAniwatchCategory } from '@/lib/aniwatch'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug') || 'top-airing'
  const page = parseInt(searchParams.get('page') || '1', 10)

  try {
    const data = await getAniwatchCategory(slug, page)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Aniwatch category error:', error)
    return NextResponse.json(
      { error: 'aniwatch_category_error', message: error?.message },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

