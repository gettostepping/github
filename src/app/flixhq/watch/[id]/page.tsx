'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import VideoPlayer from '@/components/VideoPlayer'
import { IMovieInfo, IEpisode, IEpisodeServer, ISource } from '@/lib/flixhq'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faPlay, faServer } from '@fortawesome/free-solid-svg-icons'

export default function FlixHQWatchPage() {
  const params = useParams()
  const id = params.id as string
  
  // State
  const [info, setInfo] = useState<IMovieInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeEpisode, setActiveEpisode] = useState<IEpisode | null>(null)
  const [servers, setServers] = useState<IEpisodeServer[]>([])
  const [activeServer, setActiveServer] = useState<IEpisodeServer | null>(null)
  const [source, setSource] = useState<ISource | null>(null)
  const [loadingSource, setLoadingSource] = useState(false)

  // 1. Fetch Info
  useEffect(() => {
    if (!id) return

    async function fetchInfo() {
      try {
        // decodeURIComponent in case the ID has special chars
        const decodedId = decodeURIComponent(id)
        const res = await fetch(`/api/flixhq/info?id=${decodedId}`)
        const data = await res.json()
        
        if (data.error) throw new Error(data.message)
        
        setInfo(data)
        
        // Auto-select first episode
        if (data.episodes && data.episodes.length > 0) {
          setActiveEpisode(data.episodes[0])
        }
      } catch (err) {
        console.error('Failed to fetch info:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchInfo()
  }, [id])

  // 2. Fetch Servers when Episode Changes
  useEffect(() => {
    if (!activeEpisode || !info) return

    async function fetchServers() {
      try {
        setServers([])
        setActiveServer(null)
        setSource(null)
        
        const res = await fetch(`/api/flixhq/servers?episodeId=${activeEpisode?.id}&mediaId=${info?.id}`)
        const data = await res.json()
        
        if (Array.isArray(data) && data.length > 0) {
          setServers(data)
          // Prefer UpCloud or VidCloud
          const preferred = data.find(s => s.name.toLowerCase().includes('upcloud') || s.name.toLowerCase().includes('vidcloud'))
          setActiveServer(preferred || data[0])
        }
      } catch (err) {
        console.error('Failed to fetch servers:', err)
      }
    }
    fetchServers()
  }, [activeEpisode, info])

  // 3. Fetch Source when Server Changes
  useEffect(() => {
    if (!activeServer) return

    async function fetchSource() {
      try {
        setLoadingSource(true)
        setSource(null)
        
        const res = await fetch(`/api/flixhq/sources?serverId=${activeServer?.id}&serverName=${activeServer?.name}`)
        const data = await res.json()
        
        if (data.url) {
          setSource(data)
        }
      } catch (err) {
        console.error('Failed to fetch source:', err)
      } finally {
        setLoadingSource(false)
      }
    }
    fetchSource()
  }, [activeServer])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-brand-500" />
      </div>
    )
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 text-white">
        Failed to load content.
      </div>
    )
  }

  // Helper to build proxy URL
  // const PROXY_WORKER_URL = 'https://your-worker-subdomain.workers.dev'
  const PROXY_WORKER_URL = '' // Leave empty to use local proxy, or set to your worker URL

  const getProxyUrl = (url: string, referer?: string) => {
    if (PROXY_WORKER_URL) {
        // Double-encode the URL to ensure query params inside the target URL are preserved
        const params = new URLSearchParams()
        params.set('url', url)
        if (referer) params.set('referer', referer)
        return `${PROXY_WORKER_URL}?${params.toString()}`
    }

    const params = new URLSearchParams()
    params.set('url', url)
    if (referer) params.set('referer', referer)
    return `/api/proxy/hls?${params.toString()}`
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Player Section */}
      <div className="mb-8">
        <div className="aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-neutral-800">
          {loadingSource ? (
            <div className="w-full h-full flex items-center justify-center text-white">
               <div className="flex flex-col items-center gap-4">
                 <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-brand-500" />
                 <p className="text-neutral-400">Loading stream...</p>
               </div>
            </div>
          ) : source ? (
            <VideoPlayer
              mode="hls"
              src={source.isM3U8 ? getProxyUrl(source.url, source.headers?.['Referer'] || 'https://flixhq.to/') : source.url}
              hlsSrc={source.isM3U8 ? getProxyUrl(source.url, source.headers?.['Referer'] || 'https://flixhq.to/') : undefined}
              hlsTracks={source.subtitles?.map(s => ({
                src: s.url,
                label: s.lang,
                lang: s.lang.substring(0, 2),
                kind: 'subtitles'
              }))}
              title={`${info.title} - ${activeEpisode?.title}`}
              poster={info.image}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50">
              Select an episode and server to start watching
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{info.title}</h1>
            <p className="text-neutral-400 text-lg">{activeEpisode?.title}</p>
          </div>
          
          <p className="text-neutral-300 leading-relaxed">
            {info.description}
          </p>

          {/* Servers */}
          {servers.length > 0 && (
            <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faServer} className="text-brand-500" />
                Select Server
              </h3>
              <div className="flex flex-wrap gap-2">
                {servers.map(server => (
                  <button
                    key={server.id}
                    onClick={() => setActiveServer(server)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeServer?.id === server.id
                        ? 'bg-brand-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {server.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Episodes List */}
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden flex flex-col max-h-[600px]">
          <div className="p-4 border-b border-neutral-800">
            <h3 className="text-white font-semibold">Episodes</h3>
            <p className="text-xs text-neutral-500 mt-1">{info.episodes?.length || 0} episodes available</p>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
            {info.episodes?.map(ep => (
              <button
                key={ep.id}
                onClick={() => setActiveEpisode(ep)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeEpisode?.id === ep.id
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-600/20'
                    : 'hover:bg-neutral-800 text-neutral-300'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {ep.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{ep.title}</div>
                </div>
                {activeEpisode?.id === ep.id && (
                  <FontAwesomeIcon icon={faPlay} className="text-xs" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
