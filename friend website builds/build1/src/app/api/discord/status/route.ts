import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const uidParam = searchParams.get('uid')

  if (!uidParam) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
  }

  try {
    // Get the user's Discord ID from your user table
    const user = await prisma.user.findUnique({
      where: { id: uidParam },
      select: { discordId: true, profile: true }
    })

    if (!user?.discordId) {
      return NextResponse.json({ error: 'Discord ID not found' }, { status: 404 })
    }

    // Fetch presence from DiscordPresence table
    const presence = await prisma.discordPresence.findUnique({
      where: { userId: user.discordId }
    })

    if (!presence) {
      return NextResponse.json({ status: 'offline', activities: [] })
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    const isCurrentlyActive = user.profile?.lastActiveAt && new Date(user.profile.lastActiveAt) > twoMinutesAgo

    const websiteStatus = isCurrentlyActive ? 'online' : 'offline'

    const result = {
      status: presence.status,
      websiteStatus: websiteStatus,
      activities: presence.activityName
        ? [{
            name: presence.activityName,
            type: presence.activityType || 'UNKNOWN',
            details: 'Live from Discord'
          }]
        : []
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching Discord status:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export const GET = withRequestLogging(getHandler)
