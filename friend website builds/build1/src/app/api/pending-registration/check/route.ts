import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  try {
    const { discordId, email } = await req.json()
    
    if (!discordId && !email) {
      return NextResponse.json({ error: 'Discord ID or email required' }, { status: 400 })
    }
    
    // Check if there's a pending registration
    const pending = await prisma.pendingRegistration.findFirst({
      where: discordId ? { discordId } : { email },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!pending) {
      return NextResponse.json({ status: 'not_found' })
    }
    
    return NextResponse.json({ 
      status: pending.status,
      id: pending.id
    })
    
  } catch (error) {
    console.error('Error checking registration status:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export const POST = withRequestLogging(postHandler)

