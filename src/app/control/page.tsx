'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCog } from '@fortawesome/free-solid-svg-icons'
import ApiKeyManagement from '@/components/ApiKeyManagement'
import ApiStatusDashboard from '@/components/ApiStatusDashboard'

interface AdminData {
  isOwner: boolean
  isDeveloper: boolean
  isAdmin: boolean
}

export default function ControlPanelPage() {
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch('/api/admin/check')
        if (res.ok) {
          const data = await res.json()
          setAdminData(data)
          
          // Only Developer and Owner can access
          if (!data.isDeveloper && !data.isOwner) {
            router.push('/')
            return
          }
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error('Failed to check access:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    checkAccess()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400 mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading...</p>
        </div>
      </main>
    )
  }

  if (!adminData || (!adminData.isDeveloper && !adminData.isOwner)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-neutral-400">Only Developers and Owners can access this page.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FontAwesomeIcon icon={faCog} className="text-brand-400" />
            Control Panel
          </h1>
          <p className="text-neutral-400">
            Developer and Owner tools for managing API keys and system configuration.
          </p>
        </div>

        <ApiStatusDashboard />

        <ApiKeyManagement adminData={adminData} />
      </div>
    </main>
  )
}

