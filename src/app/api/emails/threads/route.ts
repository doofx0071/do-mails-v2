import { NextRequest, NextResponse } from 'next/server'
import {
  extractAuthToken,
  verifyAuth,
  createUserClient,
} from '@/lib/supabase/server'

/**
 * GET /api/emails/threads
 * List user's email threads with optional filters and pagination
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const aliasId = searchParams.get('alias_id')
    const forwardEmail = searchParams.get('forward_email')
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
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(aliasId)) {
        return NextResponse.json(
          { error: 'Invalid alias_id format' },
          { status: 400 }
        )
      }
    }

    // Build query - fetch both alias-based and domain-based threads
    // If forward_email is specified, filter by domains that forward to that email
    let domainFilter = ''
    if (forwardEmail) {
      domainFilter = `domains.default_forward_email.eq.${forwardEmail}`
    }

    // First get alias-based threads (if any still exist)
    let aliasThreadsQuery = supabase
      .from('email_threads')
      .select(
        `
        *,
        email_aliases!inner(
          id,
          alias_name,
          domains!inner(
            id,
            domain_name,
            user_id,
            default_forward_email
          )
        )
      `
      )
      .eq('email_aliases.domains.user_id', user.id)
      .not('alias_id', 'is', null)

    // Then get domain-based threads (catch-all) - main source of emails
    let domainThreadsQuery = supabase
      .from('email_threads')
      .select(
        `
        *,
        domains!inner(
          id,
          domain_name,
          user_id,
          default_forward_email
        )
      `
      )
      .eq('domains.user_id', user.id)
      .not('domain_id', 'is', null)

    // Apply forward_email filter if specified
    if (forwardEmail) {
      aliasThreadsQuery = aliasThreadsQuery.eq('email_aliases.domains.default_forward_email', forwardEmail)
      domainThreadsQuery = domainThreadsQuery.eq('domains.default_forward_email', forwardEmail)
    }

    // Apply alias filter if provided
    if (aliasId) {
      // First verify the alias belongs to the user
      const { data: aliasCheck, error: aliasError } = await supabase
        .from('email_aliases')
        .select(
          `
          id,
          domains!inner(user_id)
        `
        )
        .eq('id', aliasId)
        .eq('domains.user_id', user.id)
        .single()

      if (aliasError || !aliasCheck) {
        return NextResponse.json(
          { error: 'Alias not found or access denied' },
          { status: 404 }
        )
      }

      aliasThreadsQuery = aliasThreadsQuery.eq('alias_id', aliasId)
      // Don't fetch domain threads if filtering by alias
      domainThreadsQuery = domainThreadsQuery.limit(0)
    }

    // Apply archived filter if provided
    if (archived !== null) {
      aliasThreadsQuery = aliasThreadsQuery.eq(
        'is_archived',
        archived === 'true'
      )
      domainThreadsQuery = domainThreadsQuery.eq(
        'is_archived',
        archived === 'true'
      )
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

    // Execute both queries
    const [aliasResult, domainResult] = await Promise.all([
      aliasThreadsQuery.order('last_message_at', { ascending: false }),
      domainThreadsQuery.order('last_message_at', { ascending: false }),
    ])

    if (aliasResult.error) {
      console.error('Alias threads query error:', aliasResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch email threads' },
        { status: 500 }
      )
    }

    if (domainResult.error) {
      console.error('Domain threads query error:', domainResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch email threads' },
        { status: 500 }
      )
    }

    // Combine and sort threads by last_message_at
    const allThreads = [
      ...(aliasResult.data || []),
      ...(domainResult.data || []),
    ].sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() -
        new Date(a.last_message_at).getTime()
    )

    // Apply pagination to combined results
    const threads = allThreads.slice(offsetNum, offsetNum + limitNum)

    // Get total count for pagination
    const totalCount = allThreads.length

    // Get unread status for each thread by checking for unread messages
    const threadIds = threads.map(t => t.id)
    const unreadStatusPromises = threadIds.map(async (threadId) => {
      const { data: unreadMessages, error } = await supabase
        .from('email_messages')
        .select('id')
        .eq('thread_id', threadId)
        .eq('is_read', false)
        .limit(1)
      
      return {
        threadId,
        hasUnread: !error && unreadMessages && unreadMessages.length > 0
      }
    })
    
    const unreadStatuses = await Promise.all(unreadStatusPromises)
    const unreadMap = new Map(unreadStatuses.map(status => [status.threadId, status.hasUnread]))

    // Transform the data to include computed fields
    const transformedThreads = (threads || []).map((thread) => {
      const isUnread = unreadMap.get(thread.id) || false
      
      // Handle both alias-based and domain-based threads
      if (thread.email_aliases) {
        // Alias-based thread
        return {
          id: thread.id,
          alias_id: thread.alias_id,
          domain_id: thread.domain_id,
          recipient_address: thread.recipient_address,
          subject: thread.subject,
          participants: thread.participants,
          message_count: thread.message_count,
          last_message_at: thread.last_message_at,
          is_archived: thread.is_archived,
          is_read: !isUnread, // Thread is read if it has no unread messages
          labels: thread.labels,
          created_at: thread.created_at,
          updated_at: thread.updated_at,
          alias: {
            id: thread.email_aliases.id,
            alias_name: thread.email_aliases.alias_name,
            full_address: `${thread.email_aliases.alias_name}@${thread.email_aliases.domains.domain_name}`,
          },
          domain: {
            id: thread.email_aliases.domains.id,
            domain_name: thread.email_aliases.domains.domain_name,
          },
        }
      } else {
        // Domain-based thread (catch-all)
        return {
          id: thread.id,
          alias_id: thread.alias_id,
          domain_id: thread.domain_id,
          recipient_address: thread.recipient_address,
          subject: thread.subject,
          participants: thread.participants,
          message_count: thread.message_count,
          last_message_at: thread.last_message_at,
          is_archived: thread.is_archived,
          is_read: !isUnread, // Thread is read if it has no unread messages
          labels: thread.labels,
          created_at: thread.created_at,
          updated_at: thread.updated_at,
          alias: null, // No specific alias for catch-all
          domain: {
            id: thread.domains.id,
            domain_name: thread.domains.domain_name,
          },
        }
      }
    })

    const total = totalCount || transformedThreads.length
    const hasMore = offsetNum + limitNum < total

    return NextResponse.json(
      {
        threads: transformedThreads,
        total,
        has_more: hasMore,
        limit: limitNum,
        offset: offsetNum,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
      'Access-Control-Max-Age': '86400',
    },
  })
}
