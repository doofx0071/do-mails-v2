// Domain types for do-Mails email system

export interface Domain {
  id: string
  domain_name: string
  user_id: string
  verification_status: 'pending' | 'verified' | 'failed'
  verification_token?: string
  verified_at?: string
  created_at: string
  updated_at: string
}


export interface EmailMessage {
  id: string
  thread_id: string
  domain_id: string
  recipient_address: string
  message_id: string
  in_reply_to?: string
  references: string[]
  from_address: string
  to_addresses: string[]
  cc_addresses: string[]
  bcc_addresses: string[]
  subject: string
  body_text?: string
  body_html?: string
  is_read: boolean
  is_sent: boolean
  mailgun_message_id?: string
  received_at: string
  created_at: string
  updated_at: string
}

export interface EmailThread {
  id: string
  domain_id: string
  recipient_address: string
  subject: string
  participants: string[]
  message_count: number
  last_message_at: string
  is_archived: boolean
  labels: string[]
  created_at: string
  updated_at: string
}



export interface EmailAttachment {
  id: string
  message_id: string
  filename: string
  content_type: string
  size: number
  storage_path: string
  storage_bucket: string
  created_at: string
}

// Status and event unions
export type DomainVerificationStatus = 'pending' | 'verified' | 'failed'
export type EmailDeliveryEvent = 'delivered' | 'opened' | 'clicked' | 'complained' | 'unsubscribed' | 'bounced'
export type EmailStatus = 'sent' | 'delivered' | 'failed' | 'bounced'

// API response types
export interface ApiResponse<T> {
  success?: boolean
  error?: string
  message?: string
  data?: T
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// Form types
export interface CreateDomainRequest {
  domain_name: string
}




export interface SendEmailRequest {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body_text?: string
  body_html?: string
  reply_to?: string
  in_reply_to?: string
  references?: string[]
}