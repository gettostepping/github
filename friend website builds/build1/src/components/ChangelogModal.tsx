'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faCodeBranch } from '@fortawesome/free-solid-svg-icons'

// Update this version whenever you push a new update
const CURRENT_VERSION = '1.2.0'

// Update this content whenever you push a new update
const CHANGELOG_CONTENT = {
  version: CURRENT_VERSION,
  title: 'What\'s New',
  items: [
    'Added Discord bypass requirement feature: Admins can now create invites with a "Discord Bypass" toggle that allows users to register without linking Discord accounts. Perfect for family members or users who don\'t have Discord.',
    'Implemented new profile picture system: Replaced default avatars with a custom "no profile picture" image for users without Discord accounts. Users with Discord continue to use their Discord avatars automatically.',
    'Enhanced admin invite management: Invite codes in the admin panel now copy the full registration link (e.g., /register?code=ABC123) instead of just the code, matching the invitations page behavior for consistency.',
    'Improved profile picture handling: Updated all user avatar displays across the site to properly handle missing images and automatically replace old Discord CDN URLs with the new default image.',
    'Database schema updates: Added bypassDiscordRequirement field to invites and bypassDiscordLink field to users, enabling flexible account creation options while maintaining security.',
    'Fixed image loading issues: Resolved 404 errors from old Discord CDN image URLs by implementing automatic URL replacement and database migration for existing users.',
    'Updated user profile displays: All user avatars now consistently use the getUserAvatar helper function, ensuring proper fallback behavior and consistent image handling site-wide.',
    'Various bug fixes and performance improvements across the admin panel and user management systems.'
  ]
}

export default function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if this version has been seen
    const lastSeenVersion = localStorage.getItem('changelog_last_seen_version')
    
    // If the current version hasn't been seen, show the modal
    if (lastSeenVersion !== CURRENT_VERSION) {
      setIsOpen(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const eventName = isOpen ? 'changelogOpen' : 'changelogClosed'
    window.dispatchEvent(new Event(eventName))
    ;(window as any).__changelogOpen = isOpen
  }, [isOpen])

  const handleClose = () => {
    setIsOpen(false)
    // Mark this version as seen
    localStorage.setItem('changelog_last_seen_version', CURRENT_VERSION)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 300
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-neutral-900/95 backdrop-blur-sm border border-neutral-800 rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col">
              {/* Header */}
              <motion.div 
                className="p-6 border-b border-neutral-800 flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-brand-500/30 flex items-center justify-center hover:border-brand-500/50 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all duration-200">
                    <FontAwesomeIcon icon={faCodeBranch} className="text-brand-400 w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {CHANGELOG_CONTENT.title}
                    </h2>
                    <p className="text-xs text-brand-400/70 mt-0.5 font-mono">
                      v{CHANGELOG_CONTENT.version}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-neutral-400 hover:text-brand-400 transition-colors p-1.5 hover:bg-neutral-800 rounded-md"
                  aria-label="Close"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                </button>
              </motion.div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1">
                <ul className="space-y-3">
                  {CHANGELOG_CONTENT.items.map((item, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ 
                        delay: index * 0.03,
                        duration: 0.2
                      }}
                      className="flex items-start gap-3 group"
                    >
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0 group-hover:scale-125 group-hover:shadow-[0_0_8px_rgba(139,92,246,0.6)] transition-all duration-200" />
                      <span className="text-sm text-neutral-300 leading-relaxed group-hover:text-brand-300 transition-colors duration-200">
                        {item}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-neutral-800 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="px-8 py-2.5 bg-brand-600 hover:bg-brand-500 border border-brand-500/50 hover:border-brand-400 hover:shadow-[0_0_16px_rgba(139,92,246,0.4)] text-white text-sm font-medium rounded-md transition-all duration-200"
                >
                  Continue
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

