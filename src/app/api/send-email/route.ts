// API endpoint for sending emails through custom domains
// PRIORITY 3: Reply functionality API

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import SMTPSender from '@/lib/smtp-sender'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SendEmailRequest {
  from: string // e.g., "user@kuyadoof.dev"
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  content: string
  isHtml?: boolean
  replyTo?: string
  inReplyTo?: string // For threading
  references?: string // For threading
  domainId?: string // Optional: specify which domain to use
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Send email API called')

    // Parse request body
    const body: SendEmailRequest = await request.json()
    const {
      from,
      to,
      cc,
      bcc,
      subject,
      content,
      isHtml = false,
      replyTo,
      inReplyTo,
      references,
      domainId,
    } = body

    // Validate required fields
    if (!from || !to || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: from, to, subject, content' },
        { status: 400 }
      )
    }

    // Extract domain from 'from' address
    const fromDomain = from.split('@')[1]
    if (!fromDomain) {
      return NextResponse.json(
        { error: 'Invalid from address format' },
        { status: 400 }
      )
    }

    // Verify domain ownership (check if domain exists in user's domains)
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('id, domain, verified')
      .eq('domain', fromDomain)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found or not authorized' },
        { status: 403 }
      )
    }

    if (!domain.verified) {
      return NextResponse.json(
        { error: 'Domain not verified. Please verify your domain first.' },
        { status: 403 }
      )
    }

    // Initialize SMTP sender
    const smtpSender = new SMTPSender()

    // Prepare email message
    const emailMessage = {
      from,
      to,
      cc,
      bcc,
      subject,
      replyTo,
      inReplyTo,
      references,
    }

    if (isHtml) {
      emailMessage.html = content
    } else {
      emailMessage.text = content
    }

    // Send email
    console.log(`📤 Sending email from ${from} to ${Array.isArray(to) ? to.join(', ') : to}`)
    const result = await smtpSender.sendEmail(emailMessage, fromDomain)

    if (!result.success) {
      console.error('❌ Failed to send email:', result.error)
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }

    // Log the sent email (optional - for tracking)
    try {
      await supabase.from('sent_emails').insert({
        domain_id: domain.id,
        from_address: from,
        to_addresses: Array.isArray(to) ? to : [to],
        cc_addresses: cc ? (Array.isArray(cc) ? cc : [cc]) : null,
        bcc_addresses: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : null,
        subject,
        content,
        is_html: isHtml,
        message_id: result.messageId,
        sent_at: new Date().toISOString(),
        status: 'sent',
      })
    } catch (logError) {
      console.warn('⚠️ Failed to log sent email:', logError)
      // Don't fail the request if logging fails
    }

    console.log('✅ Email sent successfully:', result.messageId)

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      from,
      to,
      subject,
      sentAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('💥 Send email API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve available domains for sending
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter required' },
        { status: 400 }
      )
    }

    // Get user's verified domains
    const { data: domains, error } = await supabase
      .from('domains')
      .select('id, domain, verified')
      .eq('user_id', userId)
      .eq('verified', true)

    if (error) {
      console.error('❌ Error fetching domains:', error)
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      domains: domains.map(d => ({
        id: d.id,
        domain: d.domain,
        verified: d.verified,
      })),
    })
  } catch (error) {
    console.error('💥 Get domains API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
