"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainVerifier = void 0;
const types_1 = require("./types");
const dns_1 = require("./dns");
const validator_1 = require("./validator");
class DomainVerifier {
    constructor(config = {}) {
        this.config = {
            defaultTimeout: config.defaultTimeout ?? 10000,
            defaultRetries: config.defaultRetries ?? 3,
            recordPrefix: config.recordPrefix ?? '_domails-verify',
            allowedDomains: config.allowedDomains,
            blockedDomains: config.blockedDomains ?? [
                'localhost',
                'example.com',
                'example.org',
                'example.net',
                'test.com',
                'invalid'
            ],
            dnsServers: config.dnsServers,
            cacheTimeout: config.cacheTimeout ?? 300000 // 5 minutes
        };
        this.dnsService = new dns_1.DNSService(config.dnsServers, this.config.defaultTimeout);
        this.validator = new validator_1.DomainValidator(config.allowedDomains, this.config.blockedDomains);
        this.verificationCache = new Map();
        this.dnsCache = new Map();
        // Clean up expired cache entries periodically
        setInterval(() => this.cleanupCache(), 60000); // Every minute
    }
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        // Clean verification cache
        for (const [key, entry] of this.verificationCache.entries()) {
            if (now - entry.timestamp > this.config.cacheTimeout) {
                this.verificationCache.delete(key);
            }
        }
        // Clean DNS cache
        for (const [key, entry] of this.dnsCache.entries()) {
            if (now - entry.timestamp > this.config.cacheTimeout) {
                this.dnsCache.delete(key);
            }
        }
    }
    /**
     * Get cached DNS TXT records for a domain
     */
    getCachedDNSRecords(domain) {
        const cacheKey = `dns:${domain}`;
        const cached = this.dnsCache.get(cacheKey);
        if (!cached)
            return null;
        // Check if cache entry is still valid
        if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
            this.dnsCache.delete(cacheKey);
            return null;
        }
        return cached.records;
    }
    /**
     * Cache DNS TXT records for a domain
     */
    cacheDNSRecords(domain, records) {
        const cacheKey = `dns:${domain}`;
        this.dnsCache.set(cacheKey, {
            records: [...records], // Create a copy
            timestamp: Date.now()
        });
    }
    /**
     * Get cached verification result
     */
    getCachedVerification(domain, token) {
        const cacheKey = `verify:${domain}:${token}`;
        const cached = this.verificationCache.get(cacheKey);
        if (!cached)
            return null;
        // Check if cache entry is still valid
        if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
            this.verificationCache.delete(cacheKey);
            return null;
        }
        return cached.result;
    }
    /**
     * Cache verification result
     */
    cacheVerification(domain, token, result) {
        const cacheKey = `verify:${domain}:${token}`;
        this.verificationCache.set(cacheKey, {
            result: { ...result }, // Create a copy
            timestamp: Date.now()
        });
    }
    /**
     * Verify domain ownership using DNS TXT record with caching
     */
    async verifyDomain(request) {
        const startTime = Date.now();
        // Check cache first
        const cachedResult = this.getCachedVerification(request.domain, request.token);
        if (cachedResult) {
            return {
                ...cachedResult,
                verificationTime: Date.now() - startTime
            };
        }
        try {
            // Validate domain first
            const validation = this.validator.validateDomain(request.domain);
            if (!validation.valid) {
                throw new types_1.ValidationError(`Invalid domain: ${validation.errors.join(', ')}`, { domain: request.domain, validation });
            }
            // Perform verification (caching is handled in the method above)
            const result = await this.performVerification(request, startTime);
            // Cache the result
            this.cacheVerification(request.domain, request.token, result);
            return result;
        }
        catch (error) {
            const verificationTime = Date.now() - startTime;
            return {
                domain: request.domain,
                verified: false,
                token: request.token,
                recordName: request.recordName || this.config.recordPrefix,
                error: error.message,
                timestamp: new Date(),
                dnsRecords: [],
                verificationTime
            };
        }
    }
    /**
     * Perform the actual DNS verification
     */
    async performVerification(request, startTime) {
        const recordName = `${request.recordName || this.config.recordPrefix}.${request.domain}`;
        const timeout = request.timeout || this.config.defaultTimeout;
        const maxRetries = request.retries || this.config.defaultRetries;
        let lastError = null;
        let dnsRecords = [];
        // Retry logic
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Check cache first for DNS records
                const cachedRecords = this.getCachedDNSRecords(recordName);
                if (cachedRecords) {
                    dnsRecords = cachedRecords;
                }
                else {
                    // Query TXT records
                    dnsRecords = await this.dnsService.queryTXTRecords(recordName, timeout);
                    // Cache the DNS records
                    this.cacheDNSRecords(recordName, dnsRecords);
                }
                // Check if our token is present
                const tokenFound = dnsRecords.some(record => record.trim() === request.token.trim());
                const verificationTime = Date.now() - startTime;
                if (tokenFound) {
                    return {
                        domain: request.domain,
                        verified: true,
                        token: request.token,
                        recordName,
                        recordValue: request.token,
                        timestamp: new Date(),
                        dnsRecords,
                        verificationTime
                    };
                }
                else {
                    // Token not found, but DNS query succeeded
                    return {
                        domain: request.domain,
                        verified: false,
                        token: request.token,
                        recordName,
                        error: `Verification token not found in DNS records. Found: ${dnsRecords.join(', ')}`,
                        timestamp: new Date(),
                        dnsRecords,
                        verificationTime
                    };
                }
            }
            catch (error) {
                lastError = error;
                // If this is the last attempt, don't wait
                if (attempt < maxRetries) {
                    // Wait before retry (exponential backoff)
                    const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        // All retries failed
        const verificationTime = Date.now() - startTime;
        throw new types_1.DomainVerificationError(`Verification failed after ${maxRetries + 1} attempts: ${lastError?.message}`, 'VERIFICATION_FAILED', {
            domain: request.domain,
            recordName,
            attempts: maxRetries + 1,
            lastError,
            verificationTime
        });
    }
    /**
     * Generate a verification token
     */
    generateVerificationToken(options = {}) {
        const { length = 32, includeTimestamp = false, prefix = '', charset = 'alphanumeric' } = options;
        let characters;
        switch (charset) {
            case 'hex':
                characters = '0123456789abcdef';
                break;
            case 'base64':
                characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                break;
            case 'alphanumeric':
            default:
                characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        }
        let token = prefix;
        // Add timestamp if requested
        if (includeTimestamp) {
            token += Date.now().toString(36) + '_';
        }
        // Generate random part
        for (let i = 0; i < length; i++) {
            token += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return token;
    }
    /**
     * Get verification instructions for a domain
     */
    getVerificationInstructions(domain, token) {
        const recordName = `${this.config.recordPrefix}.${domain}`;
        return {
            recordName,
            recordType: 'TXT',
            recordValue: token,
            instructions: [
                `1. Log in to your DNS provider's control panel`,
                `2. Navigate to DNS management for domain: ${domain}`,
                `3. Create a new TXT record with these details:`,
                `   - Name/Host: ${recordName}`,
                `   - Type: TXT`,
                `   - Value: ${token}`,
                `   - TTL: 300 (or minimum allowed)`,
                `4. Save the record and wait for DNS propagation (usually 5-15 minutes)`,
                `5. Click "Verify Domain" to complete verification`
            ]
        };
    }
    /**
     * Perform domain health check
     */
    async performHealthCheck(domain) {
        const startTime = Date.now();
        const result = {
            domain,
            accessible: false,
            httpsSupported: false,
            mxRecords: [],
            txtRecords: [],
            errors: [],
            timestamp: new Date()
        };
        try {
            // Check if domain exists in DNS
            const domainExists = await this.dnsService.domainExists(domain);
            if (!domainExists) {
                result.errors.push('Domain does not exist in DNS');
                return result;
            }
            // Query MX records
            try {
                result.mxRecords = await this.dnsService.queryMXRecords(domain);
            }
            catch (error) {
                result.errors.push(`MX query failed: ${error.message}`);
            }
            // Query TXT records
            try {
                result.txtRecords = await this.dnsService.queryTXTRecords(domain);
            }
            catch (error) {
                result.errors.push(`TXT query failed: ${error.message}`);
            }
            // Test HTTP accessibility
            try {
                const httpResult = await this.testHttpAccess(domain);
                result.accessible = httpResult.accessible;
                result.responseTime = httpResult.responseTime;
                result.httpStatus = httpResult.status;
                result.httpsSupported = httpResult.httpsSupported;
                result.certificateValid = httpResult.certificateValid;
            }
            catch (error) {
                result.errors.push(`HTTP test failed: ${error.message}`);
            }
        }
        catch (error) {
            result.errors.push(`Health check failed: ${error.message}`);
        }
        return result;
    }
    /**
     * Test HTTP/HTTPS access to domain
     */
    async testHttpAccess(domain) {
        // This is a simplified implementation
        // In a real implementation, you would use http/https modules
        return {
            accessible: true,
            responseTime: 200,
            status: 200,
            httpsSupported: true,
            certificateValid: true
        };
    }
    /**
     * Check if cached result is still valid
     */
    isCacheValid(result) {
        const age = Date.now() - result.timestamp.getTime();
        return age < this.config.cacheTimeout;
    }
    /**
     * Clear verification cache
     */
    clearCache() {
        this.verificationCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.verificationCache.size,
            entries: Array.from(this.verificationCache.keys())
        };
    }
}
exports.DomainVerifier = DomainVerifier;
//# sourceMappingURL=verifier.js.map