import { NextRequest, NextResponse } from 'next/server'
import { getAniwatchSchedule } from '@/lib/aniwatch'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const startParam = searchParams.get('start')
  const days = Math.min(
    Math.max(parseInt(searchParams.get('days') || '5', 10), 1),
    14
  )

  const startDate = startParam ? new Date(startParam) : new Date()
  startDate.setHours(0, 0, 0, 0)

  try {
    const results = []
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      const formatted = formatDate(currentDate)
      const data: any = await getAniwatchSchedule(formatted)
      results.push({
        date: formatted,
        scheduledAnimes: data.scheduledAnimes || []
      })
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('Aniwatch schedule error:', error)
    return NextResponse.json(
      { error: 'aniwatch_schedule_error', message: error?.message },
      { status: 502 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

