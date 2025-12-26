/**
 * Cloudflare Worker for proxying HLS streams with correct referer
 * This worker sets kwik.cx as referer for vault-*.owocdn.top requests
 * Enhanced with MegaUp support (proper browser fingerprints for Cloudflare bypass)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Get the target URL and optional referer from query parameters
    const targetUrl = url.searchParams.get('url');
    const refererParam = url.searchParams.get('referer');
    const originParam = url.searchParams.get('origin');
    
    if (!targetUrl) {
      return new Response('Listening for URL Parameters [IF YOU SEE THIS MESSAGE WORKER IS RUNNING]', { status: 400 });
    }

    let target;
    try {
      target = new URL(targetUrl);
    } catch {
      return new Response('Invalid URL', { status: 400 });
    }

    // Detect request type
    const isVaultOwoCdn = target.hostname.includes('vault-') && target.hostname.includes('owocdn.top');
    const isKeyRequest = target.pathname.includes('.key');
    const isM3U8Request = target.pathname.endsWith('.m3u8') || target.pathname.includes('.m3u8');
    const isSegmentRequest = !isKeyRequest && !isM3U8Request;
    
    // Detect MegaUp URLs (for Cloudflare fingerprinting)
    const isMegaUp = target.hostname.includes('megaup') || 
                     target.hostname.includes('4spromax') || 
                     target.hostname.includes('megaup.live') ||
                     target.pathname.includes('/media/') ||
                     target.pathname.includes('/e/');

    // Log request details
    console.log('🔍 Request Details:', {
      target: target.toString(),
      hostname: target.hostname,
      pathname: target.pathname,
      isVaultOwoCdn,
      isMegaUp,
      isKeyRequest,
      isM3U8Request,
      isSegmentRequest,
      refererParam,
      method: request.method
    });

    // Build headers for the upstream request
    const upstreamHeaders = new Headers();
    
    // Copy important headers from the original request
    const range = request.headers.get('range');
    if (range) {
      upstreamHeaders.set('Range', range);
      console.log('📦 Range header:', range);
    }

    // Set browser-like headers with proper fingerprints
    // Use Chrome 137 User-Agent (latest) for better compatibility
    upstreamHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36');
    upstreamHeaders.set('Accept', request.headers.get('accept') || '*/*');
    upstreamHeaders.set('Accept-Language', 'en-US,en;q=0.9');
    upstreamHeaders.set('Accept-Encoding', 'gzip, deflate, br');
    upstreamHeaders.set('Connection', 'keep-alive');
    
    // For MegaUp, send proper browser fingerprints to bypass Cloudflare
    if (isMegaUp) {
      // If this is a /media/ request, we might need to visit /e/ first to get cookies
      // But for now, try with proper headers and referer
      
      // Send full browser fingerprint headers for Cloudflare bypass
      upstreamHeaders.set('Sec-Fetch-Dest', 'empty');
      upstreamHeaders.set('Sec-Fetch-Mode', 'cors');
      upstreamHeaders.set('Sec-Fetch-Site', 'cross-site');
      upstreamHeaders.set('Sec-Ch-Ua', '"Google Chrome";v="137", "Chromium";v="137", "Not_A Brand";v="24"');
      upstreamHeaders.set('Sec-Ch-Ua-Mobile', '?0');
      upstreamHeaders.set('Sec-Ch-Ua-Platform', '"Windows"');
      
      // For /media/ requests, use the /e/ URL as referer if provided
      // This mimics a browser visiting /e/ first, then /media/
      if (target.pathname.includes('/media/') && refererParam && refererParam.includes('/e/')) {
        // Use the /e/ URL as referer (browser would have visited this first)
        upstreamHeaders.set('Referer', refererParam);
        try {
          const refererUrl = new URL(refererParam);
          upstreamHeaders.set('Origin', refererUrl.origin);
        } catch {
          upstreamHeaders.set('Referer', target.origin + '/');
          upstreamHeaders.set('Origin', target.origin);
        }
        console.log('🔓 MegaUp /media/ request - using /e/ URL as referer');
      } else if (refererParam && refererParam.trim()) {
        const decodedReferer = refererParam.trim();
        upstreamHeaders.set('Referer', decodedReferer);
        try {
          const refererUrl = new URL(decodedReferer);
          upstreamHeaders.set('Origin', refererUrl.origin);
        } catch {
          upstreamHeaders.set('Referer', target.origin + '/');
          upstreamHeaders.set('Origin', target.origin);
        }
      } else {
        // Default to target's origin for MegaUp
        upstreamHeaders.set('Referer', target.origin + '/');
        upstreamHeaders.set('Origin', target.origin);
      }
      
      console.log('🔓 MegaUp request - using full browser fingerprints');
    } else {
      // For non-MegaUp requests (like vault streams), use standard headers
      upstreamHeaders.set('Sec-Fetch-Dest', 'empty');
      upstreamHeaders.set('Sec-Fetch-Mode', 'cors');
      upstreamHeaders.set('Sec-Fetch-Site', 'cross-site');
      
      // Set referer header with priority logic for vault streams
      if (refererParam && refererParam.trim()) {
        const decodedReferer = refererParam.trim();
        upstreamHeaders.set('Referer', decodedReferer);
        
        // Allow overriding origin
        if (originParam) {
           upstreamHeaders.set('Origin', originParam);
        } else {
            try {
              const refererUrl = new URL(decodedReferer);
              upstreamHeaders.set('Origin', refererUrl.origin);
              console.log('🔗 Using provided referer:', decodedReferer);
            } catch {
              console.log('⚠️ Invalid referer URL, using as-is:', decodedReferer);
            }
        }
      } else if (isVaultOwoCdn) {
        // Priority: For vault-*.owocdn.top requests, use kwik.cx as referer (required by CDN)
        upstreamHeaders.set('Referer', 'https://kwik.cx/');
        upstreamHeaders.set('Origin', 'https://kwik.cx');
        console.log('🔗 Using kwik.cx referer for vault CDN');
      } else {
        // For other requests, use the target's origin as referer
        upstreamHeaders.set('Referer', target.origin);
        upstreamHeaders.set('Origin', target.origin);
        console.log('🔗 Using target origin as referer:', target.origin);
      }
    }

    // Log all headers being sent
    console.log('📤 Upstream Headers:', Object.fromEntries(upstreamHeaders.entries()));

    // Fetch from upstream
    let upstreamResponse;
    try {
      console.log('🌐 Fetching from upstream:', target.toString());
      upstreamResponse = await fetch(target.toString(), {
        method: request.method,
        headers: upstreamHeaders,
        redirect: 'follow',
      });
      
      console.log('📥 Upstream Response:', {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        contentType: upstreamResponse.headers.get('content-type'),
        contentLength: upstreamResponse.headers.get('content-length'),
        finalUrl: upstreamResponse.url
      });
      
      // If request failed, return error with details
      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text().catch(() => 'No error body');
        console.error('❌ Upstream request failed:', {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers: Object.fromEntries(upstreamResponse.headers.entries()),
          body: errorText.substring(0, 500) // First 500 chars
        });
        
        return new Response(
          `Upstream request failed: ${upstreamResponse.status} ${upstreamResponse.statusText}\n\nDetails:\n${errorText.substring(0, 500)}`,
          {
            status: upstreamResponse.status,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'text/plain',
            },
          }
        );
      }
    } catch (error) {
      console.error('❌ Fetch error:', {
        message: error.message,
        stack: error.stack,
        target: target.toString()
      });
      
      return new Response(`Fetch error: ${error.message}`, {
        status: 502,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain',
        },
      });
    }

    // Build response headers
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Accept-Encoding, Accept-Language');
    responseHeaders.set('Cache-Control', 'no-store');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      console.log('✅ CORS preflight request');
      return new Response(null, {
        status: 204,
        headers: responseHeaders,
      });
    }

    // Copy content type
    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }

    // Handle M3U8 playlists - rewrite URLs to proxy through this worker
    if (isM3U8Request || contentType?.includes('application/vnd.apple.mpegurl') || contentType?.includes('application/x-mpegurl')) {
      console.log('📋 Processing M3U8 playlist');
      
      // Read the playlist text directly (we'll create a new Response anyway)
      const playlist = await upstreamResponse.text();
      const baseUrl = upstreamResponse.url;
      
      console.log('📋 Playlist length:', playlist.length, 'lines');
      console.log('📋 Base URL:', baseUrl);
      
      // Check if playlist has encryption (EXT-X-KEY tag)
      const hasEncryption = playlist.includes('#EXT-X-KEY') && playlist.includes('URI=');
      console.log('🔐 Playlist encryption check:', {
        hasEncryption,
        hasExtXKey: playlist.includes('#EXT-X-KEY'),
        hasUri: playlist.includes('URI=')
      });
      
      // For unencrypted streams from vault CDN, return original playlist
      // The CDN allows CORS from any origin, so the browser can fetch segments directly
      if (!hasEncryption && isVaultOwoCdn) {
        console.log('✅ Unencrypted vault stream - returning original playlist (no proxy needed)');
        responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        return new Response(playlist, {
          status: upstreamResponse.status,
          headers: responseHeaders,
        });
      }
      
      // Build worker base URL for proxying
      const workerUrl = new URL(request.url);
      workerUrl.searchParams.delete('url'); // Remove current url param
      const workerBase = `${workerUrl.origin}${workerUrl.pathname}`;
      
      console.log('🔧 Worker base URL:', workerBase);
      
      let rewrittenLines = 0;
      let keyLines = 0;
      let segmentLines = 0;
      
      const rewritten = playlist
        .split(/\r?\n/)
        .map((line, index) => {
          const trimmed = line.trim();
          
          // Skip comments and empty lines (but check for key URIs)
          if (!trimmed || trimmed.startsWith('#')) {
            // Check if this is a key URI line (#EXT-X-KEY:URI="...")
            if (trimmed.includes('URI=') && (trimmed.includes('.key') || trimmed.includes('KEY'))) {
              const uriMatch = trimmed.match(/URI=["']([^"']+)["']/i);
              if (uriMatch && uriMatch[1]) {
                try {
                  const keyUrl = new URL(uriMatch[1], baseUrl).toString();
                  const isVaultKey = keyUrl.includes('vault-') && keyUrl.includes('owocdn.top');
                  
                  console.log(`🔑 Found key URI at line ${index + 1}:`, {
                    original: uriMatch[1],
                    absolute: keyUrl,
                    isVaultKey,
                    line: trimmed.substring(0, 100)
                  });
                  
                  // Always proxy keys through worker to ensure correct referer
                  // Use kwik.cx referer for vault keys (required by CDN)
                  const keyReferer = isVaultKey ? 'https://kwik.cx/' : (refererParam || 'https://kwik.cx/');
                  const proxiedKeyUrl = `${workerBase}?url=${encodeURIComponent(keyUrl)}&referer=${encodeURIComponent(keyReferer)}`;
                  console.log(`  → Proxied key URL (full): ${proxiedKeyUrl}`);
                  console.log(`  → Key referer: ${keyReferer}`);
                  keyLines++;
                  return trimmed.replace(uriMatch[1], proxiedKeyUrl);
                } catch (error) {
                  console.error(`❌ Error processing key URI at line ${index + 1}:`, error.message);
                  return line;
                }
              }
            }
            return line;
          }

          // Rewrite segment URLs
          try {
            const absolute = new URL(trimmed, baseUrl).toString();
            const isVaultSegment = absolute.includes('vault-') && absolute.includes('owocdn.top');
            
            // Proxy all segments from vault CDN through worker
            // Also proxy any segments that might need the referer
            if (isVaultSegment || isVaultOwoCdn) {
              // Always use kwik.cx referer for vault segments (required by CDN)
              const segmentReferer = isVaultSegment ? 'https://kwik.cx/' : (refererParam || 'https://kwik.cx/');
              const proxiedUrl = `${workerBase}?url=${encodeURIComponent(absolute)}&referer=${encodeURIComponent(segmentReferer)}`;
              segmentLines++;
              rewrittenLines++;
              if (segmentLines <= 3) { // Log first 3 segments for debugging
                console.log(`  → Proxied segment ${segmentLines} (full): ${proxiedUrl}`);
                console.log(`  → Segment referer: ${segmentReferer}`);
              }
              return proxiedUrl;
            }
            
            // For generic requests (FlixHQ), if we have a referer, we might want to return the absolute URL
            // and NOT proxy the segment, to avoid 403s and double-proxy overhead.
            // This assumes the segment CDN has CORS enabled.
            return absolute;
          } catch (error) {
            console.error(`❌ Error processing segment at line ${index + 1}:`, error.message);
            return line;
          }
        })
        .join('\n');

      console.log('✅ Playlist rewritten:', {
        totalLines: playlist.split(/\r?\n/).length,
        rewrittenLines,
        keyLines,
        segmentLines,
        originalLength: playlist.length,
        rewrittenLength: rewritten.length
      });
      
      // Set explicit Content-Type with charset for M3U8 playlists
      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      return new Response(rewritten, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // For non-M3U8 requests (keys, segments, or MegaUp /media/ responses), return as-is
    console.log('📦 Returning binary/text response (key/segment/media):', {
      status: upstreamResponse.status,
      contentType: upstreamResponse.headers.get('content-type'),
      contentLength: upstreamResponse.headers.get('content-length'),
      isKeyRequest,
      isSegmentRequest,
      isMegaUp
    });
    
    // Log if we got a 403 error
    if (upstreamResponse.status === 403) {
      console.error('❌ 403 Forbidden error for:', {
        target: target.toString(),
        referer: refererParam || (isVaultOwoCdn ? 'https://kwik.cx/' : target.origin),
        isKeyRequest,
        isSegmentRequest,
        isMegaUp,
        headers: Object.fromEntries(upstreamHeaders.entries())
      });
    }
    
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  },
};
