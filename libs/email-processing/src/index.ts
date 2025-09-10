// Main exports for email-processing library
export * from './types'
export * from './mailgun'
export * from './threading'
export * from './processor'

import { MailgunService } from './mailgun'
import { EmailThreadingService } from './threading'
import { EmailProcessor } from './processor'
import { EmailProcessingConfig } from './types'

/**
 * Main EmailProcessing class that combines all functionality
 */
export class EmailProcessing {
  private mailgunService: MailgunService
  private threadingService: EmailThreadingService
  private processor: EmailProcessor

  constructor(config: EmailProcessingConfig) {
    this.mailgunService = new MailgunService(config.mailgun)
    this.threadingService = new EmailThreadingService(config.threading)
    this.processor = new EmailProcessor(
      this.mailgunService,
      this.threadingService,
      config
    )
  }

  /**
   * Get Mailgun service instance
   */
  get mailgun(): MailgunService {
    return this.mailgunService
  }

  /**
   * Get threading service instance
   */
  get threading(): EmailThreadingService {
    return this.threadingService
  }

  /**
   * Get processor instance
   */
  get process(): EmailProcessor {
    return this.processor
  }

  /**
   * Process inbound webhook from Mailgun
   */
  async processInboundWebhook(webhookData: any) {
    return this.processor.processInboundWebhook(webhookData)
  }

  /**
   * Send email via Mailgun
   */
  async sendEmail(request: any) {
    return this.processor.sendEmail(request)
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): boolean {
    return this.processor.validateEmail(email)
  }

  /**
   * Group messages into threads
   */
  groupIntoThreads(messages: any[]) {
    return this.threading.groupMessagesIntoThreads(messages)
  }
}

/**
 * Create a new EmailProcessing instance
 */
export function createEmailProcessor(config: EmailProcessingConfig): EmailProcessing {
  return new EmailProcessing(config)
}

/**
 * Default export
 */
export default EmailProcessing
