import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '@/lib/supabase/server'

/**
 * GET /api/emails/forwarding
 * List user's email forwarding rules with optional alias filter
 */
export async function GET(request: NextRequest) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const aliasId = searchParams.get('alias_id')
    const enabled = searchParams.get('enabled')

    // Validate alias_id parameter if provided
    if (aliasId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(aliasId)) {
        return NextResponse.json(
          { error: 'Invalid alias_id format' },
          { status: 400 }
        )
      }
    }

    // Validate enabled parameter if provided
    if (enabled && !['true', 'false'].includes(enabled.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid enabled parameter. Must be true or false' },
        { status: 400 }
      )
    }

    // Build query - RLS automatically filters by user ownership
    let query = supabase
      .from('forwarding_rules')
      .select(`
        *,
        email_aliases!inner(
          id,
          alias_name,
          domains!inner(
            id,
            domain_name
          )
        )
      `)
      .order('created_at', { ascending: false })

    // Apply alias filter if provided
    if (aliasId) {
      query = query.eq('alias_id', aliasId)
    }

    // Apply enabled filter if provided
    if (enabled) {
      query = query.eq('is_enabled', enabled.toLowerCase() === 'true')
    }

    const { data: forwardingRules, error: dbError } = await query

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch forwarding rules' },
        { status: 500 }
      )
    }

    // Transform the data to include computed fields
    const transformedRules = (forwardingRules || []).map(rule => ({
      id: rule.id,
      alias_id: rule.alias_id,
      forward_to_email: rule.forward_to_email,
      is_enabled: rule.is_enabled,
      keep_copy: rule.keep_copy,
      created_at: rule.created_at,
      updated_at: rule.updated_at,
      alias: {
        id: rule.email_aliases.id,
        alias_name: rule.email_aliases.alias_name,
        full_address: `${rule.email_aliases.alias_name}@${rule.email_aliases.domains.domain_name}`
      }
    }))

    return NextResponse.json(
      { forwarding_rules: transformedRules },
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
 * POST /api/emails/forwarding
 * Create a new email forwarding rule
 */
export async function POST(request: NextRequest) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

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
    const requiredFields = ['alias_id', 'forward_to_email']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const { 
      alias_id, 
      forward_to_email, 
      is_enabled = true, 
      keep_copy = true 
    } = body

    // Validate alias_id format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(alias_id)) {
      return NextResponse.json(
        { error: 'Invalid alias_id format' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(forward_to_email)) {
      return NextResponse.json(
        { error: 'Invalid forward_to_email format' },
        { status: 400 }
      )
    }

    // Validate boolean fields
    if (typeof is_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'is_enabled must be a boolean' },
        { status: 400 }
      )
    }

    if (typeof keep_copy !== 'boolean') {
      return NextResponse.json(
        { error: 'keep_copy must be a boolean' },
        { status: 400 }
      )
    }

    // Verify alias exists and user owns it
    const { data: alias, error: aliasError } = await supabase
      .from('email_aliases')
      .select(`
        id,
        alias_name,
        domains!inner(
          id,
          domain_name,
          user_id
        )
      `)
      .eq('id', alias_id)
      .eq('domains.user_id', user.id)
      .single()

    if (aliasError) {
      if (aliasError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Alias not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching alias:', aliasError)
      return NextResponse.json(
        { error: 'Failed to fetch alias' },
        { status: 500 }
      )
    }

    // Note: Multiple forwarding rules per alias are allowed in this implementation
    // Users can have multiple forwarding destinations for the same alias

    // Prevent forwarding to the same alias (infinite loop)
    const aliasFullAddress = `${alias.alias_name}@${alias.domains.domain_name}`
    if (forward_to_email.toLowerCase() === aliasFullAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot forward to the same alias (would create infinite loop)' },
        { status: 400 }
      )
    }

    // Create forwarding rule - RLS will automatically enforce user ownership
    const { data: newRule, error: createError } = await supabase
      .from('forwarding_rules')
      .insert({
        alias_id,
        forward_to_email: forward_to_email.toLowerCase().trim(),
        is_enabled,
        keep_copy
      })
      .select(`
        *,
        email_aliases!inner(
          id,
          alias_name,
          domains!inner(
            id,
            domain_name
          )
        )
      `)
      .single()

    if (createError) {
      console.error('Database error creating forwarding rule:', createError)
      return NextResponse.json(
        { error: 'Failed to create forwarding rule' },
        { status: 500 }
      )
    }

    // Return the created rule with alias info
    const responseRule = {
      id: newRule.id,
      alias_id: newRule.alias_id,
      forward_to_email: newRule.forward_to_email,
      is_enabled: newRule.is_enabled,
      keep_copy: newRule.keep_copy,
      created_at: newRule.created_at,
      updated_at: newRule.updated_at,
      alias: {
        id: newRule.email_aliases.id,
        alias_name: newRule.email_aliases.alias_name,
        full_address: `${newRule.email_aliases.alias_name}@${newRule.email_aliases.domains.domain_name}`
      }
    }

    return NextResponse.json(
      responseRule,
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
 * OPTIONS /api/emails/forwarding
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
