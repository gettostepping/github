import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { rateLimiters } from '@/lib/security/rate-limit'
import { requireAdmin, getUserFromRequest, getApiKeyFromRequest } from '@/lib/security/auth'
import { logAdminAction } from '@/lib/security/audit'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  try {
    // Check if API key is used for rate limiting
    const { verifyApiKey } = await import('@/lib/security/api-key-auth')
    const apiKeyForRateLimit = await verifyApiKey(req)
    
    // Use API key rate limiter if API key is present, otherwise use admin rate limiter
    if (apiKeyForRateLimit) {
      const rateLimitResult = await rateLimiters.apiKey(req)
      if (rateLimitResult) return rateLimitResult
    } else {
      const rateLimitResult = rateLimiters.admin(req)
      if (rateLimitResult) return rateLimitResult
    }

    // Authentication
    const authResult = await requireAdmin(['owner', 'developer', 'admin'])(req)
    if (authResult) return authResult

    const admin = getUserFromRequest(req)
    const apiKey = getApiKeyFromRequest(req)

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'uid' | 'name' | 'email'
    const query = searchParams.get('query')

    if (!type || !query) {
      return NextResponse.json({ error: 'type and query required' }, { status: 400 })
    }

    let user = null

    switch (type) {
      case 'uid':
        const uid = parseInt(query)
        if (isNaN(uid)) {
          return NextResponse.json({ error: 'Invalid UID' }, { status: 400 })
        }
        user = await prisma.user.findUnique({
          where: { uid },
          include: {
            roles: true,
            profile: true,
            watchlists: true,
            ratings: true,
            comments: true
          }
        })
        break

      case 'name':
        user = await prisma.user.findUnique({
          where: { name: query },
          include: {
            roles: true,
            profile: true,
            watchlists: true,
            ratings: true,
            comments: true
          }
        })
        break

      case 'email':
        user = await prisma.user.findUnique({
          where: { email: query },
          include: {
            roles: true,
            profile: true,
            watchlists: true,
            ratings: true,
            comments: true
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Audit log (if session-based)
    if (admin) {
      await logAdminAction(admin.id, 'user_lookup', req, { 
        targetUserId: user.id,
        searchType: type,
        query
      })
    } else if (apiKey) {
      console.log('[API_KEY]', { 
        keyId: apiKey.id, 
        action: 'user_lookup',
        targetUserId: user.id,
        searchType: type
      })
    }

    // Return full user data including email (admin only)
    return NextResponse.json({
      user: {
        id: user.id,
        uid: user.uid,
        name: user.name,
        email: user.email,
        image: user.image,
        discordId: user.discordId,
        banner: user.banner,
        createdAt: user.createdAt,
        roles: user.roles.map(r => r.name),
        profile: user.profile,
        stats: {
          watchlistCount: user.watchlists.length,
          ratingsCount: user.ratings.length,
          commentsCount: user.comments.length
        }
      }
    })
  } catch (error) {
    console.error('Error looking up user:', error)
    return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)

