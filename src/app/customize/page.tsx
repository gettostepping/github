'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ToastContainer } from '@/components/Toast'
import { useToast } from '@/hooks/useToast'

export default function CustomizePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userRoles, setUserRoles] = useState<any>({})
  const [profile, setProfile] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, removeToast, showSuccess, showError } = useToast()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }

    async function fetchData() {
      try {
        const [rolesRes, profileRes] = await Promise.all([
          fetch('/api/admin/check'),
          fetch('/api/profiles')
        ])
        
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json()
          setUserRoles(rolesData)
        }
        
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile(profileData.profile || {})
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [status, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement)
      const updates = {
        bio: formData.get('bio'),
        themeAccent: formData.get('themeAccent'),
        profileLayout: formData.get('profileLayout'),
        showStats: formData.get('showStats') === 'on',
        showLastWatching: formData.get('showLastWatching') === 'on',
        showComments: formData.get('showComments') === 'on',
        customCss: userRoles.isVip ? formData.get('customCss') : undefined,
        profileBadges: userRoles.isVip ? (formData.get('profileBadges') as string)?.split(',').filter(Boolean) : [],
        profileEffects: userRoles.isVip ? (formData.get('profileEffects') as string)?.split(',').filter(Boolean) : []
      }

      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        showSuccess('Profile updated successfully!')
        setTimeout(() => window.location.reload(), 1000)
      } else {
        showError('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      showError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!userRoles.isPremium && !userRoles.isVip) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Premium Required</h1>
          <p className="text-neutral-400 mb-6">You need a Premium or VIP subscription to customize your profile.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile Customization</h1>
          <p className="text-neutral-400">
            {userRoles.isVip ? 'VIP' : 'Premium'} - Customize your profile appearance and features
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Basic Customization */}
          <div className="bg-neutral-800/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Basic Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Bio</label>
                <textarea
                  name="bio"
                  defaultValue={profile.bio || ''}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Theme Color</label>
                <input
                  type="color"
                  name="themeAccent"
                  defaultValue={profile.themeAccent || '#8b5cf6'}
                  className="w-16 h-10 bg-neutral-700 border border-neutral-600 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Profile Layout</label>
                <select
                  name="profileLayout"
                  defaultValue={profile.profileLayout || 'default'}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                  <option value="minimal">Minimal</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Display Options */}
          <div className="bg-neutral-800/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Display Options</h2>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="showStats"
                  defaultChecked={profile.showStats !== false}
                  className="w-4 h-4 text-brand-600 bg-neutral-700 border-neutral-600 rounded focus:ring-brand-500"
                />
                <span className="text-neutral-300">Show profile statistics</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="showLastWatching"
                  defaultChecked={profile.showLastWatching !== false}
                  className="w-4 h-4 text-brand-600 bg-neutral-700 border-neutral-600 rounded focus:ring-brand-500"
                />
                <span className="text-neutral-300">Show last watching section</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="showComments"
                  defaultChecked={profile.showComments !== false}
                  className="w-4 h-4 text-brand-600 bg-neutral-700 border-neutral-600 rounded focus:ring-brand-500"
                />
                <span className="text-neutral-300">Show comments section</span>
              </label>
            </div>
          </div>

          {/* VIP Only Features */}
          {userRoles.isVip && (
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-yellow-400">👑</span>
                VIP Exclusive Features
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Custom CSS</label>
                  <textarea
                    name="customCss"
                    defaultValue={profile.customCss || ''}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-sm"
                    rows={6}
                    placeholder="/* Your custom CSS here */"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Use CSS to completely customize your profile appearance</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Custom Badges</label>
                  <input
                    type="text"
                    name="profileBadges"
                    defaultValue={profile.profileBadges?.join(', ') || ''}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="Badge 1, Badge 2, Badge 3"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Comma-separated list of custom badges</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Profile Effects</label>
                  <input
                    type="text"
                    name="profileEffects"
                    defaultValue={profile.profileEffects?.join(', ') || ''}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="glow, particles, animation"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Comma-separated list of visual effects</p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-600 text-white rounded-lg transition-colors font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
