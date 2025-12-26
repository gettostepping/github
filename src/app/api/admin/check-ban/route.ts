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
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for active bans
    const activeBans = await prisma.ban.findMany({
      where: {
        userId: user.id,
        OR: [
          { bannedUntil: null },
          { bannedUntil: { gt: new Date() } }
        ]
      }
    })

    const isBanned = activeBans.length > 0
    const banInfo = isBanned ? {
      reason: activeBans[0].reason,
      bannedUntil: activeBans[0].bannedUntil
    } : null

    return NextResponse.json({ 
      isBanned, 
      banInfo 
    })
  } catch (error) {
    console.error('Error checking ban status:', error)
    return NextResponse.json({ error: 'Failed to check ban status' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
