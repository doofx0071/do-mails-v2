import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AliasManagement } from '@do-mails/alias-management'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize alias management service
const aliasManager = new AliasManagement({
  maxAliasesPerDomain: 1000,
  maxAliasLength: 64,
  enableProfanityFilter: true,
  reservedAliases: [
    'admin', 'administrator', 'root', 'postmaster', 'webmaster',
    'hostmaster', 'abuse', 'security', 'noreply', 'no-reply',
    'support', 'help', 'info', 'contact', 'sales', 'billing'
  ]
})

/**
 * GET /api/aliases
 * List user's email aliases with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Extract auth token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Bearer token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('domain_id')
    const enabled = searchParams.get('enabled')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Validate enabled parameter if provided
    if (enabled && !['true', 'false'].includes(enabled)) {
      return NextResponse.json(
        { error: 'Invalid enabled parameter. Must be: true or false' },
        { status: 400 }
      )
    }

    // Build query - join with domains to ensure user ownership
    let query = supabase
      .from('email_aliases')
      .select(`
        *,
        domains!inner(
          id,
          domain_name,
          user_id
        )
      `)
      .eq('domains.user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply domain filter if provided
    if (domainId) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(domainId)) {
        return NextResponse.json(
          { error: 'Invalid domain_id format' },
          { status: 400 }
        )
      }
      query = query.eq('domain_id', domainId)
    }

    // Apply enabled filter if provided
    if (enabled !== null) {
      query = query.eq('is_enabled', enabled === 'true')
    }

    // Apply pagination
    if (limit) {
      const limitNum = parseInt(limit)
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return NextResponse.json(
          { error: 'Invalid limit parameter. Must be between 1 and 100' },
          { status: 400 }
        )
      }
      query = query.limit(limitNum)
    }

    if (offset) {
      const offsetNum = parseInt(offset)
      if (isNaN(offsetNum) || offsetNum < 0) {
        return NextResponse.json(
          { error: 'Invalid offset parameter. Must be >= 0' },
          { status: 400 }
        )
      }
      query = query.range(offsetNum, offsetNum + (parseInt(limit || '50') - 1))
    }

    const { data: aliases, error: dbError } = await query

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch aliases' },
        { status: 500 }
      )
    }

    // Transform the data to include full_address computed field
    const transformedAliases = (aliases || []).map(alias => ({
      id: alias.id,
      domain_id: alias.domain_id,
      alias_name: alias.alias_name,
      full_address: `${alias.alias_name}@${alias.domains.domain_name}`,
      is_enabled: alias.is_enabled,
      last_email_received_at: alias.last_email_received_at,
      created_at: alias.created_at,
      updated_at: alias.updated_at
    }))

    return NextResponse.json(
      { aliases: transformedAliases },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
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
 * POST /api/aliases
 * Create a new email alias
 */
export async function POST(request: NextRequest) {
  try {
    // Extract auth token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Bearer token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

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
    if (!body.domain_id || typeof body.domain_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid domain_id field' },
        { status: 400 }
      )
    }

    if (!body.alias_name || typeof body.alias_name !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid alias_name field' },
        { status: 400 }
      )
    }

    const domainId = body.domain_id
    const aliasName = body.alias_name.toLowerCase().trim()
    const isEnabled = body.is_enabled !== undefined ? body.is_enabled : true

    // Validate domain ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(domainId)) {
      return NextResponse.json(
        { error: 'Invalid domain_id format' },
        { status: 400 }
      )
    }

    // Validate alias name using alias management library
    const validation = aliasManager.validateAlias(aliasName)
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: `Invalid alias name: ${validation.errors.join(', ')}`,
          suggestions: validation.suggestions
        },
        { status: 400 }
      )
    }

    // Verify domain exists and is owned by user
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('id, domain_name, verification_status')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError) {
      if (domainError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Domain not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching domain:', domainError)
      return NextResponse.json(
        { error: 'Failed to verify domain ownership' },
        { status: 500 }
      )
    }

    // Check if domain is verified
    if (domain.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'Domain must be verified before creating aliases' },
        { status: 400 }
      )
    }

    // Check if alias already exists
    const { data: existingAlias, error: checkError } = await supabase
      .from('email_aliases')
      .select('id')
      .eq('domain_id', domainId)
      .eq('alias_name', aliasName)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Database error checking existing alias:', checkError)
      return NextResponse.json(
        { error: 'Failed to check alias availability' },
        { status: 500 }
      )
    }

    if (existingAlias) {
      return NextResponse.json(
        { error: 'Alias already exists' },
        { status: 409 }
      )
    }

    // Create alias record
    const { data: newAlias, error: createError } = await supabase
      .from('email_aliases')
      .insert({
        domain_id: domainId,
        alias_name: aliasName,
        is_enabled: isEnabled
      })
      .select()
      .single()

    if (createError) {
      console.error('Database error creating alias:', createError)
      
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'Alias already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create alias' },
        { status: 500 }
      )
    }

    // Return the created alias with full_address
    const responseAlias = {
      ...newAlias,
      full_address: `${newAlias.alias_name}@${domain.domain_name}`
    }

    return NextResponse.json(
      responseAlias,
      { 
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
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
 * OPTIONS /api/aliases
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}
