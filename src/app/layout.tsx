import './globals.css'
import type { Metadata } from 'next'
import Providers from './providers'
import Header from '@/components/Header'
import PresenceHeartbeat from '@/components/PresenceHeartbeat'
import RequireDiscordLink from '@/components/RequireDiscordLink'
import DiscordInviteHandler from '@/components/DiscordInviteHandler'
import ChangelogModal from '@/components/ChangelogModal'
import MassInviteMessageModal from '@/components/MassInviteMessageModal'

export const metadata: Metadata = {
  title: 'Reminiscent Streaming',
  description: 'Streaming with Vidsrc + TMDB',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <RequireDiscordLink />
          <DiscordInviteHandler />
          <Header />
          <PresenceHeartbeat />
          <ChangelogModal />
          <MassInviteMessageModal />
          {children}
        </Providers>
      </body>
    </html>
  )
}


