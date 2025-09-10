import { 
  EmailMessage,
  EmailThread,
  SendEmailRequest,
  SendEmailResponse,
  MailgunInboundWebhook,
  EmailProcessingConfig,
  EmailProcessingError
} from './types'
import { MailgunService } from './mailgun'
import { EmailThreadingService } from './threading'

export class EmailProcessor {
  constructor(
    private mailgunService: MailgunService,
    private threadingService: EmailThreadingService,
    private config: EmailProcessingConfig
  ) {}

  /**
   * Process inbound email webhook from Mailgun
   */
  async processInboundWebhook(webhookData: any): Promise<EmailMessage> {
    try {
      // Parse and validate webhook
      const webhook = this.mailgunService.parseInboundWebhook(webhookData)
      
      // Convert webhook to EmailMessage format
      const message = this.webhookToEmailMessage(webhook)
      
      // Validate message
      this.validateEmailMessage(message)
      
      return message
    } catch (error: any) {
      throw new EmailProcessingError(
        `Failed to process inbound webhook: ${error.message}`,
        'WEBHOOK_PROCESSING_ERROR',
        { originalError: error, webhookData }
      )
    }
  }

  /**
   * Send email via Mailgun
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      // Validate request
      this.validateSendEmailRequest(request)
      
      // Send via Mailgun
      const response = await this.mailgunService.sendEmail(request)
      
      return response
    } catch (error: any) {
      throw new EmailProcessingError(
        `Failed to send email: ${error.message}`,
        'EMAIL_SEND_ERROR',
        { originalError: error, request }
      )
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
   * Convert Mailgun webhook to EmailMessage
   */
  private webhookToEmailMessage(webhook: MailgunInboundWebhook): EmailMessage {
    // Generate UUID for message
    const messageId = this.generateUUID()
    
    // Parse recipients
    const toAddresses = this.parseEmailAddresses(webhook.to)
    const ccAddresses = webhook.cc ? this.parseEmailAddresses(webhook.cc) : []
    const bccAddresses = webhook.bcc ? this.parseEmailAddresses(webhook.bcc) : []
    
    // Parse references
    const references = webhook.References ? 
      webhook.References.split(/\s+/).filter(ref => ref.length > 0) : []
    
    return {
      id: messageId,
      messageId: webhook['Message-Id'],
      inReplyTo: webhook['In-Reply-To'],
      references,
      from: webhook.from,
      to: toAddresses,
      cc: ccAddresses,
      bcc: bccAddresses,
      subject: webhook.subject,
      bodyText: webhook['body-plain'] || webhook['stripped-text'],
      bodyHtml: webhook['body-html'] || webhook['stripped-html'],
      receivedAt: new Date(webhook.timestamp * 1000),
      attachments: [] // TODO: Handle attachments
    }
  }

  /**
   * Parse comma-separated email addresses
   */
  private parseEmailAddresses(addressString: string): string[] {
    return addressString
      .split(',')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0 && this.validateEmail(addr))
  }

  /**
   * Validate EmailMessage object
   */
  private validateEmailMessage(message: EmailMessage): void {
    if (!message.id || !message.messageId) {
      throw new EmailProcessingError('Message missing required ID fields', 'VALIDATION_ERROR')
    }

    if (!message.from || !this.validateEmail(message.from)) {
      throw new EmailProcessingError('Message missing valid from address', 'VALIDATION_ERROR')
    }

    if (!message.to || message.to.length === 0) {
      throw new EmailProcessingError('Message missing to addresses', 'VALIDATION_ERROR')
    }

    // Validate all email addresses
    const allAddresses = [message.from, ...message.to, ...message.cc, ...message.bcc]
    for (const addr of allAddresses) {
      if (!this.validateEmail(addr)) {
        throw new EmailProcessingError(`Invalid email address: ${addr}`, 'VALIDATION_ERROR')
      }
    }

    // Check attachment size limits
    if (message.attachments) {
      const totalSize = message.attachments.reduce((sum, att) => sum + att.size, 0)
      if (totalSize > this.config.maxAttachmentSize) {
        throw new EmailProcessingError(
          `Total attachment size exceeds limit: ${totalSize} > ${this.config.maxAttachmentSize}`,
          'ATTACHMENT_SIZE_ERROR'
        )
      }
    }
  }

  /**
   * Validate SendEmailRequest
   */
  private validateSendEmailRequest(request: SendEmailRequest): void {
    if (!request.from || !this.validateEmail(request.from)) {
      throw new EmailProcessingError('Invalid from address', 'VALIDATION_ERROR')
    }

    if (!request.to || request.to.length === 0) {
      throw new EmailProcessingError('Missing to addresses', 'VALIDATION_ERROR')
    }

    // Validate all addresses
    const allAddresses = [
      request.from,
      ...request.to,
      ...(request.cc || []),
      ...(request.bcc || [])
    ]

    for (const addr of allAddresses) {
      if (!this.validateEmail(addr)) {
        throw new EmailProcessingError(`Invalid email address: ${addr}`, 'VALIDATION_ERROR')
      }
    }

    if (!request.subject || request.subject.trim().length === 0) {
      throw new EmailProcessingError('Missing email subject', 'VALIDATION_ERROR')
    }

    if (!request.text && !request.html) {
      throw new EmailProcessingError('Email must have either text or HTML content', 'VALIDATION_ERROR')
    }
  }

  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Extract plain text from HTML
   */
  extractTextFromHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Generate email preview text
   */
  generatePreview(message: EmailMessage, maxLength: number = 150): string {
    let text = message.bodyText
    
    if (!text && message.bodyHtml) {
      text = this.extractTextFromHtml(message.bodyHtml)
    }
    
    if (!text) {
      return 'No content'
    }
    
    if (text.length <= maxLength) {
      return text
    }
    
    return text.substring(0, maxLength - 3) + '...'
  }
}
