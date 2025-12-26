import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

// Store invite codes temporarily for Discord registration
const pendingRegistrations = new Map<string, { inviteCode: string, timestamp: number }>()

// Clean up old entries (older than 10 minutes)
setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000
  for (const [key, value] of pendingRegistrations.entries()) {
    if (value.timestamp < tenMinutesAgo) {
      pendingRegistrations.delete(key)
    }
  }
}, 60 * 1000) // Run every minute

async function postHandler(req: NextRequest) {
  try {
    const { inviteCode } = await req.json()
    
    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
    }
    
    // Validate the invite code exists and is valid
    const invite = await prisma.invites.findUnique({
      where: { code: inviteCode }
    })
    
    if (!invite || !invite.enabled) {
      return NextResponse.json({ error: 'Invalid or disabled invitation code' }, { status: 400 })
    }
    
    if (invite.usedBy && invite.usedBy > 0) {
      return NextResponse.json({ error: 'Invitation code already used' }, { status: 400 })
    }
    
    // Generate a unique session ID
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36)
    
    // Store the invite code temporarily
    pendingRegistrations.set(sessionId, {
      inviteCode,
      timestamp: Date.now()
    })
    
    return NextResponse.json({ sessionId })
  } catch (error) {
    console.error('Error preparing Discord registration:', error)
    return NextResponse.json({ error: 'Failed to prepare registration' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }
    
    const session = pendingRegistrations.get(sessionId)
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 })
    }
    
    // Return the invite code and remove it from memory
    const { inviteCode } = session
    pendingRegistrations.delete(sessionId)
    
    return NextResponse.json({ inviteCode })
  } catch (error) {
    console.error('Error retrieving Discord registration session:', error)
    return NextResponse.json({ error: 'Failed to retrieve session' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)
export const GET = withRequestLogging(getHandler)

