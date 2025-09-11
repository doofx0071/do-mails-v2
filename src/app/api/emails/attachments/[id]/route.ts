import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '@/lib/supabase/server'

/**
 * GET /api/emails/attachments/[id]
 * Download an email attachment with proper authentication and access control
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    const attachmentId = params.id

    // Validate attachment ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID format' },
        { status: 400 }
      )
    }

    // Get attachment metadata and verify ownership through RLS
    // The RLS policy ensures user can only access attachments from their own emails
    const { data: attachment, error: attachmentError } = await supabase
      .from('email_attachments')
      .select(`
        id,
        filename,
        content_type,
        size,
        storage_path,
        storage_bucket,
        created_at,
        email_messages!inner(
          id,
          subject,
          email_aliases!inner(
            id,
            alias_name,
            domains!inner(
              id,
              domain_name,
              user_id
            )
          )
        )
      `)
      .eq('id', attachmentId)
      .single()

    if (attachmentError) {
      if (attachmentError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { error: 'Attachment not found or access denied' },
          { status: 404 }
        )
      }
      
      console.error('Database error fetching attachment:', attachmentError)
      return NextResponse.json(
        { error: 'Failed to fetch attachment metadata' },
        { status: 500 }
      )
    }

    // Double-check user ownership (RLS should handle this, but extra security)
    if (attachment.email_messages.email_aliases.domains.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if this is a metadata request (HEAD-like behavior)
    const { searchParams } = new URL(request.url)
    const metadataOnly = searchParams.get('metadata') === 'true'

    if (metadataOnly) {
      return NextResponse.json(
        {
          id: attachment.id,
          filename: attachment.filename,
          content_type: attachment.content_type,
          size: attachment.size,
          created_at: attachment.created_at,
          message: {
            id: attachment.email_messages.id,
            subject: attachment.email_messages.subject
          },
          alias: {
            id: attachment.email_messages.email_aliases.id,
            alias_name: attachment.email_messages.email_aliases.alias_name,
            full_address: `${attachment.email_messages.email_aliases.alias_name}@${attachment.email_messages.email_aliases.domains.domain_name}`
          }
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
    }

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(attachment.storage_bucket || 'email-attachments')
      .download(attachment.storage_path)

    if (downloadError) {
      console.error('Storage download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download attachment file' },
        { status: 500 }
      )
    }

    if (!fileData) {
      return NextResponse.json(
        { error: 'Attachment file not found in storage' },
        { status: 404 }
      )
    }

    // Convert Blob to ArrayBuffer for NextResponse
    const arrayBuffer = await fileData.arrayBuffer()

    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = attachment.filename.replace(/[^\w\-_.]/g, '_')

    // Return the file with appropriate headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.content_type || 'application/octet-stream',
        'Content-Length': attachment.size.toString(),
        'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    })

  } catch (error) {
    console.error('Unexpected error downloading attachment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * HEAD /api/emails/attachments/[id]
 * Get attachment metadata without downloading the file
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

    const attachmentId = params.id

    // Validate attachment ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(attachmentId)) {
      return new NextResponse(null, { status: 400 })
    }

    // Get attachment metadata and verify ownership through RLS
    const { data: attachment, error: attachmentError } = await supabase
      .from('email_attachments')
      .select(`
        id,
        filename,
        content_type,
        size,
        created_at,
        email_messages!inner(
          email_aliases!inner(
            domains!inner(
              user_id
            )
          )
        )
      `)
      .eq('id', attachmentId)
      .single()

    if (attachmentError) {
      if (attachmentError.code === 'PGRST116') { // No rows returned
        return new NextResponse(null, { status: 404 })
      }
      
      console.error('Database error fetching attachment:', attachmentError)
      return new NextResponse(null, { status: 500 })
    }

    // Double-check user ownership
    if (attachment.email_messages.email_aliases.domains.user_id !== user.id) {
      return new NextResponse(null, { status: 403 })
    }

    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = attachment.filename.replace(/[^\w\-_.]/g, '_')

    // Return headers only
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': attachment.content_type || 'application/octet-stream',
        'Content-Length': attachment.size.toString(),
        'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
        'Last-Modified': new Date(attachment.created_at).toUTCString(),
        'Cache-Control': 'private, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    })

  } catch (error) {
    console.error('Unexpected error in HEAD request:', error)
    return new NextResponse(null, { status: 500 })
  }
}

/**
 * OPTIONS /api/emails/attachments/[id]
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}
