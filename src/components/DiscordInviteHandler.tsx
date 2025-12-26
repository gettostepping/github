'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function DiscordInviteHandler() {
  const { data: session, status } = useSession()

  useEffect(() => {
    async function handleDiscordInvite() {
      if (status === 'authenticated' && session?.user?.email) {
        // Check if there's a discord_invite_code cookie
        const cookies = document.cookie.split(';')
        const inviteCookie = cookies.find(c => c.trim().startsWith('discord_invite_code='))
        
        if (inviteCookie) {
          const inviteCode = inviteCookie.split('=')[1]
          
          if (inviteCode) {
            try {
              console.log('📝 Marking Discord invite as used:', inviteCode)
              
              const res = await fetch('/api/auth/discord/mark-invite-used', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteCode })
              })
              
              if (res.ok) {
                console.log('✅ Discord invite marked as used')
                // Delete the cookie
                document.cookie = 'discord_invite_code=; path=/; max-age=0'
              } else {
                const data = await res.json()
                console.error('❌ Failed to mark invite as used:', data.error)
                // Delete the cookie anyway to prevent retry loops
                document.cookie = 'discord_invite_code=; path=/; max-age=0'
              }
            } catch (error) {
              console.error('❌ Error marking invite as used:', error)
              // Delete the cookie anyway
              document.cookie = 'discord_invite_code=; path=/; max-age=0'
            }
          }
        }
      }
    }

    handleDiscordInvite()
  }, [status, session])

  return null // This component doesn't render anything
}

