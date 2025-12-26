import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  try {
    const invites = await prisma.invites.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Fetch user details for each invite (both issuer and used by)
    const invitesWithUsers = await Promise.all(
      invites.map(async (invite) => {
        let usedByUser = null
        let issuerUser = null
        
        // Fetch "Used By" user details
        if (invite.usedBy > 0) {
          const foundUser = await prisma.user.findUnique({
            where: { uid: invite.usedBy },
            select: { uid: true, name: true }
          })
          
          // If user doesn't exist (deleted/banned), check TrackedIdentity for their name
          if (!foundUser) {
            const trackedUser = await prisma.trackedIdentity.findFirst({
              where: { originalUid: invite.usedBy },
              select: { name: true }
            })
            
            usedByUser = { 
              uid: invite.usedBy, 
              name: trackedUser?.name || null,
              deleted: true 
            }
          } else {
            usedByUser = foundUser
          }
        }
        
        // Fetch "Issuer" user details
        if (invite.issuerId === 'admin') {
          // Special case: admin-issued invites
          issuerUser = { 
            uid: 0, 
            name: 'Admin',
            deleted: false 
          }
        } else {
          const issuerUid = invite.issuerId ? parseInt(invite.issuerId) : NaN
          if (!isNaN(issuerUid)) {
            const foundIssuer = await prisma.user.findUnique({
              where: { uid: issuerUid },
              select: { uid: true, name: true }
            })
            
            // If issuer doesn't exist (deleted/banned), check TrackedIdentity
            if (!foundIssuer) {
              const trackedIssuer = await prisma.trackedIdentity.findFirst({
                where: { originalUid: issuerUid },
                select: { name: true }
              })
              
              issuerUser = { 
                uid: issuerUid, 
                name: trackedIssuer?.name || null,
                deleted: true 
              }
            } else {
              issuerUser = foundIssuer
            }
          }
        }
        
        return { ...invite, usedByUser, issuerUser }
      })
    )

    return NextResponse.json(invitesWithUsers)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }
}

async function postHandler(req: NextRequest) {
  try {
    const { targetUid, count, bypassDiscordRequirement } = await req.json()
    const num = Math.max(1, count || 1)
    const bypassDiscord = bypassDiscordRequirement === true

    // Individual invites are always issued by "admin"
    const invitesData = Array.from({ length: num }, () => ({
      code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      issuerId: 'admin', // Individual invites are always from admin
      enabled: true,
      usedBy: 0,
      bypassDiscordRequirement: bypassDiscord
    }))

    // Use createMany to insert all invites
    await prisma.invites.createMany({
      data: invitesData,
      skipDuplicates: true
    })

    // Return the created invite objects (simulate fetching them)
    return NextResponse.json(invitesData)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create invite(s)' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
export const POST = withRequestLogging(postHandler)
