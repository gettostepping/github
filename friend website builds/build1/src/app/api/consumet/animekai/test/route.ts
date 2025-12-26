import { NextRequest, NextResponse } from 'next/server'
import { ANIME, StreamingServers } from '@consumet/extensions'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const test = searchParams.get('test') || 'search' // search, info, sources, full
  const query = searchParams.get('q') || 'jujutsu kaisen'
  const animeId = searchParams.get('animeId') || 'jujutsu-kaisen-4gm6'
  const episodeId = searchParams.get('episodeId') || 'jujutsu-kaisen-4gm6#ep=1?token=30nW30ysAuVpjobTutx2'
  const subOrDub = searchParams.get('subOrDub') || 'sub' // sub or dub
  const server = searchParams.get('server') || undefined // server name to try

  try {
    const animekai = new ANIME.AnimeKai()
    let result: any = {}

    switch (test) {
      case 'search':
        result = await animekai.search(query)
        break
      
      case 'info':
        result = await animekai.fetchAnimeInfo(animeId)
        break
      
      case 'servers':
        // @ts-ignore - Library type definition issue (SubOrSub vs SubOrDub)
        result = await animekai.fetchEpisodeServers(episodeId, subOrDub === 'dub' ? 'dub' : 'sub')
        break
      
      case 'sources':
        // Try different server parameter formats
        const attempts: any[] = []
        
        // First, get servers to extract server URLs
        let servers: any[] = []
        try {
          // @ts-ignore - Library type definition issue (SubOrSub vs SubOrDub)
          servers = await animekai.fetchEpisodeServers(episodeId, subOrDub === 'dub' ? 'dub' : 'sub')
          attempts.push({ method: 'fetch servers', success: true, serversCount: servers?.length || 0 })
        } catch (err: any) {
          attempts.push({ method: 'fetch servers', error: err.message })
        }
        
        // Try 1: Direct fetch from server URL with headers (Flowrt's suggestion)
        if (servers && servers.length > 0) {
          for (const serverEntry of servers) {
            if (serverEntry.url) {
              try {
                const serverUrl = new URL(serverEntry.url)
                const headers = {
                  'Referer': serverUrl.origin + '/',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                  'Accept': '*/*',
                  'Accept-Language': 'en-US,en;q=0.5',
                  'Origin': serverUrl.origin,
                }
                
                attempts.push({ method: `direct fetch attempt: ${serverEntry.name}`, url: serverEntry.url, headers })
                
                // Try fetching the server URL directly with headers
                const directResponse = await fetch(serverEntry.url, { headers })
                const responseStatus = directResponse.status
                const responseText = await directResponse.text()
                
                attempts.push({ 
                  method: `direct fetch result: ${serverEntry.name}`, 
                  status: responseStatus,
                  statusText: directResponse.statusText,
                  responseLength: responseText.length,
                  responsePreview: responseText.substring(0, 200)
                })
                
                if (directResponse.ok) {
                  return NextResponse.json({
                    test,
                    success: true,
                    method: 'direct fetch with headers',
                    server: serverEntry.name,
                    serverUrl: serverEntry.url,
                    data: { 
                      url: serverEntry.url,
                      responsePreview: responseText.substring(0, 500),
                      responseLength: responseText.length,
                      note: 'This is the raw response from the server URL - may need parsing'
                    },
                    timestamp: new Date().toISOString()
                  })
                } else {
                  attempts.push({ 
                    method: `direct fetch failed: ${serverEntry.name}`, 
                    status: responseStatus,
                    error: `HTTP ${responseStatus}: ${directResponse.statusText}`
                  })
                }
              } catch (err: any) {
                attempts.push({ method: `direct fetch error: ${serverEntry.name}`, error: err.message, stack: err.stack })
              }
            }
          }
        } else {
          attempts.push({ method: 'direct fetch', error: 'No servers available to try direct fetch' })
        }
        
        // Try 2: Library method with "megaup" server
        try {
          // @ts-ignore - Library type definition issue (SubOrSub vs SubOrDub)
          result = await animekai.fetchEpisodeSources(episodeId, 'megaup' as any, subOrDub === 'dub' ? 'dub' : 'sub')
          return NextResponse.json({
            test,
            success: true,
            method: 'library method: megaup',
            data: result,
            timestamp: new Date().toISOString()
          })
        } catch (err1: any) {
          attempts.push({ method: 'library: megaup', error: err1.message })
        }
        
        // Try 3: No server (default)
        try {
          // @ts-ignore - Library type definition issue (SubOrSub vs SubOrDub)
          result = await animekai.fetchEpisodeSources(episodeId, undefined, subOrDub === 'dub' ? 'dub' : 'sub')
          return NextResponse.json({
            test,
            success: true,
            method: 'default (no server)',
            data: result,
            timestamp: new Date().toISOString()
          })
        } catch (err2: any) {
          attempts.push({ method: 'default', error: err2.message })
        }
        
        // Try 4: If server param provided, use it
        if (server) {
          try {
            // @ts-ignore - Library type definition issue (SubOrSub vs SubOrDub)
            result = await animekai.fetchEpisodeSources(episodeId, server as any, subOrDub === 'dub' ? 'dub' : 'sub')
            return NextResponse.json({
              test,
              success: true,
              method: `server: ${server}`,
              data: result,
              timestamp: new Date().toISOString()
            })
          } catch (err3: any) {
            attempts.push({ method: `server: ${server}`, error: err3.message })
          }
        }
        
        // All attempts failed
        return NextResponse.json({
          test,
          success: false,
          error: 'All server attempts failed',
          attempts,
          availableServers: servers.map((s: any) => ({ name: s.name, url: s.url })),
          timestamp: new Date().toISOString()
        }, { status: 500 })
      
      case 'full':
        // Full test: search -> info -> servers -> sources
        const fullResult: any = {
          steps: []
        }
        
        // Step 1: Search
        try {
          const searchResults = await animekai.search(query)
          fullResult.steps.push({ step: 'search', success: true, resultsCount: searchResults.results?.length || 0 })
          if (searchResults.results && searchResults.results.length > 0) {
            const firstAnime = searchResults.results[0]
            fullResult.searchResult = firstAnime
            
            // Step 2: Get info
            try {
              const info = await animekai.fetchAnimeInfo(firstAnime.id)
              fullResult.steps.push({ step: 'info', success: true, episodesCount: info.episodes?.length || 0 })
              fullResult.animeInfo = { id: info.id, title: info.title, totalEpisodes: info.totalEpisodes }
              
              if (info.episodes && info.episodes.length > 0) {
                const firstEpisode = info.episodes[0]
                fullResult.firstEpisode = { number: firstEpisode.number, id: firstEpisode.id, title: firstEpisode.title }
                
                // Step 3: Get servers
                try {
                  // @ts-ignore - Library type definition issue (SubOrSub vs SubOrDub)
                  const servers = await animekai.fetchEpisodeServers(firstEpisode.id, 'sub')
                  fullResult.steps.push({ step: 'servers', success: true, serversCount: servers?.length || 0 })
                  fullResult.servers = servers
                  
                  // Step 4: Try to get sources
                  if (servers && servers.length > 0) {
                    for (const serverEntry of servers.slice(0, 2)) { // Try first 2 servers
                      // Try multiple server name formats
                      const serverNameVariants = [
                        StreamingServers?.MegaUp, // Try enum if available
                        'MegaUp', // Capitalized
                        'megaup', // Just "megaup"
                        serverEntry.name?.toLowerCase().replace(/\s+/g, ''), // "megaupserver1"
                        serverEntry.name?.toLowerCase().replace(/\s+server\s+/g, ''), // "megaup1"
                        serverEntry.name?.toLowerCase(), // "megaup server 1"
                        serverEntry.name, // Original name
                      ].filter(Boolean)
                      
                      for (const serverName of serverNameVariants) {
                        try {
                          // @ts-ignore - Library type definition issue (SubOrSub vs SubOrDub)
                          const sources = await animekai.fetchEpisodeSources(firstEpisode.id, serverName as any, 'sub')
                          fullResult.steps.push({ step: 'sources', success: true, server: serverName, sourcesCount: sources.sources?.length || 0 })
                          fullResult.sources = sources
                          return NextResponse.json({
                            test: 'full',
                            success: true,
                            ...fullResult,
                            timestamp: new Date().toISOString()
                          })
                        } catch (err: any) {
                          fullResult.steps.push({ step: 'sources', success: false, server: serverName, error: err.message })
                        }
                      }
                    }
                  }
                } catch (err: any) {
                  fullResult.steps.push({ step: 'servers', success: false, error: err.message })
                }
              }
            } catch (err: any) {
              fullResult.steps.push({ step: 'info', success: false, error: err.message })
            }
          }
        } catch (err: any) {
          fullResult.steps.push({ step: 'search', success: false, error: err.message })
        }
        
        return NextResponse.json({
          test: 'full',
          success: fullResult.steps.every((s: any) => s.success),
          ...fullResult,
          timestamp: new Date().toISOString()
        })
      
      case 'latest':
        result = await animekai.fetchLatestCompleted()
        break
      
      case 'schedule':
        result = await animekai.fetchSchedule()
        break
      
      case 'spotlight':
        result = await animekai.fetchSpotlight()
        break
      
      case 'suggestions':
        result = await animekai.fetchSearchSuggestions(query)
        break
      
      default:
        return NextResponse.json({
          error: 'invalid_test',
          message: 'Invalid test parameter',
          availableTests: ['search', 'info', 'servers', 'sources', 'full', 'latest', 'schedule', 'spotlight', 'suggestions']
        }, { status: 400 })
    }

    return NextResponse.json({
      test,
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({
      test,
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export const GET = getHandler

