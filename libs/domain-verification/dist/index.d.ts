export * from './types';
export * from './dns';
export * from './validator';
export * from './verifier';
import { DomainVerifier } from './verifier';
import { DomainValidator } from './validator';
import { DNSService } from './dns';
import { DomainVerificationConfig } from './types';
/**
 * Main DomainVerification class that combines all functionality
 */
export declare class DomainVerification {
    private verifier;
    private validator;
    private dnsService;
    private config;
    constructor(config?: DomainVerificationConfig);
    /**
     * Get verifier instance
     */
    get verify(): DomainVerifier;
    /**
     * Get validator instance
     */
    get validate(): DomainValidator;
    /**
     * Get DNS service instance
     */
    get dns(): DNSService;
    /**
     * Verify domain ownership
     */
    verifyDomain(domain: string, token: string): Promise<{
        domain: string;
        token: string;
        recordName: string;
        verified: boolean;
        timestamp: Date;
        dnsRecords: string[];
        recordValue?: string | undefined;
        error?: string | undefined;
        verificationTime?: number | undefined;
    }>;
    /**
     * Validate domain format
     */
    validateDomain(domain: string): {
        domain: string;
        valid: boolean;
        errors: string[];
        warnings: string[];
        suggestions: string[];
    };
    /**
     * Generate verification token
     */
    generateToken(options?: any): string;
    /**
     * Get verification instructions
     */
    getInstructions(domain: string, token: string): {
        recordName: string;
        recordType: string;
        recordValue: string;
        instructions: string[];
    };
    /**
     * Perform domain health check
     */
    healthCheck(domain: string): Promise<import("./types").DomainHealthCheck>;
    /**
     * Query DNS records
     */
    queryDNS(domain: string, recordType: any): Promise<{
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
}
/**
 * Create a new DomainVerification instance
 */
export declare function createDomainVerifier(config?: DomainVerificationConfig): DomainVerification;
/**
 * Default export
 */
export default DomainVerification;
//# sourceMappingURL=index.d.ts.map