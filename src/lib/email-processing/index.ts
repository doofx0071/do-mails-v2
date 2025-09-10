// Mock implementation of @do-mails/email-processing library
// This provides the interface expected by the API routes

export interface EmailProcessingConfig {
  mailgun: {
    apiKey: string
    domain: string
    baseUrl?: string
    webhookSigningKey?: string
  }
  threading: {
    subjectNormalization: boolean
    referencesTracking: boolean
    participantGrouping: boolean
    timeWindowHours: number
  }
}

export interface EmailRequest {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  text?: string
  html?: string
  inReplyTo?: string
  references?: string[]
}

export interface EmailMessage {
  messageId: string
  inReplyTo?: string
  references: string[]
  from: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  bodyText?: string
  bodyHtml?: string
  receivedAt: Date
  attachments: any[]
}

export interface MailgunResponse {
  id: string
  message: string
}

export class EmailProcessing {
  private config: EmailProcessingConfig

  constructor(config: EmailProcessingConfig) {
    this.config = config
  }

  /**
   * Send email via Mailgun
   */
  async sendEmail(request: EmailRequest): Promise<MailgunResponse> {
    // Mock implementation - in production this would call Mailgun API
    console.log('Mock: Sending email via Mailgun', {
      from: request.from,
      to: request.to,
      subject: request.subject
    })

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock successful response
    return {
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: 'Queued. Thank you.'
    }
  }

  /**
   * Process inbound webhook from Mailgun
   */
  async processInboundWebhook(webhookData: any): Promise<EmailMessage> {
    console.log('Mock: Processing inbound webhook', Object.keys(webhookData))

    // Extract email data from webhook
    const messageId = webhookData['Message-Id'] || `<${Date.now()}@${this.config.mailgun.domain}>`
    const from = webhookData.sender || webhookData.from || 'unknown@example.com'
    const to = this.parseAddresses(webhookData.recipient || webhookData.to || '')
    const cc = this.parseAddresses(webhookData.Cc || '')
    const subject = webhookData.subject || '(No Subject)'
    const bodyText = webhookData['body-plain'] || webhookData.text || ''
    const bodyHtml = webhookData['body-html'] || webhookData.html || ''
    const inReplyTo = webhookData['In-Reply-To']
    const references = this.parseReferences(webhookData.References || '')

    return {
      messageId,
      inReplyTo,
      references,
      from,
      to,
      cc,
      bcc: [],
      subject,
      bodyText,
      bodyHtml,
      receivedAt: new Date(),
      attachments: []
    }
  }

  /**
   * Validate email address format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Parse comma-separated email addresses
   */
  private parseAddresses(addresses: string): string[] {
    if (!addresses) return []
    
    return addresses
      .split(',')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0 && this.validateEmail(addr))
  }

  /**
   * Parse References header into array
   */
  private parseReferences(references: string): string[] {
    if (!references) return []
    
    // References header contains space-separated message IDs
    return references
      .split(/\s+/)
      .map(ref => ref.trim())
      .filter(ref => ref.length > 0)
  }
}

// Export for backward compatibility
export default EmailProcessing
