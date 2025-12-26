import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(request: NextRequest) {
  try {
    console.log('🛑 Stop watching API called')
    const session = await getServerSession(authOptions)
    console.log('🛑 Session:', session ? 'Found' : 'Not found')
    console.log('🛑 User email:', session?.user?.email)
    
    if (!session?.user?.email) {
      console.log('❌ No session or email found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Clear watching data but keep lastActiveAt updated
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        lastActiveAt: new Date(),
        lastWatchingId: null,
        lastWatchingTitle: null,
        lastWatchingType: null,
        lastWatchingSeason: null,
        lastWatchingEpisode: null,
        lastWatchingPoster: null,
        lastWatchingTmdbId: null
      },
      create: {
        userId: user.id,
        lastActiveAt: new Date(),
        lastWatchingId: null,
        lastWatchingTitle: null,
        lastWatchingType: null,
        lastWatchingSeason: null,
        lastWatchingEpisode: null,
        lastWatchingPoster: null,
        lastWatchingTmdbId: null
      }
    })
    
    console.log('✅ Stop watching tracked successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Stop watching error:', error)
    return NextResponse.json({ error: 'Failed to stop watching' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export const POST = withRequestLogging(postHandler)
