import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  const { verifyApiKey, hasApiKeyPermission } = await import('@/lib/security/api-key-auth')
  const { rateLimiters } = await import('@/lib/security/rate-limit')
  
  const apiKey = await verifyApiKey(req)
  const session = await getServerSession(authOptions)
  
  // If API key is used, check permissions and rate limit
  if (apiKey) {
    // Check if has public.ratings.read, public.*, admin.*, or * permission
    // admin.* grants access to all endpoints including public ones
    const hasAccess = hasApiKeyPermission(apiKey, 'public.ratings.read') || 
                      hasApiKeyPermission(apiKey, 'public.*') || 
                      hasApiKeyPermission(apiKey, 'admin.*') ||
                      hasApiKeyPermission(apiKey, '*')
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions. Requires public.ratings.read' }, { status: 403 })
    }
    
    // Apply rate limiting for API keys
    const rateLimitResult = await rateLimiters.apiKey(req)
    if (rateLimitResult) return rateLimitResult
  } else if (!session?.user?.email) {
    // Allow unauthenticated users to view ratings (optional)
    // return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type')

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'tmdbId and type required' }, { status: 400 })
  }

  try {
    // Get average rating for this item (always available)
    const avgRating = await prisma.rating.aggregate({
      where: {
        tmdbId: parseInt(tmdbId),
        type: type
      },
      _avg: {
        rating: true
      },
      _count: {
        rating: true
      }
    })

    // Get user's rating only if authenticated via session (not API key)
    let userRating = null
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (user) {
        const ratingRecord = await prisma.rating.findUnique({
          where: {
            user_tmdb_type: {
              userId: user.id,
              tmdbId: parseInt(tmdbId),
              type: type
            }
          }
        })
        userRating = ratingRecord?.rating || null
      }
    }

    return NextResponse.json({
      userRating: userRating,
      averageRating: avgRating._avg.rating || 0,
      totalRatings: avgRating._count.rating || 0
    })
  } catch (error) {
    console.error('Error fetching ratings:', error)
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
  }
}

async function postHandler(req: NextRequest) {
  // Block public API keys from write operations
  const { blockPublicApiWrites } = await import('@/lib/security/auth')
  const writeBlock = await blockPublicApiWrites()(req)
  if (writeBlock) return writeBlock

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { tmdbId, type, rating } = await req.json()

    if (!tmdbId || !type || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating data' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Upsert rating
    const ratingRecord = await prisma.rating.upsert({
      where: {
        user_tmdb_type: {
          userId: user.id,
          tmdbId: parseInt(tmdbId),
          type: type
        }
      },
      update: {
        rating: rating
      },
      create: {
        userId: user.id,
        tmdbId: parseInt(tmdbId),
        type: type,
        rating: rating
      }
    })

    // Get updated average rating
    const avgRating = await prisma.rating.aggregate({
      where: {
        tmdbId: parseInt(tmdbId),
        type: type
      },
      _avg: {
        rating: true
      },
      _count: {
        rating: true
      }
    })

    return NextResponse.json({
      success: true,
      rating: ratingRecord.rating,
      averageRating: avgRating._avg.rating || 0,
      totalRatings: avgRating._count.rating || 0
    })
  } catch (error) {
    console.error('Error saving rating:', error)
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
export const POST = withRequestLogging(postHandler)
