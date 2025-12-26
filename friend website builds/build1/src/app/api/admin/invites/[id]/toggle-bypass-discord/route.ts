import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  try {
    // Extract id from URL pathname
    const pathname = req.nextUrl.pathname
    const pathParts = pathname.split('/')
    // The path is /api/admin/invites/[id]/toggle-bypass-discord, so id is the 4th segment (index 4)
    const id = pathParts[4] || ''
    
    // Get current invite
    const invite = await prisma.invites.findUnique({
      where: { id }
    })
    
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    
    // Toggle bypassDiscordRequirement
    const updated = await prisma.invites.update({
      where: { id },
      data: { bypassDiscordRequirement: !invite.bypassDiscordRequirement }
    })
    
    console.log(`🔓 Discord bypass ${updated.bypassDiscordRequirement ? 'ENABLED' : 'DISABLED'} for invite: ${updated.code}`)
    
    return NextResponse.json(updated)
  } catch (err) {
    console.error('Error toggling bypass discord requirement:', err)
    return NextResponse.json({ error: 'Failed to toggle bypass discord requirement' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)

