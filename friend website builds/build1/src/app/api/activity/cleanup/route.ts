import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(request: NextRequest) {
  try {
    console.log('🧹 Cleanup stale watching data...')
    
    // Find profiles with watching data older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    
    const staleProfiles = await prisma.profile.findMany({
      where: {
        lastWatchingTitle: {
          not: null
        },
        lastActiveAt: {
          lt: thirtyMinutesAgo
        }
      },
      select: {
        id: true,
        userId: true,
        lastWatchingTitle: true
      }
    })
    
    console.log(`📊 Found ${staleProfiles.length} stale profiles`)
    
    // Clear stale watching data
    if (staleProfiles.length > 0) {
      await prisma.profile.updateMany({
        where: {
          id: {
            in: staleProfiles.map(p => p.id)
          }
        },
        data: {
          lastWatchingId: null,
          lastWatchingTitle: null,
          lastWatchingType: null,
          lastWatchingSeason: null,
          lastWatchingEpisode: null,
          lastWatchingPoster: null,
          lastWatchingTmdbId: null
        }
      })
      
      console.log(`✅ Cleared stale data for ${staleProfiles.length} profiles`)
      staleProfiles.forEach(profile => {
        console.log(`   - User ${profile.userId}: ${profile.lastWatchingTitle}`)
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      cleared: staleProfiles.length,
      profiles: staleProfiles.map(p => ({ userId: p.userId, title: p.lastWatchingTitle }))
    })
  } catch (error) {
    console.error('❌ Cleanup error:', error)
    return NextResponse.json({ error: 'Failed to cleanup stale data' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export const POST = withRequestLogging(postHandler)
