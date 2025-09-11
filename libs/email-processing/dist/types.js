"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadingError = exports.WebhookValidationError = exports.MailgunError = exports.EmailProcessingError = exports.EmailProcessingConfigSchema = exports.MailgunConfigSchema = exports.ThreadingOptionsSchema = exports.SendEmailResponseSchema = exports.SendEmailRequestSchema = exports.MailgunInboundWebhookSchema = exports.MailgunWebhookEventSchema = exports.EmailThreadSchema = exports.EmailMessageSchema = exports.EmailAddressSchema = void 0;
const zod_1 = require("zod");
// Email message schemas
exports.EmailAddressSchema = zod_1.z.string().email();
exports.EmailMessageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    messageId: zod_1.z.string(),
    inReplyTo: zod_1.z.string().optional(),
    references: zod_1.z.array(zod_1.z.string()).default([]),
    from: exports.EmailAddressSchema,
    to: zod_1.z.array(exports.EmailAddressSchema),
    cc: zod_1.z.array(exports.EmailAddressSchema).default([]),
    bcc: zod_1.z.array(exports.EmailAddressSchema).default([]),
    subject: zod_1.z.string(),
    bodyText: zod_1.z.string().optional(),
    bodyHtml: zod_1.z.string().optional(),
    receivedAt: zod_1.z.date(),
    attachments: zod_1.z.array(zod_1.z.object({
        filename: zod_1.z.string(),
        contentType: zod_1.z.string(),
        size: zod_1.z.number(),
        data: zod_1.z.string() // base64 encoded
    })).default([])
});
exports.EmailThreadSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    subject: zod_1.z.string(),
    participants: zod_1.z.array(exports.EmailAddressSchema),
    messageCount: zod_1.z.number().int().min(0),
    lastMessageAt: zod_1.z.date(),
    messages: zod_1.z.array(exports.EmailMessageSchema).default([])
});
// Mailgun webhook schemas
exports.MailgunWebhookEventSchema = zod_1.z.object({
    'event-data': zod_1.z.object({
        event: zod_1.z.enum(['delivered', 'opened', 'clicked', 'unsubscribed', 'complained', 'bounced', 'failed']),
        timestamp: zod_1.z.number(),
        id: zod_1.z.string(),
        message: zod_1.z.object({
            headers: zod_1.z.object({
                'message-id': zod_1.z.string(),
                from: zod_1.z.string(),
                to: zod_1.z.string(),
                subject: zod_1.z.string()
            })
        }),
        recipient: zod_1.z.string(),
        'delivery-status': zod_1.z.object({
            message: zod_1.z.string().optional(),
            code: zod_1.z.number().optional(),
            description: zod_1.z.string().optional()
        }).optional()
    })
});
exports.MailgunInboundWebhookSchema = zod_1.z.object({
    signature: zod_1.z.object({
        timestamp: zod_1.z.string(),
        token: zod_1.z.string(),
        signature: zod_1.z.string()
    }),
    'body-plain': zod_1.z.string().optional(),
    'body-html': zod_1.z.string().optional(),
    'stripped-text': zod_1.z.string().optional(),
    'stripped-html': zod_1.z.string().optional(),
    subject: zod_1.z.string(),
    from: zod_1.z.string(),
    to: zod_1.z.string(),
    cc: zod_1.z.string().optional(),
    bcc: zod_1.z.string().optional(),
    'Message-Id': zod_1.z.string(),
    'In-Reply-To': zod_1.z.string().optional(),
    References: zod_1.z.string().optional(),
    'attachment-count': zod_1.z.string().transform(Number).optional(),
    timestamp: zod_1.z.string().transform(Number),
    token: zod_1.z.string(),
    recipient: zod_1.z.string()
});
// Send email schemas
exports.SendEmailRequestSchema = zod_1.z.object({
    from: exports.EmailAddressSchema,
    to: zod_1.z.array(exports.EmailAddressSchema),
    cc: zod_1.z.array(exports.EmailAddressSchema).optional(),
    bcc: zod_1.z.array(exports.EmailAddressSchema).optional(),
    subject: zod_1.z.string(),
    text: zod_1.z.string().optional(),
    html: zod_1.z.string().optional(),
    attachments: zod_1.z.array(zod_1.z.object({
        filename: zod_1.z.string(),
        data: zod_1.z.string(), // base64 or file path
        contentType: zod_1.z.string().optional()
    })).optional(),
    replyTo: exports.EmailAddressSchema.optional(),
    inReplyTo: zod_1.z.string().optional(),
    references: zod_1.z.array(zod_1.z.string()).optional()
});
exports.SendEmailResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    message: zod_1.z.string(),
    status: zod_1.z.enum(['queued', 'sent', 'failed'])
});
// Threading schemas
exports.ThreadingOptionsSchema = zod_1.z.object({
    subjectNormalization: zod_1.z.boolean().optional(),
    referencesTracking: zod_1.z.boolean().optional(),
    participantGrouping: zod_1.z.boolean().optional(),
    timeWindowHours: zod_1.z.number().int().min(1).max(168).optional()
}).default({});
// Configuration schemas
exports.MailgunConfigSchema = zod_1.z.object({
    apiKey: zod_1.z.string(),
    domain: zod_1.z.string(),
    baseUrl: zod_1.z.string().url().default('https://api.mailgun.net'),
    webhookSigningKey: zod_1.z.string().optional()
});
exports.EmailProcessingConfigSchema = zod_1.z.object({
    mailgun: exports.MailgunConfigSchema,
    threading: exports.ThreadingOptionsSchema.optional(),
    maxAttachmentSize: zod_1.z.number().int().min(1).optional(),
    allowedAttachmentTypes: zod_1.z.array(zod_1.z.string()).optional()
});
// Error types
class EmailProcessingError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'EmailProcessingError';
    }
}
exports.EmailProcessingError = EmailProcessingError;
class MailgunError extends EmailProcessingError {
    constructor(message, details) {
        super(message, 'MAILGUN_ERROR', details);
        this.name = 'MailgunError';
    }
}
exports.MailgunError = MailgunError;
class WebhookValidationError extends EmailProcessingError {
    constructor(message, details) {
        super(message, 'WEBHOOK_VALIDATION_ERROR', details);
        this.name = 'WebhookValidationError';
    }
}
exports.WebhookValidationError = WebhookValidationError;
class ThreadingError extends EmailProcessingError {
    constructor(message, details) {
        super(message, 'THREADING_ERROR', details);
        this.name = 'ThreadingError';
    }
}
exports.ThreadingError = ThreadingError;
//# sourceMappingURL=types.js.map