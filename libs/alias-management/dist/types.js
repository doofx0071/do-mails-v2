"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHARACTER_SETS = exports.PROFANITY_WORDS = exports.BLOCKED_PATTERNS = exports.RESERVED_ALIASES = exports.GenerationPattern = exports.AliasStatus = exports.QuotaExceededError = exports.AliasNotFoundError = exports.DuplicateAliasError = exports.ValidationError = exports.AliasManagementError = exports.AliasManagementConfigSchema = exports.AliasStatsSchema = exports.AliasAvailabilityResultSchema = exports.AliasValidationResultSchema = exports.AliasGenerationOptionsSchema = exports.UpdateAliasRequestSchema = exports.CreateAliasRequestSchema = exports.EmailAliasSchema = exports.FullEmailAddressSchema = exports.DomainNameSchema = exports.AliasNameSchema = void 0;
const zod_1 = require("zod");
// Email alias validation schemas
exports.AliasNameSchema = zod_1.z.string()
    .min(1, 'Alias name cannot be empty')
    .max(64, 'Alias name too long (maximum 64 characters)')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Alias name can only contain letters, numbers, dots, underscores, and hyphens')
    .refine((name) => !name.startsWith('.') && !name.endsWith('.'), 'Alias name cannot start or end with a dot')
    .refine((name) => !name.includes('..'), 'Alias name cannot contain consecutive dots');
exports.DomainNameSchema = zod_1.z.string()
    .min(1, 'Domain name cannot be empty')
    .max(253, 'Domain name too long')
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, 'Invalid domain name format');
exports.FullEmailAddressSchema = zod_1.z.string()
    .email('Invalid email address format')
    .max(254, 'Email address too long');
// Email alias schemas
exports.EmailAliasSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    domainId: zod_1.z.string().uuid(),
    aliasName: exports.AliasNameSchema,
    fullAddress: exports.FullEmailAddressSchema,
    isEnabled: zod_1.z.boolean().default(true),
    lastEmailReceivedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.CreateAliasRequestSchema = zod_1.z.object({
    domainId: zod_1.z.string().uuid(),
    aliasName: exports.AliasNameSchema,
    isEnabled: zod_1.z.boolean().default(true)
});
exports.UpdateAliasRequestSchema = zod_1.z.object({
    isEnabled: zod_1.z.boolean().optional(),
    aliasName: exports.AliasNameSchema.optional()
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided for update');
// Alias generation schemas
exports.AliasGenerationOptionsSchema = zod_1.z.object({
    length: zod_1.z.number().int().min(3).max(32).optional(),
    includeNumbers: zod_1.z.boolean().optional(),
    includeSpecialChars: zod_1.z.boolean().optional(),
    prefix: zod_1.z.string().max(16).optional(),
    suffix: zod_1.z.string().max(16).optional(),
    excludeWords: zod_1.z.array(zod_1.z.string()).optional(),
    pattern: zod_1.z.enum(['random', 'readable', 'uuid', 'timestamp']).optional(),
    count: zod_1.z.number().int().min(1).max(100).optional()
}).default({});
// Alias validation schemas
exports.AliasValidationResultSchema = zod_1.z.object({
    aliasName: zod_1.z.string(),
    valid: zod_1.z.boolean(),
    errors: zod_1.z.array(zod_1.z.string()).default([]),
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
    suggestions: zod_1.z.array(zod_1.z.string()).default([])
});
exports.AliasAvailabilityResultSchema = zod_1.z.object({
    aliasName: zod_1.z.string(),
    domainName: zod_1.z.string(),
    fullAddress: zod_1.z.string(),
    available: zod_1.z.boolean(),
    reason: zod_1.z.string().optional(),
    suggestions: zod_1.z.array(zod_1.z.string()).default([])
});
// Alias statistics schemas
exports.AliasStatsSchema = zod_1.z.object({
    totalAliases: zod_1.z.number().int().min(0),
    enabledAliases: zod_1.z.number().int().min(0),
    disabledAliases: zod_1.z.number().int().min(0),
    aliasesWithActivity: zod_1.z.number().int().min(0),
    aliasesCreatedToday: zod_1.z.number().int().min(0),
    aliasesCreatedThisWeek: zod_1.z.number().int().min(0),
    aliasesCreatedThisMonth: zod_1.z.number().int().min(0),
    mostActiveAlias: zod_1.z.string().optional(),
    leastActiveAlias: zod_1.z.string().optional(),
    averageEmailsPerAlias: zod_1.z.number().min(0).optional()
});
// Configuration schemas
exports.AliasManagementConfigSchema = zod_1.z.object({
    maxAliasesPerDomain: zod_1.z.number().int().min(1).optional(),
    maxAliasLength: zod_1.z.number().int().min(1).max(64).optional(),
    minAliasLength: zod_1.z.number().int().min(1).max(64).optional(),
    allowedCharacters: zod_1.z.string().optional(),
    reservedAliases: zod_1.z.array(zod_1.z.string()).optional(),
    blockedPatterns: zod_1.z.array(zod_1.z.string()).optional(),
    enableProfanityFilter: zod_1.z.boolean().optional(),
    enableSimilarityCheck: zod_1.z.boolean().optional(),
    similarityThreshold: zod_1.z.number().min(0).max(1).optional()
}).default({});
// Error types
class AliasManagementError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'AliasManagementError';
    }
}
exports.AliasManagementError = AliasManagementError;
class ValidationError extends AliasManagementError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class DuplicateAliasError extends AliasManagementError {
    constructor(message, details) {
        super(message, 'DUPLICATE_ALIAS_ERROR', details);
        this.name = 'DuplicateAliasError';
    }
}
exports.DuplicateAliasError = DuplicateAliasError;
class AliasNotFoundError extends AliasManagementError {
    constructor(message, details) {
        super(message, 'ALIAS_NOT_FOUND_ERROR', details);
        this.name = 'AliasNotFoundError';
    }
}
exports.AliasNotFoundError = AliasNotFoundError;
class QuotaExceededError extends AliasManagementError {
    constructor(message, details) {
        super(message, 'QUOTA_EXCEEDED_ERROR', details);
        this.name = 'QuotaExceededError';
    }
}
exports.QuotaExceededError = QuotaExceededError;
// Alias status enum
var AliasStatus;
(function (AliasStatus) {
    AliasStatus["ENABLED"] = "enabled";
    AliasStatus["DISABLED"] = "disabled";
    AliasStatus["PENDING"] = "pending";
    AliasStatus["SUSPENDED"] = "suspended";
})(AliasStatus || (exports.AliasStatus = AliasStatus = {}));
// Alias generation patterns
var GenerationPattern;
(function (GenerationPattern) {
    GenerationPattern["RANDOM"] = "random";
    GenerationPattern["READABLE"] = "readable";
    GenerationPattern["UUID"] = "uuid";
    GenerationPattern["TIMESTAMP"] = "timestamp";
})(GenerationPattern || (exports.GenerationPattern = GenerationPattern = {}));
// Common alias patterns for validation
exports.RESERVED_ALIASES = [
    'admin', 'administrator', 'root', 'postmaster', 'webmaster',
    'hostmaster', 'abuse', 'security', 'noreply', 'no-reply',
    'support', 'help', 'info', 'contact', 'sales', 'billing',
    'marketing', 'legal', 'privacy', 'terms', 'api', 'www',
    'mail', 'email', 'smtp', 'pop', 'imap', 'ftp', 'ssh'
];
exports.BLOCKED_PATTERNS = [
    'test', 'temp', 'temporary', 'delete', 'remove', 'spam',
    'fake', 'dummy', 'example', 'sample', 'demo', 'trial'
];
// Profanity filter words (basic list)
exports.PROFANITY_WORDS = [
    'spam', 'scam', 'fraud', 'phishing', 'malware', 'virus'
    // Note: In production, use a comprehensive profanity filter library
];
// Character sets for alias generation
exports.CHARACTER_SETS = {
    LOWERCASE: 'abcdefghijklmnopqrstuvwxyz',
    UPPERCASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    NUMBERS: '0123456789',
    SPECIAL: '._-',
    READABLE: 'abcdefghijkmnpqrstuvwxyz23456789' // Excludes confusing characters
};
//# sourceMappingURL=types.js.map