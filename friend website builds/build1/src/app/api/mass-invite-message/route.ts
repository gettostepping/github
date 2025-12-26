import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

// GET: Check for unread mass invite message
async function getHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, lastMassInviteMessageId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the absolute most recent message (by finding the most recent invite with a message)
    // Only show it if the user hasn't seen this specific messageId
    const mostRecentInvite = await prisma.invites.findFirst({
      where: {
        massInviteMessage: { not: null },
        massInviteMessageId: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        massInviteMessage: true,
        massInviteMessageId: true,
        createdAt: true
      }
    })

    if (!mostRecentInvite || !mostRecentInvite.massInviteMessageId) {
      return NextResponse.json({ message: null })
    }

    // Only show if this is a different message than what the user last saw
    if (user.lastMassInviteMessageId === mostRecentInvite.massInviteMessageId) {
      return NextResponse.json({ message: null })
    }

    return NextResponse.json({
      message: mostRecentInvite.massInviteMessage,
      messageId: mostRecentInvite.massInviteMessageId
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to check for messages' }, { status: 500 })
  }
}

// POST: Mark message as read
async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { messageId } = await req.json()
    if (!messageId) {
      return NextResponse.json({ error: 'messageId required' }, { status: 400 })
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: { lastMassInviteMessageId: messageId }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to mark message as read' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
export const POST = withRequestLogging(postHandler)

