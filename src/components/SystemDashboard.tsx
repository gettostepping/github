'use client'

import useSWR from 'swr'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faUserCheck,
  faUserPlus,
  faBan,
  faShield,
  faComment,
  faStar,
  faBookmark
} from '@fortawesome/free-solid-svg-icons'
import { jsonFetcher } from '@/lib/fetcher'

interface Stats {
  totalUsers: number
  activeToday: number
  newRegistrations: number
  totalBans: number
  totalRoles: number
  totalComments: number
  totalRatings: number
  totalWatchlists: number
}

interface StatCard {
  label: string
  value: number
  icon: any
  bgClass: string
  borderClass: string
  iconClass: string
  valueClass: string
}

export default function SystemDashboard() {
  const { data: stats, error, isLoading } = useSWR<Stats>(
    '/api/admin/stats',
    jsonFetcher,
    {
      refreshInterval: 30_000,
      dedupingInterval: 10_000,
      revalidateOnFocus: false
    }
  )

  if (isLoading && !stats) {
    return (
      <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
        <p className="text-neutral-400">Failed to load stats</p>
      </div>
    )
  }

  const statCards: StatCard[] = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: faUsers,
      bgClass: 'bg-blue-500/10',
      borderClass: 'border-blue-500/30',
      iconClass: 'text-blue-400',
      valueClass: 'text-blue-400'
    },
    {
      label: 'Active Today',
      value: stats.activeToday,
      icon: faUserCheck,
      bgClass: 'bg-green-500/10',
      borderClass: 'border-green-500/30',
      iconClass: 'text-green-400',
      valueClass: 'text-green-400'
    },
    {
      label: 'New This Week',
      value: stats.newRegistrations,
      icon: faUserPlus,
      bgClass: 'bg-purple-500/10',
      borderClass: 'border-purple-500/30',
      iconClass: 'text-purple-400',
      valueClass: 'text-purple-400'
    },
    {
      label: 'Total Bans',
      value: stats.totalBans,
      icon: faBan,
      bgClass: 'bg-red-500/10',
      borderClass: 'border-red-500/30',
      iconClass: 'text-red-400',
      valueClass: 'text-red-400'
    },
    {
      label: 'Roles Assigned',
      value: stats.totalRoles,
      icon: faShield,
      bgClass: 'bg-yellow-500/10',
      borderClass: 'border-yellow-500/30',
      iconClass: 'text-yellow-400',
      valueClass: 'text-yellow-400'
    },
    {
      label: 'Total Comments',
      value: stats.totalComments,
      icon: faComment,
      bgClass: 'bg-cyan-500/10',
      borderClass: 'border-cyan-500/30',
      iconClass: 'text-cyan-400',
      valueClass: 'text-cyan-400'
    },
    {
      label: 'Total Ratings',
      value: stats.totalRatings,
      icon: faStar,
      bgClass: 'bg-orange-500/10',
      borderClass: 'border-orange-500/30',
      iconClass: 'text-orange-400',
      valueClass: 'text-orange-400'
    },
    {
      label: 'Watchlist Items',
      value: stats.totalWatchlists,
      icon: faBookmark,
      bgClass: 'bg-pink-500/10',
      borderClass: 'border-pink-500/30',
      iconClass: 'text-pink-400',
      valueClass: 'text-pink-400'
    }
  ]

  return (
    <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FontAwesomeIcon icon={faUsers} className="text-brand-400 w-5 h-5" />
          System Statistics
        </h3>
        <span className="text-xs text-neutral-500">Auto-updates every 30s</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgClass} ${card.borderClass} border rounded-lg p-4 hover:scale-105 transition-transform duration-200`}
          >
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={card.icon} className={`${card.iconClass} w-4 h-4`} />
              <div className="text-neutral-400 text-xs font-medium">{card.label}</div>
            </div>
            <div className={`${card.valueClass} text-2xl font-bold`}>{card.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

