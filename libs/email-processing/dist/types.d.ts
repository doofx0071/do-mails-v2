import { z } from 'zod';
export declare const EmailAddressSchema: z.ZodString;
export declare const EmailMessageSchema: z.ZodObject<{
    id: z.ZodString;
    messageId: z.ZodString;
    inReplyTo: z.ZodOptional<z.ZodString>;
    references: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    from: z.ZodString;
    to: z.ZodArray<z.ZodString, "many">;
    cc: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    bcc: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    subject: z.ZodString;
    bodyText: z.ZodOptional<z.ZodString>;
    bodyHtml: z.ZodOptional<z.ZodString>;
    receivedAt: z.ZodDate;
    attachments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        contentType: z.ZodString;
        size: z.ZodNumber;
        data: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        contentType: string;
        size: number;
        data: string;
    }, {
        filename: string;
        contentType: string;
        size: number;
        data: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
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
}, {
    id: string;
    messageId: string;
    from: string;
    to: string[];
    subject: string;
    receivedAt: Date;
    inReplyTo?: string | undefined;
    references?: string[] | undefined;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    bodyText?: string | undefined;
    bodyHtml?: string | undefined;
    attachments?: {
        filename: string;
        contentType: string;
        size: number;
        data: string;
    }[] | undefined;
}>;
export declare const EmailThreadSchema: z.ZodObject<{
    id: z.ZodString;
    subject: z.ZodString;
    participants: z.ZodArray<z.ZodString, "many">;
    messageCount: z.ZodNumber;
    lastMessageAt: z.ZodDate;
    messages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        messageId: z.ZodString;
        inReplyTo: z.ZodOptional<z.ZodString>;
        references: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        from: z.ZodString;
        to: z.ZodArray<z.ZodString, "many">;
        cc: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        bcc: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        subject: z.ZodString;
        bodyText: z.ZodOptional<z.ZodString>;
        bodyHtml: z.ZodOptional<z.ZodString>;
        receivedAt: z.ZodDate;
        attachments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            filename: z.ZodString;
            contentType: z.ZodString;
            size: z.ZodNumber;
            data: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            filename: string;
            contentType: string;
            size: number;
            data: string;
        }, {
            filename: string;
            contentType: string;
            size: number;
            data: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
        id: string;
        messageId: string;
        from: string;
        to: string[];
        subject: string;
        receivedAt: Date;
        inReplyTo?: string | undefined;
        references?: string[] | undefined;
        cc?: string[] | undefined;
        bcc?: string[] | undefined;
        bodyText?: string | undefined;
        bodyHtml?: string | undefined;
        attachments?: {
            filename: string;
            contentType: string;
            size: number;
            data: string;
        }[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
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
}, {
    id: string;
    subject: string;
    participants: string[];
    messageCount: number;
    lastMessageAt: Date;
    messages?: {
        id: string;
        messageId: string;
        from: string;
        to: string[];
        subject: string;
        receivedAt: Date;
        inReplyTo?: string | undefined;
        references?: string[] | undefined;
        cc?: string[] | undefined;
        bcc?: string[] | undefined;
        bodyText?: string | undefined;
        bodyHtml?: string | undefined;
        attachments?: {
            filename: string;
            contentType: string;
            size: number;
            data: string;
        }[] | undefined;
    }[] | undefined;
}>;
export declare const MailgunWebhookEventSchema: z.ZodObject<{
    'event-data': z.ZodObject<{
        event: z.ZodEnum<["delivered", "opened", "clicked", "unsubscribed", "complained", "bounced", "failed"]>;
        timestamp: z.ZodNumber;
        id: z.ZodString;
        message: z.ZodObject<{
            headers: z.ZodObject<{
                'message-id': z.ZodString;
                from: z.ZodString;
                to: z.ZodString;
                subject: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                from: string;
                to: string;
                subject: string;
                'message-id': string;
            }, {
                from: string;
                to: string;
                subject: string;
                'message-id': string;
            }>;
        }, "strip", z.ZodTypeAny, {
            headers: {
                from: string;
                to: string;
                subject: string;
                'message-id': string;
            };
        }, {
            headers: {
                from: string;
                to: string;
                subject: string;
                'message-id': string;
            };
        }>;
        recipient: z.ZodString;
        'delivery-status': z.ZodOptional<z.ZodObject<{
            message: z.ZodOptional<z.ZodString>;
            code: z.ZodOptional<z.ZodNumber>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            code?: number | undefined;
            message?: string | undefined;
            description?: string | undefined;
        }, {
            code?: number | undefined;
            message?: string | undefined;
            description?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        message: {
            headers: {
                from: string;
                to: string;
                subject: string;
                'message-id': string;
            };
        };
        event: "delivered" | "opened" | "clicked" | "unsubscribed" | "complained" | "bounced" | "failed";
        timestamp: number;
        recipient: string;
        'delivery-status'?: {
            code?: number | undefined;
            message?: string | undefined;
            description?: string | undefined;
        } | undefined;
    }, {
        id: string;
        message: {
            headers: {
                from: string;
                to: string;
                subject: string;
                'message-id': string;
            };
        };
        event: "delivered" | "opened" | "clicked" | "unsubscribed" | "complained" | "bounced" | "failed";
        timestamp: number;
        recipient: string;
        'delivery-status'?: {
            code?: number | undefined;
            message?: string | undefined;
            description?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    'event-data': {
        id: string;
        message: {
            headers: {
                from: string;
                to: string;
                subject: string;
                'message-id': string;
            };
        };
        event: "delivered" | "opened" | "clicked" | "unsubscribed" | "complained" | "bounced" | "failed";
        timestamp: number;
        recipient: string;
        'delivery-status'?: {
            code?: number | undefined;
            message?: string | undefined;
            description?: string | undefined;
        } | undefined;
    };
}, {
    'event-data': {
        id: string;
        message: {
            headers: {
                from: string;
                to: string;
                subject: string;
                'message-id': string;
            };
        };
        event: "delivered" | "opened" | "clicked" | "unsubscribed" | "complained" | "bounced" | "failed";
        timestamp: number;
        recipient: string;
        'delivery-status'?: {
            code?: number | undefined;
            message?: string | undefined;
            description?: string | undefined;
        } | undefined;
    };
}>;
export declare const MailgunInboundWebhookSchema: z.ZodObject<{
    signature: z.ZodObject<{
        timestamp: z.ZodString;
        token: z.ZodString;
        signature: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        signature: string;
        token: string;
    }, {
        timestamp: string;
        signature: string;
        token: string;
    }>;
    'body-plain': z.ZodOptional<z.ZodString>;
    'body-html': z.ZodOptional<z.ZodString>;
    'stripped-text': z.ZodOptional<z.ZodString>;
    'stripped-html': z.ZodOptional<z.ZodString>;
    subject: z.ZodString;
    from: z.ZodString;
    to: z.ZodString;
    cc: z.ZodOptional<z.ZodString>;
    bcc: z.ZodOptional<z.ZodString>;
    'Message-Id': z.ZodString;
    'In-Reply-To': z.ZodOptional<z.ZodString>;
    References: z.ZodOptional<z.ZodString>;
    'attachment-count': z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>;
    timestamp: z.ZodEffects<z.ZodString, number, string>;
    token: z.ZodString;
    recipient: z.ZodString;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
    subject: string;
    timestamp: number;
    recipient: string;
    signature: {
        timestamp: string;
        signature: string;
        token: string;
    };
    token: string;
    'Message-Id': string;
    cc?: string | undefined;
    bcc?: string | undefined;
    'body-plain'?: string | undefined;
    'body-html'?: string | undefined;
    'stripped-text'?: string | undefined;
    'stripped-html'?: string | undefined;
    'In-Reply-To'?: string | undefined;
    References?: string | undefined;
    'attachment-count'?: number | undefined;
}, {
    from: string;
    to: string;
    subject: string;
    timestamp: string;
    recipient: string;
    signature: {
        timestamp: string;
        signature: string;
        token: string;
    };
    token: string;
    'Message-Id': string;
    cc?: string | undefined;
    bcc?: string | undefined;
    'body-plain'?: string | undefined;
    'body-html'?: string | undefined;
    'stripped-text'?: string | undefined;
    'stripped-html'?: string | undefined;
    'In-Reply-To'?: string | undefined;
    References?: string | undefined;
    'attachment-count'?: string | undefined;
}>;
export declare const SendEmailRequestSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodArray<z.ZodString, "many">;
    cc: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    subject: z.ZodString;
    text: z.ZodOptional<z.ZodString>;
    html: z.ZodOptional<z.ZodString>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        data: z.ZodString;
        contentType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        data: string;
        contentType?: string | undefined;
    }, {
        filename: string;
        data: string;
        contentType?: string | undefined;
    }>, "many">>;
    replyTo: z.ZodOptional<z.ZodString>;
    inReplyTo: z.ZodOptional<z.ZodString>;
    references: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string[];
    subject: string;
    inReplyTo?: string | undefined;
    references?: string[] | undefined;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    attachments?: {
        filename: string;
        data: string;
        contentType?: string | undefined;
    }[] | undefined;
    text?: string | undefined;
    html?: string | undefined;
    replyTo?: string | undefined;
}, {
    from: string;
    to: string[];
    subject: string;
    inReplyTo?: string | undefined;
    references?: string[] | undefined;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    attachments?: {
        filename: string;
        data: string;
        contentType?: string | undefined;
    }[] | undefined;
    text?: string | undefined;
    html?: string | undefined;
    replyTo?: string | undefined;
}>;
export declare const SendEmailResponseSchema: z.ZodObject<{
    id: z.ZodString;
    message: z.ZodString;
    status: z.ZodEnum<["queued", "sent", "failed"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    message: string;
    status: "failed" | "queued" | "sent";
}, {
    id: string;
    message: string;
    status: "failed" | "queued" | "sent";
}>;
export declare const ThreadingOptionsSchema: z.ZodDefault<z.ZodObject<{
    subjectNormalization: z.ZodOptional<z.ZodBoolean>;
    referencesTracking: z.ZodOptional<z.ZodBoolean>;
    participantGrouping: z.ZodOptional<z.ZodBoolean>;
    timeWindowHours: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    subjectNormalization?: boolean | undefined;
    referencesTracking?: boolean | undefined;
    participantGrouping?: boolean | undefined;
    timeWindowHours?: number | undefined;
}, {
    subjectNormalization?: boolean | undefined;
    referencesTracking?: boolean | undefined;
    participantGrouping?: boolean | undefined;
    timeWindowHours?: number | undefined;
}>>;
export declare const MailgunConfigSchema: z.ZodObject<{
    apiKey: z.ZodString;
    domain: z.ZodString;
    baseUrl: z.ZodDefault<z.ZodString>;
    webhookSigningKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    apiKey: string;
    domain: string;
    baseUrl: string;
    webhookSigningKey?: string | undefined;
}, {
    apiKey: string;
    domain: string;
    baseUrl?: string | undefined;
    webhookSigningKey?: string | undefined;
}>;
export declare const EmailProcessingConfigSchema: z.ZodObject<{
    mailgun: z.ZodObject<{
        apiKey: z.ZodString;
        domain: z.ZodString;
        baseUrl: z.ZodDefault<z.ZodString>;
        webhookSigningKey: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        apiKey: string;
        domain: string;
        baseUrl: string;
        webhookSigningKey?: string | undefined;
    }, {
        apiKey: string;
        domain: string;
        baseUrl?: string | undefined;
        webhookSigningKey?: string | undefined;
    }>;
    threading: z.ZodOptional<z.ZodDefault<z.ZodObject<{
        subjectNormalization: z.ZodOptional<z.ZodBoolean>;
        referencesTracking: z.ZodOptional<z.ZodBoolean>;
        participantGrouping: z.ZodOptional<z.ZodBoolean>;
        timeWindowHours: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        subjectNormalization?: boolean | undefined;
        referencesTracking?: boolean | undefined;
        participantGrouping?: boolean | undefined;
        timeWindowHours?: number | undefined;
    }, {
        subjectNormalization?: boolean | undefined;
        referencesTracking?: boolean | undefined;
        participantGrouping?: boolean | undefined;
        timeWindowHours?: number | undefined;
    }>>>;
    maxAttachmentSize: z.ZodOptional<z.ZodNumber>;
    allowedAttachmentTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    mailgun: {
        apiKey: string;
        domain: string;
        baseUrl: string;
        webhookSigningKey?: string | undefined;
    };
    threading?: {
        subjectNormalization?: boolean | undefined;
        referencesTracking?: boolean | undefined;
        participantGrouping?: boolean | undefined;
        timeWindowHours?: number | undefined;
    } | undefined;
    maxAttachmentSize?: number | undefined;
    allowedAttachmentTypes?: string[] | undefined;
}, {
    mailgun: {
        apiKey: string;
        domain: string;
        baseUrl?: string | undefined;
        webhookSigningKey?: string | undefined;
    };
    threading?: {
        subjectNormalization?: boolean | undefined;
        referencesTracking?: boolean | undefined;
        participantGrouping?: boolean | undefined;
        timeWindowHours?: number | undefined;
    } | undefined;
    maxAttachmentSize?: number | undefined;
    allowedAttachmentTypes?: string[] | undefined;
}>;
export type EmailAddress = z.infer<typeof EmailAddressSchema>;
export type EmailMessage = z.infer<typeof EmailMessageSchema>;
export type EmailThread = z.infer<typeof EmailThreadSchema>;
export type MailgunWebhookEvent = z.infer<typeof MailgunWebhookEventSchema>;
export type MailgunInboundWebhook = z.infer<typeof MailgunInboundWebhookSchema>;
export type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;
export type SendEmailResponse = z.infer<typeof SendEmailResponseSchema>;
export type ThreadingOptions = z.infer<typeof ThreadingOptionsSchema>;
export type MailgunConfig = z.infer<typeof MailgunConfigSchema>;
export type EmailProcessingConfig = z.infer<typeof EmailProcessingConfigSchema>;
export declare class EmailProcessingError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
export declare class MailgunError extends EmailProcessingError {
    constructor(message: string, details?: any);
}
export declare class WebhookValidationError extends EmailProcessingError {
    constructor(message: string, details?: any);
}
export declare class ThreadingError extends EmailProcessingError {
    constructor(message: string, details?: any);
}
//# sourceMappingURL=types.d.ts.map