import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Get user's presence data to determine website status
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        profile: true,
        presence: true
      }
    })

    if (!user) {
      await prisma.$disconnect()
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Determine website status (more lenient than Discord status)
    let status = 'offline'
    let activity = null

    // Check if user is currently active (within last 15 minutes for website)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const isCurrentlyActive = user.profile?.lastActiveAt && new Date(user.profile.lastActiveAt) > fifteenMinutesAgo

    if (isCurrentlyActive) {
      status = 'online'
      
      // If user has current page data, show that as activity
      if (user.presence?.currentPage) {
        activity = {
          name: user.presence.currentPage,
          type: 'PLAYING',
          details: 'On the streaming platform'
        }
      }
      
      // If user has current watching data, show that instead
      if (user.profile?.currentWatchingTitle) {
        activity = {
          name: user.profile.currentWatchingTitle,
          type: 'WATCHING',
          details: user.profile.currentWatchingType === 'tv' 
            ? `Season ${user.profile.currentWatchingSeason}, Episode ${user.profile.currentWatchingEpisode}`
            : 'Movie'
        }
      }
    }

    const result = {
      status,
      activities: activity ? [activity] : []
    }

    await prisma.$disconnect()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching website status:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
