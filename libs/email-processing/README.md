# @do-mails/email-processing

Email processing library with Mailgun integration for the do-Mails system.

## Features

- **Mailgun Integration**: Send and receive emails via Mailgun API
- **Webhook Processing**: Parse inbound email webhooks from Mailgun
- **Email Threading**: Intelligent conversation grouping
- **Validation**: Email address and message validation
- **CLI Interface**: Command-line tools for email operations
- **TypeScript**: Full type safety and IntelliSense support

## Installation

```bash
npm install @do-mails/email-processing
```

## Usage

### Library Usage

```typescript
import { EmailProcessing } from '@do-mails/email-processing'

const processor = new EmailProcessing({
  mailgun: {
    apiKey: 'your-mailgun-api-key',
    domain: 'your-domain.com',
    webhookSigningKey: 'your-webhook-key'
  },
  threading: {
    subjectNormalization: true,
    referencesTracking: true,
    participantGrouping: true,
    timeWindowHours: 24
  }
})

// Send email
const response = await processor.sendEmail({
  from: 'sender@example.com',
  to: ['recipient@example.com'],
  subject: 'Hello World',
  text: 'Hello from do-Mails!',
  html: '<p>Hello from do-Mails!</p>'
})

// Process inbound webhook
const message = await processor.processInboundWebhook(webhookData)

// Group messages into threads
const threads = processor.groupIntoThreads(messages)
```

### CLI Usage

```bash
# Send email
email-processing send-email \
  --api-key your-key \
  --domain your-domain.com \
  --from sender@example.com \
  --to recipient@example.com \
  --subject "Test Email" \
  --text "Hello World"

# Parse webhook
email-processing parse-webhook --file webhook.json

# Validate email
email-processing validate-email user@example.com

# Process threads
email-processing process-thread --file messages.json
```

## Configuration

### Environment Variables

- `MAILGUN_API_KEY`: Your Mailgun API key
- `MAILGUN_DOMAIN`: Your Mailgun domain
- `MAILGUN_WEBHOOK_KEY`: Your Mailgun webhook signing key

### Configuration File

```json
{
  "mailgun": {
    "apiKey": "your-api-key",
    "domain": "your-domain.com",
    "baseUrl": "https://api.mailgun.net",
    "webhookSigningKey": "your-webhook-key"
  },
  "threading": {
    "subjectNormalization": true,
    "referencesTracking": true,
    "participantGrouping": true,
    "timeWindowHours": 24
  },
  "maxAttachmentSize": 26214400,
  "allowedAttachmentTypes": [
    "image/jpeg",
    "image/png",
    "application/pdf"
  ]
}
```

## API Reference

### EmailProcessing

Main class that provides all email processing functionality.

#### Methods

- `sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>`
- `processInboundWebhook(webhookData: any): Promise<EmailMessage>`
- `validateEmail(email: string): boolean`
- `groupIntoThreads(messages: EmailMessage[]): EmailThread[]`

### MailgunService

Direct interface to Mailgun API.

#### Methods

- `sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>`
- `parseInboundWebhook(webhookData: any): MailgunInboundWebhook`
- `validateWebhookSignature(timestamp: string, token: string, signature: string): boolean`
- `getDeliveryStatus(messageId: string): Promise<any>`

### EmailThreadingService

Email conversation threading and grouping.

#### Methods

- `groupMessagesIntoThreads(messages: EmailMessage[]): EmailThread[]`
- `addMessageToThread(thread: EmailThread, message: EmailMessage): EmailThread`
- `findThreadForMessage(threads: EmailThread[], message: EmailMessage): EmailThread | null`

## Types

### EmailMessage

```typescript
interface EmailMessage {
  id: string
  messageId: string
  inReplyTo?: string
  references: string[]
  from: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  bodyText?: string
  bodyHtml?: string
  receivedAt: Date
  attachments: EmailAttachment[]
}
```

### EmailThread

```typescript
interface EmailThread {
  id: string
  subject: string
  participants: string[]
  messageCount: number
  lastMessageAt: Date
  messages: EmailMessage[]
}
```

### SendEmailRequest

```typescript
interface SendEmailRequest {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  text?: string
  html?: string
  attachments?: EmailAttachment[]
  replyTo?: string
  inReplyTo?: string
  references?: string[]
}
```

## Error Handling

The library provides specific error types:

- `EmailProcessingError`: Base error class
- `MailgunError`: Mailgun API related errors
- `WebhookValidationError`: Webhook validation errors
- `ThreadingError`: Email threading errors

## Testing

```bash
npm test
```

## License

MIT
