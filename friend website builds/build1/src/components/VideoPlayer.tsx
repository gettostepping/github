"use client"
import { useEffect, useRef, useState } from 'react'
import { MediaPlayer, MediaProvider } from '@vidstack/react'
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default'
import '@vidstack/react/player/styles/base.css'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStepForward, faStepBackward } from '@fortawesome/free-solid-svg-icons'

type SubtitleTrack = {
  src: string
  label?: string
  kind?: 'subtitles' | 'captions' | 'metadata'
  lang?: string
  default?: boolean
}

interface VideoPlayerProps {
  mode: 'embed' | 'hls'
  src?: string
  hlsSrc?: string
  hlsTracks?: SubtitleTrack[]
  title: string
  poster?: string
  blurPlayer?: boolean
  onError?: () => void
  onLoad?: () => void
  onPlayerStart?: () => void
  onNextEpisode?: () => void
  onPrevEpisode?: () => void
  hasNextEpisode?: boolean
  hasPrevEpisode?: boolean
}

export default function VideoPlayer({
  mode,
  src,
  hlsSrc,
  hlsTracks = [],
  title,
  poster,
  blurPlayer = false,
  onError,
  onLoad,
  onPlayerStart,
  onNextEpisode,
  onPrevEpisode,
  hasNextEpisode = false,
  hasPrevEpisode = false
}: VideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const errorHandledRef = useRef<string | null>(null) // Track if we've handled an error for this source
  const [hlsSrcState, setHlsSrcState] = useState(hlsSrc) // Local state to clear source on error

  // Reset error handling and update local state when source changes
  useEffect(() => {
    errorHandledRef.current = null
    setHlsSrcState(hlsSrc)
  }, [hlsSrc, src])

  useEffect(() => {
    setIsMounted(true)
    
    // Suppress Vidstack initialization errors (PiP and HLS loader)
    const handleError = (event: ErrorEvent) => {
      const error = event.error
      const stack = error?.stack || ''
      const message = error?.message || ''
      
      // Check for Vidstack-related null reference errors
      if ((message.includes('addEventListener') || message.includes('dispatch')) &&
          (stack.includes('VideoPictureInPicture') || 
           stack.includes('HLSProvider') || 
           stack.includes('HLSLibLoader') ||
           stack.includes('vidstack'))) {
        event.preventDefault()
        console.debug('Suppressed Vidstack initialization error:', message)
        return true
      }
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const stack = reason?.stack || ''
      const message = reason?.message || ''
      
      // Check for Vidstack-related null reference errors
      if ((message.includes('addEventListener') || message.includes('dispatch')) &&
          (stack.includes('VideoPictureInPicture') || 
           stack.includes('HLSProvider') || 
           stack.includes('HLSLibLoader') ||
           stack.includes('vidstack'))) {
        event.preventDefault()
        console.debug('Suppressed Vidstack initialization promise rejection:', message)
      }
    }
    
    window.addEventListener('error', handleError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    const handlePlayerClick = () => {
      if (blurPlayer && onPlayerStart) {
        onPlayerStart()
      }
    }

    const playerElement = playerRef.current
    if (playerElement) {
      playerElement.addEventListener('click', handlePlayerClick)
      return () => {
        playerElement.removeEventListener('click', handlePlayerClick)
      }
    }
  }, [blurPlayer, onPlayerStart])

  const renderPlayer = () => {
    if (mode === 'hls') {
      if (!hlsSrcState || !isMounted) {
        return (
          <div className="flex h-full items-center justify-center text-white/70 text-sm">
            {!isMounted ? 'Loading player...' : 'No streaming source available'}
          </div>
        )
      }

      return (
        <MediaPlayer
          key={hlsSrcState || hlsSrc} // Use local state to force remount when cleared
          className="relative w-full h-full"
          title={title}
          src={hlsSrcState ? {
            src: hlsSrcState,
            type: 'application/vnd.apple.mpegurl'
          } : undefined}
          poster={poster}
          playsInline
          streamType="on-demand"
          viewType="video"
          crossOrigin="anonymous"
          load="eager"
          onCanPlay={() => {
            console.log('✅ Vidstack video can play')
            onLoad?.()
          }}
          onPlay={() => {
            console.log('▶️ Vidstack video playing')
            onPlayerStart?.()
          }}
                 onError={(detail: any, nativeEvent: any) => {
                   const error = nativeEvent || detail
                   const errorDetail = detail?.detail || detail || {}
                   const errorDetails = errorDetail.details || errorDetail.type || ''

                   // Create a unique error key for this source
                   const errorKey = `${hlsSrc || src}-${errorDetails}`

                   // If we've already handled this error for this source, don't handle it again
                   if (errorHandledRef.current === errorKey) {
                     console.debug('⏭️ Skipping already-handled error:', errorKey)
                     return
                   }

                   // Log FULL error object to see what Vidstack is actually reporting
                   console.error('🎞️ Vidstack video player error:', {
                     type: error?.type,
                     code: error?.code,
                     message: error?.message,
                     detail: errorDetail,
                     details: errorDetails,
                     source: hlsSrcState || hlsSrc,
                     target: nativeEvent?.target,
                     fullError: error,
                     fullErrorDetail: errorDetail,
                     errorEvent: nativeEvent
                   })
                   
                   // Log network errors for debugging
                   if (errorDetail.type === 'networkError' || errorDetails === 'networkError') {
                     console.error('🌐 Network error detected - possible CORS or connection issue')
                     console.error('🌐 Full network error:', errorDetail)
                   }
                   
                   // Log HLS-specific errors
                   if (errorDetail.type === 'hlsError' || errorDetails === 'hlsError' || error.message?.includes('HLS')) {
                     console.error('📺 HLS Error Details:', {
                       errorDetail,
                       errorDetails,
                       errorMessage: error.message,
                       errorCode: error.code,
                       hlsError: errorDetail.error || errorDetail.hlsError || errorDetail.data
                     })
                   }
            
            // Check for fatal codec errors that should stop retrying
            const isCodecError = errorDetails === 'bufferAddCodecError' || 
                               errorDetails === 'bufferAppendError' ||
                               errorDetail.details === 'bufferAddCodecError' ||
                               errorDetail.details === 'bufferAppendError' ||
                               (errorDetail.type === 'mediaError' && 
                                (errorDetail.details === 'bufferAddCodecError' || 
                                 errorDetail.details === 'bufferAppendError'))
            
            // Call onError for fatal errors:
            // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED (codec/format not supported)
            // Codec errors that cause infinite loops
            const isFatalError = error.code === 4 || isCodecError
            
            if (isFatalError) {
              console.error('🚨 Fatal video error detected (codec issue), calling onError handler to stop retries')
              // Mark this error as handled to prevent infinite retries
               errorHandledRef.current = errorKey
               // Clear the source immediately to stop Vidstack from retrying
               setHlsSrcState(undefined)
               // Stop the player to prevent infinite retries
               if (nativeEvent?.target && 'pause' in nativeEvent.target) {
                 (nativeEvent.target as HTMLVideoElement).pause()
               }
              // Call onError after a short delay to ensure source is cleared
              setTimeout(() => {
                onError?.()
              }, 100)
            }
          }}
          onLoadStart={() => {
            console.log('🔄 Vidstack video loading started')
            console.log('📺 HLS Source:', hlsSrcState || hlsSrc)
          }}
          onLoadedMetadata={() => {
            console.log('📊 Vidstack metadata loaded')
          }}
          onLoadedData={() => {
            console.log('📦 Vidstack data loaded')
          }}
          onWaiting={() => {
            console.warn('⏳ Vidstack waiting for data')
          }}
          onStalled={() => {
            console.warn('⚠️ Vidstack stalled')
          }}
          onProviderChange={(event: any) => {
            // Log all provider change events, even if detail is null
            console.log('🔄 onProviderChange called:', {
              hasEvent: !!event,
              hasDetail: !!event?.detail,
              detailType: event?.detail?.type,
              provider: event?.detail
            })
            
            // event.detail can be null during provider cleanup/initialization
            if (!event || !event.detail) {
              console.debug('⏭️ Skipping provider change - no detail')
              return
            }
            
            const provider = event.detail
            console.log('🔄 Vidstack provider changed:', provider?.type, provider)
            
            // Listen for HLS errors from the provider
            if (provider?.type === 'hls') {
              const hls = provider.instance
              console.log('📺 HLS provider instance:', hls)
              if (hls) {
                // Try to listen to all HLS events
                const errorHandler = (event: any, data: any) => {
                  console.error('🚨 HLS Error from provider:', {
                    event,
                    data,
                    type: data?.type,
                    details: data?.details,
                    fatal: data?.fatal,
                    error: data?.error,
                    url: data?.url,
                    response: data?.response
                  })
                }
                
                hls.on('hlsError', errorHandler)
                hls.on('hlsNetworkError', errorHandler)
                hls.on('hlsFragLoading', (event: any, data: any) => {
                  console.log('📥 HLS Fragment Loading:', data?.frag?.url)
                })
                hls.on('hlsFragLoaded', (event: any, data: any) => {
                  console.log('✅ HLS Fragment Loaded:', data?.frag?.url)
                })
                hls.on('hlsFragLoadError', (event: any, data: any) => {
                  console.error('❌ HLS Fragment Load Error:', {
                    frag: data?.frag?.url,
                    error: data?.error,
                    response: data?.response
                  })
                })
              } else {
                console.warn('⚠️ HLS provider has no instance')
              }
            }
          }}
        >
          <MediaProvider>
            {hlsTracks.map((track, index) =>
              track.src ? (
                <track
                  key={`${track.src}-${index}`}
                  src={track.src}
                  kind={track.kind || 'subtitles'}
                  label={track.label || `Track ${index + 1}`}
                  srcLang={track.lang}
                  default={track.default}
                />
              ) : null
            )}
          </MediaProvider>
          <DefaultVideoLayout icons={defaultLayoutIcons} />
        </MediaPlayer>
      )
    }

    if (!src) {
      return (
        <div className="flex h-full items-center justify-center text-white/70 text-sm">
          No streaming source available
        </div>
      )
    }

    return (
      <iframe
        src={src && src.trim() ? src : undefined}
        allowFullScreen
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        referrerPolicy="no-referrer"
        loading="lazy"
        className="w-full h-full"
        onLoad={onLoad}
        onError={(e) => {
          console.error('🚨 Iframe load error:', e)
          console.error('🚨 Failed to load src:', src)
          onError?.()
        }}
      />
    )
  }

  return (
    <div className="w-full">
      <div
        ref={playerRef}
        className={`relative w-full aspect-video rounded-lg border border-neutral-800 bg-black ${
          mode === 'embed' ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={{ minHeight: '400px' }}
      >
        {mode === 'hls' ? (
          <div className="w-full h-full">
            {renderPlayer()}
          </div>
        ) : (
          <div className={blurPlayer ? 'h-full w-full blur-sm overflow-hidden' : 'h-full w-full overflow-hidden'}>
            {renderPlayer()}
          </div>
        )}
        {blurPlayer && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-white font-medium z-10">
            Click to start watching
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-neutral-400">
        <button
          onClick={onPrevEpisode}
          disabled={!hasPrevEpisode}
          className={`flex items-center gap-2 transition-colors ${
            hasPrevEpisode
              ? 'cursor-pointer hover:text-white'
              : 'cursor-not-allowed text-neutral-600'
          }`}
        >
          <FontAwesomeIcon icon={faStepBackward} />
          Prev
        </button>
        <button
          onClick={onNextEpisode}
          disabled={!hasNextEpisode}
          className={`flex items-center gap-2 transition-colors ${
            hasNextEpisode
              ? 'cursor-pointer hover:text-white'
              : 'cursor-not-allowed text-neutral-600'
          }`}
        >
          <FontAwesomeIcon icon={faStepForward} />
          Next
        </button>
      </div>
    </div>
  )
}
