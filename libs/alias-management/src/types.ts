import { z } from 'zod'

// Email alias validation schemas
export const AliasNameSchema = z.string()
  .min(1, 'Alias name cannot be empty')
  .max(64, 'Alias name too long (maximum 64 characters)')
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    'Alias name can only contain letters, numbers, dots, underscores, and hyphens'
  )
  .refine(
    (name) => !name.startsWith('.') && !name.endsWith('.'),
    'Alias name cannot start or end with a dot'
  )
  .refine(
    (name) => !name.includes('..'),
    'Alias name cannot contain consecutive dots'
  )

export const DomainNameSchema = z.string()
  .min(1, 'Domain name cannot be empty')
  .max(253, 'Domain name too long')
  .regex(
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    'Invalid domain name format'
  )

export const FullEmailAddressSchema = z.string()
  .email('Invalid email address format')
  .max(254, 'Email address too long')

// Email alias schemas
export const EmailAliasSchema = z.object({
  id: z.string().uuid(),
  domainId: z.string().uuid(),
  aliasName: AliasNameSchema,
  fullAddress: FullEmailAddressSchema,
  isEnabled: z.boolean().default(true),
  lastEmailReceivedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateAliasRequestSchema = z.object({
  domainId: z.string().uuid(),
  aliasName: AliasNameSchema,
  isEnabled: z.boolean().default(true)
})

export const UpdateAliasRequestSchema = z.object({
  isEnabled: z.boolean().optional(),
  aliasName: AliasNameSchema.optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
)

// Alias generation schemas
export const AliasGenerationOptionsSchema = z.object({
  length: z.number().int().min(3).max(32).optional(),
  includeNumbers: z.boolean().optional(),
  includeSpecialChars: z.boolean().optional(),
  prefix: z.string().max(16).optional(),
  suffix: z.string().max(16).optional(),
  excludeWords: z.array(z.string()).optional(),
  pattern: z.enum(['random', 'readable', 'uuid', 'timestamp']).optional(),
  count: z.number().int().min(1).max(100).optional()
}).default({})

// Alias validation schemas
export const AliasValidationResultSchema = z.object({
  aliasName: z.string(),
  valid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([])
})

export const AliasAvailabilityResultSchema = z.object({
  aliasName: z.string(),
  domainName: z.string(),
  fullAddress: z.string(),
  available: z.boolean(),
  reason: z.string().optional(),
  suggestions: z.array(z.string()).default([])
})

// Alias statistics schemas
export const AliasStatsSchema = z.object({
  totalAliases: z.number().int().min(0),
  enabledAliases: z.number().int().min(0),
  disabledAliases: z.number().int().min(0),
  aliasesWithActivity: z.number().int().min(0),
  aliasesCreatedToday: z.number().int().min(0),
  aliasesCreatedThisWeek: z.number().int().min(0),
  aliasesCreatedThisMonth: z.number().int().min(0),
  mostActiveAlias: z.string().optional(),
  leastActiveAlias: z.string().optional(),
  averageEmailsPerAlias: z.number().min(0).optional()
})

// Configuration schemas
export const AliasManagementConfigSchema = z.object({
  maxAliasesPerDomain: z.number().int().min(1).optional(),
  maxAliasLength: z.number().int().min(1).max(64).optional(),
  minAliasLength: z.number().int().min(1).max(64).optional(),
  allowedCharacters: z.string().optional(),
  reservedAliases: z.array(z.string()).optional(),
  blockedPatterns: z.array(z.string()).optional(),
  enableProfanityFilter: z.boolean().optional(),
  enableSimilarityCheck: z.boolean().optional(),
  similarityThreshold: z.number().min(0).max(1).optional()
}).default({})

// Type exports
export type AliasName = z.infer<typeof AliasNameSchema>
export type DomainName = z.infer<typeof DomainNameSchema>
export type FullEmailAddress = z.infer<typeof FullEmailAddressSchema>
export type EmailAlias = z.infer<typeof EmailAliasSchema>
export type CreateAliasRequest = z.infer<typeof CreateAliasRequestSchema>
export type UpdateAliasRequest = z.infer<typeof UpdateAliasRequestSchema>
export type AliasGenerationOptions = z.infer<typeof AliasGenerationOptionsSchema>
export type AliasValidationResult = z.infer<typeof AliasValidationResultSchema>
export type AliasAvailabilityResult = z.infer<typeof AliasAvailabilityResultSchema>
export type AliasStats = z.infer<typeof AliasStatsSchema>
export type AliasManagementConfig = z.infer<typeof AliasManagementConfigSchema>

// Error types
export class AliasManagementError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AliasManagementError'
  }
}

export class ValidationError extends AliasManagementError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class DuplicateAliasError extends AliasManagementError {
  constructor(message: string, details?: any) {
    super(message, 'DUPLICATE_ALIAS_ERROR', details)
    this.name = 'DuplicateAliasError'
  }
}

export class AliasNotFoundError extends AliasManagementError {
  constructor(message: string, details?: any) {
    super(message, 'ALIAS_NOT_FOUND_ERROR', details)
    this.name = 'AliasNotFoundError'
  }
}

export class QuotaExceededError extends AliasManagementError {
  constructor(message: string, details?: any) {
    super(message, 'QUOTA_EXCEEDED_ERROR', details)
    this.name = 'QuotaExceededError'
  }
}

// Alias status enum
export enum AliasStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

// Alias generation patterns
export enum GenerationPattern {
  RANDOM = 'random',
  READABLE = 'readable',
  UUID = 'uuid',
  TIMESTAMP = 'timestamp'
}

// Common alias patterns for validation
export const RESERVED_ALIASES = [
  'admin', 'administrator', 'root', 'postmaster', 'webmaster',
  'hostmaster', 'abuse', 'security', 'noreply', 'no-reply',
  'support', 'help', 'info', 'contact', 'sales', 'billing',
  'marketing', 'legal', 'privacy', 'terms', 'api', 'www',
  'mail', 'email', 'smtp', 'pop', 'imap', 'ftp', 'ssh'
]

export const BLOCKED_PATTERNS = [
  'test', 'temp', 'temporary', 'delete', 'remove', 'spam',
  'fake', 'dummy', 'example', 'sample', 'demo', 'trial'
]

// Profanity filter words (basic list)
export const PROFANITY_WORDS = [
  'spam', 'scam', 'fraud', 'phishing', 'malware', 'virus'
  // Note: In production, use a comprehensive profanity filter library
]

// Character sets for alias generation
export const CHARACTER_SETS = {
  LOWERCASE: 'abcdefghijklmnopqrstuvwxyz',
  UPPERCASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  NUMBERS: '0123456789',
  SPECIAL: '._-',
  READABLE: 'abcdefghijkmnpqrstuvwxyz23456789' // Excludes confusing characters
}

// Alias usage tracking
export interface AliasUsage {
  aliasId: string
  emailCount: number
  lastEmailAt?: Date
  firstEmailAt?: Date
  senderCount: number
  topSenders: string[]
  averageEmailsPerDay: number
  peakUsageDate?: Date
}

// Alias search and filtering
export interface AliasSearchOptions {
  query?: string
  domainId?: string
  isEnabled?: boolean
  hasActivity?: boolean
  createdAfter?: Date
  createdBefore?: Date
  lastActivityAfter?: Date
  lastActivityBefore?: Date
  sortBy?: 'name' | 'created' | 'activity' | 'emails'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface AliasSearchResult {
  aliases: EmailAlias[]
  total: number
  hasMore: boolean
  nextOffset?: number
}
