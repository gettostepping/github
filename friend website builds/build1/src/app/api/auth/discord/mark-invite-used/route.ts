import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { inviteCode } = await req.json()
    
    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
    }
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Check if user was recently created (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (user.createdAt < fiveMinutesAgo) {
      return NextResponse.json({ error: 'User account is too old for invite validation' }, { status: 400 })
    }
    
    // Find the invite code
    const invite = await prisma.invites.findUnique({
      where: { code: inviteCode }
    })
    
    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }
    
    if (!invite.enabled) {
      return NextResponse.json({ error: 'Invite code is disabled' }, { status: 400 })
    }
    
    if (invite.usedBy && invite.usedBy > 0) {
      // Already used, but check if it was used by this user
      if (invite.usedBy === user.uid) {
        return NextResponse.json({ success: true, message: 'Invite already marked as used by you' })
      }
      return NextResponse.json({ error: 'Invite code already used by another user' }, { status: 400 })
    }
    
    // Mark the invite as used
    await prisma.invites.update({
      where: { code: inviteCode },
      data: { usedBy: user.uid }
    })
    
    console.log(`✅ Marked invite ${inviteCode} as used by UID ${user.uid}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Invite code marked as used successfully' 
    })
    
  } catch (error) {
    console.error('Error marking invite as used:', error)
    return NextResponse.json({ error: 'Failed to mark invite as used' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export const POST = withRequestLogging(postHandler)

