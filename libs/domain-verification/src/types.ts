import { z } from 'zod'

// Domain validation schemas
export const DomainNameSchema = z.string()
  .min(1, 'Domain name cannot be empty')
  .max(253, 'Domain name too long')
  .regex(
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    'Invalid domain name format'
  )

export const VerificationTokenSchema = z.string()
  .min(32, 'Verification token too short')
  .max(128, 'Verification token too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid verification token format')

// Domain verification schemas
export const DomainVerificationRequestSchema = z.object({
  domain: DomainNameSchema,
  token: VerificationTokenSchema,
  recordName: z.string().default('_domails-verify'),
  timeout: z.number().int().min(1000).max(30000).default(10000), // 1-30 seconds
  retries: z.number().int().min(0).max(5).default(3)
})

export const DomainVerificationResultSchema = z.object({
  domain: DomainNameSchema,
  verified: z.boolean(),
  token: VerificationTokenSchema,
  recordName: z.string(),
  recordValue: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.date(),
  dnsRecords: z.array(z.string()).default([]),
  verificationTime: z.number().optional() // milliseconds
})

// DNS record schemas
export const DNSRecordSchema = z.object({
  name: z.string(),
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR']),
  value: z.string(),
  ttl: z.number().int().optional()
})

export const DNSQueryResultSchema = z.object({
  domain: DomainNameSchema,
  recordType: z.string(),
  records: z.array(DNSRecordSchema),
  queryTime: z.number(), // milliseconds
  timestamp: z.date()
})

// Configuration schemas
export const DomainVerificationConfigSchema = z.object({
  defaultTimeout: z.number().int().min(1000).max(30000).optional(),
  defaultRetries: z.number().int().min(0).max(5).optional(),
  recordPrefix: z.string().optional(),
  allowedDomains: z.array(DomainNameSchema).optional(),
  blockedDomains: z.array(DomainNameSchema).optional(),
  dnsServers: z.array(z.string().ip()).optional(),
  cacheTimeout: z.number().int().min(0).optional()
}).default({})

// Validation result schemas
export const DomainValidationResultSchema = z.object({
  domain: DomainNameSchema,
  valid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([])
})

// Type exports
export type DomainName = z.infer<typeof DomainNameSchema>
export type VerificationToken = z.infer<typeof VerificationTokenSchema>
export type DomainVerificationRequest = z.infer<typeof DomainVerificationRequestSchema>
export type DomainVerificationResult = z.infer<typeof DomainVerificationResultSchema>
export type DNSRecord = z.infer<typeof DNSRecordSchema>
export type DNSQueryResult = z.infer<typeof DNSQueryResultSchema>
export type DomainVerificationConfig = z.infer<typeof DomainVerificationConfigSchema>
export type DomainValidationResult = z.infer<typeof DomainValidationResultSchema>

// Error types
export class DomainVerificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'DomainVerificationError'
  }
}

export class DNSError extends DomainVerificationError {
  constructor(message: string, details?: any) {
    super(message, 'DNS_ERROR', details)
    this.name = 'DNSError'
  }
}

export class ValidationError extends DomainVerificationError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class TimeoutError extends DomainVerificationError {
  constructor(message: string, details?: any) {
    super(message, 'TIMEOUT_ERROR', details)
    this.name = 'TimeoutError'
  }
}

// Verification status enum
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

// DNS record types
export enum DNSRecordType {
  A = 'A',
  AAAA = 'AAAA',
  CNAME = 'CNAME',
  MX = 'MX',
  TXT = 'TXT',
  NS = 'NS',
  SOA = 'SOA',
  PTR = 'PTR'
}

// Common domain patterns for validation
export const RESERVED_DOMAINS = [
  'localhost',
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'invalid',
  '*.local',
  '*.localhost',
  '*.test',
  '*.example'
]

export const TLD_PATTERNS = {
  GENERIC: /\.(com|org|net|edu|gov|mil|int)$/i,
  COUNTRY: /\.(us|uk|ca|au|de|fr|jp|cn|in|br|ru)$/i,
  NEW_GTLD: /\.(app|dev|tech|online|site|store|blog|news)$/i
}

// Verification token generation options
export interface TokenGenerationOptions {
  length?: number
  includeTimestamp?: boolean
  prefix?: string
  charset?: 'alphanumeric' | 'hex' | 'base64'
}

// Domain health check result
export interface DomainHealthCheck {
  domain: string
  accessible: boolean
  responseTime?: number
  httpStatus?: number
  httpsSupported: boolean
  certificateValid?: boolean
  mxRecords: string[]
  txtRecords: string[]
  errors: string[]
  timestamp: Date
}
