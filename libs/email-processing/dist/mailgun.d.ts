import { MailgunConfig, SendEmailRequest, SendEmailResponse, MailgunInboundWebhook } from './types';
export declare class MailgunService {
    private mailgun;
    private config;
    constructor(config: MailgunConfig);
    /**
     * Send an email via Mailgun API
     */
    sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>;
    /**
     * Validate Mailgun webhook signature
     */
    validateWebhookSignature(timestamp: string, token: string, signature: string): boolean;
    /**
     * Parse inbound email webhook from Mailgun
     */
    parseInboundWebhook(webhookData: any): MailgunInboundWebhook;
    /**
     * Get email delivery status
     */
    getDeliveryStatus(messageId: string): Promise<any>;
    /**
     * Get domain statistics
     */
    getDomainStats(days?: number): Promise<any>;
    /**
     * Validate domain configuration
     */
    validateDomainConfig(): Promise<boolean>;
}
//# sourceMappingURL=mailgun.d.ts.map