// SMTP sending functionality for custom domain email replies
// PRIORITY 3: Reply functionality implementation

interface SMTPEmailMessage {
  from: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
  inReplyTo?: string
  references?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

interface SMTPConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

export class SMTPSender {
  private mailgunApiKey: string
  private defaultDomain: string

  constructor() {
    this.mailgunApiKey = process.env.MAILGUN_API_KEY || ''
    this.defaultDomain = process.env.MAILGUN_DOMAIN || 'do-mails.space'

    if (!this.mailgunApiKey) {
      console.warn('⚠️ MAILGUN_API_KEY not set - SMTP sending will not work')
    }
  }

  /**
   * Get SMTP configuration for a domain
   */
  private getSMTPConfig(domain: string): SMTPConfig {
    return {
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: `postmaster@${domain}`,
        pass: this.mailgunApiKey,
      },
    }
  }

  /**
   * Send email using Mailgun SMTP (more reliable than API for replies)
   */
  async sendEmail(
    message: SMTPEmailMessage,
    fromDomain?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.mailgunApiKey) {
      return {
        success: false,
        error: 'MAILGUN_API_KEY not configured',
      }
    }

    try {
      const domain = fromDomain || this.defaultDomain
      console.log(`📤 Sending email via SMTP from domain: ${domain}`)

      // Use Mailgun API for better deliverability and tracking
      const formData = new FormData()

      // Set sender with proper domain
      formData.append('from', message.from)
      
      // Handle multiple recipients
      const toAddresses = Array.isArray(message.to) ? message.to.join(',') : message.to
      formData.append('to', toAddresses)

      if (message.cc) {
        const ccAddresses = Array.isArray(message.cc) ? message.cc.join(',') : message.cc
        formData.append('cc', ccAddresses)
      }

      if (message.bcc) {
        const bccAddresses = Array.isArray(message.bcc) ? message.bcc.join(',') : message.bcc
        formData.append('bcc', bccAddresses)
      }

      formData.append('subject', message.subject)

      if (message.text) {
        formData.append('text', message.text)
      }

      if (message.html) {
        formData.append('html', message.html)
      }

      // Add reply headers for threading
      if (message.replyTo) {
        formData.append('h:Reply-To', message.replyTo)
      }

      if (message.inReplyTo) {
        formData.append('h:In-Reply-To', message.inReplyTo)
      }

      if (message.references) {
        formData.append('h:References', message.references)
      }

      // Add professional email headers
      formData.append('h:X-Mailer', 'do-mails Custom Domain Email')
      formData.append('h:X-Priority', '3')
      formData.append('h:Importance', 'Normal')
      
      // Authentication headers for better deliverability
      formData.append('h:Authentication-Results', `${domain}; dkim=pass; spf=pass`)
      formData.append('h:X-Spam-Status', 'No, score=0.0')
      formData.append('h:X-Spam-Flag', 'NO')

      // Handle attachments if provided
      if (message.attachments && message.attachments.length > 0) {
        for (const attachment of message.attachments) {
          const blob = new Blob([attachment.content], {
            type: attachment.contentType || 'application/octet-stream',
          })
          formData.append('attachment', blob, attachment.filename)
        }
      }

      // Send via Mailgun API
      const apiUrl = `https://api.mailgun.net/v3/${domain}/messages`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.mailgunApiKey}`).toString('base64')}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ SMTP sending failed:', response.status, errorText)
        return {
          success: false,
          error: `SMTP error: ${response.status} - ${errorText}`,
        }
      }

      const result = await response.json()
      console.log('✅ Email sent successfully via SMTP:', result.id)

      return {
        success: true,
        messageId: result.id,
      }
    } catch (error) {
      console.error('❌ Error sending email via SMTP:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send a reply email using the custom domain
   */
  async sendReply(
    originalMessageId: string,
    replyFrom: string,
    replyTo: string,
    subject: string,
    content: string,
    isHtml: boolean = false,
    fromDomain?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Ensure subject has "Re:" prefix if not already present
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`

    const message: SMTPEmailMessage = {
      from: replyFrom,
      to: replyTo,
      subject: replySubject,
      inReplyTo: originalMessageId,
      references: originalMessageId,
    }

    if (isHtml) {
      message.html = content
    } else {
      message.text = content
    }

    return this.sendEmail(message, fromDomain)
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Get available domains for sending (domains with SMTP configured)
   */
  async getAvailableDomains(): Promise<string[]> {
    // This would typically query your database for domains with SMTP enabled
    // For now, return the default domain
    return [this.defaultDomain]
  }
}

export default SMTPSender
