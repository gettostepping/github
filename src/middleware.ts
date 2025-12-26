import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // For watch pages, extract type parameter and add it to a custom header
  if (request.nextUrl.pathname.startsWith('/watch/')) {
    const type = request.nextUrl.searchParams.get('type') || 'movie'
    
    // Create a new response
    const response = NextResponse.next()
    
    // Add custom header with the type parameter
    response.headers.set('x-watch-type', type)
    
    return response
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/watch/:path*',
}
