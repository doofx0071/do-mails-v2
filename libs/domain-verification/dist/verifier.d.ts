import { DomainVerificationRequest, DomainVerificationResult, DomainVerificationConfig, VerificationToken, DomainHealthCheck, TokenGenerationOptions } from './types';
export declare class DomainVerifier {
    private dnsService;
    private validator;
    private config;
    private verificationCache;
    private dnsCache;
    constructor(config?: DomainVerificationConfig);
    /**
     * Clean up expired cache entries
     */
    private cleanupCache;
    /**
     * Get cached DNS TXT records for a domain
     */
    private getCachedDNSRecords;
    /**
     * Cache DNS TXT records for a domain
     */
    private cacheDNSRecords;
    /**
     * Get cached verification result
     */
    private getCachedVerification;
    /**
     * Cache verification result
     */
    private cacheVerification;
    /**
     * Verify domain ownership using DNS TXT record with caching
     */
    verifyDomain(request: DomainVerificationRequest): Promise<DomainVerificationResult>;
    /**
     * Perform the actual DNS verification
     */
    private performVerification;
    /**
     * Generate a verification token
     */
    generateVerificationToken(options?: TokenGenerationOptions): VerificationToken;
    /**
     * Get verification instructions for a domain
     */
    getVerificationInstructions(domain: string, token: string): {
        recordName: string;
        recordType: string;
        recordValue: string;
        instructions: string[];
    };
    /**
     * Perform domain health check
     */
    performHealthCheck(domain: string): Promise<DomainHealthCheck>;
    /**
     * Test HTTP/HTTPS access to domain
     */
    private testHttpAccess;
    /**
     * Check if cached result is still valid
     */
    private isCacheValid;
    /**
     * Clear verification cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        entries: string[];
    };
}
//# sourceMappingURL=verifier.d.ts.map