"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailgunService = void 0;
const mailgun_js_1 = __importDefault(require("mailgun.js"));
const form_data_1 = __importDefault(require("form-data"));
const crypto_1 = __importDefault(require("crypto"));
const types_1 = require("./types");
class MailgunService {
    constructor(config) {
        this.config = config;
        const mg = new mailgun_js_1.default(form_data_1.default);
        this.mailgun = mg.client({
            username: 'api',
            key: config.apiKey,
            url: config.baseUrl
        });
    }
    /**
     * Send an email via Mailgun API
     */
    async sendEmail(request) {
        try {
            const messageData = {
                from: request.from,
                to: request.to,
                subject: request.subject
            };
            if (request.cc && request.cc.length > 0) {
                messageData.cc = request.cc;
            }
            if (request.bcc && request.bcc.length > 0) {
                messageData.bcc = request.bcc;
            }
            if (request.text) {
                messageData.text = request.text;
            }
            if (request.html) {
                messageData.html = request.html;
            }
            if (request.replyTo) {
                messageData['h:Reply-To'] = request.replyTo;
            }
            if (request.inReplyTo) {
                messageData['h:In-Reply-To'] = request.inReplyTo;
            }
            if (request.references && request.references.length > 0) {
                messageData['h:References'] = request.references.join(' ');
            }
            // Handle attachments
            if (request.attachments && request.attachments.length > 0) {
                messageData.attachment = request.attachments.map(att => ({
                    filename: att.filename,
                    data: Buffer.from(att.data, 'base64'),
                    contentType: att.contentType
                }));
            }
            const response = await this.mailgun.messages.create(this.config.domain, messageData);
            return {
                id: response.id,
                message: response.message,
                status: 'queued'
            };
        }
        catch (error) {
            throw new types_1.MailgunError(`Failed to send email: ${error.message}`, {
                originalError: error,
                request: request
            });
        }
    }
    /**
     * Validate Mailgun webhook signature
     */
    validateWebhookSignature(timestamp, token, signature) {
        if (!this.config.webhookSigningKey) {
            throw new types_1.WebhookValidationError('Webhook signing key not configured');
        }
        const value = timestamp + token;
        const hash = crypto_1.default
            .createHmac('sha256', this.config.webhookSigningKey)
            .update(value)
            .digest('hex');
        return hash === signature;
    }
    /**
     * Parse inbound email webhook from Mailgun
     */
    parseInboundWebhook(webhookData) {
        try {
            // Validate webhook signature first
            if (webhookData.signature) {
                const isValid = this.validateWebhookSignature(webhookData.signature.timestamp, webhookData.signature.token, webhookData.signature.signature);
                if (!isValid) {
                    throw new types_1.WebhookValidationError('Invalid webhook signature');
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
            };
            return parsed;
        }
        catch (error) {
            throw new types_1.WebhookValidationError(`Failed to parse inbound webhook: ${error.message}`, { originalError: error, webhookData });
        }
    }
    /**
     * Get email delivery status
     */
    async getDeliveryStatus(messageId) {
        try {
            const events = await this.mailgun.events.get(this.config.domain, {
                'message-id': messageId
            });
            return events;
        }
        catch (error) {
            throw new types_1.MailgunError(`Failed to get delivery status: ${error.message}`, { messageId, originalError: error });
        }
    }
    /**
     * Get domain statistics
     */
    async getDomainStats(days = 30) {
        try {
            const stats = await this.mailgun.stats.getDomain(this.config.domain, {
                duration: `${days}d`
            });
            return stats;
        }
        catch (error) {
            throw new types_1.MailgunError(`Failed to get domain stats: ${error.message}`, { domain: this.config.domain, originalError: error });
        }
    }
    /**
     * Validate domain configuration
     */
    async validateDomainConfig() {
        try {
            const domain = await this.mailgun.domains.get(this.config.domain);
            return domain.state === 'active';
        }
        catch (error) {
            throw new types_1.MailgunError(`Failed to validate domain config: ${error.message}`, { domain: this.config.domain, originalError: error });
        }
    }
}
exports.MailgunService = MailgunService;
//# sourceMappingURL=mailgun.js.map