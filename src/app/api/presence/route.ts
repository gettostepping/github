import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })
  
  const body = await req.json().catch(() => ({}))
  const { currentPage, pageType, mediaType } = body
  
  // Get the user ID from the database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  
  if (!user) return NextResponse.json({ ok: false }, { status: 404 })
  
  await prisma.presence.upsert({
    where: { userId: user.id },
    update: { 
      updatedAt: new Date(),
      currentPage: currentPage || null,
      pageType: pageType || null,
      mediaType: mediaType || null
    },
    create: { 
      userId: user.id,
      currentPage: currentPage || null,
      pageType: pageType || null,
      mediaType: mediaType || null,
      updatedAt: new Date()
    },
  })

  // Only clear current watching data if user is not on a watch page
  // Keep lastWatching data for "Last Watching" display
  if (currentPage && !currentPage.startsWith('watch/')) {
    await prisma.profile.updateMany({
      where: { userId: user.id },
      data: {
        // Only clear current watching, keep last watching
        currentWatchingId: null,
        currentWatchingTitle: null,
        currentWatchingType: null,
        currentWatchingSeason: null,
        currentWatchingEpisode: null,
        currentWatchingPoster: null,
        currentWatchingTmdbId: null
      }
    })
  }
  
  // Update the user's profile lastActiveAt
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      lastActiveAt: new Date()
    },
    create: {
      userId: user.id,
      lastActiveAt: new Date()
    }
  })
  return NextResponse.json({ ok: true })
}

export const POST = withRequestLogging(postHandler)

async function getHandler(req: NextRequest) {
  const fiveMin = new Date(Date.now() - 5 * 60 * 1000)
  const online = await prisma.presence.findMany({ 
    where: { updatedAt: { gt: fiveMin } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          uid: true
        }
      }
    }
  })
  return NextResponse.json({ online })
}

export const GET = withRequestLogging(getHandler)


