// app/api/admin/invites/[id]/toggle/route.ts
import { NextResponse } from "next/server"
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'
import { NextRequest } from 'next/server'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  // Extract id from URL pathname
  const pathname = req.nextUrl.pathname
  const pathParts = pathname.split('/')
  // The path is /api/admin/invites/[id]/toggle, so id is the 4th segment (index 4)
  const id = pathParts[4] || ''
  
  const invite = await prisma.invites.findUnique({ where: { id } })
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.invites.update({
    where: { id },
    data: { enabled: !invite.enabled },
  })

  return NextResponse.json(updated)
}

export const POST = withRequestLogging(postHandler)
