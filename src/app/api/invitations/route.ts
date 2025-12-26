import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'
import { NextRequest } from 'next/server'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user UID from email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { uid: true }
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const invites = await prisma.invites.findMany({
      where: {
        OR: [
          { issuerId: user.uid.toString() },
          { 
            AND: [
              { issuerId: 'admin' }, // Mass invites from admin
              { targetUserId: user.uid } // Only show mass invites created for this user
            ]
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
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
          // Special case: admin-issued invites (mass invites)
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

export const GET = withRequestLogging(getHandler)
