import { NextRequest, NextResponse } from 'next/server'

const BLOCKED_HOSTS = new Set([''])

function isSafeTarget(url: URL) {
  if (!['https:', 'http:'].includes(url.protocol)) return false
  if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) return false
  return true
}

function buildProxyUrl(target: string, referer?: string | null, isKey: boolean = false) {
  const params = new URLSearchParams()
  params.set('url', target)
  if (referer) {
    params.set('referer', referer)
  }
  return `/api/proxy/hls?${params.toString()}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('url')
  const referer = searchParams.get('referer')

  if (!target) {
    return NextResponse.json({ error: 'missing_url' }, { status: 400 })
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(target)
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }

  // If this is an animepahe-proxy key URL, extract the original key URL
  // animepahe-proxy returns 403 on key requests, so we need to bypass it
  if (targetUrl.hostname === 'animepahe-proxy.vercel.app' && targetUrl.pathname.includes('/api/proxy/key')) {
    const originalKeyUrl = targetUrl.searchParams.get('url')
    if (originalKeyUrl) {
      try {
        targetUrl = new URL(originalKeyUrl)
        console.log('🔑 Extracted original key URL from animepahe-proxy:', originalKeyUrl)
      } catch {
        return NextResponse.json({ error: 'invalid_key_url' }, { status: 400 })
      }
    }
  }

  if (!isSafeTarget(targetUrl)) {
    return NextResponse.json({ error: 'forbidden_target' }, { status: 400 })
  }

  try {
    const upstreamHeaders: Record<string, string> = {}
    const rangeHeader = req.headers.get('range')
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader
    }

    const userAgent = req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    upstreamHeaders['User-Agent'] = userAgent
    
    // Add browser-like headers to avoid bot detection
    upstreamHeaders['Accept-Language'] = 'en-US,en;q=0.9'
    upstreamHeaders['Accept-Encoding'] = 'gzip, deflate, br'
    upstreamHeaders['Connection'] = 'keep-alive'
    upstreamHeaders['Sec-Fetch-Dest'] = 'empty'
    upstreamHeaders['Sec-Fetch-Mode'] = 'cors'
    upstreamHeaders['Sec-Fetch-Site'] = 'cross-site'

    // Check if this is a key request - handle differently
    const isKeyRequest = targetUrl.pathname.includes('.key')
    const isVaultOwoCdn = targetUrl.hostname.includes('vault-') && targetUrl.hostname.includes('owocdn.top')
    
    // Detect MegaUp CDN domains (pro25zone.site, megaup.cc, megaup.live, 4spromax.site, dev23app.site, etc.)
    const isMegaUpCdn = targetUrl.hostname.includes('pro25zone.site') || 
                        targetUrl.hostname.includes('megaup.cc') || 
                        targetUrl.hostname.includes('megaup.live') ||
                        targetUrl.hostname.includes('4spromax.site') ||
                        targetUrl.hostname.includes('dev23app.site')
    
    if (referer) {
      // For vault-*.owocdn.top key requests, always use kwik.cx as referer
      // The CDN expects requests to come from kwik.cx (where the streams are served)
      if (isKeyRequest && isVaultOwoCdn) {
        upstreamHeaders['Referer'] = 'https://kwik.cx/'
        upstreamHeaders['Origin'] = 'https://kwik.cx'
      } else if (isKeyRequest) {
        try {
          // For other key requests, use the key's own domain as referer
          const keyOrigin = targetUrl.origin
          upstreamHeaders['Referer'] = keyOrigin
          upstreamHeaders['Origin'] = keyOrigin
        } catch {
          // Fallback to provided referer
          upstreamHeaders['Referer'] = referer
          try {
            upstreamHeaders['Origin'] = new URL(referer).origin
          } catch {
            // Ignore invalid referer origins
          }
        }
      } else if (isMegaUpCdn) {
        // For MegaUp CDN requests, check if referer is a MegaUp /e/ URL
        const isMegaUpReferer = referer.includes('/e/') && (
          referer.includes('megaup.cc') || 
          referer.includes('megaup.live') || 
          referer.includes('4spromax.site') ||
          referer.includes('pro25zone.site')
        )
        
        // Check if this is an M3U8 manifest request or a fragment request
        const isM3U8Manifest = targetUrl.pathname.endsWith('.m3u8') || targetUrl.pathname.includes('list,')
        
        if (isMegaUpReferer) {
          // Always use the MegaUp /e/ URL as referer for both manifest and fragments
          // This is what MegaUp CDN expects - the landing page URL
          upstreamHeaders['Referer'] = referer
          try {
            upstreamHeaders['Origin'] = new URL(referer).origin
          } catch {
            // Ignore invalid referer origins
          }
        } else if (referer.includes('animekai.to')) {
          // For MegaUp CDN with animekai.to referer (no /e/ URL provided), try fragment's origin
          // But this is less likely to work - we should have the /e/ URL
          try {
            upstreamHeaders['Referer'] = targetUrl.origin + '/'
            upstreamHeaders['Origin'] = targetUrl.origin
          } catch {
            // Fallback to provided referer
            upstreamHeaders['Referer'] = referer
            try {
              upstreamHeaders['Origin'] = new URL(referer).origin
            } catch {
              // Ignore invalid referer origins
            }
          }
        } else {
          // Use provided referer as-is
          upstreamHeaders['Referer'] = referer
          try {
            upstreamHeaders['Origin'] = new URL(referer).origin
          } catch {
            // Ignore invalid referer origins
          }
        }
      } else {
        upstreamHeaders['Referer'] = referer
        try {
          upstreamHeaders['Origin'] = new URL(referer).origin
        } catch {
          // Ignore invalid referer origins
        }
      }
    } else if (isKeyRequest && isVaultOwoCdn) {
      // For vault-*.owocdn.top key requests without referer, use kwik.cx
      upstreamHeaders['Referer'] = 'https://kwik.cx/'
      upstreamHeaders['Origin'] = 'https://kwik.cx'
    } else if (isKeyRequest) {
      // For other key requests without referer, use the key's own origin
      try {
        upstreamHeaders['Referer'] = targetUrl.origin
        upstreamHeaders['Origin'] = targetUrl.origin
      } catch {
        // Ignore if URL parsing fails
      }
    } else if (isMegaUpCdn) {
      // For MegaUp CDN requests without referer, use the fragment's own origin
      try {
        upstreamHeaders['Referer'] = targetUrl.origin + '/'
        upstreamHeaders['Origin'] = targetUrl.origin
      } catch {
        // Ignore if URL parsing fails
      }
    }

    upstreamHeaders['Accept'] = req.headers.get('accept') || '*/*'

    // Log key requests for debugging
    if (isKeyRequest && isVaultOwoCdn) {
      console.log('🔑 Fetching vault-*.owocdn.top key:', targetUrl.toString())
      console.log('🔑 Headers being sent:', JSON.stringify(upstreamHeaders, null, 2))
    }

    // For key requests, try multiple strategies if we get 403
    let upstreamResponse = await fetch(targetUrl.toString(), {
      headers: upstreamHeaders,
      redirect: 'follow'
    })

    // Log response for key requests
    if (isKeyRequest && isVaultOwoCdn) {
      console.log('🔑 Key response status:', upstreamResponse.status)
      console.log('🔑 Key response headers:', Object.fromEntries(upstreamResponse.headers.entries()))
    }

    // If key request gets 403, try different strategies
    if (isKeyRequest && isVaultOwoCdn && upstreamResponse.status === 403) {
      console.log('🔑 Vault key got 403, trying different strategies...')
      
      // Strategy 1: Try with exact kwik.cx referer format (with trailing slash)
      const strategy1Headers = {
        ...upstreamHeaders,
        'Referer': 'https://kwik.cx/',
        'Origin': 'https://kwik.cx'
      }
      upstreamResponse = await fetch(targetUrl.toString(), {
        headers: strategy1Headers,
        redirect: 'follow'
      })
      console.log('🔑 Strategy 1 (kwik.cx/) status:', upstreamResponse.status)
      
      // Strategy 2: Try without Origin header
      if (upstreamResponse.status === 403) {
        const strategy2Headers: Record<string, string> = {
          ...upstreamHeaders,
          'Referer': 'https://kwik.cx/'
        }
        delete strategy2Headers['Origin']
        upstreamResponse = await fetch(targetUrl.toString(), {
          headers: strategy2Headers,
          redirect: 'follow'
        })
        console.log('🔑 Strategy 2 (no Origin) status:', upstreamResponse.status)
      }
      
      // Strategy 3: Try with kwik.cx without trailing slash
      if (upstreamResponse.status === 403) {
        const strategy3Headers = {
          ...upstreamHeaders,
          'Referer': 'https://kwik.cx',
          'Origin': 'https://kwik.cx'
        }
        upstreamResponse = await fetch(targetUrl.toString(), {
          headers: strategy3Headers,
          redirect: 'follow'
        })
        console.log('🔑 Strategy 3 (kwik.cx no slash) status:', upstreamResponse.status)
      }
    } else if (isKeyRequest && upstreamResponse.status === 403) {
      // For non-vault keys, try without referer
      console.log('🔑 Key request got 403, retrying without referer...')
      const retryHeaders = { ...upstreamHeaders }
      delete retryHeaders['Referer']
      delete retryHeaders['Origin']
      
      upstreamResponse = await fetch(targetUrl.toString(), {
        headers: retryHeaders,
        redirect: 'follow'
      })
    }

    const contentType = upstreamResponse.headers.get('content-type') || ''
    const headers = new Headers()
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cache-Control', 'no-store')

    if (contentType) {
      headers.set('Content-Type', contentType)
    }

    if (
      contentType.includes('application/vnd.apple.mpegurl') ||
      targetUrl.pathname.endsWith('.m3u8')
    ) {
      const playlist = await upstreamResponse.text()
      // Use the original target URL as base for resolving relative URLs
      // upstreamResponse.url might be different (redirects, etc.)
      const baseUrl = targetUrl.toString()
      
      // For vault-*.owocdn.top playlists, we need to ensure keys use kwik.cx referer
      // Since we can't control browser referer, we'll add a comment hint
      // and let the browser fetch keys directly (it will use playlist URL as referer)
      const isVaultPlaylist = baseUrl.includes('vault-') && baseUrl.includes('owocdn.top')
      const rewritten = playlist
        .split(/\r?\n/)
        .map((line) => {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) {
            // Check if this line contains a URI parameter (for keys, media, etc.)
            // Examples: #EXT-X-KEY:URI="...", #EXT-X-MEDIA:URI="..."
            if (trimmed.includes('URI=')) {
              const uriMatch = trimmed.match(/URI=["']([^"']+)["']/i)
              if (uriMatch && uriMatch[1]) {
                try {
                  const uriValue = uriMatch[1]
                  // Resolve relative URI to absolute URL
                  const absoluteUri = new URL(uriValue, baseUrl).toString()
                  
                  // If the URL is already pointing to Shrina Proxy, keep it as-is
                  if (absoluteUri.includes('hls.shrina.dev')) {
                    return line
                  }
                  
                  // Check if this is a key URL
                  const isKey = uriValue.includes('.key') || absoluteUri.includes('.key')
                  
                  // For vault-*.owocdn.top keys, don't proxy - let browser fetch directly
                  if (isKey && absoluteUri.includes('vault-') && absoluteUri.includes('owocdn.top')) {
                    return trimmed.replace(uriMatch[1], absoluteUri)
                  }
                  
                  // For keys, proxy with appropriate referer
                  if (isKey) {
                    try {
                      const uriUrlObj = new URL(absoluteUri)
                      const playlistDomain = new URL(baseUrl).origin
                      const uriDomain = uriUrlObj.origin
                      const uriReferer = (uriDomain === playlistDomain) ? baseUrl : uriDomain
                      const proxiedUri = buildProxyUrl(absoluteUri, uriReferer)
                      return trimmed.replace(uriMatch[1], proxiedUri || absoluteUri)
                    } catch {
                      const proxiedUri = buildProxyUrl(absoluteUri, referer)
                      return trimmed.replace(uriMatch[1], proxiedUri || absoluteUri)
                    }
                  }
                  
                  // For non-key URIs (like audio playlists), proxy them with the provided referer
                  const proxiedUri = buildProxyUrl(absoluteUri, referer)
                  return trimmed.replace(uriMatch[1], proxiedUri || absoluteUri)
                } catch (e) {
                  // If URL resolution fails, return line as-is
                  return line
                }
              }
            }
            // Legacy check for key URI (kept for backwards compatibility)
            if (trimmed.includes('URI=') && trimmed.includes('.key')) {
              // Extract the key URL from the URI parameter
              const uriMatch = trimmed.match(/URI=["']([^"']+)["']/i)
              if (uriMatch && uriMatch[1]) {
                try {
                  const keyUrl = new URL(uriMatch[1], baseUrl).toString()
                  // If key URL is already pointing to Shrina Proxy, keep it as-is
                  if (keyUrl.includes('hls.shrina.dev')) {
                    return line // Don't rewrite Shrina Proxy URLs
                  }
                  // For vault-*.owocdn.top keys, don't proxy - let browser fetch directly
                  // The CDN blocks server requests but allows browser requests with proper referer
                  // Vidstack will handle CORS if needed
                  if (keyUrl.includes('vault-') && keyUrl.includes('owocdn.top')) {
                    // Return the original key URL - browser will fetch it with kwik.cx referer
                    // We can't set referer from server, but browser will use the playlist URL as referer
                    return trimmed.replace(uriMatch[1], keyUrl)
                  }
                  // For other keys, use the playlist URL as referer (like a browser would)
                  try {
                    const playlistDomain = new URL(baseUrl).origin
                    const keyDomain = new URL(keyUrl).origin
                    const keyReferer = (keyDomain === playlistDomain) ? baseUrl : keyDomain
                    const proxiedKeyUrl = buildProxyUrl(keyUrl, keyReferer)
                    return trimmed.replace(uriMatch[1], proxiedKeyUrl || keyUrl)
                  } catch {
                    // Fallback: use original referer
                    const proxiedKeyUrl = buildProxyUrl(keyUrl, referer)
                    return trimmed.replace(uriMatch[1], proxiedKeyUrl || keyUrl)
                  }
                } catch {
                  return line
                }
              }
            }
            return line
          }

          try {
            const absolute = new URL(trimmed, baseUrl).toString()
            
            // If the URL is already pointing to Shrina Proxy, keep it as-is
            // Shrina Proxy handles URL rewriting automatically
            if (absolute.includes('hls.shrina.dev')) {
              return absolute
            }
            
            // For MegaUp CDN fragments, return original URL so HLS.js can set custom referer via xhrSetup
            // HLS.js will use xhrSetup to set the MegaUp /e/ URL as referer header
            // Check this EARLY, before any other processing
            const isMegaUpFragment = absolute.includes('pro25zone.site') || 
                                     absolute.includes('megaup.cc') || 
                                     absolute.includes('megaup.live') ||
                                     absolute.includes('4spromax.site') ||
                                     absolute.includes('dev23app.site')
            if (isMegaUpFragment && !absolute.includes('.m3u8') && !absolute.includes('.key')) {
              // Return original URL - HLS.js will set the referer header via xhrSetup
              // Only log once per unique fragment URL to reduce spam
              // (removed verbose logging to reduce terminal spam)
              return absolute
            }
            
            // Check if this is a key URL - use our proxy for keys to avoid 403 errors
            // Also check if it's from animepahe-proxy and rewrite it
            const isKey = absolute.includes('.key') || trimmed.includes('.key')
            const isAnimepaheProxy = absolute.includes('animepahe-proxy.vercel.app/api/proxy/key')
            
            if (isKey || isAnimepaheProxy) {
              // Extract the original key URL from animepahe-proxy URL if needed
              let actualKeyUrl = absolute
              if (isAnimepaheProxy) {
                try {
                  const proxyUrl = new URL(absolute)
                  const originalUrl = proxyUrl.searchParams.get('url')
                  if (originalUrl) {
                    actualKeyUrl = originalUrl
                  }
                } catch {
                  // Keep using absolute if parsing fails
                }
              }
              // For key URLs, use appropriate referer to avoid 403 errors
              // For vault-*.owocdn.top keys, use kwik.cx as referer
              try {
                const keyUrlObj = new URL(actualKeyUrl)
                const isVaultOwoCdn = keyUrlObj.hostname.includes('vault-') && keyUrlObj.hostname.includes('owocdn.top')
                if (isVaultOwoCdn) {
                  return buildProxyUrl(actualKeyUrl, 'https://kwik.cx/')
                }
                const requestDomain = targetUrl.origin
                const keyDomain = keyUrlObj.origin
                const keyReferer = (keyDomain === requestDomain) ? targetUrl.toString() : keyDomain
                return buildProxyUrl(actualKeyUrl, keyReferer)
              } catch {
                return buildProxyUrl(actualKeyUrl, referer)
              }
            }
            // For thumbnail images (.jpg), let browser fetch directly to avoid 403 errors
            // Thumbnails are not critical for playback and some CDNs block server requests
            const isThumbnail = absolute.includes('.jpg') || absolute.includes('.jpeg') || absolute.includes('.png')
            if (isThumbnail) {
              // Return original URL - browser will fetch it directly with proper referer
              return absolute
            }
            
            // Use the provided referer for segment URLs
            // For FlixHQ (rabbitstream/upcloud), we need to be careful not to double-encode
            // if the original URL is already proxied or special
            
            // Check if it's a VidCloud/UpCloud/RabbitStream segment (often on .raffaellocdn.net or similar)
            // If the referer is flixhq.to, we should pass it through
            if (referer && (referer.includes('flixhq.to') || referer.includes('rabbitstream'))) {
                 return absolute
            }
            
            return buildProxyUrl(absolute, referer)
          } catch {
            return line
          }
        })
        .join('\n')

      headers.set('Content-Type', 'application/vnd.apple.mpegurl')
      return new NextResponse(rewritten, {
        status: upstreamResponse.status,
        headers
      })
    }

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json({ error: 'proxy_failure' }, { status: 502 })
  }
}

