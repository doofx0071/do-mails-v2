import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '@/lib/supabase/server'

/**
 * PATCH /api/emails/messages/[id]/read
 * Mark an email message as read or unread
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    const messageId = params.id

    // Validate message ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(messageId)) {
      return NextResponse.json(
        { error: 'Invalid message ID format' },
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

    // Validate is_read field
    if (typeof body.is_read !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid is_read field. Must be a boolean' },
        { status: 400 }
      )
    }

    // Verify message exists and user owns it
    const { data: existingMessage, error: messageError } = await supabase
      .from('email_messages')
      .select(`
        id,
        is_read,
        email_aliases!inner(
          domains!inner(user_id)
        )
      `)
      .eq('id', messageId)
      .eq('email_aliases.domains.user_id', user.id)
      .single()

    if (messageError) {
      if (messageError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Message not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching message:', messageError)
      return NextResponse.json(
        { error: 'Failed to fetch message' },
        { status: 500 }
      )
    }

    // Check if the read status is already what's requested
    if (existingMessage.is_read === body.is_read) {
      return NextResponse.json(
        {
          success: true,
          message: `Message is already marked as ${body.is_read ? 'read' : 'unread'}`,
          message_id: messageId,
          is_read: body.is_read
        },
        { status: 200 }
      )
    }

    // Update the message read status
    const { data: updatedMessage, error: updateError } = await supabase
      .from('email_messages')
      .update({
        is_read: body.is_read
      })
      .eq('id', messageId)
      .select('id, is_read')
      .single()

    if (updateError) {
      console.error('Database error updating message:', updateError)
      return NextResponse.json(
        { error: 'Failed to update message read status' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: `Message marked as ${body.is_read ? 'read' : 'unread'}`,
        message_id: updatedMessage.id,
        is_read: updatedMessage.is_read
      },
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
 * OPTIONS /api/emails/messages/[id]/read
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}
