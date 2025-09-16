import { NextRequest, NextResponse } from 'next/server'
import { DomainVerification } from '../../../../libs/domain-verification/src'
import {
  createUserClient,
  extractAuthToken,
  verifyAuth,
} from '@/lib/supabase/server'
import { createAPILogger, createTimer } from '@/lib/observability/logger'

// Initialize domain verification service
const domainVerifier = new DomainVerification({
  defaultTimeout: 10000,
  defaultRetries: 3,
  recordPrefix: '_domails-verify',
  blockedDomains: [],
  cacheTimeout: 300000, // 5 minutes
})

/**
 * GET /api/domains
 * List user's domains with optional status filter
 */
export async function GET(request: NextRequest) {
  const logger = createAPILogger(request)
  const _timer = createTimer(logger)

  logger.logRequestStart()

  try {
    // Extract and validate auth token
    const token = extractAuthToken(request)
    if (!token) {
      logger.warn('Missing authorization token')
      return NextResponse.json(
        { error: 'Unauthorized - Bearer token required' },
        { status: 401 }
      )
    }

    // Verify authentication and get user
    logger.debug('Verifying authentication')
    let _user
    try {
      _user = await verifyAuth(token)
    } catch (error) {
      logger.warn('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Create user-context client (respects RLS)
    logger.debug('Creating user-context client')
    const supabase = createUserClient(token)
    logger.debug('User-context client created')

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Validate status parameter if provided
    if (status && !['pending', 'verified', 'failed'].includes(status)) {
      return NextResponse.json(
        {
          error:
            'Invalid status parameter. Must be: pending, verified, or failed',
        },
        { status: 400 }
      )
    }

    // Build query - RLS automatically filters by user
    let query = supabase
      .from('domains')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply status filter if provided
    if (status) {
      query = query.eq('verification_status', status)
    }

    const { data: domains, error: dbError } = await query

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      )
    }

    // Also load domains from forwarding config file (for ImprovMX-style domains)
    let forwardingDomains: any[] = []
    try {
      const ForwardingConfigFileManager = (await import('@/lib/forwarding-config-file')).default
      const configs = await ForwardingConfigFileManager.listConfigs()
      
      // Convert forwarding configs to domain format
      forwardingDomains = configs.map(config => ({
        id: `forwarding-${config.domain}`,
        domain_name: config.domain,
        verification_status: config.status === 'verified' ? 'verified' : 'pending',
        verification_token: config.verification_token,
        created_at: config.created_at,
        updated_at: config.created_at,
        user_id: null, // These are ImprovMX-style domains without specific user
        forward_to_email: config.forward_to, // Additional field for forwarding domains
        source: 'forwarding_config' // Mark source for identification
      }))
      
      console.log(`Found ${forwardingDomains.length} forwarding config domains`)
    } catch (error) {
      console.warn('Could not load forwarding config domains:', error)
    }

    // Merge database domains and forwarding config domains
    // Remove duplicates (prefer database version if exists)
    const dbDomainNames = new Set((domains || []).map(d => d.domain_name))
    const uniqueForwardingDomains = forwardingDomains.filter(fd => !dbDomainNames.has(fd.domain_name))
    
    const allDomains = [...(domains || []), ...uniqueForwardingDomains]
    
    // Apply status filter to merged results if provided
    const filteredDomains = status 
      ? allDomains.filter(d => d.verification_status === status)
      : allDomains

    return NextResponse.json(
      { domains: filteredDomains },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/domains
 * Add a new domain for verification
 */
export async function POST(request: NextRequest) {
  try {
    // Extract and validate auth token
    const token = extractAuthToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Bearer token required' },
        { status: 401 }
      )
    }

    // Verify authentication and get user
    let user
    try {
      user = await verifyAuth(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Create user-context client (respects RLS)
    const supabase = createUserClient(token)

    // Validate content type
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid content-type. Must be application/json' },
        { status: 400 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.domain_name || typeof body.domain_name !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid domain_name field' },
        { status: 400 }
      )
    }

    const domainName = body.domain_name.toLowerCase().trim()

    // Validate domain format using domain verification library
    const validation = domainVerifier.validateDomain(domainName)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: `Invalid domain format: ${validation.errors.join(', ')}`,
          suggestions: validation.suggestions,
        },
        { status: 400 }
      )
    }

    // Check if domain already exists
    const { data: existingDomain, error: checkError } = await supabase
      .from('domains')
      .select('id')
      .eq('domain_name', domainName)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Database error checking existing domain:', checkError)
      return NextResponse.json(
        { error: 'Failed to check domain availability' },
        { status: 500 }
      )
    }

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already exists' },
        { status: 409 }
      )
    }

    // Generate verification token
    const verificationToken = domainVerifier.verify.generateVerificationToken({
      length: 32,
      charset: 'alphanumeric',
    })

    // Create domain record with explicit user_id
    const { data: newDomain, error: createError } = await supabase
      .from('domains')
      .insert({
        domain_name: domainName,
        verification_status: 'pending',
        verification_token: verificationToken,
        user_id: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Database error creating domain:', createError)

      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'Domain already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create domain' },
        { status: 500 }
      )
    }

    return NextResponse.json(newDomain, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/domains
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
