import { NextRequest, NextResponse } from 'next/server'

/**
 * Image Proxy API Route for Email Privacy Protection
 * 
 * This endpoint proxies external images in emails to:
 * 1. Prevent tracking pixels from revealing user's IP address
 * 2. Block malicious images that could exploit browser vulnerabilities
 * 3. Provide consistent image loading experience
 * 
 * Similar to Gmail's image proxy functionality
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    // Validate the URL parameter
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      )
    }

    // Security: Validate URL format and protocol
    let targetUrl: URL
    try {
      targetUrl = new URL(imageUrl)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS URLs are allowed' },
        { status: 400 }
      )
    }

    // Security: Block local/internal network requests
    const hostname = targetUrl.hostname.toLowerCase()
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]'
    ]
    
    // Block local IP ranges
    if (
      blockedHosts.includes(hostname) ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.includes('.local')
    ) {
      return NextResponse.json(
        { error: 'Local and internal network URLs are not allowed' },
        { status: 403 }
      )
    }

    // Fetch the image with security headers
    const imageResponse = await fetch(imageUrl, {
      headers: {
        // Don't send referrer to protect user privacy
        'Referrer-Policy': 'no-referrer',
        // Generic user agent
        'User-Agent': 'Mozilla/5.0 (compatible; EmailProxy/1.0)',
        // Request specific image formats
        'Accept': 'image/webp,image/avif,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        // Limit response size
        'Range': 'bytes=0-10485760' // Max 10MB
      },
      // Set timeout
      signal: AbortSignal.timeout(15000), // 15 second timeout
      // Don't follow too many redirects
      redirect: 'follow'
    })

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${imageResponse.status}` },
        { status: imageResponse.status }
      )
    }

    // Validate content type
    const contentType = imageResponse.headers.get('content-type') || ''
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/svg+xml',
      'image/bmp',
      'image/tiff'
    ]

    if (!allowedTypes.some(type => contentType.toLowerCase().includes(type))) {
      return NextResponse.json(
        { error: 'Invalid content type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Check content length
    const contentLength = imageResponse.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
        { status: 413 }
      )
    }

    // Get image data
    const imageBuffer = await imageResponse.arrayBuffer()

    // Return proxied image with privacy-focused headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        // Set correct content type
        'Content-Type': contentType,
        
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'no-referrer',
        
        // Cache for a reasonable time to improve performance
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'ETag': `"${Date.now()}"`,
        
        // CORS headers for cross-origin requests
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        
        // Content length
        'Content-Length': imageBuffer.byteLength.toString()
      }
    })

  } catch (error) {
    console.error('Image proxy error:', error)
    
    // Return error response
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle preflight requests for CORS
 */
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}