import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'

/**
 * Server-side MegaUp extractor using got-scraping
 * Fetches /media/ URL, gets encrypted text, decodes it via enc-dec.app API
 * Based on the working implementation from Consumet library
 */
export const dynamic = 'force-dynamic' // Ensure this route is dynamic

export async function GET(req: NextRequest) {
  console.log(`🔓 MegaUp extractor route called`)
  
  // Dynamic import to avoid Next.js build issues with got-scraping
  // Use string literal to prevent Next.js from analyzing at build time
  let gotScraping: any
  try {
    // got-scraping is an ESM module, use dynamic import with string literal
    // This prevents Next.js from trying to analyze the import at build time
    const gotScrapingModuleName = 'got-scraping'
    const gotScrapingModule = await import(/* @vite-ignore */ gotScrapingModuleName)
    gotScraping = gotScrapingModule.gotScraping || gotScrapingModule.default || gotScrapingModule
    
    if (!gotScraping || typeof gotScraping !== 'function') {
      throw new Error('gotScraping function not found in module')
    }
  } catch (error: any) {
    console.error('❌ Failed to import got-scraping:', error.message)
    console.error('Error details:', error)
    return NextResponse.json({ 
      error: 'Failed to import got-scraping',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
  
  const { searchParams } = new URL(req.url)
  const mediaUrl = searchParams.get('url')
  const eUrl = searchParams.get('eUrl') // Original /e/ URL (not needed with got-scraping, but kept for compatibility)

  console.log(`📋 Request params: mediaUrl=${mediaUrl?.substring(0, 50)}..., eUrl=${eUrl?.substring(0, 50)}...`)

  if (!mediaUrl) {
    console.error(`❌ Missing url parameter`)
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    // Validate URL
    const url = new URL(mediaUrl)
    if (!['https:', 'http:'].includes(url.protocol)) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 })
    }

    console.log(`🔓 MegaUp extractor (got-scraping): Fetching /media/ URL: ${mediaUrl}`)

    // Step 1: Fetch /media/ URL using got-scraping (bypasses Cloudflare automatically)
    let encryptedText: string
    try {
      console.log(`🌐 Fetching /media/ URL with got-scraping...`)
      const response = await gotScraping({
        url: mediaUrl,
        headers: {
          Connection: 'keep-alive',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        },
        responseType: 'json',
        timeout: {
          request: 30000, // 30 second timeout
        },
      })

      // Extract encrypted text from result field
      const jsonBody = response.body as any
      if (!jsonBody || !jsonBody.result) {
        console.error(`❌ Invalid response structure:`, Object.keys(jsonBody || {}))
        return NextResponse.json({
          error: 'Invalid response from /media/ URL',
          responseKeys: Object.keys(jsonBody || {}),
        }, { status: 400 })
      }

      encryptedText = jsonBody.result
      console.log(`✅ Got encrypted text from /media/ URL (${encryptedText.length} bytes)`)
    } catch (error: any) {
      console.error(`❌ Failed to fetch /media/ URL:`, error.message)
      return NextResponse.json({
        error: 'Failed to fetch /media/ URL',
        message: error.message,
      }, { status: 500 })
    }

    // Step 2: Call the decode API using got-scraping (same pattern as working code)
    console.log(`🔓 Calling enc-dec.app API to decode...`)
    try {
      const decodeResponse = await gotScraping.post('https://enc-dec.app/api/dec-mega', {
        json: {
          text: encryptedText,
          agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        },
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'json',
      })

      const decodedData = decodeResponse.body as any
      console.log(`✅ Decode API response received`)

      if (!decodedData || !decodedData.result) {
        console.error(`❌ Invalid decode response:`, decodedData)
        return NextResponse.json({
          error: 'Decode API returned invalid response',
          decodeResponse: decodedData,
        }, { status: 400 })
      }

      // Step 3: Extract video sources from decoded response (following the working pattern)
      const result = decodedData.result
      const sources = (result.sources || []).map((s: { file: string }) => ({
        url: s.file,
        isM3U8: s.file.includes('.m3u8') || s.file.endsWith('m3u8'),
        quality: 'auto', // Quality will be determined from the m3u8 playlist
      }))

      if (sources.length === 0) {
        return NextResponse.json({
          error: 'No video sources found in decoded response',
          decodeResponse: decodedData,
        }, { status: 404 })
      }

      console.log(`✅ Found ${sources.length} video sources`)

      return NextResponse.json({
        success: true,
        method: 'got-scraping',
        sources: sources,
        tracks: (result.tracks || []).map((t: { kind: string; file: string; label: string }) => ({
          kind: t.kind,
          url: t.file,
          lang: t.label,
        })),
        download: result.download,
      })
    } catch (error: any) {
      console.error(`❌ Decode API error:`, error.message)
      return NextResponse.json({
        error: 'Decode API failed',
        message: error.message,
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('❌ MegaUp extractor error:', error)
    return NextResponse.json({
      error: 'Extractor failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}
