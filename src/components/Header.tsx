'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faClapperboard, 
  faFilm, 
  faTv, 
  faUser, 
  faChevronDown,
  faSignOutAlt,
  faCog,
  faUserCircle,
  faShield,
  faRocket
} from '@fortawesome/free-solid-svg-icons'
import { getUserAvatar } from '@/lib/images'

interface AdminData {
  isOwner: boolean
  isDeveloper: boolean
  isAdmin: boolean
  isTrialMod: boolean
  roles: string[]
  uid: number
}

export default function Header() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [userUid, setUserUid] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const previousPositionRef = useRef<{ left: number; width: number } | null>(null)
  const [shouldAnimate, setShouldAnimate] = useState(true)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get user UID for profile link
  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/profiles?uid=' + session.user.email)
        .then(res => res.json())
        .then(data => {
          if (data.user?.uid) setUserUid(data.user.uid.toString())
        })
        .catch(() => {})
    }
  }, [session])

  // Fetch admin data
  useEffect(() => {
    async function fetchAdminStatus() {
      if (!session) {
        setAdminData(null)
        return
      }
      
      try {
        const res = await fetch('/api/admin/check')
        if (res.ok) {
          const data = await res.json()
          setAdminData(data)
        }
      } catch (error) {
        console.error('Failed to fetch admin status:', error)
      }
    }
    fetchAdminStatus()
  }, [session])

  // Update active tab indicator position
  useEffect(() => {
    const updateIndicator = () => {
      if (!navRef.current) return
      
      // Find the active link - try exact match first, then check all links
      let activeLink = navRef.current.querySelector(`a[href="${pathname}"]`) as HTMLElement
      
      // If no exact match, find the link whose href matches the pathname
      if (!activeLink) {
        const allLinks = navRef.current.querySelectorAll('a')
        for (const link of allLinks) {
          if (link.getAttribute('href') === pathname) {
            activeLink = link as HTMLElement
            break
          }
        }
      }
      
      if (activeLink) {
        const navRect = navRef.current.getBoundingClientRect()
        const linkRect = activeLink.getBoundingClientRect()
        const newStyle = {
          left: linkRect.left - navRect.left,
          width: linkRect.width
        }
        
        // Check if this is a large jump (likely from scroll) - if so, skip animation
        const prevPos = previousPositionRef.current
        if (prevPos && Math.abs(newStyle.left - prevPos.left) > 150) {
          // Large jump detected - skip animation
          setShouldAnimate(false)
          // Set position immediately
          setIndicatorStyle(newStyle)
          previousPositionRef.current = newStyle
          setIsInitialized(true)
          // Re-enable animation for next time
          setTimeout(() => setShouldAnimate(true), 50)
        } else {
          // Normal movement - animate smoothly
          setShouldAnimate(true)
          setIndicatorStyle(newStyle)
          previousPositionRef.current = newStyle
          setIsInitialized(true)
        }
      }
    }

    // Calculate immediately - no delay
    updateIndicator()
    
    // Also update after a tiny delay to catch any layout shifts
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updateIndicator)
    })
    
    // Update on resize
    window.addEventListener('resize', updateIndicator)
    
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [pathname])

  const adminCheck = adminData && (adminData.isAdmin || adminData.isDeveloper || adminData.isOwner || adminData.isTrialMod)

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-30 bg-neutral-900/70 backdrop-blur border-b border-neutral-800 min-h-[80px]"
    >
      <div className="max-w-6xl mx-auto p-4 flex items-center justify-between gap-2 flex-wrap">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl flex-shrink-0">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <FontAwesomeIcon icon={faClapperboard} className="text-2xl text-brand-400" />
            </motion.div>
            <span className="text-2xl font-black text-brand-400">Reminiscent</span>
          </Link>
        </motion.div>

        {/* Navigation */}
        <nav ref={navRef} className="flex items-center gap-2 flex-1 min-w-0 relative">
          {[
            { href: '/', icon: faClapperboard, label: 'Home' },
            { href: '/movies', icon: faFilm, label: 'Movies' },
            { href: '/tv', icon: faTv, label: 'TV Shows' },
            { href: '/flixhq', icon: faFilm, label: 'FlixHQ' },
            // Only show Anime link for developers or admins
            ...((adminData?.isDeveloper || adminData?.isAdmin || adminData?.isOwner) 
              ? [{ href: '/anime', icon: faRocket, label: 'Anime' }] 
              : []),
            { href: '/members', icon: faUser, label: 'Members' }
          ].map((item, index) => {
            const isActive = pathname === item.href
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link 
                  href={item.href} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${isActive ? 'text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'}`}
                >
                  <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </motion.div>
            )
          })}
          {/* Active tab indicator */}
          {indicatorStyle && indicatorStyle.width > 0 && (
            <motion.div
              className="absolute bg-brand-600 rounded-lg -z-10 h-full"
              initial={false}
              animate={{
                left: indicatorStyle.left,
                width: indicatorStyle.width
              }}
              transition={shouldAnimate ? { 
                type: 'spring', 
                stiffness: 300,
                damping: 30,
                mass: 0.8,
                bounce: 0.2
              } : {
                duration: 0
              }}
            />
          )}
        </nav>

        {/* User Profile / Sign In */}
        {status === 'loading' ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700/50 animate-pulse flex-shrink-0 min-w-[120px]">
            <div className="w-8 h-8 bg-neutral-700 rounded-full"></div>
            <div className="w-20 h-4 bg-neutral-700 rounded"></div>
          </div>
        ) : status === 'authenticated' ? (
          <div className="relative flex-shrink-0 min-w-[120px]" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-700/50 transition-colors whitespace-nowrap min-w-[120px]"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden">
                <Image src={getUserAvatar(session.user?.image, undefined)} alt={session.user?.name || ''} width={32} height={32} className="object-cover" />
              </div>
              <span className="text-white font-medium truncate">{session.user?.name}</span>
              <FontAwesomeIcon icon={faChevronDown} className={`text-neutral-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/50 rounded-xl shadow-2xl overflow-hidden"
                >
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 border-b border-neutral-800/50 flex items-center gap-3"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="relative w-12 h-12 rounded-full overflow-hidden"
                    >
                      <Image src={getUserAvatar(session.user?.image, undefined)} alt={session.user?.name || ''} width={48} height={48} className="object-cover" />
                    </motion.div>
                    <div>
                      <div className="text-white font-medium truncate">{session.user?.name}</div>
                      <div className="text-sm text-neutral-400 truncate">{session.user?.email}</div>
                    </div>
                  </motion.div>

                  <div className="py-2">
                    {[
                      { href: userUid ? `/u/${userUid}` : '#', icon: faUserCircle, label: 'My Profile' },
                      { href: '/invitations', icon: faUserCircle, label: 'My Invitations' },
                      { href: '/settings', icon: faCog, label: 'Settings' },
                      ...(adminCheck ? [{ href: '/admin', icon: faShield, label: 'Admin Panel' }] : []),
                      ...((adminData?.isOwner || adminData?.isDeveloper) ? [{ href: '/control', icon: faCog, label: 'Control Panel' }] : [])
                    ].map((item, index) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          className="flex items-center gap-3 px-4 py-3 text-white hover:bg-neutral-800/50 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <FontAwesomeIcon icon={item.icon} className="w-4 h-4" /> {item.label}
                        </Link>
                      </motion.div>
                    ))}

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <button
                        onClick={() => { setDropdownOpen(false); signOut() }}
                        className="flex items-center gap-3 px-4 py-3 text-white hover:bg-red-600/20 transition-colors w-full text-left"
                      >
                        <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4" /> Sign Out
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Link 
              href="/auth/signin" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors"
            >
              <FontAwesomeIcon icon={faUser} className="w-4 h-4" /> Sign In
            </Link>
          </motion.div>
        )}
      </div>
    </motion.header>
  )
}
