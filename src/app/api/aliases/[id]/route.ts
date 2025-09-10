import { NextRequest, NextResponse } from 'next/server'
import { AliasManagement } from '@do-mails/alias-management'
import { createAuthenticatedClient } from '@/lib/supabase/server'

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
 * PATCH /api/aliases/[id]
 * Update an existing email alias
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    const aliasId = params.id

    // Validate alias ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(aliasId)) {
      return NextResponse.json(
        { error: 'Invalid alias ID format' },
        { status: 400 }
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

    // Validate that at least one field is provided for update
    const allowedFields = ['alias_name', 'is_enabled']
    const providedFields = Object.keys(body).filter(key => allowedFields.includes(key))
    
    if (providedFields.length === 0) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update: alias_name, is_enabled' },
        { status: 400 }
      )
    }

    // Get existing alias and verify ownership
    const { data: existingAlias, error: aliasError } = await supabase
      .from('email_aliases')
      .select(`
        *,
        domains!inner(
          id,
          domain_name,
          user_id,
          verification_status
        )
      `)
      .eq('id', aliasId)
      .eq('domains.user_id', user.id) // Ensure user owns this alias
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

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Validate and process alias_name if provided
    if (body.alias_name !== undefined) {
      if (typeof body.alias_name !== 'string') {
        return NextResponse.json(
          { error: 'Invalid alias_name field. Must be a string' },
          { status: 400 }
        )
      }

      const newAliasName = body.alias_name.toLowerCase().trim()

      // Validate alias name using alias management library
      const validation = aliasManager.validateAlias(newAliasName)
      if (!validation.valid) {
        return NextResponse.json(
          { 
            error: `Invalid alias name: ${validation.errors.join(', ')}`,
            suggestions: validation.suggestions
          },
          { status: 400 }
        )
      }

      // Check if new alias name conflicts with existing aliases (excluding current one)
      if (newAliasName !== existingAlias.alias_name) {
        const { data: conflictingAlias, error: conflictError } = await supabase
          .from('email_aliases')
          .select('id')
          .eq('domain_id', existingAlias.domain_id)
          .eq('alias_name', newAliasName)
          .neq('id', aliasId)
          .single()

        if (conflictError && conflictError.code !== 'PGRST116') {
          console.error('Database error checking alias conflict:', conflictError)
          return NextResponse.json(
            { error: 'Failed to check alias availability' },
            { status: 500 }
          )
        }

        if (conflictingAlias) {
          return NextResponse.json(
            { error: 'Alias name already exists in this domain' },
            { status: 409 }
          )
        }

        updateData.alias_name = newAliasName
      }
    }

    // Validate and process is_enabled if provided
    if (body.is_enabled !== undefined) {
      if (typeof body.is_enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'Invalid is_enabled field. Must be a boolean' },
          { status: 400 }
        )
      }

      updateData.is_enabled = body.is_enabled
    }

    // Perform the update
    const { data: updatedAlias, error: updateError } = await supabase
      .from('email_aliases')
      .update(updateData)
      .eq('id', aliasId)
      .select(`
        *,
        domains!inner(
          domain_name
        )
      `)
      .single()

    if (updateError) {
      console.error('Database error updating alias:', updateError)
      
      // Handle unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'Alias name already exists in this domain' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to update alias' },
        { status: 500 }
      )
    }

    // Transform response to include full_address
    const responseAlias = {
      id: updatedAlias.id,
      domain_id: updatedAlias.domain_id,
      alias_name: updatedAlias.alias_name,
      full_address: `${updatedAlias.alias_name}@${updatedAlias.domains.domain_name}`,
      is_enabled: updatedAlias.is_enabled,
      last_email_received_at: updatedAlias.last_email_received_at,
      created_at: updatedAlias.created_at,
      updated_at: updatedAlias.updated_at
    }

    return NextResponse.json(
      responseAlias,
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
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
 * GET /api/aliases/[id]
 * Get a specific alias by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const aliasId = params.id

    // Validate alias ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(aliasId)) {
      return NextResponse.json(
        { error: 'Invalid alias ID format' },
        { status: 400 }
      )
    }

    // Get alias and verify ownership
    const { data: alias, error: aliasError } = await supabase
      .from('email_aliases')
      .select(`
        *,
        domains!inner(
          id,
          domain_name,
          user_id
        )
      `)
      .eq('id', aliasId)
      .eq('domains.user_id', user.id) // Ensure user owns this alias
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

    // Transform response to include full_address
    const responseAlias = {
      id: alias.id,
      domain_id: alias.domain_id,
      alias_name: alias.alias_name,
      full_address: `${alias.alias_name}@${alias.domains.domain_name}`,
      is_enabled: alias.is_enabled,
      last_email_received_at: alias.last_email_received_at,
      created_at: alias.created_at,
      updated_at: alias.updated_at
    }

    return NextResponse.json(
      responseAlias,
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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
 * OPTIONS /api/aliases/[id]
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}
