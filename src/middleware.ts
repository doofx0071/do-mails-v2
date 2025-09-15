import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAPILogger } from '@/lib/observability/logger'
import { metricsCollector, RATE_LIMITS, createRateLimiter } from '@/lib/observability/metrics'

// Rate limiters for different endpoint types
const rateLimiters = {
  auth: createRateLimiter(RATE_LIMITS.AUTH),
  domainVerification: createRateLimiter(RATE_LIMITS.DOMAIN_VERIFICATION),
  emailSend: createRateLimiter(RATE_LIMITS.EMAIL_SEND),
  general: createRateLimiter(RATE_LIMITS.GENERAL)
}

// Determine which rate limiter to use based on the path
function getRateLimiterForPath(pathname: string) {
  if (pathname.includes('/auth/') || pathname.includes('/login') || pathname.includes('/signup')) {
    return rateLimiters.auth
  }
  if (pathname.includes('/domains/') && pathname.includes('/verify')) {
    return rateLimiters.domainVerification
  }
  if (pathname.includes('/emails/send')) {
    return rateLimiters.emailSend
  }
  if (pathname.startsWith('/api/')) {
    return rateLimiters.general
  }
  return null
}

export async function middleware(req: NextRequest) {
  const startTime = Date.now()
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Create logger for observability
  const logger = createAPILogger(req)

  // Add request ID to all responses
  res.headers.set('x-request-id', logger.getRequestId())

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Define protected routes
  const protectedRoutes: string[] = [] // Temporarily disable to test dashboard
  const authRoutes = ['/auth/signin', '/auth/signup', '/auth/callback']

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route: string) =>
    pathname.startsWith(route)
  )

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Debug logging
  console.log('Middleware:', { pathname, hasSession: !!session, isProtectedRoute, isAuthRoute })

  // If user is not authenticated and trying to access protected route
  if (isProtectedRoute && !session) {
    console.log('Redirecting to signin - no session for protected route')
    const redirectUrl = new URL('/auth/signin', req.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (isAuthRoute && session && pathname !== '/auth/callback') {
    console.log('Redirecting to dashboard - authenticated user on auth route')
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
