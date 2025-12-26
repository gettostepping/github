import { NextResponse } from 'next/server'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'
import { NextRequest } from 'next/server'

const DISCORD_CLIENT_ID = '1428638052468789329'
const DISCORD_REDIRECT_URI = 'http://streamingwesbitetest.vercel.app/api/discord/callback'
const DISCORD_SCOPE = 'identify email'

async function getHandler(req: NextRequest) {
  try {
    // Construct the Discord OAuth2 URL
    const discordAuthURL = new URL('https://discord.com/oauth2/authorize')
    discordAuthURL.searchParams.set('client_id', DISCORD_CLIENT_ID)
    discordAuthURL.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI)
    discordAuthURL.searchParams.set('response_type', 'code')
    discordAuthURL.searchParams.set('scope', DISCORD_SCOPE)
    discordAuthURL.searchParams.set('prompt', 'consent')

    // Redirect user to Discord's authorization page
    return NextResponse.redirect(discordAuthURL.toString())
  } catch (error) {
    console.error('Error redirecting to Discord login:', error)
    return NextResponse.json({ error: 'Failed to redirect to Discord login' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
