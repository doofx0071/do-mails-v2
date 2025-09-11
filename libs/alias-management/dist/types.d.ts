import { z } from 'zod';
export declare const AliasNameSchema: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
export declare const DomainNameSchema: z.ZodString;
export declare const FullEmailAddressSchema: z.ZodString;
export declare const EmailAliasSchema: z.ZodObject<{
    id: z.ZodString;
    domainId: z.ZodString;
    aliasName: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    fullAddress: z.ZodString;
    isEnabled: z.ZodDefault<z.ZodBoolean>;
    lastEmailReceivedAt: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    domainId: string;
    aliasName: string;
    fullAddress: string;
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastEmailReceivedAt?: Date | undefined;
}, {
    id: string;
    domainId: string;
    aliasName: string;
    fullAddress: string;
    createdAt: Date;
    updatedAt: Date;
    isEnabled?: boolean | undefined;
    lastEmailReceivedAt?: Date | undefined;
}>;
export declare const CreateAliasRequestSchema: z.ZodObject<{
    domainId: z.ZodString;
    aliasName: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    isEnabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    domainId: string;
    aliasName: string;
    isEnabled: boolean;
}, {
    domainId: string;
    aliasName: string;
    isEnabled?: boolean | undefined;
}>;
export declare const UpdateAliasRequestSchema: z.ZodEffects<z.ZodObject<{
    isEnabled: z.ZodOptional<z.ZodBoolean>;
    aliasName: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
}, "strip", z.ZodTypeAny, {
    aliasName?: string | undefined;
    isEnabled?: boolean | undefined;
}, {
    aliasName?: string | undefined;
    isEnabled?: boolean | undefined;
}>, {
    aliasName?: string | undefined;
    isEnabled?: boolean | undefined;
}, {
    aliasName?: string | undefined;
    isEnabled?: boolean | undefined;
}>;
export declare const AliasGenerationOptionsSchema: z.ZodDefault<z.ZodObject<{
    length: z.ZodOptional<z.ZodNumber>;
    includeNumbers: z.ZodOptional<z.ZodBoolean>;
    includeSpecialChars: z.ZodOptional<z.ZodBoolean>;
    prefix: z.ZodOptional<z.ZodString>;
    suffix: z.ZodOptional<z.ZodString>;
    excludeWords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    pattern: z.ZodOptional<z.ZodEnum<["random", "readable", "uuid", "timestamp"]>>;
    count: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    length?: number | undefined;
    includeNumbers?: boolean | undefined;
    includeSpecialChars?: boolean | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    excludeWords?: string[] | undefined;
    pattern?: "random" | "readable" | "uuid" | "timestamp" | undefined;
    count?: number | undefined;
}, {
    length?: number | undefined;
    includeNumbers?: boolean | undefined;
    includeSpecialChars?: boolean | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    excludeWords?: string[] | undefined;
    pattern?: "random" | "readable" | "uuid" | "timestamp" | undefined;
    count?: number | undefined;
}>>;
export declare const AliasValidationResultSchema: z.ZodObject<{
    aliasName: z.ZodString;
    valid: z.ZodBoolean;
    errors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    suggestions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    aliasName: string;
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}, {
    aliasName: string;
    valid: boolean;
    errors?: string[] | undefined;
    warnings?: string[] | undefined;
    suggestions?: string[] | undefined;
}>;
export declare const AliasAvailabilityResultSchema: z.ZodObject<{
    aliasName: z.ZodString;
    domainName: z.ZodString;
    fullAddress: z.ZodString;
    available: z.ZodBoolean;
    reason: z.ZodOptional<z.ZodString>;
    suggestions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    aliasName: string;
    fullAddress: string;
    suggestions: string[];
    domainName: string;
    available: boolean;
    reason?: string | undefined;
}, {
    aliasName: string;
    fullAddress: string;
    domainName: string;
    available: boolean;
    suggestions?: string[] | undefined;
    reason?: string | undefined;
}>;
export declare const AliasStatsSchema: z.ZodObject<{
    totalAliases: z.ZodNumber;
    enabledAliases: z.ZodNumber;
    disabledAliases: z.ZodNumber;
    aliasesWithActivity: z.ZodNumber;
    aliasesCreatedToday: z.ZodNumber;
    aliasesCreatedThisWeek: z.ZodNumber;
    aliasesCreatedThisMonth: z.ZodNumber;
    mostActiveAlias: z.ZodOptional<z.ZodString>;
    leastActiveAlias: z.ZodOptional<z.ZodString>;
    averageEmailsPerAlias: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    totalAliases: number;
    enabledAliases: number;
    disabledAliases: number;
    aliasesWithActivity: number;
    aliasesCreatedToday: number;
    aliasesCreatedThisWeek: number;
    aliasesCreatedThisMonth: number;
    mostActiveAlias?: string | undefined;
    leastActiveAlias?: string | undefined;
    averageEmailsPerAlias?: number | undefined;
}, {
    totalAliases: number;
    enabledAliases: number;
    disabledAliases: number;
    aliasesWithActivity: number;
    aliasesCreatedToday: number;
    aliasesCreatedThisWeek: number;
    aliasesCreatedThisMonth: number;
    mostActiveAlias?: string | undefined;
    leastActiveAlias?: string | undefined;
    averageEmailsPerAlias?: number | undefined;
}>;
export declare const AliasManagementConfigSchema: z.ZodDefault<z.ZodObject<{
    maxAliasesPerDomain: z.ZodOptional<z.ZodNumber>;
    maxAliasLength: z.ZodOptional<z.ZodNumber>;
    minAliasLength: z.ZodOptional<z.ZodNumber>;
    allowedCharacters: z.ZodOptional<z.ZodString>;
    reservedAliases: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    blockedPatterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    enableProfanityFilter: z.ZodOptional<z.ZodBoolean>;
    enableSimilarityCheck: z.ZodOptional<z.ZodBoolean>;
    similarityThreshold: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxAliasesPerDomain?: number | undefined;
    maxAliasLength?: number | undefined;
    minAliasLength?: number | undefined;
    allowedCharacters?: string | undefined;
    reservedAliases?: string[] | undefined;
    blockedPatterns?: string[] | undefined;
    enableProfanityFilter?: boolean | undefined;
    enableSimilarityCheck?: boolean | undefined;
    similarityThreshold?: number | undefined;
}, {
    maxAliasesPerDomain?: number | undefined;
    maxAliasLength?: number | undefined;
    minAliasLength?: number | undefined;
    allowedCharacters?: string | undefined;
    reservedAliases?: string[] | undefined;
    blockedPatterns?: string[] | undefined;
    enableProfanityFilter?: boolean | undefined;
    enableSimilarityCheck?: boolean | undefined;
    similarityThreshold?: number | undefined;
}>>;
export type AliasName = z.infer<typeof AliasNameSchema>;
export type DomainName = z.infer<typeof DomainNameSchema>;
export type FullEmailAddress = z.infer<typeof FullEmailAddressSchema>;
export type EmailAlias = z.infer<typeof EmailAliasSchema>;
export type CreateAliasRequest = z.infer<typeof CreateAliasRequestSchema>;
export type UpdateAliasRequest = z.infer<typeof UpdateAliasRequestSchema>;
export type AliasGenerationOptions = z.infer<typeof AliasGenerationOptionsSchema>;
export type AliasValidationResult = z.infer<typeof AliasValidationResultSchema>;
export type AliasAvailabilityResult = z.infer<typeof AliasAvailabilityResultSchema>;
export type AliasStats = z.infer<typeof AliasStatsSchema>;
export type AliasManagementConfig = z.infer<typeof AliasManagementConfigSchema>;
export declare class AliasManagementError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
export declare class ValidationError extends AliasManagementError {
    constructor(message: string, details?: any);
}
export declare class DuplicateAliasError extends AliasManagementError {
    constructor(message: string, details?: any);
}
export declare class AliasNotFoundError extends AliasManagementError {
    constructor(message: string, details?: any);
}
export declare class QuotaExceededError extends AliasManagementError {
    constructor(message: string, details?: any);
}
export declare enum AliasStatus {
    ENABLED = "enabled",
    DISABLED = "disabled",
    PENDING = "pending",
    SUSPENDED = "suspended"
}
export declare enum GenerationPattern {
    RANDOM = "random",
    READABLE = "readable",
    UUID = "uuid",
    TIMESTAMP = "timestamp"
}
export declare const RESERVED_ALIASES: string[];
export declare const BLOCKED_PATTERNS: string[];
export declare const PROFANITY_WORDS: string[];
export declare const CHARACTER_SETS: {
    LOWERCASE: string;
    UPPERCASE: string;
    NUMBERS: string;
    SPECIAL: string;
    READABLE: string;
};
export interface AliasUsage {
    aliasId: string;
    emailCount: number;
    lastEmailAt?: Date;
    firstEmailAt?: Date;
    senderCount: number;
    topSenders: string[];
    averageEmailsPerDay: number;
    peakUsageDate?: Date;
}
export interface AliasSearchOptions {
    query?: string;
    domainId?: string;
    isEnabled?: boolean;
    hasActivity?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
    lastActivityAfter?: Date;
    lastActivityBefore?: Date;
    sortBy?: 'name' | 'created' | 'activity' | 'emails';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}
export interface AliasSearchResult {
    aliases: EmailAlias[];
    total: number;
    hasMore: boolean;
    nextOffset?: number;
}
//# sourceMappingURL=types.d.ts.map