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
      console.warn('⚠️ MAILGUN_API_KEY not set - email forwarding will not work')
    }
  }

  /**
   * Forward an email to a destination address
   */
  async forwardEmail(originalEmail: EmailMessage, forwardToEmail: string): Promise<boolean> {
    if (!this.mailgunApiKey) {
      console.error('❌ Cannot forward email: MAILGUN_API_KEY not configured')
      return false
    }

    try {
      console.log(`📧 Forwarding email from ${originalEmail.from} to ${forwardToEmail}`)
      
      // Prepare forwarding email
      const forwardedSubject = `Fwd: ${originalEmail.subject}`
      
      // Create forwarded email body
      const forwardedBodyText = this.createForwardedBodyText(originalEmail)
      const forwardedBodyHtml = this.createForwardedBodyHtml(originalEmail)
      
      // Use a system sender that's authorized in Mailgun
      const systemSender = `noreply@${this.mailgunDomain}`
      
      // Prepare form data for Mailgun API
      const formData = new FormData()
      formData.append('from', systemSender)
      formData.append('to', forwardToEmail)
      formData.append('subject', forwardedSubject)
      formData.append('text', forwardedBodyText)
      
      if (forwardedBodyHtml) {
        formData.append('html', forwardedBodyHtml)
      }
      
      // Set Reply-To to original sender for easy replies
      formData.append('h:Reply-To', originalEmail.from)
      
      // Add reference headers for threading
      if (originalEmail.messageId) {
        formData.append('h:In-Reply-To', originalEmail.messageId)
      }
      
      // Send via Mailgun API
      const response = await fetch(`${this.mailgunApiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.mailgunApiKey}`).toString('base64')}`
        },
        body: formData
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

  /**
   * Create plain text body for forwarded email
   */
  private createForwardedBodyText(originalEmail: EmailMessage): string {
    const separator = '\n---------- Forwarded message ----------'
    const headers = [
      `From: ${originalEmail.from}`,
      `Subject: ${originalEmail.subject}`,
      `To: ${originalEmail.to}`,
      `Date: ${new Date().toISOString()}`
    ].join('\n')
    
    const originalBody = originalEmail.bodyText || '[No plain text content]'
    
    return `${separator}\n${headers}\n\n${originalBody}`
  }

  /**
   * Create HTML body for forwarded email
   */
  private createForwardedBodyHtml(originalEmail: EmailMessage): string | null {
    if (!originalEmail.bodyHtml) return null
    
    const separator = '<div style="border-top: 1px solid #ccc; margin: 20px 0; padding-top: 10px;">'
    const headers = `
      <div style="color: #666; font-size: 12px; margin-bottom: 15px;">
        <strong>---------- Forwarded message ----------</strong><br>
        <strong>From:</strong> ${this.escapeHtml(originalEmail.from)}<br>
        <strong>Subject:</strong> ${this.escapeHtml(originalEmail.subject)}<br>
        <strong>To:</strong> ${this.escapeHtml(originalEmail.to)}<br>
        <strong>Date:</strong> ${new Date().toISOString()}
      </div>
    `
    
    return `${separator}${headers}${originalEmail.bodyHtml}</div>`
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = typeof document !== 'undefined' ? document.createElement('div') : null
    if (div) {
      div.textContent = text
      return div.innerHTML
    }
    // Fallback for server-side
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}

export default EmailForwarder