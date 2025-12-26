"use client"

import { useState } from 'react'
import Image from 'next/image'

interface User {
  id: string
  name: string | null
  image: string | null
  banner: string | null
  discordId: string | null
  profile: {
    bio: string | null
    themeAccent: string | null
    customAvatar: string | null
    customBanner: string | null
  } | null
}

interface SettingsFormProps {
  user: User
}

export default function SettingsForm({ user }: SettingsFormProps) {
  const [bio, setBio] = useState(user.profile?.bio || '')
  const [themeAccent, setThemeAccent] = useState(user.profile?.themeAccent || '#8b5cf6')
  const [customAvatar, setCustomAvatar] = useState(user.profile?.customAvatar || '')
  const [customBanner, setCustomBanner] = useState(user.profile?.customBanner || '')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio,
          themeAccent,
          customAvatar: customAvatar || null,
          customBanner: customBanner || null,
        })
      })

      if (response.ok) {
        setMessage('Settings saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Failed to save settings')
      }
    } catch (error) {
      setMessage('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Bio Section */}
      <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Bio</h3>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          className="w-full h-24 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-600"
          maxLength={500}
        />
        <div className="text-sm text-neutral-400 mt-2">{bio.length}/500 characters</div>
      </div>

      {/* Theme Section */}
      <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Theme Accent Color</h3>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={themeAccent}
            onChange={(e) => setThemeAccent(e.target.value)}
            className="w-12 h-12 rounded-lg border border-neutral-700 cursor-pointer"
          />
          <div className="flex-1">
            <input
              type="text"
              value={themeAccent}
              onChange={(e) => setThemeAccent(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="#8b5cf6"
            />
            <div className="text-sm text-neutral-400 mt-1">Hex color code</div>
          </div>
        </div>
      </div>

      {/* Custom Avatar Section */}
      <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Custom Avatar</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-neutral-800">
            {customAvatar ? (
              <Image
                src={customAvatar}
                alt="Custom avatar"
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <Image
                src={user.image || '/placeholder.png'}
                alt="Discord avatar"
                fill
                sizes="64px"
                className="object-cover"
              />
            )}
          </div>
          <div className="flex-1">
            <input
              type="url"
              value={customAvatar}
              onChange={(e) => setCustomAvatar(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
            <div className="text-sm text-neutral-400 mt-1">Leave empty to use Discord avatar</div>
          </div>
        </div>
        <div className="text-sm text-neutral-400">
          <p>• Must be a valid image URL</p>
          <p>• Recommended size: 256x256px or larger</p>
          <p>• Supports JPG, PNG, and GIF formats</p>
        </div>
      </div>

      {/* Custom Banner Section */}
      <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Custom Banner</h3>
        <div className="mb-4">
          <div className="relative h-24 w-full bg-gradient-to-r from-brand-800 to-brand-700 rounded-lg overflow-hidden">
            {customBanner ? (
              <Image
                src={customBanner}
                alt="Custom banner"
                fill
                sizes="100vw"
                className="object-cover"
              />
            ) : user.banner ? (
              <Image
                src={`${user.banner}${user.banner.includes('?') ? '&' : '?'}size=4096`}
                alt="Discord banner"
                fill
                sizes="100vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800" />
            )}
          </div>
        </div>
        <input
          type="url"
          value={customBanner}
          onChange={(e) => setCustomBanner(e.target.value)}
          placeholder="https://example.com/banner.jpg"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
        <div className="text-sm text-neutral-400 mt-2">
          <p>• Leave empty to use Discord banner</p>
          <p>• Recommended size: 1920x1080px or larger</p>
          <p>• Supports JPG, PNG, and GIF formats</p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-400">
          {message && (
            <span className={`${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}