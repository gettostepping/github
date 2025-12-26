import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

/**
 * Puppeteer-based MegaUp extractor
 * Uses headless browser to solve Cloudflare challenges and fetch /media/ URL
 * This is separate from the regular extractor to avoid breaking AnimePahe
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mediaUrl = searchParams.get('url')
  const eUrl = searchParams.get('eUrl') // Original /e/ URL

  if (!mediaUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  let browser: any = null

  try {
    // Validate URL
    const url = new URL(mediaUrl)
    if (!['https:', 'http:'].includes(url.protocol)) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 })
    }

    console.log(`🤖 Puppeteer MegaUp extractor: Fetching /media/ URL: ${mediaUrl}`)
    console.log(`🔍 Puppeteer available: ${typeof puppeteer !== 'undefined'}`)

    // Launch browser with stealth settings
    console.log(`🚀 Launching Puppeteer browser...`)
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ],
    })

    const page = await browser.newPage()

    // Track cookies and User-Agent for decode API (must match between requests)
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    let hehCookie: string | null = null

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(userAgent)

    // Remove webdriver property to avoid detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      })
    })
    
    // If we have /e/ URL, visit it first to get cookies/session
    if (eUrl) {
      console.log(`🔗 Step 1: Visiting /e/ URL first: ${eUrl}`)
      try {
        await page.goto(eUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        })
        console.log(`✅ Step 1: Visited /e/ URL successfully`)
        
        // Wait for JavaScript to execute and cookies to be set
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Check cookies via Puppeteer API (more reliable than document.cookie)
        const cookies = await page.cookies()
        console.log(`🍪 Got ${cookies.length} cookies from Puppeteer API`)
        if (cookies.length > 0) {
          console.log(`🍪 Cookie names: ${cookies.map((c: any) => c.name).join(', ')}`)
        }
        
        // Try to find 'heh' cookie from Puppeteer cookies
        const hehCookieObj = cookies.find((c: any) => c.name === 'heh' || c.name.toLowerCase().includes('heh'))
        
        if (hehCookieObj) {
          hehCookie = hehCookieObj.value
          if (hehCookie) {
            console.log(`🍪 Found heh cookie from Puppeteer: ${hehCookie.substring(0, 20)}...`)
          }
        } else {
          console.log(`⚠️ No 'heh' cookie found. Available cookies: ${cookies.map((c: any) => c.name).join(', ') || 'none'}`)
          // Try to get cookies from response headers instead
          const response = await page.goto(eUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null)
          if (response) {
            const setCookieHeaders = response.headers()['set-cookie'] || []
            console.log(`🍪 Set-Cookie headers: ${setCookieHeaders.length > 0 ? setCookieHeaders.join('; ') : 'none'}`)
          }
        }
      } catch (err: any) {
        console.log(`⚠️ Step 1: Error visiting /e/ URL: ${err.message}, continuing anyway...`)
      }
    }

    // Step 2: Navigate to /media/ URL
    console.log(`🔗 Step 2: Fetching /media/ URL: ${mediaUrl}`)
    
    // Set referer to /e/ URL if available (mimics browser behavior)
    if (eUrl) {
      await page.setExtraHTTPHeaders({
        'Referer': eUrl,
      })
    }

    const response = await page.goto(mediaUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    if (!response) {
      throw new Error('No response from /media/ URL')
    }

    const status = response.status()
    console.log(`📥 Response status: ${status}`)

    if (status !== 200) {
      const text = await response.text().catch(() => '')
      console.error(`❌ /media/ URL returned ${status}`)
      return NextResponse.json({
        error: `Failed to fetch /media/ URL`,
        status: status,
        statusText: response.statusText(),
        responsePreview: text.substring(0, 500),
      }, { status: status })
    }

    // Get the encrypted text - /media/ URL can return JSON or plain text
    let actualText = ''
    
    try {
      const contentType = response.headers()['content-type'] || ''
      console.log(`📄 Content-Type: ${contentType}`)
      
      // Get response text (works for both JSON and plain text)
      const responseText = await response.text()
      console.log(`📝 Got response as text (${responseText.length} bytes)`)
      
      // If it's JSON, extract the text field
      if (contentType.includes('application/json')) {
        try {
          const jsonData = JSON.parse(responseText)
          const jsonKeys = Object.keys(jsonData)
          console.log(`📋 JSON structure - Keys: ${jsonKeys.join(', ')}`)
          console.log(`📋 JSON preview (first 200 chars): ${JSON.stringify(jsonData).substring(0, 200)}`)
          
          // The encrypted text is in the 'result' field based on logs: {"status":200,"result":"..."}
          // Try result first, then fallback to other fields
          actualText = jsonData.result || 
                      jsonData.text || 
                      jsonData.data || 
                      jsonData.content || 
                      jsonData.encrypted || 
                      jsonData.payload ||
                      (typeof jsonData === 'string' ? jsonData : null)
          
          // The result field might be URL-encoded, try decoding it
          if (actualText && actualText === jsonData.result) {
            try {
              // Try URL decoding in case it's encoded
              const decoded = decodeURIComponent(actualText)
              if (decoded !== actualText && decoded.length > 100) {
                console.log(`📝 URL-decoded result field (${decoded.length} bytes)`)
                actualText = decoded
              }
            } catch (e) {
              // Not URL-encoded, use as-is
              console.log(`📝 Result field is not URL-encoded, using as-is`)
            }
          }
          
          // If we didn't find it in common fields, look for the longest string value
          if (!actualText || actualText === responseText || actualText.length === responseText.length) {
            // Look for the longest string value in the JSON (likely the encrypted text)
            const findLongestString = (obj: any, path = ''): { value: string, path: string } | null => {
              if (typeof obj === 'string' && obj.length > 100) {
                return { value: obj, path }
              }
              if (typeof obj === 'object' && obj !== null) {
                let longest: { value: string, path: string } | null = null
                for (const [key, value] of Object.entries(obj)) {
                  const found = findLongestString(value, path ? `${path}.${key}` : key)
                  if (found && (!longest || found.value.length > longest.value.length)) {
                    longest = found
                  }
                }
                return longest
              }
              return null
            }
            const longestString = findLongestString(jsonData)
            if (longestString && longestString.value.length > 100) {
              actualText = longestString.value
              console.log(`📝 Found encrypted text at path "${longestString.path}" (${actualText.length} bytes)`)
            } else {
              // Last resort: use the raw JSON string
              actualText = responseText
              console.log(`⚠️ Could not find encrypted text field, using full JSON (${actualText.length} bytes)`)
            }
          } else {
            console.log(`📝 Extracted text from JSON field (${actualText.length} bytes)`)
          }
        } catch (err: any) {
          // If JSON parsing fails, use the raw text
          actualText = responseText
          console.log(`📝 Using raw response text (JSON parse failed: ${err.message})`)
        }
      } else {
        // Plain text or HTML response
        actualText = responseText
        console.log(`📝 Using response as plain text`)
      }
    } catch (err: any) {
      // Fallback: get page content
      console.log(`⚠️ Error getting response text, trying page content: ${err.message}`)
      actualText = await page.content()
    }
    
    console.log(`✅ Got encrypted text (${actualText.length} bytes)`)

    // Check if we got HTML instead of encrypted text (Cloudflare challenge page)
    if (actualText.includes('challenge-platform') || actualText.includes('cf-browser-verification') || actualText.includes('Just a moment')) {
      console.error(`⚠️ Got Cloudflare challenge page instead of encrypted text`)
      return NextResponse.json({
        error: 'Cloudflare challenge detected',
        note: 'The server returned a Cloudflare challenge page instead of encrypted text',
        responsePreview: actualText.substring(0, 1000),
      }, { status: 403 })
    }

    // Step 3: Call the decode API
    // The decode API requires:
    // 1. User-Agent to match the one used in /media/ request
    // 2. Cookie (heh) if generated when visiting /e/
    console.log(`🔓 Calling enc-dec.app API to decode...`)
    console.log(`📊 Decode payload preview: text length=${actualText.length}, hasCookie=${!!hehCookie}, userAgent=${userAgent.substring(0, 50)}...`)
    
    const decodePayload: any = {
      text: actualText,
      agent: userAgent
    }
    
    if (hehCookie) {
      decodePayload.cookie = hehCookie
      console.log(`🍪 Including heh cookie in decode request (length: ${hehCookie.length})`)
    } else {
      console.log(`⚠️ No heh cookie found - decode API might fail`)
    }
    
    const decodeResponse = await fetch('https://enc-dec.app/api/dec-mega', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent, // Also set in headers for good measure
      },
      body: JSON.stringify(decodePayload)
    })

    if (!decodeResponse.ok) {
      const errorData = await decodeResponse.json().catch(() => ({}))
      console.error(`❌ Decode API failed: ${decodeResponse.status}`, errorData)
      return NextResponse.json({
        error: 'Decode API failed',
        status: decodeResponse.status,
        decodeError: errorData,
      }, { status: decodeResponse.status })
    }

    const decodedData = await decodeResponse.json()
    console.log(`✅ Decode API response status: ${decodedData.status}`)

    if (decodedData.status !== 200 || !decodedData.result) {
      return NextResponse.json({
        error: 'Decode API returned error',
        decodeResponse: decodedData,
      }, { status: 400 })
    }

    // Step 4: Extract video sources from decoded response
    let sources: any[] = []
    
    if (decodedData.result.sources && Array.isArray(decodedData.result.sources)) {
      sources = decodedData.result.sources.map((s: any) => ({
        url: s.file || s.url,
        isM3U8: (s.file || s.url || '').includes('.m3u8'),
        quality: s.quality || 'auto',
        size: s.size,
        type: s.type,
      }))
    } else if (decodedData.result.file) {
      // Single file response
      sources = [{
        url: decodedData.result.file,
        isM3U8: decodedData.result.file.includes('.m3u8'),
        quality: 'auto',
      }]
    }

    if (sources.length === 0) {
      return NextResponse.json({
        error: 'No video sources found in decoded response',
        decodeResponse: decodedData,
      }, { status: 404 })
    }

    console.log(`✅ Found ${sources.length} video sources via Puppeteer`)

    return NextResponse.json({
      success: true,
      method: 'puppeteer',
      sources: sources,
      tracks: decodedData.result.tracks || [],
      download: decodedData.result.download,
      headers: decodedData.result.headers || {},
    })
  } catch (error: any) {
    console.error('❌ Puppeteer MegaUp extractor error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500),
    })
    return NextResponse.json({
      error: 'Extractor failed',
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  } finally {
    // Always close the browser
    if (browser) {
      try {
        await browser.close()
        console.log('🔒 Browser closed')
      } catch (err: any) {
        console.error('⚠️ Error closing browser:', err.message)
      }
    }
  }
}

