'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faExternalLinkAlt, faShieldAlt } from '@fortawesome/free-solid-svg-icons'

interface PopupBlockerBannerProps {
  onClose: () => void
}

export default function PopupBlockerBanner({ onClose }: PopupBlockerBannerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [browser, setBrowser] = useState<'chrome' | 'firefox' | 'other'>('other')

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem('popup-blocker-banner-dismissed')
    if (dismissed === 'true') {
      return
    }

    // Detect browser
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      setBrowser('chrome')
    } else if (userAgent.includes('firefox') || userAgent.includes('mozilla')) {
      setBrowser('firefox')
    } else {
      setBrowser('other')
    }

    // Show banner after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setShowConfirmModal(true)
  }

  const handleConfirmClose = () => {
    setIsVisible(false)
    localStorage.setItem('popup-blocker-banner-dismissed', 'true')
    onClose()
    setShowConfirmModal(false)
  }

  const handleCancelClose = () => {
    setShowConfirmModal(false)
  }

  const getExtensionInfo = () => {
    switch (browser) {
      case 'chrome':
        return {
          name: 'Popup Blocker (strict)',
          url: 'https://chromewebstore.google.com/detail/popup-blocker-strict/aefkmifgmaafnojlojpnekbpbmjiiogg?hl=en',
          description: 'Block all popup requests from any website'
        }
      case 'firefox':
        return {
          name: 'Popup Blocker Ultimate',
          url: 'https://addons.mozilla.org/en-US/firefox/addon/popup-blocker-ultimate/',
          description: 'Best pop-up blocker for Firefox'
        }
      default:
        return {
          name: 'Popup Blocker Extension',
          url: 'https://chromewebstore.google.com/detail/popup-blocker-strict/aefkmifgmaafnojlojpnekbpbmjiiogg?hl=en',
          description: 'Block unwanted popups and redirects'
        }
    }
  }

  const extensionInfo = getExtensionInfo()

  if (!isVisible) return null

  return (
    <>
      <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <a
            href={extensionInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-white hover:text-blue-300 transition-colors cursor-pointer"
          >
            <span className="text-sm">
              Install a popup blocker to prevent unwanted redirects during streaming.
            </span>
          </a>
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-6 h-6 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors group ml-3"
            title="Close notification"
          >
            <FontAwesomeIcon icon={faTimes} className="text-white/60 group-hover:text-white text-xs" />
          </button>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faShieldAlt} className="text-yellow-400 text-lg" />
              </div>
              <h3 className="text-lg font-semibold text-white">Close Notification?</h3>
            </div>
            
            <p className="text-neutral-300 mb-6">
              Are you sure you want to close this notification? You can always access popup blocker extensions from your browser's extension store.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelClose}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Close Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
