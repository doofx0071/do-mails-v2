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

      // Use original sender's email and name for transparent forwarding
      formData.append('from', originalEmail.from)
      formData.append('to', forwardToEmail)
      formData.append('subject', originalEmail.subject) // Keep original subject

      // Use original email content directly
      if (originalEmail.bodyText) {
        formData.append('text', originalEmail.bodyText)
      }

      if (originalEmail.bodyHtml) {
        formData.append('html', originalEmail.bodyHtml)
      }

      // Set Reply-To to original sender (same as From for transparent forwarding)
      formData.append('h:Reply-To', originalEmail.from)

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
      return true
    } catch (error) {
      console.error('❌ Error forwarding email:', error)
      return false
    }
  }
}

export default EmailForwarder
