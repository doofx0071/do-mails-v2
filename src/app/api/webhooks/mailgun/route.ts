import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { EmailProcessing } from '@do-mails/email-processing'

// Initialize Supabase client with service role for webhook processing
// Note: Service role is appropriate here since webhooks are system events,
// not user-scoped requests. RLS is bypassed intentionally for email ingestion.
const supabase = createServiceClient()

// Initialize email processing service
const emailProcessor = new EmailProcessing({
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY!,
    domain: process.env.MAILGUN_DOMAIN!,
    baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net',
    webhookSigningKey: process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
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
 * POST /api/webhooks/mailgun
 * Handle inbound email webhooks from Mailgun
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature first
    const signature = request.headers.get('x-mailgun-signature-256')
    const timestamp = request.headers.get('x-mailgun-timestamp')
    const token = request.headers.get('x-mailgun-token')

    if (!signature || !timestamp || !token) {
      console.error('Missing Mailgun signature headers')
      return NextResponse.json(
        { error: 'Missing signature headers' },
        { status: 401 }
      )
    }

    // Parse the webhook data
    const formData = await request.formData()
    const webhookData: any = {}

    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      webhookData[key] = value
    }

    // Verify webhook signature using email processing library
    const isValidSignature = await emailProcessor.verifyWebhookSignature({
      signature,
      timestamp,
      token,
      body: webhookData,
    })

    if (!isValidSignature) {
      console.error('Invalid Mailgun webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log('Received verified Mailgun webhook:', Object.keys(webhookData))

    // Process the inbound email using email processing library
    let emailMessage
    try {
      emailMessage = await emailProcessor.processInboundWebhook(webhookData)
    } catch (error: any) {
      console.error('Failed to process webhook:', error)
      return NextResponse.json(
        { error: 'Failed to process webhook', details: error.message },
        { status: 400 }
      )
    }

    // Extract recipient email to find the alias
    const recipientEmail = webhookData.recipient || webhookData.to
    if (!recipientEmail) {
      console.error('No recipient email found in webhook')
      return NextResponse.json(
        { error: 'No recipient email found' },
        { status: 400 }
      )
    }

    // Parse the recipient email to get alias and domain
    const [aliasName, domainName] = recipientEmail.split('@')
    if (!aliasName || !domainName) {
      console.error('Invalid recipient email format:', recipientEmail)
      return NextResponse.json(
        { error: 'Invalid recipient email format' },
        { status: 400 }
      )
    }

    // Find the domain in our database (catch-all approach)
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select(
        `
        id,
        domain_name,
        user_id,
        verification_status
      `
      )
      .eq('domain_name', domainName.toLowerCase())
      .eq('verification_status', 'verified')
      .single()

    if (domainError) {
      if (domainError.code === 'PGRST116') {
        // No rows returned
        console.error('Domain not found or not verified:', domainName)
        return NextResponse.json(
          { error: 'Domain not found or not verified' },
          { status: 404 }
        )
      }

      console.error('Database error fetching domain:', domainError)
      return NextResponse.json(
        { error: 'Failed to fetch domain' },
        { status: 500 }
      )
    }

    console.log(
      `✅ Catch-all: Accepting email for ${recipientEmail} on verified domain ${domainName}`
    )

    // Check if message already exists (prevent duplicates)
    const { data: existingMessage, error: checkError } = await supabase
      .from('email_messages')
      .select('id')
      .eq('message_id', emailMessage.messageId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Database error checking existing message:', checkError)
      return NextResponse.json(
        { error: 'Failed to check message existence' },
        { status: 500 }
      )
    }

    if (existingMessage) {
      console.log('Message already exists:', emailMessage.messageId)
      return NextResponse.json(
        {
          success: true,
          message: 'Message already processed',
          duplicate: true,
        },
        { status: 200 }
      )
    }

    // Find or create thread for this message
    let threadId: string | null = null

    // Try to find existing thread based on references or subject
    if (emailMessage.inReplyTo || emailMessage.references.length > 0) {
      // Look for thread by message references
      const referenceIds = [
        ...(emailMessage.inReplyTo ? [emailMessage.inReplyTo] : []),
        ...emailMessage.references,
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
      const normalizedSubject = emailMessage.subject
        .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:|FW:)\s*/gi, '')
        .trim()
        .toLowerCase()

      if (normalizedSubject) {
        const { data: subjectThread, error: subjectError } = await supabase
          .from('email_threads')
          .select('id')
          .eq('domain_id', domain.id)
          .eq('recipient_address', recipientEmail.toLowerCase())
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
        new Set([emailMessage.from, ...emailMessage.to, ...emailMessage.cc])
      )

      const { data: newThread, error: createThreadError } = await supabase
        .from('email_threads')
        .insert({
          domain_id: domain.id,
          recipient_address: recipientEmail.toLowerCase(),
          subject: emailMessage.subject,
          participants: participants,
          message_count: 0, // Will be updated by trigger
          last_message_at: emailMessage.receivedAt.toISOString(),
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

    // Store the email message
    const { data: storedMessage, error: storeError } = await supabase
      .from('email_messages')
      .insert({
        thread_id: threadId,
        domain_id: domain.id,
        recipient_address: recipientEmail.toLowerCase(),
        message_id: emailMessage.messageId,
        in_reply_to: emailMessage.inReplyTo,
        references: emailMessage.references,
        from_address: emailMessage.from,
        to_addresses: emailMessage.to,
        cc_addresses: emailMessage.cc,
        bcc_addresses: emailMessage.bcc,
        subject: emailMessage.subject,
        body_text: emailMessage.bodyText,
        body_html: emailMessage.bodyHtml,
        is_read: false,
        is_sent: false,
        mailgun_message_id: webhookData['Message-Id'],
        received_at: emailMessage.receivedAt.toISOString(),
      })
      .select()
      .single()

    if (storeError) {
      console.error('Database error storing message:', storeError)
      return NextResponse.json(
        { error: 'Failed to store email message' },
        { status: 500 }
      )
    }

    // Handle attachments if present
    const attachmentCount = parseInt(webhookData['attachment-count'] || '0')
    const attachmentIds: string[] = []

    if (attachmentCount > 0) {
      console.log(`Processing ${attachmentCount} attachments`)

      for (let i = 1; i <= attachmentCount; i++) {
        const attachmentFile = formData.get(`attachment-${i}`) as File
        const attachmentName = webhookData[`attachment-${i}`] as string

        if (attachmentFile && attachmentName) {
          try {
            // Generate unique filename
            const timestamp = Date.now()
            const randomId = Math.random().toString(36).substr(2, 9)
            const fileExtension = attachmentName.split('.').pop() || 'bin'
            const uniqueFilename = `${timestamp}-${randomId}.${fileExtension}`
            const storagePath = `attachments/${alias.domains.user_id}/${uniqueFilename}`

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } =
              await supabase.storage
                .from('email-attachments')
                .upload(storagePath, attachmentFile, {
                  contentType:
                    attachmentFile.type || 'application/octet-stream',
                  upsert: false,
                })

            if (uploadError) {
              console.error(`Failed to upload attachment ${i}:`, uploadError)
              continue
            }

            // Store attachment metadata in database
            const { data: attachmentRecord, error: attachmentError } =
              await supabase
                .from('email_attachments')
                .insert({
                  message_id: storedMessage.id,
                  filename: attachmentName,
                  content_type:
                    attachmentFile.type || 'application/octet-stream',
                  size: attachmentFile.size,
                  storage_path: storagePath,
                  storage_bucket: 'email-attachments',
                })
                .select('id')
                .single()

            if (attachmentError) {
              console.error(
                `Failed to store attachment metadata ${i}:`,
                attachmentError
              )
              // Clean up uploaded file
              await supabase.storage
                .from('email-attachments')
                .remove([storagePath])
              continue
            }

            attachmentIds.push(attachmentRecord.id)
            console.log(
              `Successfully stored attachment ${i}: ${attachmentName}`
            )
          } catch (error) {
            console.error(`Error processing attachment ${i}:`, error)
          }
        }
      }

      console.log(
        `Successfully processed ${attachmentIds.length}/${attachmentCount} attachments`
      )
    }

    // Update alias last_email_received_at
    await supabase
      .from('email_aliases')
      .update({
        last_email_received_at: emailMessage.receivedAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', alias.id)

    console.log('Successfully processed inbound email:', {
      messageId: emailMessage.messageId,
      threadId: threadId,
      aliasId: alias.id,
      from: emailMessage.from,
      subject: emailMessage.subject,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Email processed successfully',
        message_id: storedMessage.id,
        thread_id: threadId,
        alias_id: alias.id,
        from: emailMessage.from,
        subject: emailMessage.subject,
        received_at: emailMessage.receivedAt,
        attachments_processed: attachmentIds.length,
        attachment_ids: attachmentIds,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/mailgun
 * Health check endpoint for webhook
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      message: 'Mailgun webhook endpoint is active',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}
