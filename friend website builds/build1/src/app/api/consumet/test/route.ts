import { NextRequest, NextResponse } from 'next/server'
import { searchAnime, getAnimeInfo, getEpisodeSources } from '@/lib/consumet'
import { ANIME } from '@consumet/extensions'

async function getHandler(req: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    }

    // Test 1: Check if AnimePahe is available
    try {
      const animepahe = new ANIME.AnimePahe()
      results.tests.push({
        name: 'AnimePahe Instance Creation',
        status: 'success',
        details: {
          name: animepahe.name,
          isWorking: animepahe.isWorking
        }
      })
    } catch (error: any) {
      results.tests.push({
        name: 'AnimePahe Instance Creation',
        status: 'error',
        error: error.message
      })
      return NextResponse.json(results, { status: 500 })
    }

    // Test 2: Search for anime (try multiple queries)
    const searchQueries = ['Naruto', 'One Piece', 'Attack on Titan']
    let searchSuccess = false
    let selectedAnime: any = null
    
    for (const query of searchQueries) {
      if (searchSuccess) break
      try {
        const searchResults = await searchAnime(query, 1)
        if (searchResults.results && searchResults.results.length > 0) {
          selectedAnime = searchResults.results[0]
          searchSuccess = true
          results.tests.push({
            name: 'Search Anime',
            status: 'success',
            details: {
              query,
              resultsCount: searchResults.results?.length || 0,
              firstResult: {
                id: selectedAnime.id,
                title: selectedAnime.title
              }
            }
          })
        }
      } catch (error: any) {
        // Continue to next query
      }
    }
    
    if (!searchSuccess) {
      results.tests.push({
        name: 'Search Anime',
        status: 'error',
        error: 'All search queries failed'
      })
      return NextResponse.json(results, { status: 500 })
    }

    // Test 3: Get anime info
    try {
      const animeId = selectedAnime.id
      const animeInfo = await getAnimeInfo(animeId, -1)
        
        // Check episode ID format
        const firstEpisode = animeInfo.episodes?.[0]
        const episodeIdFormat = firstEpisode?.id || 'no episodes'
        const isCombinedFormat = typeof episodeIdFormat === 'string' && episodeIdFormat.includes('/')
        
        results.tests.push({
          name: 'Get Anime Info',
          status: 'success',
          details: {
            animeId,
            title: animeInfo.title,
            totalEpisodes: animeInfo.totalEpisodes,
            episodesCount: animeInfo.episodes?.length || 0,
            firstEpisodeId: firstEpisode?.id || null,
            firstEpisodeNumber: firstEpisode?.number || null,
            episodeIdFormat: isCombinedFormat ? 'combined (animeId/episodeHash)' : 'hash only',
            episodePages: animeInfo.episodePages
          }
        })

        // Test 4: Inspect episode structure
        if (animeInfo.episodes && animeInfo.episodes.length > 0) {
          const firstEp = animeInfo.episodes[0]
          results.tests.push({
            name: 'Episode Structure Analysis',
            status: 'success',
            details: {
              firstEpisode: {
                number: firstEp.number,
                id: firstEp.id,
                title: firstEp.title,
                url: firstEp.url,
                image: firstEp.image,
                releaseDate: firstEp.releaseDate,
                allKeys: Object.keys(firstEp)
              },
              episodeIdType: typeof firstEp.id,
              episodeIdLength: firstEp.id?.length || 0,
              hasUrl: !!firstEp.url,
              sampleEpisodes: animeInfo.episodes.slice(0, 3).map((ep: any) => ({
                number: ep.number,
                id: ep.id,
                url: ep.url
              }))
            }
          })
        }

        // Test 5: Get episode sources (if we have an episode)
        // Try multiple episodes in case the first one is unavailable
        const episodesToTest = animeInfo.episodes?.slice(0, 3) || []
        if (episodesToTest.length > 0) {
          let episodeSourcesSuccess = false
          const episodeAttempts: any[] = []
          
          // Also test direct library call
          let directLibraryTest: any = null
          try {
            const firstEp = episodesToTest[0]
            let testHash = firstEp.id
            if (testHash.includes('/')) {
              testHash = testHash.split('/').pop() || testHash
            }
            
            console.log(`🧪 Test: Direct library call with hash: ${testHash}`)
            const animepahe = new ANIME.AnimePahe()
            
            // Try with the episode URL if available
            if (firstEp.url) {
              try {
                console.log(`🧪 Test: Trying with episode URL: ${firstEp.url}`)
                // Extract session and episode ID from URL if it's an animepahe URL
                const urlMatch = firstEp.url.match(/\/anime\/([^\/]+)\/episode\/([^\/]+)/)
                if (urlMatch) {
                  const session = urlMatch[1]
                  const epId = urlMatch[2]
                  console.log(`🧪 Test: Extracted from URL - session: ${session}, episodeId: ${epId}`)
                }
              } catch (urlError: any) {
                console.log(`🧪 Test: URL parsing error: ${urlError.message}`)
              }
            }
            
            const directSources = await animepahe.fetchEpisodeSources(testHash)
            directLibraryTest = {
              status: 'success',
              hash: testHash,
              sourcesCount: directSources.sources?.length || 0
            }
            episodeSourcesSuccess = true
            results.tests.push({
              name: 'Get Episode Sources (Direct Library)',
              status: 'success',
              details: {
                episodeNumber: firstEp.number,
                hash: testHash,
                method: 'direct library call',
                sourcesCount: directSources.sources?.length || 0,
                hasReferer: !!directSources.headers?.Referer
              }
            })
          } catch (directError: any) {
            directLibraryTest = {
              status: 'error',
              error: directError.message,
              stack: directError.stack
            }
            episodeAttempts.push({
              method: 'direct library call',
              error: directError.message
            })
          }
          
          // Try through our wrapper
          if (!episodeSourcesSuccess) {
            for (const episode of episodesToTest) {
              if (episodeSourcesSuccess) break
              
              try {
                // Extract hash if needed
                let episodeHash = episode.id
                const originalEpisodeId = episode.id
                if (episodeHash.includes('/')) {
                  episodeHash = episodeHash.split('/').pop() || episodeHash
                }
                
                console.log(`🧪 Test: Trying episode ${episode.number} with hash: ${episodeHash}`)
                
                // Try with extracted hash first
                try {
                  const sources = await getEpisodeSources(episodeHash)
                  episodeSourcesSuccess = true
                  results.tests.push({
                    name: 'Get Episode Sources (Wrapper)',
                    status: 'success',
                    details: {
                      episodeNumber: episode.number,
                      originalEpisodeId: originalEpisodeId,
                      extractedHash: episodeHash,
                      method: 'extracted hash',
                      sourcesCount: sources.sources?.length || 0,
                      hasReferer: !!sources.headers?.Referer,
                      referer: sources.headers?.Referer || null,
                      firstSource: sources.sources?.[0] ? {
                        url: sources.sources[0].url,
                        quality: sources.sources[0].quality,
                        isM3U8: sources.sources[0].isM3U8
                      } : null
                    }
                  })
                  break
                } catch (hashError: any) {
                  episodeAttempts.push({
                    episodeNumber: episode.number,
                    method: 'extracted hash (wrapper)',
                    episodeId: episodeHash,
                    error: hashError.message
                  })
                  
                  // Try with combined format as fallback
                  try {
                    console.log(`🧪 Test: Trying episode ${episode.number} with combined format: ${episode.id}`)
                    const sources = await getEpisodeSources(episode.id)
                    episodeSourcesSuccess = true
                    results.tests.push({
                      name: 'Get Episode Sources (Wrapper)',
                      status: 'success (with combined format)',
                      details: {
                        episodeNumber: episode.number,
                        originalEpisodeId: episode.id,
                        method: 'combined format',
                        sourcesCount: sources.sources?.length || 0,
                        hasReferer: !!sources.headers?.Referer
                      }
                    })
                    break
                  } catch (combinedError: any) {
                    episodeAttempts.push({
                      episodeNumber: episode.number,
                      method: 'combined format (wrapper)',
                      episodeId: episode.id,
                      error: combinedError.message
                    })
                  }
                }
              } catch (error: any) {
                episodeAttempts.push({
                  episodeNumber: episode.number,
                  episodeId: episode.id,
                  error: error.message
                })
              }
            }
          }
          
          if (!episodeSourcesSuccess) {
            results.tests.push({
              name: 'Get Episode Sources',
              status: 'error',
              error: 'All episode attempts failed',
              details: {
                directLibraryTest,
                episodesTested: episodesToTest.length,
                attempts: episodeAttempts
              }
            })
          }
        } else {
          results.tests.push({
            name: 'Get Episode Sources',
            status: 'skipped',
            reason: 'No episodes available'
          })
        }
    } catch (error: any) {
      results.tests.push({
        name: 'Get Anime Info',
        status: 'error',
        error: error.message
      })
    }

    // Summary
    const successCount = results.tests.filter((t: any) => t.status === 'success').length
    const errorCount = results.tests.filter((t: any) => t.status === 'error').length
    results.summary = {
      total: results.tests.length,
      success: successCount,
      errors: errorCount,
      allPassed: errorCount === 0
    }

    return NextResponse.json(results, { status: errorCount > 0 ? 207 : 200 }) // 207 = Multi-Status
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'test_failed',
        message: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}

export const GET = getHandler

