import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

// Helper function to get next available UID (never reuse deleted UIDs)
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

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json()
    const { discordId, email, name, avatar, banner, password, inviteCode } = body
    
    // Validation
    if (!discordId || !email || !name || !password || !inviteCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }
    
    // Validate invite code
    const invite = await prisma.invites.findUnique({
      where: { code: inviteCode }
    })
    
    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invitation code' },
        { status: 400 }
      )
    }
    
    if (!invite.enabled) {
      return NextResponse.json(
        { error: 'This invitation code has been disabled' },
        { status: 400 }
      )
    }
    
    if (invite.usedBy !== 0) {
      return NextResponse.json(
        { error: 'This invitation code has already been used' },
        { status: 400 }
      )
    }
    
    // Build avatar and banner URLs
    const avatarUrl = avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png`
      : '/noprofilepicture.jpg'
    
    const bannerUrl = banner
      ? `https://cdn.discordapp.com/banners/${discordId}/${banner}.${banner.startsWith('a_') ? 'gif' : 'png'}`
      : null
    
    // Check if this invite is in testing mode (bypasses multi-account detection)
    const isTestingMode = invite.testingMode || false
    
    if (isTestingMode) {
      console.log(`✅ Invite code is in TESTING MODE - bypassing multi-account detection`)
    }
    
    // Check if this is a tracked identity (deleted/banned account attempting to re-register)
    // Skip this check if invite is in testing mode
    let isTracked = null
    let trackedByDiscord = null
    let trackedByEmail = null
    
    if (!isTestingMode) {
      trackedByDiscord = await prisma.trackedIdentity.findUnique({
        where: { discordId: discordId }
      })
      
      trackedByEmail = await prisma.trackedIdentity.findUnique({
        where: { email: email }
      })
      
      isTracked = trackedByDiscord || trackedByEmail
    } else {
      console.log(`⚠️  Skipping tracked identity check (Testing Mode enabled)`)
    }
    
    // Hash password (needed for both tracked and non-tracked users)
    const hashedPassword = await bcrypt.hash(password, 10)
    
    if (isTracked) {
      console.log(`⚠️ Tracked identity detected for ${email}. Creating pending registration...`)
      
      // Create pending registration for admin approval (includes password!)
      try {
        await prisma.pendingRegistration.create({
          data: {
            discordId,
            email,
            name,
            avatarUrl,
            bannerUrl,
            password: hashedPassword, // Store hashed password
            inviteCode,
            flagReason: `Matched tracked ${trackedByDiscord ? 'Discord ID' : 'email'} - Original UID: ${isTracked.originalUid || 'unknown'}`,
            status: 'pending'
          }
        })
        console.log(`✅ Created pending registration for admin approval`)
      } catch (pendingError) {
        // May already exist, that's okay
        console.log(`ℹ️ Pending registration may already exist`)
      }
      
      // Return special response to trigger redirect to pending approval page
      return NextResponse.json({
        success: true,
        pendingApproval: true,
        discordId,
        email
      })
    }
    
    // Not tracked - create account normally
    
    // Generate unique UID
    const nextUid = await getNextUid()
    
    // Check if invite has bypassDiscordRequirement flag
    // Note: Even though Discord registration always has Discord, we still check for consistency
    const bypassDiscordLink = invite.bypassDiscordRequirement || false
    
    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        discordId,
        image: avatarUrl,
        banner: bannerUrl,
        uid: nextUid,
        bypassDiscordLink,
        profile: {
          create: {}
        }
      }
    })
    
    // Mark invite as used
    await prisma.invites.update({
      where: { code: inviteCode },
      data: { usedBy: nextUid }
    })
    
    console.log(`✅ Discord registration completed for ${email} (UID: ${nextUid})`)
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully'
    })
  } catch (error: any) {
    console.error('Discord registration completion error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}

export const POST = withRequestLogging(postHandler)

