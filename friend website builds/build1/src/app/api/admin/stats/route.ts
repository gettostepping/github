import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { rateLimiters } from '@/lib/security/rate-limit'
import { requireAdmin } from '@/lib/security/auth'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  try {
    // Check if API key is used for rate limiting
    const { verifyApiKey } = await import('@/lib/security/api-key-auth')
    const apiKey = await verifyApiKey(req)
    
    // Use API key rate limiter if API key is present, otherwise use admin rate limiter
    if (apiKey) {
      const rateLimitResult = await rateLimiters.apiKey(req)
      if (rateLimitResult) return rateLimitResult
    } else {
      const rateLimitResult = rateLimiters.admin(req)
      if (rateLimitResult) return rateLimitResult
    }

    // Authentication
    const authResult = await requireAdmin(['owner', 'developer', 'admin'])(req)
    if (authResult) return authResult

    // Get all stats in parallel
    const [
      totalUsers,
      activeToday,
      newRegistrations,
      totalBans,
      totalRoles,
      totalComments,
      totalRatings,
      totalWatchlists
    ] = await Promise.all([
      // Total Users
      prisma.user.count(),

      // Active Today (users with presence updated in last 24 hours)
      prisma.presence.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),

      // New This Week
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Total Bans
      prisma.ban.count(),

      // Total Roles Assigned
      prisma.role.count(),

      // Total Comments
      prisma.profileComment.count(),

      // Total Ratings
      prisma.rating.count(),

      // Total Watchlist Items
      prisma.watchlist.count()
    ])

    return NextResponse.json({
      totalUsers,
      activeToday,
      newRegistrations,
      totalBans,
      totalRoles,
      totalComments,
      totalRatings,
      totalWatchlists
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)

