import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

// Toggle invite
async function postHandler(req: NextRequest) {
  try {
    // Extract id from URL pathname
    const pathname = req.nextUrl.pathname
    const id = pathname.split('/').pop() || ''
    
    const invite = await prisma.invites.findUnique({ where: { id } })
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

    const updated = await prisma.invites.update({
      where: { id },
      data: { enabled: !invite.enabled }
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to toggle invite' }, { status: 500 })
  }
}

// DELETE invite
async function deleteHandler(req: NextRequest) {
  try {
    // Extract id from URL pathname
    const pathname = req.nextUrl.pathname
    const id = pathname.split('/').pop() || ''
    
    // Check if invite exists first
    const invite = await prisma.invites.findUnique({ where: { id } })
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    
    await prisma.invites.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    // Handle Prisma P2025 error (record not found)
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)
export const DELETE = withRequestLogging(deleteHandler)
