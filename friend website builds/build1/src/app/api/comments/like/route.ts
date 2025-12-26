import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { commentId } = await req.json()

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find Comment In Database by ID
    const comment = await prisma.profileComment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check if user already liked this comment
    const existingLike = await prisma.commentLike.findFirst({
      where: {
        commentId: commentId,
        userId: user.id
      }
    })

    if (existingLike) {
      // Unlike the comment
      await prisma.commentLike.delete({
        where: { id: existingLike.id }
      })

      const updated = await prisma.profileComment.update({
        where: { id: commentId },
        data: {
          likes: { decrement: 1 }
        }
      })

      return NextResponse.json({ liked: false, likes: updated.likes })
    } else {
      // Like the comment
      await prisma.commentLike.create({
        data: {
          commentId: commentId,
          userId: user.id
        }
      })

      const updated = await prisma.profileComment.update({
        where: { id: commentId },
        data: {
          likes: { increment: 1 }
        }
      })
      return NextResponse.json({ liked: true, likes: updated.likes })
    }
  } catch (error) {
    console.error('Error toggling comment like:', error)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)