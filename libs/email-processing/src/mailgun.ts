import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import crypto from 'crypto'
import { 
  MailgunConfig, 
  SendEmailRequest, 
  SendEmailResponse, 
  MailgunInboundWebhook,
  MailgunError,
  WebhookValidationError
} from './types'

export class MailgunService {
  private mailgun: any
  private config: MailgunConfig

  constructor(config: MailgunConfig) {
    this.config = config
    const mg = new Mailgun(FormData)
    this.mailgun = mg.client({
      username: 'api',
      key: config.apiKey,
      url: config.baseUrl
    })
  }

  /**
   * Send an email via Mailgun API
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      const messageData: any = {
        from: request.from,
        to: request.to,
        subject: request.subject
      }

      if (request.cc && request.cc.length > 0) {
        messageData.cc = request.cc
      }

      if (request.bcc && request.bcc.length > 0) {
        messageData.bcc = request.bcc
      }

      if (request.text) {
        messageData.text = request.text
      }

      if (request.html) {
        messageData.html = request.html
      }

      if (request.replyTo) {
        messageData['h:Reply-To'] = request.replyTo
      }

      if (request.inReplyTo) {
        messageData['h:In-Reply-To'] = request.inReplyTo
      }

      if (request.references && request.references.length > 0) {
        messageData['h:References'] = request.references.join(' ')
      }

      // Handle attachments
      if (request.attachments && request.attachments.length > 0) {
        messageData.attachment = request.attachments.map(att => ({
          filename: att.filename,
          data: Buffer.from(att.data, 'base64'),
          contentType: att.contentType
        }))
      }

      const response = await this.mailgun.messages.create(this.config.domain, messageData)

      return {
        id: response.id,
        message: response.message,
        status: 'queued'
      }
    } catch (error: any) {
      throw new MailgunError(
        `Failed to send email: ${error.message}`,
        {
          originalError: error,
          request: request
        }
      )
    }
  }

  /**
   * Validate Mailgun webhook signature
   */
  validateWebhookSignature(
    timestamp: string,
    token: string,
    signature: string
  ): boolean {
    if (!this.config.webhookSigningKey) {
      throw new WebhookValidationError('Webhook signing key not configured')
    }

    const value = timestamp + token
    const hash = crypto
      .createHmac('sha256', this.config.webhookSigningKey)
      .update(value)
      .digest('hex')

    return hash === signature
  }

  /**
   * Parse inbound email webhook from Mailgun
   */
  parseInboundWebhook(webhookData: any): MailgunInboundWebhook {
    try {
      // Validate webhook signature first
      if (webhookData.signature) {
        const isValid = this.validateWebhookSignature(
          webhookData.signature.timestamp,
          webhookData.signature.token,
          webhookData.signature.signature
        )

        if (!isValid) {
          throw new WebhookValidationError('Invalid webhook signature')
        }
      }

      // Parse and validate webhook data
      const parsed = {
        signature: webhookData.signature,
        'body-plain': webhookData['body-plain'],
        'body-html': webhookData['body-html'],
        'stripped-text': webhookData['stripped-text'],
        'stripped-html': webhookData['stripped-html'],
        subject: webhookData.subject,
        from: webhookData.from,
        to: webhookData.to,
        cc: webhookData.cc,
        bcc: webhookData.bcc,
        'Message-Id': webhookData['Message-Id'],
        'In-Reply-To': webhookData['In-Reply-To'],
        References: webhookData.References,
        'attachment-count': webhookData['attachment-count'],
        timestamp: webhookData.timestamp,
        token: webhookData.token,
        recipient: webhookData.recipient
      }

      return parsed as MailgunInboundWebhook
    } catch (error: any) {
      throw new WebhookValidationError(
        `Failed to parse inbound webhook: ${error.message}`,
        { originalError: error, webhookData }
      )
    }
  }

  /**
   * Get email delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<any> {
    try {
      const events = await this.mailgun.events.get(this.config.domain, {
        'message-id': messageId
      })
      return events
    } catch (error: any) {
      throw new MailgunError(
        `Failed to get delivery status: ${error.message}`,
        { messageId, originalError: error }
      )
    }
  }

  /**
   * Get domain statistics
   */
  async getDomainStats(days: number = 30): Promise<any> {
    try {
      const stats = await this.mailgun.stats.getDomain(this.config.domain, {
        duration: `${days}d`
      })
      return stats
    } catch (error: any) {
      throw new MailgunError(
        `Failed to get domain stats: ${error.message}`,
        { domain: this.config.domain, originalError: error }
      )
    }
  }

  /**
   * Validate domain configuration
   */
  async validateDomainConfig(): Promise<boolean> {
    try {
      const domain = await this.mailgun.domains.get(this.config.domain)
      return domain.state === 'active'
    } catch (error: any) {
      throw new MailgunError(
        `Failed to validate domain config: ${error.message}`,
        { domain: this.config.domain, originalError: error }
      )
    }
  }
}
