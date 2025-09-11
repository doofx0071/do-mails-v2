import { NextRequest, NextResponse } from 'next/server'
import {
  extractAuthToken,
  verifyAuth,
  createUserClient,
} from '@/lib/supabase/server'

/**
 * GET /api/emails/signatures
 * List user's email signatures with optional alias filter
 */
export async function GET(request: NextRequest) {
  try {
    // Extract and validate auth token
    const token = extractAuthToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Bearer token required' },
        { status: 401 }
      )
    }

    // Verify authentication
    try {
      await verifyAuth(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Create user-context client (respects RLS)
    const supabase = createUserClient(token)

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const aliasId = searchParams.get('alias_id')

    // Validate alias_id parameter if provided
    if (aliasId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(aliasId)) {
        return NextResponse.json(
          { error: 'Invalid alias_id format' },
          { status: 400 }
        )
      }
    }

    // Build query - RLS automatically filters by user ownership
    let query = supabase
      .from('email_signatures')
      .select(
        `
        *,
        email_aliases!inner(
          id,
          alias_name,
          domains!inner(
            id,
            domain_name
          )
        )
      `
      )
      .order('created_at', { ascending: false })

    // Apply alias filter if provided
    if (aliasId) {
      query = query.eq('alias_id', aliasId)
    }

    const { data: signatures, error: dbError } = await query

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch signatures' },
        { status: 500 }
      )
    }

    // Transform the data to include computed fields
    const transformedSignatures = (signatures || []).map((signature) => ({
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
        full_address: `${signature.email_aliases.alias_name}@${signature.email_aliases.domains.domain_name}`,
      },
    }))

    return NextResponse.json(
      { signatures: transformedSignatures },
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
 * POST /api/emails/signatures
 * Create a new email signature
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

    // Verify authentication
    try {
      await verifyAuth(token)
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
    const requiredFields = ['alias_id', 'signature_html', 'signature_text']
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
      signature_html,
      signature_text,
      is_default = false,
    } = body

    // Validate alias_id format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(alias_id)) {
      return NextResponse.json(
        { error: 'Invalid alias_id format' },
        { status: 400 }
      )
    }

    // Validate signature content
    if (
      typeof signature_html !== 'string' ||
      signature_html.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'signature_html must be a non-empty string' },
        { status: 400 }
      )
    }

    if (
      typeof signature_text !== 'string' ||
      signature_text.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'signature_text must be a non-empty string' },
        { status: 400 }
      )
    }

    // Verify alias exists and user owns it
    const { data: alias, error: aliasError } = await supabase
      .from('email_aliases')
      .select(
        `
        id,
        alias_name,
        domains!inner(
          id,
          domain_name,
          user_id
        )
      `
      )
      .eq('id', alias_id)
      .eq('domains.user_id', user.id)
      .single()

    if (aliasError) {
      if (aliasError.code === 'PGRST116') {
        // No rows returned
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

    // Check if signature already exists for this alias (UNIQUE constraint)
    const { data: existingSignature, error: checkError } = await supabase
      .from('email_signatures')
      .select('id')
      .eq('alias_id', alias_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Database error checking existing signature:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing signature' },
        { status: 500 }
      )
    }

    if (existingSignature) {
      return NextResponse.json(
        {
          error:
            'Signature already exists for this alias. Use PATCH to update.',
        },
        { status: 409 }
      )
    }

    // Create signature record - RLS will automatically enforce user ownership
    const { data: newSignature, error: createError } = await supabase
      .from('email_signatures')
      .insert({
        alias_id,
        signature_html: signature_html.trim(),
        signature_text: signature_text.trim(),
        is_default,
      })
      .select(
        `
        *,
        email_aliases!inner(
          id,
          alias_name,
          domains!inner(
            id,
            domain_name
          )
        )
      `
      )
      .single()

    if (createError) {
      console.error('Database error creating signature:', createError)

      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'Signature already exists for this alias' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create signature' },
        { status: 500 }
      )
    }

    // Return the created signature with alias info
    const responseSignature = {
      id: newSignature.id,
      alias_id: newSignature.alias_id,
      signature_html: newSignature.signature_html,
      signature_text: newSignature.signature_text,
      is_default: newSignature.is_default,
      created_at: newSignature.created_at,
      updated_at: newSignature.updated_at,
      alias: {
        id: newSignature.email_aliases.id,
        alias_name: newSignature.email_aliases.alias_name,
        full_address: `${newSignature.email_aliases.alias_name}@${newSignature.email_aliases.domains.domain_name}`,
      },
    }

    return NextResponse.json(responseSignature, {
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
 * OPTIONS /api/emails/signatures
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
