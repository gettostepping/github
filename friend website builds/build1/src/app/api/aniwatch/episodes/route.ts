import { NextRequest, NextResponse } from 'next/server'
import { getAniwatchEpisodes } from '@/lib/aniwatch'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'missing_id', message: 'Missing anime id' },
      { status: 400 }
    )
  }

  try {
    const data = await getAniwatchEpisodes(id)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Aniwatch episodes error:', error)
    return NextResponse.json(
      { error: 'aniwatch_episodes_error', message: error?.message },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

