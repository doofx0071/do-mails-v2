import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/emails/threads/[id]
 * Get a specific email thread with its messages
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

    const threadId = params.id

    // Validate thread ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(threadId)) {
      return NextResponse.json(
        { error: 'Invalid thread ID format' },
        { status: 400 }
      )
    }

    // Get thread and verify ownership
    const { data: thread, error: threadError } = await supabase
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
      .eq('id', threadId)
      .eq('email_aliases.domains.user_id', user.id)
      .single()

    if (threadError) {
      if (threadError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Thread not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching thread:', threadError)
      return NextResponse.json(
        { error: 'Failed to fetch thread' },
        { status: 500 }
      )
    }

    // Get messages for this thread
    const { data: messages, error: messagesError } = await supabase
      .from('email_messages')
      .select(`
        *,
        email_attachments(*)
      `)
      .eq('thread_id', threadId)
      .order('received_at', { ascending: true })

    if (messagesError) {
      console.error('Database error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch thread messages' },
        { status: 500 }
      )
    }

    // Transform the response
    const responseThread = {
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
      },
      messages: (messages || []).map(message => ({
        id: message.id,
        thread_id: message.thread_id,
        alias_id: message.alias_id,
        message_id: message.message_id,
        in_reply_to: message.in_reply_to,
        references: message.references,
        from_address: message.from_address,
        to_addresses: message.to_addresses,
        cc_addresses: message.cc_addresses,
        bcc_addresses: message.bcc_addresses,
        subject: message.subject,
        body_text: message.body_text,
        body_html: message.body_html,
        is_read: message.is_read,
        is_sent: message.is_sent,
        mailgun_message_id: message.mailgun_message_id,
        received_at: message.received_at,
        created_at: message.created_at,
        attachments: message.email_attachments || []
      }))
    }

    return NextResponse.json(
      responseThread,
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
 * PATCH /api/emails/threads/[id]
 * Update thread properties (archived status, labels)
 */
export async function PATCH(
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

    const threadId = params.id

    // Validate thread ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(threadId)) {
      return NextResponse.json(
        { error: 'Invalid thread ID format' },
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
    const allowedFields = ['is_archived', 'labels']
    const providedFields = Object.keys(body).filter(key => allowedFields.includes(key))
    
    if (providedFields.length === 0) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update: is_archived, labels' },
        { status: 400 }
      )
    }

    // Verify thread exists and user owns it
    const { data: existingThread, error: threadError } = await supabase
      .from('email_threads')
      .select(`
        id,
        email_aliases!inner(
          domains!inner(user_id)
        )
      `)
      .eq('id', threadId)
      .eq('email_aliases.domains.user_id', user.id)
      .single()

    if (threadError) {
      if (threadError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Thread not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching thread:', threadError)
      return NextResponse.json(
        { error: 'Failed to fetch thread' },
        { status: 500 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Validate and process is_archived if provided
    if (body.is_archived !== undefined) {
      if (typeof body.is_archived !== 'boolean') {
        return NextResponse.json(
          { error: 'Invalid is_archived field. Must be a boolean' },
          { status: 400 }
        )
      }
      updateData.is_archived = body.is_archived
    }

    // Validate and process labels if provided
    if (body.labels !== undefined) {
      if (!Array.isArray(body.labels)) {
        return NextResponse.json(
          { error: 'Invalid labels field. Must be an array' },
          { status: 400 }
        )
      }
      
      // Validate each label is a string
      for (const label of body.labels) {
        if (typeof label !== 'string') {
          return NextResponse.json(
            { error: 'Invalid label. All labels must be strings' },
            { status: 400 }
          )
        }
      }
      
      updateData.labels = body.labels
    }

    // Perform the update
    const { data: updatedThread, error: updateError } = await supabase
      .from('email_threads')
      .update(updateData)
      .eq('id', threadId)
      .select(`
        *,
        email_aliases!inner(
          id,
          alias_name,
          domains!inner(
            domain_name
          )
        )
      `)
      .single()

    if (updateError) {
      console.error('Database error updating thread:', updateError)
      return NextResponse.json(
        { error: 'Failed to update thread' },
        { status: 500 }
      )
    }

    // Transform response
    const responseThread = {
      id: updatedThread.id,
      alias_id: updatedThread.alias_id,
      subject: updatedThread.subject,
      participants: updatedThread.participants,
      message_count: updatedThread.message_count,
      last_message_at: updatedThread.last_message_at,
      is_archived: updatedThread.is_archived,
      labels: updatedThread.labels,
      created_at: updatedThread.created_at,
      updated_at: updatedThread.updated_at,
      alias: {
        id: updatedThread.email_aliases.id,
        alias_name: updatedThread.email_aliases.alias_name,
        full_address: `${updatedThread.email_aliases.alias_name}@${updatedThread.email_aliases.domains.domain_name}`
      }
    }

    return NextResponse.json(
      responseThread,
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
 * OPTIONS /api/emails/threads/[id]
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
