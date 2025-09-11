export * from './types';
export * from './mailgun';
export * from './threading';
export * from './processor';
import { MailgunService } from './mailgun';
import { EmailThreadingService } from './threading';
import { EmailProcessor } from './processor';
import { EmailProcessingConfig } from './types';
/**
 * Main EmailProcessing class that combines all functionality
 */
export declare class EmailProcessing {
    private mailgunService;
    private threadingService;
    private processor;
    private config;
    constructor(config: EmailProcessingConfig);
    /**
     * Get Mailgun service instance
     */
    get mailgun(): MailgunService;
    /**
     * Get threading service instance
     */
    get threading(): EmailThreadingService;
    /**
     * Get processor instance
     */
    get process(): EmailProcessor;
    /**
     * Process inbound webhook from Mailgun
     */
    processInboundWebhook(webhookData: any): Promise<{
        id: string;
        messageId: string;
        references: string[];
        from: string;
        to: string[];
        cc: string[];
        bcc: string[];
        subject: string;
        receivedAt: Date;
        attachments: {
            filename: string;
            contentType: string;
            size: number;
            data: string;
        }[];
        inReplyTo?: string | undefined;
        bodyText?: string | undefined;
        bodyHtml?: string | undefined;
    }>;
    /**
     * Send email via Mailgun
     */
    sendEmail(request: any): Promise<{
        id: string;
        message: string;
        status: "failed" | "queued" | "sent";
    }>;
    /**
     * Validate email address
     */
    validateEmail(email: string): boolean;
    /**
     * Group messages into threads
     */
    groupIntoThreads(messages: any[]): {
        id: string;
        subject: string;
        participants: string[];
        messageCount: number;
        lastMessageAt: Date;
        messages: {
            id: string;
            messageId: string;
            references: string[];
            from: string;
            to: string[];
            cc: string[];
            bcc: string[];
            subject: string;
            receivedAt: Date;
            attachments: {
                filename: string;
                contentType: string;
                size: number;
                data: string;
            }[];
            inReplyTo?: string | undefined;
            bodyText?: string | undefined;
            bodyHtml?: string | undefined;
        }[];
    }[];
}
/**
 * Create a new EmailProcessing instance
 */
export declare function createEmailProcessor(config: EmailProcessingConfig): EmailProcessing;
/**
 * Default export
 */
export default EmailProcessing;
//# sourceMappingURL=index.d.ts.map