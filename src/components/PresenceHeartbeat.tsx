'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'

export default function PresenceHeartbeat() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'authenticated' || !session) return

    // Get a friendly page name from the pathname
    const getPageInfo = (path: string) => {
      if (path === '/') return { currentPage: 'Home', pageType: 'browsing' }
      if (path.startsWith('/search')) return { currentPage: 'Search', pageType: 'browsing' }
      if (path.startsWith('/watch/')) {
        // For watch pages, we'll determine the media type from URL params
        // This will be handled by the watch page itself
        return { currentPage: 'Watching', pageType: 'watching' }
      }
      if (path.startsWith('/u/')) {
        // Extract the UID from the path to show which profile
        const uid = path.split('/u/')[1]
        return { currentPage: `Profile:${uid}`, pageType: 'browsing' }
      }
      if (path.startsWith('/members')) return { currentPage: 'Members', pageType: 'browsing' }
      if (path.startsWith('/settings')) return { currentPage: 'Settings', pageType: 'browsing' }
      if (path.startsWith('/admin')) return { currentPage: 'Admin Panel', pageType: 'browsing' }
      if (path.startsWith('/customize')) return { currentPage: 'Customize Profile', pageType: 'browsing' }
      if (path.startsWith('/browsing')) return { currentPage: 'Browsing', pageType: 'browsing' }
      if (path.startsWith('/movies')) return { currentPage: 'Movies', pageType: 'browsing' }
      if (path.startsWith('/tv')) return { currentPage: 'TV Shows', pageType: 'browsing' }
      return { currentPage: 'Browsing', pageType: 'browsing' }
    }

    // Send initial heartbeat
    const sendHeartbeat = async () => {
      try {
        const pageInfo = getPageInfo(pathname || '')
        await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pageInfo)
        })
      } catch (error) {
        console.error('Failed to send presence heartbeat:', error)
      }
    }

    // Send heartbeat immediately
    sendHeartbeat()

    // Set up interval to send heartbeat every 2 minutes
    const interval = setInterval(sendHeartbeat, 2 * 60 * 1000)

    // Cleanup on unmount
    return () => clearInterval(interval)
  }, [session, status, pathname])

  return null // This component doesn't render anything
}
