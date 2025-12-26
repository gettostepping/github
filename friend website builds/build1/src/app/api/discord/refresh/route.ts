import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'
import { NextRequest } from 'next/server'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const token = (session as any)?.accessToken as string | undefined
  if (!token) {
    return NextResponse.json({ error: 'No Discord token' }, { status: 401 })
  }

  try {
    // Fetch fresh Discord data
    const discordResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!discordResponse.ok) {
      return NextResponse.json({ error: 'Discord API error' }, { status: 502 })
    }
    
    const discordUser = await discordResponse.json();
    
    // Update user record with Discord data
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        banner: discordUser.banner,
      },
    });

    // Also update profile
    await prisma.profile.upsert({
      where: { userId: updatedUser.id },
      update: {
        banner: discordUser.banner,
      },
      create: {
        userId: updatedUser.id,
        banner: discordUser.banner,
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      banner: discordUser.banner,
    });
  } catch (error) {
    console.error('Discord refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh Discord data' }, { status: 500 });
  }
}

export const POST = withRequestLogging(postHandler)
