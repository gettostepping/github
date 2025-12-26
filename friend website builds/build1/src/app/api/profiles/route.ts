import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { sanitizeUser } from '@/lib/security/sanitize'
import { verifyApiKey, hasApiKeyPermission } from '@/lib/security/api-key-auth'
import { rateLimiters } from '@/lib/security/rate-limit'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  const key = new URL(req.url).searchParams.get('uid')
  if (!key) return NextResponse.json({ error: 'uid required' }, { status: 400 })

  // Check API key authentication for public API
  const apiKey = await verifyApiKey(req)
  const session = await getServerSession(authOptions)
  
  // If API key is used, check permissions and rate limit
  if (apiKey) {
    // Check if has public.profiles.read, public.*, admin.*, or * permission
    // admin.* should have access to all endpoints including public ones
    const hasAccess = hasApiKeyPermission(apiKey, 'public.profiles.read') || 
                      hasApiKeyPermission(apiKey, 'public.*') || 
                      hasApiKeyPermission(apiKey, 'admin.*') ||
                      hasApiKeyPermission(apiKey, '*')
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions. Requires public.profiles.read' }, { status: 403 })
    }
    
    // Apply rate limiting for API keys
    const rateLimitResult = await rateLimiters.apiKey(req)
    if (rateLimitResult) return rateLimitResult
  } else if (!session?.user?.email) {
    // Allow unauthenticated users to view profiles (optional - can require auth)
     return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get current session for profile view tracking
  const currentUserId = session?.user?.email ? 
    (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id : null

  // Resolve to internal user id from either numeric uid, email, or direct userId
  let user = null as any
  // Try numeric uid
  if (/^\d+$/.test(key)) {
    user = await prisma.user.findFirst({ where: { uid: Number(key) } })
  }
  // Try email
  if (!user && key.includes('@')) {
    user = await prisma.user.findFirst({ where: { email: key } })
  }
  // Fallback: assume it's the internal userId (cuid)
  if (!user) {
    user = await prisma.user.findFirst({ where: { id: key } })
  }

  if (!user) {
    user = await prisma.user.findFirst({ where: { name: key } })
  }

  // If no user found, return 404
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  const presence = await prisma.presence.findUnique({ where: { userId: user.id } })
  
  // Track profile view if user is authenticated and viewing someone else's profile
  if (currentUserId && user && currentUserId !== user.id && profile) {
    try {
      await prisma.profileView.create({
        data: {
          profileId: profile.id,
          viewerId: currentUserId
        }
      })
    } catch (error) {
      // Ignore duplicate view errors
      console.log('Profile view already tracked or error:', error)
    }
  }
  
  // If user is viewing a profile, fetch that profile's info
  let viewedProfile = null
  if (presence?.currentPage?.startsWith('Profile:')) {
    const viewedUid = presence.currentPage.split(':')[1]
    const viewedUser = await prisma.user.findFirst({ where: { uid: Number(viewedUid) } })
    if (viewedUser) {
      viewedProfile = {
        uid: viewedUser.uid,
        name: viewedUser.name
      }
    }
  }
  
  const views = profile ? await prisma.profileView.findMany({ 
    where: { profileId: profile.id }, 
    orderBy: { createdAt: 'desc' }, 
    take: 50 
  }) : []

  // Manually fetch viewer information for each view
  const viewsWithViewers = await Promise.all(
    views.map(async (view) => {
      if (view.viewerId) {
        const viewer = await prisma.user.findUnique({
          where: { id: view.viewerId },
          select: { uid: true, name: true, image: true }
        })
        return { ...view, viewer }
      }
      return { ...view, viewer: null }
    })
  )
  const comments = profile ? await prisma.profileComment.findMany({ 
    where: { profileId: profile.id }, 
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          uid: true,
          discordId: true
        }
      },
      likedBy: {
        include: {
          user: {
            select: {
              id: true,
              uid: true,
              name: true,
              image: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }, 
    take: 50 
  }) : []

  // Check if current user is viewing their own profile or is admin
  const isSelf = currentUserId === user.id
  const isAdmin = session?.user?.email ? (await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { roles: true }
  }))?.roles.some(r => ['owner', 'developer', 'admin'].includes(r.name.toLowerCase())) : false

  // Sanitize user data
  const sanitizedUser = user ? sanitizeUser(
    {
      id: user.id,
      uid: user.uid,
      name: user.name,
      image: user.image,
      email: user.email,
      createdAt: user.createdAt,
      discordId: user.discordId,
      banner: user.banner,
      bypassDiscordLink: user.bypassDiscordLink
    },
    {
      isSelf,
      isAdmin,
      includeEmail: isSelf || isAdmin
    }
  ) : null

  return NextResponse.json({ 
    user: sanitizedUser,
    profile, 
    presence,
    viewedProfile,
    views: viewsWithViewers, 
    comments 
  })
}

async function putHandler(req: NextRequest) {
  // Block public API keys from write operations
  const { blockPublicApiWrites } = await import('@/lib/security/auth')
  const writeBlock = await blockPublicApiWrites()(req)
  if (writeBlock) return writeBlock

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { 
      bio, 
      themeAccent, 
      customAvatar, 
      customBanner,
      profileLayout,
      showStats,
      showLastWatching,
      showComments,
      customCss,
      profileBadges,
      profileEffects
    } = await req.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { roles: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has premium/vip for advanced features
    const isPremium = user.roles.some(r => r.name.toLowerCase() === 'premium')
    const isVip = user.roles.some(r => r.name.toLowerCase() === 'vip')
    
    const updateData: any = {
      bio: bio || null,
      themeAccent: themeAccent || null,
      customAvatar: customAvatar || null,
      customBanner: customBanner || null,
      profileLayout: profileLayout || 'default',
      showStats: showStats !== false,
      showLastWatching: showLastWatching !== false,
      showComments: showComments !== false
    }

    // Only allow VIP features for VIP users
    if (isVip) {
      updateData.customCss = customCss || null
      updateData.profileBadges = profileBadges || []
      updateData.profileEffects = profileEffects || []
    }

    // Update profile
    const updatedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
        lastActiveAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, profile: updatedProfile })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
export const PUT = withRequestLogging(putHandler)


