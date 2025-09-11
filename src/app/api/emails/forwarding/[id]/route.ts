import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '@/lib/supabase/server'

/**
 * GET /api/emails/forwarding/[id]
 * Get a specific email forwarding rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    const ruleId = params.id

    // Validate rule ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(ruleId)) {
      return NextResponse.json(
        { error: 'Invalid forwarding rule ID format' },
        { status: 400 }
      )
    }

    // Get forwarding rule and verify ownership through RLS
    const { data: rule, error: ruleError } = await supabase
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
      .eq('id', ruleId)
      .single()

    if (ruleError) {
      if (ruleError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Forwarding rule not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching forwarding rule:', ruleError)
      return NextResponse.json(
        { error: 'Failed to fetch forwarding rule' },
        { status: 500 }
      )
    }

    // Transform the response
    const responseRule = {
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
    }

    return NextResponse.json(
      responseRule,
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
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
 * PATCH /api/emails/forwarding/[id]
 * Update an existing email forwarding rule
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    const ruleId = params.id

    // Validate rule ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(ruleId)) {
      return NextResponse.json(
        { error: 'Invalid forwarding rule ID format' },
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
    const allowedFields = ['forward_to_email', 'is_enabled', 'keep_copy']
    const providedFields = Object.keys(body).filter(key => allowedFields.includes(key))
    
    if (providedFields.length === 0) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update: forward_to_email, is_enabled, keep_copy' },
        { status: 400 }
      )
    }

    // Verify forwarding rule exists and user owns it through RLS
    const { data: existingRule, error: ruleError } = await supabase
      .from('forwarding_rules')
      .select(`
        id, 
        alias_id,
        email_aliases!inner(
          alias_name,
          domains!inner(
            domain_name
          )
        )
      `)
      .eq('id', ruleId)
      .single()

    if (ruleError) {
      if (ruleError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Forwarding rule not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching forwarding rule:', ruleError)
      return NextResponse.json(
        { error: 'Failed to fetch forwarding rule' },
        { status: 500 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Validate and process forward_to_email if provided
    if (body.forward_to_email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.forward_to_email)) {
        return NextResponse.json(
          { error: 'Invalid forward_to_email format' },
          { status: 400 }
        )
      }

      // Prevent forwarding to the same alias (infinite loop)
      const aliasFullAddress = `${existingRule.email_aliases.alias_name}@${existingRule.email_aliases.domains.domain_name}`
      if (body.forward_to_email.toLowerCase() === aliasFullAddress.toLowerCase()) {
        return NextResponse.json(
          { error: 'Cannot forward to the same alias (would create infinite loop)' },
          { status: 400 }
        )
      }

      updateData.forward_to_email = body.forward_to_email.toLowerCase().trim()
    }

    // Validate and process is_enabled if provided
    if (body.is_enabled !== undefined) {
      if (typeof body.is_enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'is_enabled must be a boolean' },
          { status: 400 }
        )
      }
      updateData.is_enabled = body.is_enabled
    }

    // Validate and process keep_copy if provided
    if (body.keep_copy !== undefined) {
      if (typeof body.keep_copy !== 'boolean') {
        return NextResponse.json(
          { error: 'keep_copy must be a boolean' },
          { status: 400 }
        )
      }
      updateData.keep_copy = body.keep_copy
    }

    // Update the forwarding rule
    const { data: updatedRule, error: updateError } = await supabase
      .from('forwarding_rules')
      .update(updateData)
      .eq('id', ruleId)
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

    if (updateError) {
      console.error('Database error updating forwarding rule:', updateError)
      return NextResponse.json(
        { error: 'Failed to update forwarding rule' },
        { status: 500 }
      )
    }

    // Transform the response
    const responseRule = {
      id: updatedRule.id,
      alias_id: updatedRule.alias_id,
      forward_to_email: updatedRule.forward_to_email,
      is_enabled: updatedRule.is_enabled,
      keep_copy: updatedRule.keep_copy,
      created_at: updatedRule.created_at,
      updated_at: updatedRule.updated_at,
      alias: {
        id: updatedRule.email_aliases.id,
        alias_name: updatedRule.email_aliases.alias_name,
        full_address: `${updatedRule.email_aliases.alias_name}@${updatedRule.email_aliases.domains.domain_name}`
      }
    }

    return NextResponse.json(
      responseRule,
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
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
 * DELETE /api/emails/forwarding/[id]
 * Delete an email forwarding rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    const ruleId = params.id

    // Validate rule ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(ruleId)) {
      return NextResponse.json(
        { error: 'Invalid forwarding rule ID format' },
        { status: 400 }
      )
    }

    // Verify forwarding rule exists and user owns it through RLS
    const { data: existingRule, error: ruleError } = await supabase
      .from('forwarding_rules')
      .select('id, alias_id')
      .eq('id', ruleId)
      .single()

    if (ruleError) {
      if (ruleError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Forwarding rule not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching forwarding rule:', ruleError)
      return NextResponse.json(
        { error: 'Failed to fetch forwarding rule' },
        { status: 500 }
      )
    }

    // Delete the forwarding rule
    const { error: deleteError } = await supabase
      .from('forwarding_rules')
      .delete()
      .eq('id', ruleId)

    if (deleteError) {
      console.error('Database error deleting forwarding rule:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete forwarding rule' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Forwarding rule deleted successfully',
        rule_id: ruleId
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
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
 * OPTIONS /api/emails/forwarding/[id]
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}
