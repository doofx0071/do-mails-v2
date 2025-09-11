import { z } from 'zod'

// Email message schemas
export const EmailAddressSchema = z.string().email()

export const EmailMessageSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).default([]),
  from: EmailAddressSchema,
  to: z.array(EmailAddressSchema),
  cc: z.array(EmailAddressSchema).default([]),
  bcc: z.array(EmailAddressSchema).default([]),
  subject: z.string(),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  receivedAt: z.date(),
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    size: z.number(),
    data: z.string() // base64 encoded
  })).default([])
})

export const EmailThreadSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  participants: z.array(EmailAddressSchema),
  messageCount: z.number().int().min(0),
  lastMessageAt: z.date(),
  messages: z.array(EmailMessageSchema).default([])
})

// Mailgun webhook schemas
export const MailgunWebhookEventSchema = z.object({
  'event-data': z.object({
    event: z.enum(['delivered', 'opened', 'clicked', 'unsubscribed', 'complained', 'bounced', 'failed']),
    timestamp: z.number(),
    id: z.string(),
    message: z.object({
      headers: z.object({
        'message-id': z.string(),
        from: z.string(),
        to: z.string(),
        subject: z.string()
      })
    }),
    recipient: z.string(),
    'delivery-status': z.object({
      message: z.string().optional(),
      code: z.number().optional(),
      description: z.string().optional()
    }).optional()
  })
})

export const MailgunInboundWebhookSchema = z.object({
  signature: z.object({
    timestamp: z.string(),
    token: z.string(),
    signature: z.string()
  }),
  'body-plain': z.string().optional(),
  'body-html': z.string().optional(),
  'stripped-text': z.string().optional(),
  'stripped-html': z.string().optional(),
  subject: z.string(),
  from: z.string(),
  to: z.string(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  'Message-Id': z.string(),
  'In-Reply-To': z.string().optional(),
  References: z.string().optional(),
  'attachment-count': z.string().transform(Number).optional(),
  timestamp: z.string().transform(Number),
  token: z.string(),
  recipient: z.string()
})

// Send email schemas
export const SendEmailRequestSchema = z.object({
  from: EmailAddressSchema,
  to: z.array(EmailAddressSchema),
  cc: z.array(EmailAddressSchema).optional(),
  bcc: z.array(EmailAddressSchema).optional(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    data: z.string(), // base64 or file path
    contentType: z.string().optional()
  })).optional(),
  replyTo: EmailAddressSchema.optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional()
})

export const SendEmailResponseSchema = z.object({
  id: z.string(),
  message: z.string(),
  status: z.enum(['queued', 'sent', 'failed'])
})

// Threading schemas
export const ThreadingOptionsSchema = z.object({
  subjectNormalization: z.boolean().optional(),
  referencesTracking: z.boolean().optional(),
  participantGrouping: z.boolean().optional(),
  timeWindowHours: z.number().int().min(1).max(168).optional()
}).default({})

// Configuration schemas
export const MailgunConfigSchema = z.object({
  apiKey: z.string(),
  domain: z.string(),
  baseUrl: z.string().url().default('https://api.mailgun.net'),
  webhookSigningKey: z.string().optional()
})

export const EmailProcessingConfigSchema = z.object({
  mailgun: MailgunConfigSchema,
  threading: ThreadingOptionsSchema.optional(),
  maxAttachmentSize: z.number().int().min(1).optional(),
  allowedAttachmentTypes: z.array(z.string()).optional()
})

// Type exports
export type EmailAddress = z.infer<typeof EmailAddressSchema>
export type EmailMessage = z.infer<typeof EmailMessageSchema>
export type EmailThread = z.infer<typeof EmailThreadSchema>
export type MailgunWebhookEvent = z.infer<typeof MailgunWebhookEventSchema>
export type MailgunInboundWebhook = z.infer<typeof MailgunInboundWebhookSchema>
export type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>
export type SendEmailResponse = z.infer<typeof SendEmailResponseSchema>
export type ThreadingOptions = z.infer<typeof ThreadingOptionsSchema>
export type MailgunConfig = z.infer<typeof MailgunConfigSchema>
export type EmailProcessingConfig = z.infer<typeof EmailProcessingConfigSchema>

// Error types
export class EmailProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'EmailProcessingError'
  }
}

export class MailgunError extends EmailProcessingError {
  constructor(message: string, details?: any) {
    super(message, 'MAILGUN_ERROR', details)
    this.name = 'MailgunError'
  }
}

export class WebhookValidationError extends EmailProcessingError {
  constructor(message: string, details?: any) {
    super(message, 'WEBHOOK_VALIDATION_ERROR', details)
    this.name = 'WebhookValidationError'
  }
}

export class ThreadingError extends EmailProcessingError {
  constructor(message: string, details?: any) {
    super(message, 'THREADING_ERROR', details)
    this.name = 'ThreadingError'
  }
}
