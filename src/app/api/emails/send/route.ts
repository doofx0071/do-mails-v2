import { NextRequest, NextResponse } from 'next/server'
import { EmailProcessing } from '@do-mails/email-processing'
import { createAuthenticatedClient } from '@/lib/supabase/server'

// Initialize email processing service
const emailProcessor = new EmailProcessing({
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY!,
    domain: process.env.MAILGUN_DOMAIN!,
    baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
  },
  threading: {
    subjectNormalization: true,
    referencesTracking: true,
    participantGrouping: true,
    timeWindowHours: 24
  },
  maxAttachmentSize: 25 * 1024 * 1024, // 25MB
  allowedAttachmentTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
})

/**
 * POST /api/emails/send
 * Send an email via Mailgun using an alias
 */
export async function POST(request: NextRequest) {
  try {
    // Create authenticated client (respects RLS)
    const { supabase, user } = await createAuthenticatedClient(request)

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
    const requiredFields = ['alias_id', 'to_addresses', 'subject', 'body_html']
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
      to_addresses,
      cc_addresses = [],
      bcc_addresses = [],
      subject,
      body_text,
      body_html,
      in_reply_to,
      references = []
    } = body

    // Validate alias_id format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(alias_id)) {
      return NextResponse.json(
        { error: 'Invalid alias_id format' },
        { status: 400 }
      )
    }

    // Validate email addresses
    const allAddresses = [...to_addresses, ...cc_addresses, ...bcc_addresses]
    for (const address of allAddresses) {
      if (!emailProcessor.validateEmail(address)) {
        return NextResponse.json(
          { error: `Invalid email address: ${address}` },
          { status: 400 }
        )
      }
    }

    // Validate arrays
    if (!Array.isArray(to_addresses) || to_addresses.length === 0) {
      return NextResponse.json(
        { error: 'to_addresses must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!Array.isArray(cc_addresses)) {
      return NextResponse.json(
        { error: 'cc_addresses must be an array' },
        { status: 400 }
      )
    }

    if (!Array.isArray(bcc_addresses)) {
      return NextResponse.json(
        { error: 'bcc_addresses must be an array' },
        { status: 400 }
      )
    }

    if (!Array.isArray(references)) {
      return NextResponse.json(
        { error: 'references must be an array' },
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
          user_id,
          verification_status
        )
      `)
      .eq('id', alias_id)
      .eq('domains.user_id', user.id)
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

    // Check if alias is enabled
    if (!alias.is_enabled) {
      return NextResponse.json(
        { error: 'Alias is disabled' },
        { status: 400 }
      )
    }

    // Check if domain is verified
    if (alias.domains.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'Domain must be verified before sending emails' },
        { status: 400 }
      )
    }

    const fromAddress = `${alias.alias_name}@${alias.domains.domain_name}`

    // Prepare email request
    const emailRequest = {
      from: fromAddress,
      to: to_addresses,
      cc: cc_addresses.length > 0 ? cc_addresses : undefined,
      bcc: bcc_addresses.length > 0 ? bcc_addresses : undefined,
      subject,
      text: body_text,
      html: body_html,
      inReplyTo: in_reply_to,
      references: references.length > 0 ? references : undefined
    }

    // Send email via Mailgun
    let mailgunResponse
    try {
      mailgunResponse = await emailProcessor.sendEmail(emailRequest)
    } catch (error: any) {
      console.error('Mailgun send error:', error)
      return NextResponse.json(
        { error: `Failed to send email: ${error.message}` },
        { status: 500 }
      )
    }

    // Generate unique message ID for our database
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${alias.domains.domain_name}>`

    // Store the sent message in database
    const { data: storedMessage, error: storeError } = await supabase
      .from('email_messages')
      .insert({
        alias_id: alias_id,
        message_id: messageId,
        in_reply_to: in_reply_to || null,
        references: references,
        from_address: fromAddress,
        to_addresses: to_addresses,
        cc_addresses: cc_addresses,
        bcc_addresses: bcc_addresses,
        subject: subject,
        body_text: body_text,
        body_html: body_html,
        is_read: true, // Sent messages are considered "read"
        is_sent: true,
        mailgun_message_id: mailgunResponse.id,
        received_at: new Date().toISOString()
      })
      .select()
      .single()

    if (storeError) {
      console.error('Database error storing message:', storeError)
      // Don't fail the request since email was sent successfully
      console.warn('Email sent but failed to store in database')
    }

    return NextResponse.json(
      {
        success: true,
        message_id: messageId,
        mailgun_id: mailgunResponse.id,
        from: fromAddress,
        to: to_addresses,
        cc: cc_addresses,
        bcc: bcc_addresses,
        subject: subject,
        sent_at: new Date().toISOString(),
        stored_message_id: storedMessage?.id
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
 * OPTIONS /api/emails/send
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}
