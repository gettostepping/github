"use client"
import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCrown, faShield, faHammer, faGem, faStar, faUserShield, faTools } from '@fortawesome/free-solid-svg-icons'

interface AdminData {
  isOwner: boolean
  isDeveloper: boolean
  isAdmin: boolean
  isTrialMod: boolean
  isModerator: boolean
  isPremium: boolean
  isVip: boolean
  roles: string[]
  uid: number
}

export default function AdminBadge({ userId }: { userId: string }) {
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAdminStatus() {
      try {
        const res = await fetch(`/api/admin/check?userId=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setAdminData(data)
        }
      } catch (error) {
        console.error('Failed to fetch admin status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminStatus()
  }, [userId])

  if (loading || !adminData) {
    return null
  }

  if (adminData.isOwner) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium border border-purple-600/30">
          <FontAwesomeIcon icon={faCrown} className="w-3 h-3" />
          <span>Owner</span>
        </div>
      </div>
    )
  }

  if (adminData.isDeveloper) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium border border-green-600/30">
          <FontAwesomeIcon icon={faHammer} className="w-3 h-3" />
          <span>Developer</span>
        </div>
      </div>
    )
  }

  if (adminData.isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium border border-yellow-600/30">
          <FontAwesomeIcon icon={faTools} className="w-3 h-3" />
          <span>Admin</span>
        </div>
      </div>
    )
  }

  if (adminData.isTrialMod) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium border border-blue-600/30">
          <FontAwesomeIcon icon={faShield} className="w-3 h-3" />
          <span>Trial Mod</span>
        </div>
      </div>
    )
  }

  if (adminData.isModerator) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 px-3 py-1 rounded-full text-sm font-medium border border-indigo-600/30">
          <FontAwesomeIcon icon={faUserShield} className="w-3 h-3" />
          <span>Moderator</span>
        </div>
      </div>
    )
  }

  if (adminData.isPremium) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gradient-to-r from-pink-600/20 to-rose-600/20 text-pink-400 px-3 py-1 rounded-full text-sm font-medium border border-pink-600/30">
          <FontAwesomeIcon icon={faGem} className="w-3 h-3" />
          <span>Premium</span>
        </div>
      </div>
    )
  }

  if (adminData.isVip) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 text-amber-400 px-3 py-1 rounded-full text-sm font-medium border border-amber-600/30">
          <FontAwesomeIcon icon={faStar} className="w-3 h-3" />
          <span>VIP</span>
        </div>
      </div>
    )
  }

  return null
}
