import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'
import { NextRequest } from 'next/server'

async function getHandler(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const token = (session as any)?.accessToken as string | undefined
  if (!token) return NextResponse.json({ error: 'no_token' }, { status: 401 })
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'discord_error' }, { status: 502 })
  }
}

export const GET = withRequestLogging(getHandler)


