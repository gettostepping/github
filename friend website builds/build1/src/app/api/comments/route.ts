import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

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
    const { profileId, content } = await req.json()
    
    if (!profileId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Comment too long' }, { status: 400 })
    }

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if the profile exists
    const profile = await prisma.profile.findUnique({
      where: { id: profileId }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Create the comment
    const comment = await prisma.profileComment.create({
      data: {
        profileId,
        authorId: user.id,
        body: content.trim()
      }
    })

    return NextResponse.json({ success: true, comment })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}

async function getHandler(req: NextRequest) {
  const { verifyApiKey, hasApiKeyPermission } = await import('@/lib/security/api-key-auth')
  const { rateLimiters } = await import('@/lib/security/rate-limit')
  
  const apiKey = await verifyApiKey(req)
  
  // If API key is used, check permissions and rate limit
  if (apiKey) {
    // Check if has public.comments.read, public.*, admin.*, or * permission
    // admin.* grants access to all endpoints including public ones
    const hasAccess = hasApiKeyPermission(apiKey, 'public.comments.read') || 
                      hasApiKeyPermission(apiKey, 'public.*') || 
                      hasApiKeyPermission(apiKey, 'admin.*') ||
                      hasApiKeyPermission(apiKey, '*')
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions. Requires public.comments.read' }, { status: 403 })
    }
    
    // Apply rate limiting for API keys
    const rateLimitResult = await rateLimiters.apiKey(req)
    if (rateLimitResult) return rateLimitResult
  }

  const { searchParams } = new URL(req.url)
  const profileId = searchParams.get('profileId')

  if (!profileId) {
    return NextResponse.json({ error: 'Profile ID required' }, { status: 400 })
  }

  try {
    const comments = await prisma.profileComment.findMany({
      where: { profileId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            uid: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

async function deleteHandler(req: NextRequest) {
  // Block public API keys from write operations
  const { blockPublicApiWrites } = await import('@/lib/security/auth')
  const writeBlock = await blockPublicApiWrites()(req)
  if (writeBlock) return writeBlock

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { commentId } = await req.json()
    
    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
    }

    // Get the current user with roles
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { roles: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the comment to check ownership
    const comment = await prisma.profileComment.findUnique({
      where: { id: commentId },
      include: {
        profile: {
          include: {
            user: true
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check if user can delete (author, profile owner, or staff above trial_mod)
    const canDelete = 
      comment.authorId === user.id || 
      comment.profile.user.email === session.user.email ||
      user.roles.some(r => ['owner', 'developer', 'admin'].includes(r.name.toLowerCase()))

    if (!canDelete) {
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 })
    }

    // Delete the comment
    await prisma.profileComment.delete({
      where: { id: commentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // 👇👇👇 ADD THIS
    console.error("Error deleting comment:", error)
    // 👆 This prints the real issue in your terminal where Next.js runs.

    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
export const POST = withRequestLogging(postHandler)
export const DELETE = withRequestLogging(deleteHandler)
