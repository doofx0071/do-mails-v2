import { EmailMessage, SendEmailRequest, SendEmailResponse, EmailProcessingConfig } from './types';
import { MailgunService } from './mailgun';
import { EmailThreadingService } from './threading';
export declare class EmailProcessor {
    private mailgunService;
    private threadingService;
    private config;
    constructor(mailgunService: MailgunService, threadingService: EmailThreadingService, config: EmailProcessingConfig);
    /**
     * Process inbound email webhook from Mailgun
     */
    processInboundWebhook(webhookData: any): Promise<EmailMessage>;
    /**
     * Send email via Mailgun
     */
    sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>;
    /**
     * Validate email address format
     */
    validateEmail(email: string): boolean;
    /**
     * Convert Mailgun webhook to EmailMessage
     */
    private webhookToEmailMessage;
    /**
     * Parse comma-separated email addresses
     */
    private parseEmailAddresses;
    /**
     * Validate EmailMessage object
     */
    private validateEmailMessage;
    /**
     * Validate SendEmailRequest
     */
    private validateSendEmailRequest;
    /**
     * Generate UUID
     */
    private generateUUID;
    /**
     * Extract plain text from HTML
     */
    extractTextFromHtml(html: string): string;
    /**
     * Generate email preview text
     */
    generatePreview(message: EmailMessage, maxLength?: number): string;
}
//# sourceMappingURL=processor.d.ts.map