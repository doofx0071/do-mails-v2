import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use this ONLY for:
 * - System operations (webhooks, background jobs)
 * - Admin operations that need to access all data
 * - Operations where you manually verify permissions
 */
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Create a Supabase client with user context (respects RLS)
 * Use this for user-facing API operations where RLS should apply
 */
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Extract and validate auth token from request headers
 */
export function extractAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Verify user authentication and return user info
 * Uses service client only for token verification, not data access
 */
export async function verifyAuth(token: string) {
  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new Error('Unauthorized - Invalid token')
  }

  return user
}

/**
 * Create authenticated Supabase client from request
 * Returns both the client (with RLS enforced) and user info
 */
export async function createAuthenticatedClient(request: Request) {
  const token = extractAuthToken(request)
  if (!token) {
    throw new Error('Unauthorized - Bearer token required')
  }

  const user = await verifyAuth(token)
  const supabase = createUserClient(token)

  return { supabase, user }
}
