import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(request: NextRequest) {
  try {
    console.log('🔍 Activity API called')
    const session = await getServerSession(authOptions)
    console.log('🔍 Session:', session ? 'Found' : 'Not found')
    console.log('🔍 User email:', session?.user?.email)
    
    if (!session?.user?.email) {
      console.log('❌ No session or email found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { tmdbId, type, season, episode, title, poster } = body
    
    console.log('📊 Activity tracked:', body)
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('👤 User found:', user.name, 'Profile exists:', !!user.profile)

    // Update both current and last watching data
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        lastActiveAt: new Date(),
        // Update current watching
        currentWatchingId: tmdbId ? parseInt(tmdbId) : null,
        currentWatchingTitle: title,
        currentWatchingType: type,
        currentWatchingSeason: season || null,
        currentWatchingEpisode: episode || null,
        currentWatchingPoster: poster || null,
        currentWatchingTmdbId: tmdbId ? parseInt(tmdbId) : null,
        // Also update last watching (this becomes the last watched)
        lastWatchingId: tmdbId ? parseInt(tmdbId) : null,
        lastWatchingTitle: title,
        lastWatchingType: type,
        lastWatchingSeason: season || null,
        lastWatchingEpisode: episode || null,
        lastWatchingPoster: poster || null,
        lastWatchingTmdbId: tmdbId ? parseInt(tmdbId) : null
      },
      create: {
        userId: user.id,
        lastActiveAt: new Date(),
        // Set both current and last watching
        currentWatchingId: tmdbId ? parseInt(tmdbId) : null,
        currentWatchingTitle: title,
        currentWatchingType: type,
        currentWatchingSeason: season || null,
        currentWatchingEpisode: episode || null,
        currentWatchingPoster: poster || null,
        currentWatchingTmdbId: tmdbId ? parseInt(tmdbId) : null,
        lastWatchingId: tmdbId ? parseInt(tmdbId) : null,
        lastWatchingTitle: title,
        lastWatchingType: type,
        lastWatchingSeason: season || null,
        lastWatchingEpisode: episode || null,
        lastWatchingPoster: poster || null,
        lastWatchingTmdbId: tmdbId ? parseInt(tmdbId) : null
      }
    })
    
    console.log('✅ Profile updated successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Activity tracking error:', error)
    return NextResponse.json({ error: 'Failed to track activity' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export const POST = withRequestLogging(postHandler)