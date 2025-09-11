import { DomainValidationResult } from './types';
export declare class DomainValidator {
    private allowedDomains?;
    private blockedDomains;
    constructor(allowedDomains?: string[], blockedDomains?: string[]);
    /**
     * Validate domain name format and rules
     */
    validateDomain(domain: string): DomainValidationResult;
    /**
     * Validate basic domain format
     */
    private validateFormat;
    /**
     * Validate domain length
     */
    private validateLength;
    /**
     * Validate domain characters
     */
    private validateCharacters;
    /**
     * Validate domain labels (parts between dots)
     */
    private validateLabels;
    /**
     * Validate top-level domain
     */
    private validateTLD;
    /**
     * Validate against reserved domains
     */
    private validateReservedDomains;
    /**
     * Validate against allowed/blocked domain lists
     */
    private validateDomainLists;
    /**
     * Check if domain is likely a subdomain
     */
    isSubdomain(domain: string): boolean;
    /**
     * Extract root domain from subdomain
     */
    getRootDomain(domain: string): string;
    /**
     * Generate domain suggestions for common typos
     */
    generateSuggestions(domain: string): string[];
    /**
     * Normalize domain name
     */
    normalizeDomain(domain: string): string;
}
//# sourceMappingURL=validator.d.ts.map