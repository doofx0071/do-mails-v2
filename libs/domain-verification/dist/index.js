"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainVerification = void 0;
exports.createDomainVerifier = createDomainVerifier;
// Main exports for domain-verification library
__exportStar(require("./types"), exports);
__exportStar(require("./dns"), exports);
__exportStar(require("./validator"), exports);
__exportStar(require("./verifier"), exports);
const verifier_1 = require("./verifier");
const validator_1 = require("./validator");
const dns_1 = require("./dns");
/**
 * Main DomainVerification class that combines all functionality
 */
class DomainVerification {
    constructor(config = {}) {
        this.config = {
            defaultTimeout: config.defaultTimeout ?? 10000,
            defaultRetries: config.defaultRetries ?? 3,
            recordPrefix: config.recordPrefix ?? '_domails-verify',
            allowedDomains: config.allowedDomains ?? undefined,
            blockedDomains: config.blockedDomains ?? [
                'localhost',
                'example.com',
                'example.org',
                'example.net',
                'test.com',
                'invalid'
            ],
            dnsServers: config.dnsServers ?? undefined,
            cacheTimeout: config.cacheTimeout ?? 300000
        };
        this.verifier = new verifier_1.DomainVerifier(this.config);
        this.validator = new validator_1.DomainValidator(this.config.allowedDomains, this.config.blockedDomains);
        this.dnsService = new dns_1.DNSService(this.config.dnsServers, this.config.defaultTimeout);
    }
    /**
     * Get verifier instance
     */
    get verify() {
        return this.verifier;
    }
    /**
     * Get validator instance
     */
    get validate() {
        return this.validator;
    }
    /**
     * Get DNS service instance
     */
    get dns() {
        return this.dnsService;
    }
    /**
     * Verify domain ownership
     */
    async verifyDomain(domain, token) {
        return this.verifier.verifyDomain({
            domain,
            token,
            recordName: '_domails-verify',
            timeout: this.config.defaultTimeout,
            retries: this.config.defaultRetries
        });
    }
    /**
     * Validate domain format
     */
    validateDomain(domain) {
        return this.validator.validateDomain(domain);
    }
    /**
     * Generate verification token
     */
    generateToken(options) {
        return this.verifier.generateVerificationToken(options);
    }
    /**
     * Get verification instructions
     */
    getInstructions(domain, token) {
        return this.verifier.getVerificationInstructions(domain, token);
    }
    /**
     * Perform domain health check
     */
    async healthCheck(domain) {
        return this.verifier.performHealthCheck(domain);
    }
    /**
     * Query DNS records
     */
    async queryDNS(domain, recordType) {
        return this.dnsService.queryRecords(domain, recordType);
    }
}
exports.DomainVerification = DomainVerification;
/**
 * Create a new DomainVerification instance
 */
function createDomainVerifier(config) {
    return new DomainVerification(config);
}
/**
 * Default export
 */
exports.default = DomainVerification;
//# sourceMappingURL=index.js.map