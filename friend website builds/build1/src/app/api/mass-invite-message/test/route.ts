import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

// POST: Set a test message for the current user
async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { message } = await req.json()
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use a consistent test messageId for this user so we can track it
    const testMessageId = `test_user_${user.id}`
    
    // First, delete any existing test invites for this user to avoid duplicates
    try {
      await prisma.invites.deleteMany({
        where: {
          massInviteMessageId: testMessageId
        }
      })
    } catch (err) {
      // Ignore errors - field might not exist yet
    }

    // Clear the user's last seen message so the test will show
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastMassInviteMessageId: null } as any
      })
    } catch (err: any) {
      // If field doesn't exist yet, that's okay
      if (!err.message?.includes('lastMassInviteMessageId')) {
        throw err
      }
    }

    // Create a test invite with the message
    // Note: These fields may not exist until migration is run
    await prisma.invites.create({
      data: {
        code: `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        issuerId: 'admin',
        enabled: true,
        usedBy: 0,
        massInviteMessage: message.trim(),
        massInviteMessageId: testMessageId,
      } as any
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Test message sent. Refresh the page to see the modal.' 
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to send test message' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)

