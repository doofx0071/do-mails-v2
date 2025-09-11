"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainValidator = void 0;
const types_1 = require("./types");
class DomainValidator {
    constructor(allowedDomains, blockedDomains) {
        this.allowedDomains = allowedDomains;
        this.blockedDomains = blockedDomains || [
            'localhost',
            'example.com',
            'example.org',
            'example.net',
            'test.com',
            'invalid'
        ];
    }
    /**
     * Validate domain name format and rules
     */
    validateDomain(domain) {
        const result = {
            domain: domain.toLowerCase(),
            valid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };
        try {
            // Basic format validation
            this.validateFormat(domain, result);
            // Length validation
            this.validateLength(domain, result);
            // Character validation
            this.validateCharacters(domain, result);
            // Label validation (parts between dots)
            this.validateLabels(domain, result);
            // TLD validation
            this.validateTLD(domain, result);
            // Reserved domain validation
            this.validateReservedDomains(domain, result);
            // Allowed/blocked domain validation
            this.validateDomainLists(domain, result);
            // Set overall validity
            result.valid = result.errors.length === 0;
        }
        catch (error) {
            result.valid = false;
            result.errors.push(`Validation error: ${error.message}`);
        }
        return result;
    }
    /**
     * Validate basic domain format
     */
    validateFormat(domain, result) {
        if (!domain || typeof domain !== 'string') {
            result.errors.push('Domain must be a non-empty string');
            return;
        }
        // Remove trailing dot if present
        const cleanDomain = domain.replace(/\.$/, '');
        // Basic regex validation
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(cleanDomain)) {
            result.errors.push('Invalid domain name format');
            // Provide specific suggestions
            if (cleanDomain.includes('_')) {
                result.suggestions.push('Remove underscores from domain name');
            }
            if (cleanDomain.includes(' ')) {
                result.suggestions.push('Remove spaces from domain name');
            }
            if (cleanDomain.startsWith('-') || cleanDomain.endsWith('-')) {
                result.suggestions.push('Domain cannot start or end with hyphen');
            }
        }
    }
    /**
     * Validate domain length
     */
    validateLength(domain, result) {
        if (domain.length > 253) {
            result.errors.push('Domain name too long (maximum 253 characters)');
        }
        if (domain.length < 1) {
            result.errors.push('Domain name cannot be empty');
        }
        if (domain.length > 200) {
            result.warnings.push('Domain name is very long and may cause issues');
        }
    }
    /**
     * Validate domain characters
     */
    validateCharacters(domain, result) {
        // Check for invalid characters
        const invalidChars = domain.match(/[^a-zA-Z0-9.-]/g);
        if (invalidChars) {
            result.errors.push(`Invalid characters found: ${[...new Set(invalidChars)].join(', ')}`);
        }
        // Check for consecutive dots
        if (domain.includes('..')) {
            result.errors.push('Domain cannot contain consecutive dots');
        }
        // Check for leading/trailing dots
        if (domain.startsWith('.')) {
            result.errors.push('Domain cannot start with a dot');
        }
        if (domain.endsWith('.') && domain.length > 1) {
            result.warnings.push('Trailing dot will be removed');
        }
    }
    /**
     * Validate domain labels (parts between dots)
     */
    validateLabels(domain, result) {
        const labels = domain.split('.');
        if (labels.length < 2) {
            result.errors.push('Domain must have at least two labels (e.g., example.com)');
        }
        for (let i = 0; i < labels.length; i++) {
            const label = labels[i];
            if (label.length === 0) {
                result.errors.push(`Empty label at position ${i + 1}`);
                continue;
            }
            if (label.length > 63) {
                result.errors.push(`Label "${label}" too long (maximum 63 characters)`);
            }
            if (label.startsWith('-') || label.endsWith('-')) {
                result.errors.push(`Label "${label}" cannot start or end with hyphen`);
            }
            // Check for numeric-only labels (except for IP addresses)
            if (/^\d+$/.test(label) && i < labels.length - 1) {
                result.warnings.push(`Numeric-only label "${label}" may cause confusion`);
            }
        }
    }
    /**
     * Validate top-level domain
     */
    validateTLD(domain, result) {
        const labels = domain.split('.');
        const tld = labels[labels.length - 1].toLowerCase();
        if (tld.length < 2) {
            result.errors.push('Top-level domain too short (minimum 2 characters)');
        }
        if (tld.length > 63) {
            result.errors.push('Top-level domain too long (maximum 63 characters)');
        }
        // Check if TLD is numeric
        if (/^\d+$/.test(tld)) {
            result.errors.push('Top-level domain cannot be numeric');
        }
        // Check for common TLD patterns
        const hasValidTLD = Object.values(types_1.TLD_PATTERNS).some(pattern => pattern.test(domain));
        if (!hasValidTLD && tld.length === 2) {
            result.warnings.push('Unusual top-level domain - please verify it exists');
        }
    }
    /**
     * Validate against reserved domains
     */
    validateReservedDomains(domain, result) {
        const lowerDomain = domain.toLowerCase();
        for (const reserved of types_1.RESERVED_DOMAINS) {
            if (reserved.startsWith('*.')) {
                // Wildcard pattern
                const pattern = reserved.substring(2);
                if (lowerDomain.endsWith(pattern)) {
                    result.errors.push(`Domain uses reserved pattern: ${reserved}`);
                }
            }
            else {
                // Exact match
                if (lowerDomain === reserved) {
                    result.errors.push(`Domain is reserved: ${reserved}`);
                }
            }
        }
        // Additional reserved patterns
        if (lowerDomain.includes('localhost')) {
            result.errors.push('Domain cannot contain "localhost"');
        }
        if (lowerDomain.match(/^(www\.)?test\./)) {
            result.warnings.push('Domain appears to be for testing purposes');
        }
    }
    /**
     * Validate against allowed/blocked domain lists
     */
    validateDomainLists(domain, result) {
        const lowerDomain = domain.toLowerCase();
        // Check blocked domains
        for (const blocked of this.blockedDomains) {
            if (lowerDomain === blocked.toLowerCase() ||
                lowerDomain.endsWith('.' + blocked.toLowerCase())) {
                result.errors.push(`Domain is blocked: ${blocked}`);
            }
        }
        // Check allowed domains (if specified)
        if (this.allowedDomains && this.allowedDomains.length > 0) {
            const isAllowed = this.allowedDomains.some(allowed => lowerDomain === allowed.toLowerCase() ||
                lowerDomain.endsWith('.' + allowed.toLowerCase()));
            if (!isAllowed) {
                result.errors.push('Domain is not in the allowed list');
            }
        }
    }
    /**
     * Check if domain is likely a subdomain
     */
    isSubdomain(domain) {
        const labels = domain.split('.');
        return labels.length > 2;
    }
    /**
     * Extract root domain from subdomain
     */
    getRootDomain(domain) {
        const labels = domain.split('.');
        if (labels.length <= 2) {
            return domain;
        }
        // Return last two labels for most cases
        // This is a simplified approach - real implementation might use a TLD list
        return labels.slice(-2).join('.');
    }
    /**
     * Generate domain suggestions for common typos
     */
    generateSuggestions(domain) {
        const suggestions = [];
        // Common TLD corrections
        const commonTLDs = ['com', 'org', 'net', 'edu', 'gov'];
        const labels = domain.split('.');
        if (labels.length >= 2) {
            const baseDomain = labels.slice(0, -1).join('.');
            const currentTLD = labels[labels.length - 1];
            // Suggest common TLDs if current one is unusual
            if (!commonTLDs.includes(currentTLD.toLowerCase())) {
                commonTLDs.forEach(tld => {
                    suggestions.push(`${baseDomain}.${tld}`);
                });
            }
        }
        // Remove www prefix suggestion
        if (domain.startsWith('www.')) {
            suggestions.push(domain.substring(4));
        }
        // Add www prefix suggestion
        if (!domain.startsWith('www.')) {
            suggestions.push(`www.${domain}`);
        }
        return suggestions.slice(0, 5); // Limit to 5 suggestions
    }
    /**
     * Normalize domain name
     */
    normalizeDomain(domain) {
        return domain
            .toLowerCase()
            .replace(/\.$/, '') // Remove trailing dot
            .trim();
    }
}
exports.DomainValidator = DomainValidator;
//# sourceMappingURL=validator.js.map