import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import Image from 'next/image'
import { formatLastActive, isCurrentlyActive, formatSearchTime } from '@/lib/timeUtils'
import { getUserAvatar } from '@/lib/images'
import NotSignedIn from "@/components/NotSignedIn";

const prisma = new PrismaClient()

// Role hierarchy for sorting (lower number = higher priority)
function getRolePriority(user: any): number {
  if (!user.roles || user.roles.length === 0) return 100 // Regular users
  
  if (user.roles.some((role: any) => role.name.toLowerCase() === 'owner')) return 0
  if (user.roles.some((role: any) => role.name.toLowerCase() === 'developer')) return 1
  if (user.roles.some((role: any) => role.name.toLowerCase() === 'admin')) return 2
  if (user.roles.some((role: any) => role.name.toLowerCase() === 'moderator')) return 3
  if (user.roles.some((role: any) => role.name.toLowerCase() === 'trial_mod')) return 4
  if (user.roles.some((role: any) => role.name.toLowerCase() === 'vip')) return 5
  if (user.roles.some((role: any) => role.name.toLowerCase() === 'premium')) return 6
  
  return 100 // Regular users
}

// Sort users by role hierarchy, then by UID (lowest UID first - earliest users)
function sortUsersByHierarchy(users: any[]): any[] {
  return users.sort((a, b) => {
    const aPriority = getRolePriority(a)
    const bPriority = getRolePriority(b)
    
    // First sort by role priority
    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }
    
    // Within same role, sort by UID (lowest first - earliest registered users)
    return a.uid - b.uid
  })
}

async function getMembersStats() {
  try {
    console.log('🔍 Fetching members stats...')
    // Get users with most ratings
    const mostRatedUsers = await prisma.user.findMany({
      include: {
        ratings: true,
        profile: true,
        roles: true
      },
      orderBy: {
        ratings: {
          _count: 'desc'
        }
      },
      take: 10
    })

    const mostRatedDetails = mostRatedUsers.map(user => ({
      id: user.id,
      name: user.name,
      uid: user.uid,
      image: user.image,
      discordId: user.discordId,
      ratingCount: user.ratings.length,
      profile: user.profile,
      roles: user.roles
    }))

    // Get last active users (by last activity)
    const lastActiveUsers = await prisma.user.findMany({
      include: {
        profile: true,
        roles: true
      },
      where: {
        profile: {
          isNot: null
        }
      },
      orderBy: {
        profile: {
          lastActiveAt: 'desc'
        }
      },
      take: 10
    })

    // Get staff members - only those who are currently online
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000)
    const allStaffMembers = await prisma.user.findMany({
      include: {
        roles: true,
        profile: true
      },
      where: {
        roles: {
          some: {
            name: {
              in: ['owner', 'admin', 'developer', 'trial_mod']
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    // Filter to only show staff members who are currently online
    const staffMembers = allStaffMembers.filter(user => {
      if (!user.profile?.lastActiveAt) return false
      const lastActive = new Date(user.profile.lastActiveAt)
      return lastActive >= oneMinuteAgo
    })

    // Filter to only users who show "Now" in Last Active Users (within 1 minute)
    const onlineUsers = lastActiveUsers.filter(user => {
      if (!user.profile?.lastActiveAt) {
        console.log(`❌ ${user.name} - No lastActiveAt`)
        return false
      }
      const lastActive = new Date(user.profile.lastActiveAt)
      const isOnline = lastActive >= oneMinuteAgo
      console.log(`👤 ${user.name} - Last active: ${user.profile.lastActiveAt}, Online: ${isOnline}`)
      return isOnline
    })
    
    console.log(`📊 Online users: ${onlineUsers.length}/${lastActiveUsers.length}`)

    // Get recent searches
    console.log('🔍 Fetching recent searches...')
    const recentSearches = await prisma.search.findMany({
      take: 20,
      orderBy: {
        createdAt: 'desc'
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
      }
    })
    console.log(`📋 Found ${recentSearches.length} recent searches`)

    return {
      mostRatedDetails,
      lastActiveUsers,
      staffMembers,
      onlineUsers,
      recentSearches
    }
  } catch (error) {
    console.error('Error fetching members stats:', error)
    return {
      mostRatedDetails: [],
      lastActiveUsers: [],
      staffMembers: [],
      onlineUsers: [],
      recentSearches: []
    }
  }
}

export default async function MembersPage() {
  const session = await getServerSession(authOptions)
  const stats = await getMembersStats()

  if (!session?.user?.email) {
    return (<NotSignedIn />)
  }
  
  console.log('📊 Members page stats:', {
    lastActiveUsers: stats.lastActiveUsers?.length || 0,
    onlineUsers: stats.onlineUsers?.length || 0,
    staffMembers: stats.staffMembers?.length || 0,
    recentSearches: stats.recentSearches?.length || 0
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Community Members
          </h1>
          <p className="text-neutral-400 mb-4">Discover the community and see who's online</p>
          <Link 
            href="/browsing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
          >
            Browse Content
          </Link>
        </div>

        {/* Online Now Section */}
        <div className="mb-8">
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">🟢</span>
              Online Now ({stats.onlineUsers?.length || 0})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sortUsersByHierarchy(stats.onlineUsers || [])
                ?.slice(0, 12).map((user) => {
                const isOwner = user.roles?.some((role: any) => role.name.toLowerCase() === 'owner')
                const isAdmin = user.roles?.some((role: any) => role.name.toLowerCase() === 'admin')
                const isDeveloper = user.roles?.some((role: any) => role.name.toLowerCase() === 'developer')
                const isTrialMod = user.roles?.some((role: any) => role.name === 'trial_mod')
                const isModerator = user.roles?.some((role: any) => role.name.toLowerCase() === 'moderator')
                const isPremium = user.roles?.some((role: any) => role.name.toLowerCase() === 'premium')
                const isVip = user.roles?.some((role: any) => role.name.toLowerCase() === 'vip')
                
                const getRoleColors = () => {
                  if (isOwner) return { bg: 'from-purple-600/20 to-pink-600/20', hover: 'hover:from-purple-600/30 hover:to-pink-600/30', border: 'border-purple-600/30', text: 'text-purple-400' }
                  if (isAdmin) return { bg: 'from-yellow-600/20 to-orange-600/20', hover: 'hover:from-yellow-600/30 hover:to-orange-600/30', border: 'border-yellow-600/30', text: 'text-yellow-400' }
                  if (isDeveloper) return { bg: 'from-green-600/20 to-emerald-600/20', hover: 'hover:from-green-600/30 hover:to-emerald-600/30', border: 'border-green-600/30', text: 'text-green-400' }
                  if (isTrialMod) return { bg: 'from-blue-600/20 to-cyan-600/20', hover: 'hover:from-blue-600/30 hover:to-cyan-600/30', border: 'border-blue-600/30', text: 'text-blue-400' }
                  if (isModerator) return { bg: 'from-indigo-600/20 to-purple-600/20', hover: 'hover:from-indigo-600/30 hover:to-purple-600/30', border: 'border-indigo-600/30', text: 'text-indigo-400' }
                  if (isPremium) return { bg: 'from-pink-600/20 to-rose-600/20', hover: 'hover:from-pink-600/30 hover:to-rose-600/30', border: 'border-pink-600/30', text: 'text-pink-400' }
                  if (isVip) return { bg: 'from-amber-600/20 to-yellow-600/20', hover: 'hover:from-amber-600/30 hover:to-yellow-600/30', border: 'border-amber-600/30', text: 'text-amber-400' }
                  return { bg: 'from-neutral-800/20 to-neutral-700/20', hover: 'hover:from-neutral-700/30 hover:to-neutral-600/30', border: 'border-neutral-600/50', text: 'text-neutral-400' }
                }

                const colors = getRoleColors()
                const hasStaffRole = isOwner || isAdmin || isDeveloper || isTrialMod

                return (
                  <div key={user.id} className={`group block ${hasStaffRole ? `bg-gradient-to-br ${colors.bg} ${colors.hover} border ${colors.border}` : 'bg-neutral-800/50 hover:bg-neutral-700/50'} rounded-lg p-4 transition-colors`}>
                    <Link href={`/members/${user.uid}`} className="block">
                      <div className="relative w-12 h-12 mx-auto mb-2">
                        <Image
                          src={getUserAvatar(user.image, user.discordId)}
                          alt={user.name || 'User'}
                          fill
                          sizes="48px"
                          className="object-cover rounded-full"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-neutral-900"></div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-white truncate">{user.name}</div>
                        <div className="text-xs text-neutral-400">UID: {user.uid}</div>
                        {hasStaffRole && user.roles && (
                          <div className={`text-xs ${colors.text} mt-1 truncate`}>
                            {user.roles.map((role: any) => {
                              const roleName = role.name === 'trial_mod' ? 'Trial Mod' : role.name.charAt(0).toUpperCase() + role.name.slice(1)
                              return roleName
                            }).join(', ')}
                          </div>
                        )}
                        <div className="text-xs text-neutral-400 mt-1">
                          {user.profile?.lastActiveAt ? (isCurrentlyActive(user.profile.lastActiveAt) ? 'Now' : formatLastActive(user.profile.lastActiveAt)) : 'Unknown'}
                        </div>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Most Rated Shows and Movies */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">⭐</span>
              Most Active Raters
            </h3>
            <div className="space-y-3">
              {stats.mostRatedDetails.slice(0, 5).map((user, index) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800/50 transition-colors">
                  <Link href={`/members/${user.uid}`} className="flex items-center gap-3 w-full">
                    <span className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </span>
                    <div className="relative w-10 h-10">
                      <Image
                        src={getUserAvatar(user.image)}
                        alt={user.name || 'User'}
                        fill
                        sizes="40px"
                        className="object-cover rounded-full"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{user.name}</div>
                      <div className="text-sm text-neutral-400">UID: {user.uid}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-neutral-400">Ratings</div>
                      <div className="text-sm text-white font-bold">{user.ratingCount}</div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Most Time Online */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">⏰</span>
              Last Active Users
            </h3>
            <div className="space-y-2">
              {stats.lastActiveUsers && stats.lastActiveUsers.length > 0 ? (
                stats.lastActiveUsers.map((user, index) => (
                <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors">
                  <Link href={`/members/${user.uid}`} className="flex items-center gap-2 w-full">
                    <span className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {index + 1}
                    </span>
                    <div className="relative w-8 h-8">
                      <Image
                        src={getUserAvatar(user.image)}
                        alt={user.name || 'User'}
                        fill
                        sizes="32px"
                        className="object-cover rounded-full"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm">{user.name}</div>
                      <div className="text-xs text-neutral-400">UID: {user.uid}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-neutral-400">Last active</div>
                      <div className="text-xs text-white">
                        {user.profile?.lastActiveAt ? formatLastActive(user.profile.lastActiveAt) : 'Never'}
                      </div>
                    </div>
                  </Link>
                </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-neutral-500 text-sm">No users found</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Staff Members */}
        <div className="mb-8">
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">👑</span>
              Staff Members
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.staffMembers
                .sort((a, b) => {
                  // Sort by role priority first
                  const getRolePriority = (user: any) => {
                    if (user.roles?.some((role: any) => role.name.toLowerCase() === 'owner')) return 0
                    if (user.roles?.some((role: any) => role.name.toLowerCase() === 'admin')) return 1
                    if (user.roles?.some((role: any) => role.name.toLowerCase() === 'developer')) return 2
                    if (user.roles?.some((role: any) => role.name === 'trial_mod')) return 3
                    return 4
                  }
                  
                  const aPriority = getRolePriority(a)
                  const bPriority = getRolePriority(b)
                  
                  if (aPriority !== bPriority) {
                    return aPriority - bPriority
                  }
                  
                  // Then by creation date (oldest first)
                  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                })
                .map((user) => {
                const isOwner = user.roles?.some(role => role.name.toLowerCase() === 'owner')
                const isAdmin = user.roles?.some(role => role.name.toLowerCase() === 'admin')
                const isDeveloper = user.roles?.some(role => role.name.toLowerCase() === 'developer')
                const isTrialMod = user.roles?.some(role => role.name === 'trial_mod')
                const isModerator = user.roles?.some(role => role.name.toLowerCase() === 'moderator')
                const isPremium = user.roles?.some(role => role.name.toLowerCase() === 'premium')
                const isVip = user.roles?.some(role => role.name.toLowerCase() === 'vip')
                
                const getRoleColors = () => {
                  if (isOwner) return { bg: 'from-purple-600/20 to-pink-600/20', hover: 'hover:from-purple-600/30 hover:to-pink-600/30', border: 'border-purple-600/30', text: 'text-purple-400' }
                  if (isAdmin) return { bg: 'from-yellow-600/20 to-orange-600/20', hover: 'hover:from-yellow-600/30 hover:to-orange-600/30', border: 'border-yellow-600/30', text: 'text-yellow-400' }
                  if (isDeveloper) return { bg: 'from-green-600/20 to-emerald-600/20', hover: 'hover:from-green-600/30 hover:to-emerald-600/30', border: 'border-green-600/30', text: 'text-green-400' }
                  if (isTrialMod) return { bg: 'from-blue-600/20 to-cyan-600/20', hover: 'hover:from-blue-600/30 hover:to-cyan-600/30', border: 'border-blue-600/30', text: 'text-blue-400' }
                  if (isModerator) return { bg: 'from-indigo-600/20 to-purple-600/20', hover: 'hover:from-indigo-600/30 hover:to-purple-600/30', border: 'border-indigo-600/30', text: 'text-indigo-400' }
                  if (isPremium) return { bg: 'from-pink-600/20 to-rose-600/20', hover: 'hover:from-pink-600/30 hover:to-rose-600/30', border: 'border-pink-600/30', text: 'text-pink-400' }
                  if (isVip) return { bg: 'from-amber-600/20 to-yellow-600/20', hover: 'hover:from-amber-600/30 hover:to-yellow-600/30', border: 'border-amber-600/30', text: 'text-amber-400' }
                  return { bg: 'from-neutral-800/20 to-neutral-700/20', hover: 'hover:from-neutral-700/30 hover:to-neutral-600/30', border: 'border-neutral-600/50', text: 'text-neutral-400' }
                }
                
                const colors = getRoleColors()
                
                return (
                  <div key={user.id} className={`group block bg-gradient-to-br ${colors.bg} rounded-lg p-4 ${colors.hover} transition-colors border ${colors.border}`}>
                    <Link href={`/members/${user.uid}`} className="block">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative w-12 h-12">
                          <Image
                            src={getUserAvatar(user.image)}
                            alt={user.name || 'User'}
                            fill
                            sizes="48px"
                            className="object-cover rounded-full"
                          />
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.name}</div>
                          <div className={`text-sm ${colors.text}`}>
                            {user.roles.map(role => {
                              const roleName = role.name === 'trial_mod' ? 'Trial Mod' : role.name.charAt(0).toUpperCase() + role.name.slice(1)
                              return roleName
                            }).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-neutral-400">
                        UID: {user.uid} • {user.profile?.lastActiveAt ? `Last online: ${formatLastActive(user.profile.lastActiveAt)}` : 'Session: 0m'}
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Searches Section */}
        <div className="mb-8">
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">🔍</span>
              Recent Searches ({stats.recentSearches?.length || 0})
            </h2>
            <div className="space-y-3">
              {stats.recentSearches?.slice(0, 10).map((search) => (
                <div key={search.id} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/30">
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8">
                      <Image
                            src={getUserAvatar(search.user.image, search.user.discordId)}
                        alt={search.user.name || 'User'}
                        fill
                        sizes="32px"
                        className="object-cover rounded-full"
                      />
                    </div>
                    <div>
                      <div className="text-white font-medium">{search.user.name}</div>
                      <div className="text-sm text-neutral-400">searched for</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">"{search.query}"</div>
                    <div className="text-xs text-neutral-400">
                      {search.results} results • {formatSearchTime(search.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              {(!stats.recentSearches || stats.recentSearches.length === 0) && (
                <div className="text-neutral-400 text-center py-8">No recent searches yet</div>
              )}
            </div>
          </div>
        </div>


        {/* Future Stats Placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">📊</span>
              Coming Soon
            </h3>
            <p className="text-neutral-400">More community statistics will be added here</p>
          </div>
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">🏆</span>
              Achievements
            </h3>
            <p className="text-neutral-400">User achievements and badges coming soon</p>
          </div>
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">📈</span>
              Analytics
            </h3>
            <p className="text-neutral-400">Detailed community analytics coming soon</p>
          </div>
        </div>
      </div>
    </main>
  )
}