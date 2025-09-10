import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '@/lib/supabase/server'

/**
 * GET /api/emails/threads
 * List user's email threads with optional filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const aliasId = searchParams.get('alias_id')
    const archived = searchParams.get('archived')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Validate archived parameter if provided
    if (archived && !['true', 'false'].includes(archived)) {
      return NextResponse.json(
        { error: 'Invalid archived parameter. Must be: true or false' },
        { status: 400 }
      )
    }

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

    // Build query - join with email_aliases and domains to ensure user ownership
    let query = supabase
      .from('email_threads')
      .select(`
        *,
        email_aliases!inner(
          id,
          alias_name,
          domains!inner(
            id,
            domain_name,
            user_id
          )
        )
      `)
      .eq('email_aliases.domains.user_id', user.id)
      .order('last_message_at', { ascending: false })

    // Apply alias filter if provided
    if (aliasId) {
      // First verify the alias belongs to the user
      const { data: aliasCheck, error: aliasError } = await supabase
        .from('email_aliases')
        .select(`
          id,
          domains!inner(user_id)
        `)
        .eq('id', aliasId)
        .eq('domains.user_id', user.id)
        .single()

      if (aliasError || !aliasCheck) {
        return NextResponse.json(
          { error: 'Alias not found or access denied' },
          { status: 404 }
        )
      }

      query = query.eq('alias_id', aliasId)
    }

    // Apply archived filter if provided
    if (archived !== null) {
      query = query.eq('is_archived', archived === 'true')
    }

    // Apply pagination
    const limitNum = limit ? parseInt(limit) : 50
    const offsetNum = offset ? parseInt(offset) : 0

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be between 1 and 100' },
        { status: 400 }
      )
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return NextResponse.json(
        { error: 'Invalid offset parameter. Must be >= 0' },
        { status: 400 }
      )
    }

    query = query.range(offsetNum, offsetNum + limitNum - 1)

    const { data: threads, error: dbError } = await query

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch email threads' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('email_threads')
      .select('id', { count: 'exact', head: true })
      .eq('email_aliases.domains.user_id', user.id)

    if (aliasId) {
      countQuery = countQuery.eq('alias_id', aliasId)
    }

    if (archived !== null) {
      countQuery = countQuery.eq('is_archived', archived === 'true')
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error('Count query error:', countError)
      // Continue without count rather than failing
    }

    // Transform the data to include computed fields
    const transformedThreads = (threads || []).map(thread => ({
      id: thread.id,
      alias_id: thread.alias_id,
      subject: thread.subject,
      participants: thread.participants,
      message_count: thread.message_count,
      last_message_at: thread.last_message_at,
      is_archived: thread.is_archived,
      labels: thread.labels,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      alias: {
        id: thread.email_aliases.id,
        alias_name: thread.email_aliases.alias_name,
        full_address: `${thread.email_aliases.alias_name}@${thread.email_aliases.domains.domain_name}`
      }
    }))

    const total = totalCount || transformedThreads.length
    const hasMore = offsetNum + limitNum < total

    return NextResponse.json(
      { 
        threads: transformedThreads,
        total,
        has_more: hasMore,
        limit: limitNum,
        offset: offsetNum
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
 * OPTIONS /api/emails/threads
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}
