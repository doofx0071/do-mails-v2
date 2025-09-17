// Email forwarding functionality using Mailgun API

interface EmailMessage {
  from: string
  to: string
  subject: string
  bodyText?: string
  bodyHtml?: string
  messageId?: string
  inReplyTo?: string
  references?: string[]
  attachments?: any[]
}

export class EmailForwarder {
  private mailgunApiKey: string
  private mailgunDomain: string
  private mailgunApiUrl: string

  constructor() {
    this.mailgunApiKey = process.env.MAILGUN_API_KEY || ''
    this.mailgunDomain = process.env.MAILGUN_DOMAIN || 'do-mails.space'
    this.mailgunApiUrl = `https://api.mailgun.net/v3/${this.mailgunDomain}`

    if (!this.mailgunApiKey) {
      console.warn(
        '⚠️ MAILGUN_API_KEY not set - email forwarding will not work'
      )
    }
  }

  /**
   * Forward an email to a destination address
   */
  async forwardEmail(
    originalEmail: EmailMessage,
    forwardToEmail: string,
    fromDomain?: string
  ): Promise<boolean> {
    if (!this.mailgunApiKey) {
      console.error('❌ Cannot forward email: MAILGUN_API_KEY not configured')
      return false
    }

    try {
      console.log(
        `📧 Forwarding email from ${originalEmail.from} to ${forwardToEmail}`
      )

      // Extract domain from the original recipient email to use as sender domain
      const recipientDomain = originalEmail.to.split('@')[1]
      const senderDomain = fromDomain || recipientDomain || this.mailgunDomain

      // Prepare form data for Mailgun API - transparent forwarding
      const formData = new FormData()

      // Use original sender directly for transparent forwarding (like ImprovMX)
      // This preserves the exact sender format: "Name <email@domain.com>" or "email@domain.com"
      formData.append('from', originalEmail.from)
      formData.append('to', forwardToEmail)
      formData.append('subject', originalEmail.subject) // Keep original subject

      // Add original recipient in To header for transparency
      formData.append('h:X-Original-To', originalEmail.to)

      // Use original email content directly
      if (originalEmail.bodyText) {
        formData.append('text', originalEmail.bodyText)
      }

      if (originalEmail.bodyHtml) {
        formData.append('html', originalEmail.bodyHtml)
      }

      // Don't set Reply-To since From is already the original sender
      // This reduces duplicate header display in Gmail

      // Add comprehensive headers to improve deliverability and reduce spam score
      formData.append('h:X-Original-From', originalEmail.from)
      formData.append('h:X-Forwarded-For', originalEmail.to)
      formData.append('h:X-Forwarded-By', `do-mails via ${senderDomain}`)

      // Critical anti-spam headers
      formData.append('h:X-Mailer', 'do-mails Email Forwarding Service')
      formData.append('h:X-Auto-Response-Suppress', 'All')
      formData.append('h:X-Forwarded', 'true')
      formData.append('h:X-Email-Forwarding-Service', 'do-mails')

      // Authentication and reputation headers
      formData.append(
        'h:Authentication-Results',
        `${senderDomain}; dkim=pass; spf=pass`
      )
      formData.append('h:X-Spam-Status', 'No, score=0.0')
      formData.append('h:X-Spam-Flag', 'NO')

      // List management headers (required for bulk email compliance)
      formData.append(
        'h:List-Unsubscribe',
        `<mailto:unsubscribe@${senderDomain}>`
      )
      formData.append('h:List-Unsubscribe-Post', 'List-Unsubscribe=One-Click')
      formData.append('h:List-Id', `<forwarding.${senderDomain}>`)

      // Message classification headers
      formData.append('h:Precedence', 'list')
      formData.append('h:X-Priority', '3')
      formData.append('h:Importance', 'Normal')

      // Delivery optimization headers
      formData.append('h:X-MSMail-Priority', 'Normal')
      formData.append('h:X-MimeOLE', 'Produced By do-mails Email Forwarding')

      // Add DMARC alignment hint
      formData.append('h:X-DMARC-Policy', 'none')

      // Add reference headers for threading
      if (originalEmail.messageId) {
        formData.append('h:In-Reply-To', originalEmail.messageId)
      }

      // Send via Mailgun API using the correct domain
      const apiUrl = `https://api.mailgun.net/v3/${senderDomain}/messages`
      console.log(`📤 Sending forwarded email via: ${apiUrl}`)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.mailgunApiKey}`).toString('base64')}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Mailgun API error:', response.status, errorText)
        return false
      }

      const result = await response.json()
      console.log('✅ Email forwarded successfully:', result.id)
      console.log('📧 Mailgun response details:', {
        id: result.id,
        message: result.message,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      })
      return true
    } catch (error) {
      console.error('❌ Error forwarding email:', error)
      return false
    }
  }
}

export default EmailForwarder
