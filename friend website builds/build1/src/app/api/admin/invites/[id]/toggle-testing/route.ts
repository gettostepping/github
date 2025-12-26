import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  try {
    // Extract id from URL pathname
    const pathname = req.nextUrl.pathname
    const pathParts = pathname.split('/')
    // The path is /api/admin/invites/[id]/toggle-testing, so id is the 4th segment (index 4)
    const id = pathParts[4] || ''
    
    // Get current invite
    const invite = await prisma.invites.findUnique({
      where: { id }
    })
    
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    
    // Toggle testing mode
    const updated = await prisma.invites.update({
      where: { id },
      data: { testingMode: !invite.testingMode }
    })
    
    console.log(`🧪 Testing mode ${updated.testingMode ? 'ENABLED' : 'DISABLED'} for invite: ${updated.code}`)
    
    return NextResponse.json(updated)
  } catch (err) {
    console.error('Error toggling testing mode:', err)
    return NextResponse.json({ error: 'Failed to toggle testing mode' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)

