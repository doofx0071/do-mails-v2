import { NextRequest, NextResponse } from 'next/server'
import {
  extractAuthToken,
  verifyAuth,
  createUserClient,
} from '@/lib/supabase/server'

/**
 * POST /api/emails/mark-read
 * Mark email messages or threads as read
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

    const { thread_id, message_ids } = body

    // Validate that either thread_id or message_ids is provided
    if (!thread_id && (!message_ids || !Array.isArray(message_ids))) {
      return NextResponse.json(
        { error: 'Either thread_id or message_ids array must be provided' },
        { status: 400 }
      )
    }

    let updatedCount = 0

    if (thread_id) {
      // Mark all messages in thread as read
      // First verify the user has access to this thread
      const { data: thread, error: threadError } = await supabase
        .from('email_threads')
        .select(`
          id,
          domains!inner(user_id)
        `)
        .eq('id', thread_id)
        .eq('domains.user_id', user.id)
        .single()

      if (threadError || !thread) {
        return NextResponse.json(
          { error: 'Thread not found or access denied' },
          { status: 404 }
        )
      }

      // Update all messages in the thread
      const { data: updatedMessages, error: updateError } = await supabase
        .from('email_messages')
        .update({ is_read: true })
        .eq('thread_id', thread_id)
        .eq('is_read', false)
        .select('id')

      if (updateError) {
        console.error('Error marking thread messages as read:', updateError)
        return NextResponse.json(
          { error: 'Failed to mark messages as read' },
          { status: 500 }
        )
      }

      updatedCount = updatedMessages?.length || 0
    } else if (message_ids && Array.isArray(message_ids)) {
      // Mark specific messages as read
      // First verify the user has access to these messages
      const { data: userMessages, error: messageError } = await supabase
        .from('email_messages')
        .select(`
          id,
          domains!inner(user_id)
        `)
        .in('id', message_ids)
        .eq('domains.user_id', user.id)

      if (messageError) {
        console.error('Error fetching user messages:', messageError)
        return NextResponse.json(
          { error: 'Failed to verify message access' },
          { status: 500 }
        )
      }

      const accessibleMessageIds = userMessages?.map(m => m.id) || []
      
      if (accessibleMessageIds.length === 0) {
        return NextResponse.json(
          { error: 'No accessible messages found' },
          { status: 404 }
        )
      }

      // Update the accessible messages
      const { data: updatedMessages, error: updateError } = await supabase
        .from('email_messages')
        .update({ is_read: true })
        .in('id', accessibleMessageIds)
        .eq('is_read', false)
        .select('id')

      if (updateError) {
        console.error('Error marking messages as read:', updateError)
        return NextResponse.json(
          { error: 'Failed to mark messages as read' },
          { status: 500 }
        )
      }

      updatedCount = updatedMessages?.length || 0
    }

    return NextResponse.json(
      {
        success: true,
        updated_count: updatedCount,
        message: `${updatedCount} message(s) marked as read`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error in mark-read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/emails/mark-read
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}