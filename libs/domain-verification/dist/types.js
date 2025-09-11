"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TLD_PATTERNS = exports.RESERVED_DOMAINS = exports.DNSRecordType = exports.VerificationStatus = exports.TimeoutError = exports.ValidationError = exports.DNSError = exports.DomainVerificationError = exports.DomainValidationResultSchema = exports.DomainVerificationConfigSchema = exports.DNSQueryResultSchema = exports.DNSRecordSchema = exports.DomainVerificationResultSchema = exports.DomainVerificationRequestSchema = exports.VerificationTokenSchema = exports.DomainNameSchema = void 0;
const zod_1 = require("zod");
// Domain validation schemas
exports.DomainNameSchema = zod_1.z.string()
    .min(1, 'Domain name cannot be empty')
    .max(253, 'Domain name too long')
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, 'Invalid domain name format');
exports.VerificationTokenSchema = zod_1.z.string()
    .min(32, 'Verification token too short')
    .max(128, 'Verification token too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid verification token format');
// Domain verification schemas
exports.DomainVerificationRequestSchema = zod_1.z.object({
    domain: exports.DomainNameSchema,
    token: exports.VerificationTokenSchema,
    recordName: zod_1.z.string().default('_domails-verify'),
    timeout: zod_1.z.number().int().min(1000).max(30000).default(10000), // 1-30 seconds
    retries: zod_1.z.number().int().min(0).max(5).default(3)
});
exports.DomainVerificationResultSchema = zod_1.z.object({
    domain: exports.DomainNameSchema,
    verified: zod_1.z.boolean(),
    token: exports.VerificationTokenSchema,
    recordName: zod_1.z.string(),
    recordValue: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
    timestamp: zod_1.z.date(),
    dnsRecords: zod_1.z.array(zod_1.z.string()).default([]),
    verificationTime: zod_1.z.number().optional() // milliseconds
});
// DNS record schemas
exports.DNSRecordSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: zod_1.z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR']),
    value: zod_1.z.string(),
    ttl: zod_1.z.number().int().optional()
});
exports.DNSQueryResultSchema = zod_1.z.object({
    domain: exports.DomainNameSchema,
    recordType: zod_1.z.string(),
    records: zod_1.z.array(exports.DNSRecordSchema),
    queryTime: zod_1.z.number(), // milliseconds
    timestamp: zod_1.z.date()
});
// Configuration schemas
exports.DomainVerificationConfigSchema = zod_1.z.object({
    defaultTimeout: zod_1.z.number().int().min(1000).max(30000).optional(),
    defaultRetries: zod_1.z.number().int().min(0).max(5).optional(),
    recordPrefix: zod_1.z.string().optional(),
    allowedDomains: zod_1.z.array(exports.DomainNameSchema).optional(),
    blockedDomains: zod_1.z.array(exports.DomainNameSchema).optional(),
    dnsServers: zod_1.z.array(zod_1.z.string().ip()).optional(),
    cacheTimeout: zod_1.z.number().int().min(0).optional()
}).default({});
// Validation result schemas
exports.DomainValidationResultSchema = zod_1.z.object({
    domain: exports.DomainNameSchema,
    valid: zod_1.z.boolean(),
    errors: zod_1.z.array(zod_1.z.string()).default([]),
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
    suggestions: zod_1.z.array(zod_1.z.string()).default([])
});
// Error types
class DomainVerificationError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'DomainVerificationError';
    }
}
exports.DomainVerificationError = DomainVerificationError;
class DNSError extends DomainVerificationError {
    constructor(message, details) {
        super(message, 'DNS_ERROR', details);
        this.name = 'DNSError';
    }
}
exports.DNSError = DNSError;
class ValidationError extends DomainVerificationError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class TimeoutError extends DomainVerificationError {
    constructor(message, details) {
        super(message, 'TIMEOUT_ERROR', details);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
// Verification status enum
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "pending";
    VerificationStatus["VERIFIED"] = "verified";
    VerificationStatus["FAILED"] = "failed";
    VerificationStatus["EXPIRED"] = "expired";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
// DNS record types
var DNSRecordType;
(function (DNSRecordType) {
    DNSRecordType["A"] = "A";
    DNSRecordType["AAAA"] = "AAAA";
    DNSRecordType["CNAME"] = "CNAME";
    DNSRecordType["MX"] = "MX";
    DNSRecordType["TXT"] = "TXT";
    DNSRecordType["NS"] = "NS";
    DNSRecordType["SOA"] = "SOA";
    DNSRecordType["PTR"] = "PTR";
})(DNSRecordType || (exports.DNSRecordType = DNSRecordType = {}));
// Common domain patterns for validation
exports.RESERVED_DOMAINS = [
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
];
exports.TLD_PATTERNS = {
    GENERIC: /\.(com|org|net|edu|gov|mil|int)$/i,
    COUNTRY: /\.(us|uk|ca|au|de|fr|jp|cn|in|br|ru)$/i,
    NEW_GTLD: /\.(app|dev|tech|online|site|store|blog|news)$/i
};
//# sourceMappingURL=types.js.map