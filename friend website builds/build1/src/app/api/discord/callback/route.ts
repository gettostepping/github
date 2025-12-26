import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth' // adjust to your auth config path
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Missing Discord OAuth code' }, { status: 400 })
  }

  // Get the signed-in user session
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.email) {
    return NextResponse.redirect(new URL('/auth/signin?error=not_signed_in', req.url))
  }

  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: '1428638052468789329',
        client_secret: '65sGardSsqh1c0u3Bh-Wp0w4lvz9peCO',
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:3000/api/discord/callback',
      })
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) {
      console.error('Discord token exchange failed:', tokenData)
      return NextResponse.json({ error: 'Failed to exchange code for token' }, { status: 400 })
    }

    // Fetch Discord user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })
    const discordUser = await userResponse.json()

    if (!userResponse.ok) {
        console.error('Discord user fetch failed:', discordUser)
        return NextResponse.json({ error: 'Failed to fetch Discord user info' }, { status: 400 })
    }

    if (!discordUser.id) {
        return NextResponse.json({ error: 'Invalid Discord user data' }, { status: 400 })
    }

    const alreadyLinked = await prisma.user.findUnique({ where: { discordId: discordUser.id } })
    if (alreadyLinked) {
      return NextResponse.json({ error: 'This Discord account is already linked to another user.' }, { status: 400 })
    }

    // Build Discord avatar and banner URLs
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null

    const bannerUrl = discordUser.banner
      ? `https://cdn.discordapp.com/banners/${discordUser.id}/${discordUser.banner}.${discordUser.banner.startsWith('a_') ? 'gif' : 'png'}`
      : null

    // Update user record in Prisma
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        discordId: discordUser.id,
        image: avatarUrl,
        banner: bannerUrl
      }
    })

    console.log(`✅ Linked Discord account for ${updatedUser.email} (${discordUser.username})`)

    // Redirect back to settings
    const redirectUrl = new URL('/settings?discordLinked=true', req.url)
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Discord callback error:', error)
    return NextResponse.json({ error: 'Discord OAuth linking failed' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
