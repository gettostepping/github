import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'
import { NextRequest } from 'next/server'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json()
    const count = Number(body.count) || 1
    const message = body.message?.trim() || null
    const bypassDiscordRequirement = body.bypassDiscordRequirement === true

    // Fetch all users (not just admin)
    const users = await prisma.user.findMany({ select: { uid: true } })

    // Generate unique message ID for this mass invite batch
    const messageId = message ? `mass_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : null

    const invitesData = []

    for (const user of users) {
      for (let i = 0; i < count; i++) {
        invitesData.push({
          code: Math.random().toString(36).substring(2, 10).toUpperCase(),
          issuerId: 'admin', // Mass invites are always from admin
          enabled: true,
          usedBy: 0,
          massInviteMessage: message,
          massInviteMessageId: messageId,
          targetUserId: user.uid, // Track which user this invite belongs to
          bypassDiscordRequirement: bypassDiscordRequirement
        })
      }
    }

    await prisma.invites.createMany({
      data: invitesData,
      skipDuplicates: true,
    })

    return NextResponse.json(invitesData) // return full data for frontend table
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create mass invites' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)
