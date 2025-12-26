import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import Image from 'next/image'
import { formatLastActive } from '@/lib/timeUtils'
import { getUserAvatar } from '@/lib/images'

const prisma = new PrismaClient()

async function getBrowsingData() {
  try {
    // Get users who are currently browsing (active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const browsingUsers = await prisma.presence.findMany({
      where: {
        updatedAt: {
          gte: fiveMinutesAgo
        },
        currentPage: {
          not: null
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            uid: true,
            discordId: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return { browsingUsers }
  } catch (error) {
    console.error('Error fetching browsing data:', error)
    return { browsingUsers: [] }
  }
}

export default async function BrowsingPage() {
  const session = await getServerSession(authOptions)
  const { browsingUsers } = await getBrowsingData()

  const getPageType = (currentPage: string | null) => {
    if (!currentPage) return { type: 'Unknown', icon: '🌐' }
    
    if (currentPage.includes('/movies')) return { type: 'Movies', icon: '🎬' }
    if (currentPage.includes('/tv')) return { type: 'TV Shows', icon: '📺' }
    if (currentPage.includes('/watch')) return { type: 'Watching', icon: '👀' }
    if (currentPage.includes('/members')) return { type: 'Members', icon: '👥' }
    if (currentPage.includes('/search')) return { type: 'Searching', icon: '🔍' }
    if (currentPage === '/') return { type: 'Home', icon: '🏠' }
    
    return { type: 'Browsing', icon: '🌐' }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Currently Browsing
          </h1>
          <p className="text-xl text-neutral-400">
            See what users are currently browsing on the site
          </p>
        </div>

        {browsingUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌐</div>
            <h2 className="text-2xl font-bold text-white mb-2">No one is browsing right now</h2>
            <p className="text-neutral-400">Check back later to see active users</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {browsingUsers.map((presence) => {
              const pageInfo = getPageType(presence.currentPage)
              
              return (
                <Link 
                  key={presence.user.id} 
                  href={`/members/${presence.user.uid}`}
                  className="group bg-neutral-800/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6 hover:bg-neutral-700/50 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-12 h-12">
                      <Image
                        src={getUserAvatar(presence.user.image, presence.user.discordId)}
                        alt={presence.user.name || 'User'}
                        fill
                        sizes="48px"
                        className="object-cover rounded-full"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{presence.user.name}</div>
                      <div className="text-sm text-neutral-400">UID: {presence.user.uid}</div>
                    </div>
                    <div className="text-2xl">{pageInfo.icon}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-400">Currently:</span>
                      <span className="text-sm text-white font-medium">{pageInfo.type}</span>
                    </div>
                    
                    {presence.currentPage && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-400">Page:</span>
                        <span className="text-sm text-brand-400 font-mono text-xs truncate">
                          {presence.currentPage}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-400">Last seen:</span>
                      <span className="text-sm text-green-400">
                        {formatLastActive(presence.updatedAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
