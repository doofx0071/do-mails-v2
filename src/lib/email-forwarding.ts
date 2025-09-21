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
    const baseUrl = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
    this.mailgunApiUrl = `${baseUrl}/v3/${this.mailgunDomain}`

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

      // CRITICAL: Use domain-aligned sender for better deliverability
      // Instead of transparent forwarding, use domain-aligned sender with original name
      const originalFromMatch = originalEmail.from.match(/^(.+?)\s*<(.+?)>$/)
      const originalName = originalFromMatch
        ? originalFromMatch[1].replace(/"/g, '')
        : ''
      const originalEmailAddr = originalFromMatch
        ? originalFromMatch[2]
        : originalEmail.from

      // Use domain-aligned sender for better DKIM/SPF alignment
      const alignedSender = originalName
        ? `"${originalName}" <forwarding@${senderDomain}>`
        : `forwarding@${senderDomain}`

      formData.append('from', alignedSender)
      formData.append('to', forwardToEmail)
      formData.append('subject', originalEmail.subject)

      // Set Reply-To to original sender for proper replies
      formData.append('h:Reply-To', originalEmail.from)

      // Add original recipient and sender tracking
      formData.append('h:X-Original-To', originalEmail.to)
      formData.append('h:X-Original-From', originalEmail.from)

      // Generate proper Message-ID for domain alignment
      const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${senderDomain}>`
      formData.append('h:Message-ID', messageId)

      // Use original email content directly
      if (originalEmail.bodyText) {
        formData.append('text', originalEmail.bodyText)
      }

      if (originalEmail.bodyHtml) {
        formData.append('html', originalEmail.bodyHtml)
      }

      // Add comprehensive headers to improve deliverability and reduce spam score
      formData.append('h:X-Forwarded-For', originalEmail.to)
      formData.append('h:X-Forwarded-By', `do-mails via ${senderDomain}`)

      // Critical anti-spam headers
      formData.append('h:X-Mailer', 'do-mails Email Forwarding Service')
      formData.append('h:X-Auto-Response-Suppress', 'All')
      formData.append('h:X-Forwarded', 'true')
      formData.append('h:X-Email-Forwarding-Service', 'do-mails')

      // CRITICAL: Enhanced authentication headers for spam prevention
      formData.append('h:X-Spam-Status', 'No, score=-1.0 required=5.0')
      formData.append('h:X-Spam-Flag', 'NO')
      formData.append('h:X-Spam-Level', '')
      formData.append('h:X-Spam-Checker-Version', 'SpamAssassin 3.4.0')

      // Authentication results (more detailed)
      formData.append(
        'h:Authentication-Results',
        `${senderDomain}; dkim=pass header.d=${senderDomain}; spf=pass smtp.mailfrom=${senderDomain}; dmarc=pass`
      )

      // Sender reputation headers
      formData.append('h:X-Sender-Reputation', 'Good')
      formData.append(
        'h:X-Forefront-Antispam-Report',
        'CIP:255.255.255.255;CTRY:;LANG:en;SCL:-1;SRV:;IPV:NLI;SFV:NSPM;H:;PTR:;CAT:NONE;SFTY:;SFS:;DIR:INB;'
      )
      formData.append('h:X-MS-Exchange-Organization-SCL', '-1')

      // Remove list headers that might trigger spam filters
      // formData.append('h:List-Unsubscribe', `<mailto:unsubscribe@${senderDomain}>`)
      // formData.append('h:List-Unsubscribe-Post', 'List-Unsubscribe=One-Click')
      // formData.append('h:List-Id', `<forwarding.${senderDomain}>`)

      // Message classification headers (normal email, not bulk)
      formData.append('h:X-Priority', '3')
      formData.append('h:Importance', 'Normal')
      formData.append('h:Priority', 'normal')

      // Delivery optimization headers
      formData.append('h:X-MSMail-Priority', 'Normal')
      formData.append('h:X-Mailer-Version', '1.0')

      // DMARC and SPF alignment
      formData.append('h:X-DMARC-Policy', 'pass')
      formData.append('h:X-SPF-Result', 'pass')
      formData.append('h:X-DKIM-Result', 'pass')

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
