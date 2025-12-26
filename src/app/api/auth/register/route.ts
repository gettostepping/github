import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  try {
    const { email, password, name, code } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const invite = await prisma.invites.findUnique({ where: { code } })
    if (!invite || !invite.enabled) {
      return NextResponse.json({ error: 'Invalid invitation code' }, { status: 400 })
    }
    if (invite.usedBy >= 1) {
      return NextResponse.json({ error: 'Invitation code already used' }, { status: 400 })
    }

    // Check if user already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const existingName = await prisma.user.findUnique({ where: { name } })
    if (existingName) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const newUid = await getNextUid()

    // Check if invite has bypassDiscordRequirement flag
    const bypassDiscordLink = invite.bypassDiscordRequirement || false

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        uid: newUid,
        profile: { create: { bio: '' } },
        image: '/noprofilepicture.jpg',
        bypassDiscordLink
      },
    })

    // Mark invite as used
    await prisma.invites.update({
      where: { code },
      data: { usedBy: newUid },
    })

    return NextResponse.json({ ok: true, user })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)

// Generate next UID - never reuse deleted UIDs
async function getNextUid(): Promise<number> {
  // Get highest UID from active users
  const lastUser = await prisma.user.findFirst({ 
    orderBy: { uid: 'desc' }, 
    select: { uid: true } 
  })
  
  // Get highest UID from deleted users
  const lastDeletedUser = await prisma.trackedIdentity.findFirst({
    orderBy: { originalUid: 'desc' },
    select: { originalUid: true },
    where: { originalUid: { not: null } }
  })
  
  // Use the highest UID from either active or deleted users
  const highestUid = Math.max(lastUser?.uid ?? 0, lastDeletedUser?.originalUid ?? 0)
  return highestUid + 1
}
