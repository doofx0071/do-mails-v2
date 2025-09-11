import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '@/lib/supabase/server'

/**
 * GET /api/emails/signatures/[id]
 * Get a specific email signature
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    const signatureId = params.id

    // Validate signature ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(signatureId)) {
      return NextResponse.json(
        { error: 'Invalid signature ID format' },
        { status: 400 }
      )
    }

    // Get signature and verify ownership through RLS
    const { data: signature, error: signatureError } = await supabase
      .from('email_signatures')
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
      .eq('id', signatureId)
      .single()

    if (signatureError) {
      if (signatureError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Signature not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching signature:', signatureError)
      return NextResponse.json(
        { error: 'Failed to fetch signature' },
        { status: 500 }
      )
    }

    // Transform the response
    const responseSignature = {
      id: signature.id,
      alias_id: signature.alias_id,
      signature_html: signature.signature_html,
      signature_text: signature.signature_text,
      is_default: signature.is_default,
      created_at: signature.created_at,
      updated_at: signature.updated_at,
      alias: {
        id: signature.email_aliases.id,
        alias_name: signature.email_aliases.alias_name,
        full_address: `${signature.email_aliases.alias_name}@${signature.email_aliases.domains.domain_name}`
      }
    }

    return NextResponse.json(
      responseSignature,
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
 * PATCH /api/emails/signatures/[id]
 * Update an existing email signature
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    const signatureId = params.id

    // Validate signature ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(signatureId)) {
      return NextResponse.json(
        { error: 'Invalid signature ID format' },
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
    const allowedFields = ['signature_html', 'signature_text', 'is_default']
    const providedFields = Object.keys(body).filter(key => allowedFields.includes(key))
    
    if (providedFields.length === 0) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update: signature_html, signature_text, is_default' },
        { status: 400 }
      )
    }

    // Verify signature exists and user owns it through RLS
    const { data: existingSignature, error: signatureError } = await supabase
      .from('email_signatures')
      .select('id, alias_id')
      .eq('id', signatureId)
      .single()

    if (signatureError) {
      if (signatureError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Signature not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching signature:', signatureError)
      return NextResponse.json(
        { error: 'Failed to fetch signature' },
        { status: 500 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Validate and process signature_html if provided
    if (body.signature_html !== undefined) {
      if (typeof body.signature_html !== 'string' || body.signature_html.trim().length === 0) {
        return NextResponse.json(
          { error: 'signature_html must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.signature_html = body.signature_html.trim()
    }

    // Validate and process signature_text if provided
    if (body.signature_text !== undefined) {
      if (typeof body.signature_text !== 'string' || body.signature_text.trim().length === 0) {
        return NextResponse.json(
          { error: 'signature_text must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.signature_text = body.signature_text.trim()
    }

    // Validate and process is_default if provided
    if (body.is_default !== undefined) {
      if (typeof body.is_default !== 'boolean') {
        return NextResponse.json(
          { error: 'is_default must be a boolean' },
          { status: 400 }
        )
      }
      updateData.is_default = body.is_default
    }

    // Update the signature
    const { data: updatedSignature, error: updateError } = await supabase
      .from('email_signatures')
      .update(updateData)
      .eq('id', signatureId)
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
      console.error('Database error updating signature:', updateError)
      return NextResponse.json(
        { error: 'Failed to update signature' },
        { status: 500 }
      )
    }

    // Transform the response
    const responseSignature = {
      id: updatedSignature.id,
      alias_id: updatedSignature.alias_id,
      signature_html: updatedSignature.signature_html,
      signature_text: updatedSignature.signature_text,
      is_default: updatedSignature.is_default,
      created_at: updatedSignature.created_at,
      updated_at: updatedSignature.updated_at,
      alias: {
        id: updatedSignature.email_aliases.id,
        alias_name: updatedSignature.email_aliases.alias_name,
        full_address: `${updatedSignature.email_aliases.alias_name}@${updatedSignature.email_aliases.domains.domain_name}`
      }
    }

    return NextResponse.json(
      responseSignature,
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
 * DELETE /api/emails/signatures/[id]
 * Delete an email signature
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    const signatureId = params.id

    // Validate signature ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(signatureId)) {
      return NextResponse.json(
        { error: 'Invalid signature ID format' },
        { status: 400 }
      )
    }

    // Verify signature exists and user owns it through RLS
    const { data: existingSignature, error: signatureError } = await supabase
      .from('email_signatures')
      .select('id, alias_id')
      .eq('id', signatureId)
      .single()

    if (signatureError) {
      if (signatureError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Signature not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching signature:', signatureError)
      return NextResponse.json(
        { error: 'Failed to fetch signature' },
        { status: 500 }
      )
    }

    // Delete the signature
    const { error: deleteError } = await supabase
      .from('email_signatures')
      .delete()
      .eq('id', signatureId)

    if (deleteError) {
      console.error('Database error deleting signature:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete signature' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Signature deleted successfully',
        signature_id: signatureId
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
 * OPTIONS /api/emails/signatures/[id]
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
