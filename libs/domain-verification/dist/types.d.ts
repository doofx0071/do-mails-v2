import { z } from 'zod';
export declare const DomainNameSchema: z.ZodString;
export declare const VerificationTokenSchema: z.ZodString;
export declare const DomainVerificationRequestSchema: z.ZodObject<{
    domain: z.ZodString;
    token: z.ZodString;
    recordName: z.ZodDefault<z.ZodString>;
    timeout: z.ZodDefault<z.ZodNumber>;
    retries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    domain: string;
    token: string;
    recordName: string;
    timeout: number;
    retries: number;
}, {
    domain: string;
    token: string;
    recordName?: string | undefined;
    timeout?: number | undefined;
    retries?: number | undefined;
}>;
export declare const DomainVerificationResultSchema: z.ZodObject<{
    domain: z.ZodString;
    verified: z.ZodBoolean;
    token: z.ZodString;
    recordName: z.ZodString;
    recordValue: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDate;
    dnsRecords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    verificationTime: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    domain: string;
    token: string;
    recordName: string;
    verified: boolean;
    timestamp: Date;
    dnsRecords: string[];
    recordValue?: string | undefined;
    error?: string | undefined;
    verificationTime?: number | undefined;
}, {
    domain: string;
    token: string;
    recordName: string;
    verified: boolean;
    timestamp: Date;
    recordValue?: string | undefined;
    error?: string | undefined;
    dnsRecords?: string[] | undefined;
    verificationTime?: number | undefined;
}>;
export declare const DNSRecordSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "PTR"]>;
    value: z.ZodString;
    ttl: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    value: string;
    type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "PTR";
    name: string;
    ttl?: number | undefined;
}, {
    value: string;
    type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "PTR";
    name: string;
    ttl?: number | undefined;
}>;
export declare const DNSQueryResultSchema: z.ZodObject<{
    domain: z.ZodString;
    recordType: z.ZodString;
    records: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodEnum<["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "PTR"]>;
        value: z.ZodString;
        ttl: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "PTR";
        name: string;
        ttl?: number | undefined;
    }, {
        value: string;
        type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "PTR";
        name: string;
        ttl?: number | undefined;
    }>, "many">;
    queryTime: z.ZodNumber;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    domain: string;
    timestamp: Date;
    recordType: string;
    records: {
        value: string;
        type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "PTR";
        name: string;
        ttl?: number | undefined;
    }[];
    queryTime: number;
}, {
    domain: string;
    timestamp: Date;
    recordType: string;
    records: {
        value: string;
        type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "PTR";
        name: string;
        ttl?: number | undefined;
    }[];
    queryTime: number;
}>;
export declare const DomainVerificationConfigSchema: z.ZodDefault<z.ZodObject<{
    defaultTimeout: z.ZodOptional<z.ZodNumber>;
    defaultRetries: z.ZodOptional<z.ZodNumber>;
    recordPrefix: z.ZodOptional<z.ZodString>;
    allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    blockedDomains: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    dnsServers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    cacheTimeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    defaultTimeout?: number | undefined;
    defaultRetries?: number | undefined;
    recordPrefix?: string | undefined;
    allowedDomains?: string[] | undefined;
    blockedDomains?: string[] | undefined;
    dnsServers?: string[] | undefined;
    cacheTimeout?: number | undefined;
}, {
    defaultTimeout?: number | undefined;
    defaultRetries?: number | undefined;
    recordPrefix?: string | undefined;
    allowedDomains?: string[] | undefined;
    blockedDomains?: string[] | undefined;
    dnsServers?: string[] | undefined;
    cacheTimeout?: number | undefined;
}>>;
export declare const DomainValidationResultSchema: z.ZodObject<{
    domain: z.ZodString;
    valid: z.ZodBoolean;
    errors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    suggestions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    domain: string;
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}, {
    domain: string;
    valid: boolean;
    errors?: string[] | undefined;
    warnings?: string[] | undefined;
    suggestions?: string[] | undefined;
}>;
export type DomainName = z.infer<typeof DomainNameSchema>;
export type VerificationToken = z.infer<typeof VerificationTokenSchema>;
export type DomainVerificationRequest = z.infer<typeof DomainVerificationRequestSchema>;
export type DomainVerificationResult = z.infer<typeof DomainVerificationResultSchema>;
export type DNSRecord = z.infer<typeof DNSRecordSchema>;
export type DNSQueryResult = z.infer<typeof DNSQueryResultSchema>;
export type DomainVerificationConfig = z.infer<typeof DomainVerificationConfigSchema>;
export type DomainValidationResult = z.infer<typeof DomainValidationResultSchema>;
export declare class DomainVerificationError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
export declare class DNSError extends DomainVerificationError {
    constructor(message: string, details?: any);
}
export declare class ValidationError extends DomainVerificationError {
    constructor(message: string, details?: any);
}
export declare class TimeoutError extends DomainVerificationError {
    constructor(message: string, details?: any);
}
export declare enum VerificationStatus {
    PENDING = "pending",
    VERIFIED = "verified",
    FAILED = "failed",
    EXPIRED = "expired"
}
export declare enum DNSRecordType {
    A = "A",
    AAAA = "AAAA",
    CNAME = "CNAME",
    MX = "MX",
    TXT = "TXT",
    NS = "NS",
    SOA = "SOA",
    PTR = "PTR"
}
export declare const RESERVED_DOMAINS: string[];
export declare const TLD_PATTERNS: {
    GENERIC: RegExp;
    COUNTRY: RegExp;
    NEW_GTLD: RegExp;
};
export interface TokenGenerationOptions {
    length?: number;
    includeTimestamp?: boolean;
    prefix?: string;
    charset?: 'alphanumeric' | 'hex' | 'base64';
}
export interface DomainHealthCheck {
    domain: string;
    accessible: boolean;
    responseTime?: number;
    httpStatus?: number;
    httpsSupported: boolean;
    certificateValid?: boolean;
    mxRecords: string[];
    txtRecords: string[];
    errors: string[];
    timestamp: Date;
}
//# sourceMappingURL=types.d.ts.map