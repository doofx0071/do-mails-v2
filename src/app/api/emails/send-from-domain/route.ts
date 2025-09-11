import { NextRequest, NextResponse } from 'next/server'
import { EmailProcessing } from '@do-mails/email-processing'
import {
  extractAuthToken,
  verifyAuth,
  createUserClient,
} from '@/lib/supabase/server'

// Initialize email processing service
const emailProcessor = new EmailProcessing({
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY!,
    domain: process.env.MAILGUN_DOMAIN!,
    baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net',
  },
  threading: {
    subjectNormalization: true,
    referencesTracking: true,
    participantGrouping: true,
    timeWindowHours: 24,
  },
  maxAttachmentSize: 25 * 1024 * 1024, // 25MB
  allowedAttachmentTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
})

/**
 * POST /api/emails/send-from-domain
 * Send an email from any address on a verified domain (catch-all sending)
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
    const requiredFields = [
      'from_address',
      'to_addresses',
      'subject',
      'body_html',
    ]
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const {
      from_address,
      to_addresses,
      cc_addresses = [],
      bcc_addresses = [],
      subject,
      body_text,
      body_html,
      in_reply_to,
      references = [],
    } = body

    // Parse from_address to get domain
    const [fromAlias, fromDomain] = from_address.split('@')
    if (!fromAlias || !fromDomain) {
      return NextResponse.json(
        { error: 'Invalid from_address format' },
        { status: 400 }
      )
    }

    // Verify user owns the domain
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('id, domain_name, verification_status')
      .eq('domain_name', fromDomain.toLowerCase())
      .eq('user_id', user.id)
      .single()

    if (domainError) {
      if (domainError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Domain not found or access denied' },
          { status: 404 }
        )
      }

      console.error('Database error fetching domain:', domainError)
      return NextResponse.json(
        { error: 'Failed to fetch domain' },
        { status: 500 }
      )
    }

    // Check if domain is verified
    if (domain.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'Domain must be verified before sending emails' },
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

    // Use default sender for Mailgun but set reply-to as the from_address
    const defaultSender =
      process.env.MAILGUN_DEFAULT_SENDER || `noreply@${domain.domain_name}`

    // Prepare email request
    const emailRequest = {
      from: defaultSender,
      to: to_addresses,
      cc: cc_addresses.length > 0 ? cc_addresses : undefined,
      bcc: bcc_addresses.length > 0 ? bcc_addresses : undefined,
      subject,
      text: body_text,
      html: body_html,
      inReplyTo: in_reply_to,
      references: references.length > 0 ? references : undefined,
      replyTo: from_address, // Set the desired from_address as reply-to
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
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${domain.domain_name}>`

    // Find or create thread for this email
    let threadId: string | null = null

    // Try to find existing thread based on references or subject
    if (in_reply_to || references.length > 0) {
      // Look for thread by message references
      const referenceIds = [
        ...(in_reply_to ? [in_reply_to] : []),
        ...references,
      ]

      const { data: existingThread, error: threadError } = await supabase
        .from('email_messages')
        .select('thread_id')
        .eq('domain_id', domain.id)
        .in('message_id', referenceIds)
        .limit(1)
        .single()

      if (!threadError && existingThread) {
        threadId = existingThread.thread_id
      }
    }

    // If no thread found by references, try to find by subject
    if (!threadId) {
      const normalizedSubject = subject
        .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:|FW:)\s*/gi, '')
        .trim()
        .toLowerCase()

      if (normalizedSubject) {
        const { data: subjectThread, error: subjectError } = await supabase
          .from('email_threads')
          .select('id')
          .eq('domain_id', domain.id)
          .eq('recipient_address', from_address.toLowerCase())
          .ilike('subject', `%${normalizedSubject}%`)
          .limit(1)
          .single()

        if (!subjectError && subjectThread) {
          threadId = subjectThread.id
        }
      }
    }

    // Create new thread if none found
    if (!threadId) {
      const participants = Array.from(
        new Set([from_address, ...to_addresses, ...cc_addresses])
      )

      const { data: newThread, error: createThreadError } = await supabase
        .from('email_threads')
        .insert({
          domain_id: domain.id,
          recipient_address: from_address.toLowerCase(),
          subject: subject,
          participants: participants,
          message_count: 0, // Will be updated by trigger
          last_message_at: new Date().toISOString(),
          is_archived: false,
          labels: [],
        })
        .select('id')
        .single()

      if (createThreadError) {
        console.error('Database error creating thread:', createThreadError)
        return NextResponse.json(
          { error: 'Failed to create email thread' },
          { status: 500 }
        )
      }

      threadId = newThread.id
    }

    // Store the sent message in database (catch-all style)
    const { data: storedMessage, error: storeError } = await supabase
      .from('email_messages')
      .insert({
        thread_id: threadId,
        domain_id: domain.id,
        recipient_address: from_address.toLowerCase(),
        message_id: messageId,
        in_reply_to: in_reply_to || null,
        references: references,
        from_address: from_address,
        to_addresses: to_addresses,
        cc_addresses: cc_addresses,
        bcc_addresses: bcc_addresses,
        subject: subject,
        body_text: body_text,
        body_html: body_html,
        is_read: true, // Sent messages are considered "read"
        is_sent: true,
        mailgun_message_id: mailgunResponse.id,
        received_at: new Date().toISOString(),
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
        from: from_address,
        to: to_addresses,
        cc: cc_addresses,
        bcc: bcc_addresses,
        subject: subject,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error: any) {
    console.error('Unexpected error in send email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/emails/send-from-domain
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
