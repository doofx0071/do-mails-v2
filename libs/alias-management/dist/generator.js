"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AliasGenerator = void 0;
const types_1 = require("./types");
class AliasGenerator {
    constructor() {
        this.readableWords = [
            'apple', 'beach', 'cloud', 'dream', 'eagle', 'flame', 'green', 'happy',
            'island', 'jungle', 'knight', 'light', 'magic', 'night', 'ocean', 'peace',
            'quiet', 'river', 'storm', 'tiger', 'unity', 'voice', 'water', 'xenon',
            'youth', 'zebra', 'amber', 'brave', 'coral', 'dance', 'earth', 'frost'
        ];
        this.readableAdjectives = [
            'bright', 'calm', 'deep', 'fast', 'gentle', 'happy', 'kind', 'light',
            'quick', 'smart', 'warm', 'wise', 'bold', 'cool', 'fair', 'free',
            'good', 'pure', 'safe', 'true', 'wild', 'blue', 'gold', 'pink'
        ];
    }
    /**
     * Generate alias names based on options
     */
    generateAliases(options = {}) {
        const opts = {
            length: options.length ?? 8,
            includeNumbers: options.includeNumbers ?? true,
            includeSpecialChars: options.includeSpecialChars ?? false,
            prefix: options.prefix ?? '',
            suffix: options.suffix ?? '',
            excludeWords: options.excludeWords ?? [],
            pattern: options.pattern ?? types_1.GenerationPattern.RANDOM,
            count: options.count ?? 1
        };
        const aliases = [];
        const maxAttempts = opts.count * 10; // Prevent infinite loops
        let attempts = 0;
        while (aliases.length < opts.count && attempts < maxAttempts) {
            attempts++;
            try {
                const alias = this.generateSingleAlias(opts);
                // Check if alias is unique and not excluded
                if (!aliases.includes(alias) && !this.containsExcludedWords(alias, opts.excludeWords)) {
                    aliases.push(alias);
                }
            }
            catch (error) {
                // Continue trying if generation fails
                continue;
            }
        }
        if (aliases.length === 0) {
            throw new types_1.AliasManagementError('Failed to generate any valid aliases', 'GENERATION_FAILED', { options: opts, attempts });
        }
        return aliases;
    }
    /**
     * Generate a single alias based on pattern
     */
    generateSingleAlias(options) {
        let alias = '';
        switch (options.pattern) {
            case types_1.GenerationPattern.RANDOM:
                alias = this.generateRandomAlias(options);
                break;
            case types_1.GenerationPattern.READABLE:
                alias = this.generateReadableAlias(options);
                break;
            case types_1.GenerationPattern.UUID:
                alias = this.generateUUIDAlias(options);
                break;
            case types_1.GenerationPattern.TIMESTAMP:
                alias = this.generateTimestampAlias(options);
                break;
            default:
                alias = this.generateRandomAlias(options);
        }
        // Add prefix and suffix
        if (options.prefix) {
            alias = options.prefix + alias;
        }
        if (options.suffix) {
            alias = alias + options.suffix;
        }
        // Ensure alias meets length requirements
        if (alias.length > 64) {
            alias = alias.substring(0, 64);
        }
        return alias;
    }
    /**
     * Generate random alias
     */
    generateRandomAlias(options) {
        let charset = types_1.CHARACTER_SETS.LOWERCASE;
        if (options.includeNumbers) {
            charset += types_1.CHARACTER_SETS.NUMBERS;
        }
        if (options.includeSpecialChars) {
            charset += types_1.CHARACTER_SETS.SPECIAL;
        }
        let alias = '';
        const targetLength = Math.max(1, options.length - options.prefix.length - options.suffix.length);
        for (let i = 0; i < targetLength; i++) {
            alias += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return alias;
    }
    /**
     * Generate readable alias using word combinations
     */
    generateReadableAlias(options) {
        const adjective = this.readableAdjectives[Math.floor(Math.random() * this.readableAdjectives.length)];
        const noun = this.readableWords[Math.floor(Math.random() * this.readableWords.length)];
        let alias = adjective + noun;
        // Add numbers if requested and we need more length
        if (options.includeNumbers) {
            const number = Math.floor(Math.random() * 999) + 1;
            alias += number.toString();
        }
        // Truncate if too long
        const maxLength = options.length - options.prefix.length - options.suffix.length;
        if (alias.length > maxLength && maxLength > 0) {
            alias = alias.substring(0, maxLength);
        }
        return alias;
    }
    /**
     * Generate UUID-based alias
     */
    generateUUIDAlias(options) {
        const uuid = this.generateUUID();
        let alias = uuid.replace(/-/g, '').toLowerCase();
        // Truncate to desired length
        const maxLength = options.length - options.prefix.length - options.suffix.length;
        if (maxLength > 0 && alias.length > maxLength) {
            alias = alias.substring(0, maxLength);
        }
        return alias;
    }
    /**
     * Generate timestamp-based alias
     */
    generateTimestampAlias(options) {
        const timestamp = Date.now().toString(36); // Base36 encoding
        let alias = 'alias' + timestamp;
        // Add random suffix if we need more length
        const currentLength = alias.length + options.prefix.length + options.suffix.length;
        if (currentLength < options.length) {
            const remainingLength = options.length - currentLength;
            const randomSuffix = this.generateRandomString(remainingLength, types_1.CHARACTER_SETS.LOWERCASE + types_1.CHARACTER_SETS.NUMBERS);
            alias += randomSuffix;
        }
        // Truncate if too long
        const maxLength = options.length - options.prefix.length - options.suffix.length;
        if (maxLength > 0 && alias.length > maxLength) {
            alias = alias.substring(0, maxLength);
        }
        return alias;
    }
    /**
     * Generate random string of specified length
     */
    generateRandomString(length, charset) {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }
    /**
     * Generate UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    /**
     * Check if alias contains excluded words
     */
    containsExcludedWords(alias, excludeWords) {
        const lowerAlias = alias.toLowerCase();
        return excludeWords.some(word => lowerAlias.includes(word.toLowerCase()));
    }
    /**
     * Generate alias with specific pattern and constraints
     */
    generateCustomAlias(pattern, replacements = {}) {
        let alias = pattern;
        // Replace placeholders
        const placeholders = {
            '{random}': () => this.generateRandomString(6, types_1.CHARACTER_SETS.LOWERCASE + types_1.CHARACTER_SETS.NUMBERS),
            '{word}': () => this.readableWords[Math.floor(Math.random() * this.readableWords.length)],
            '{adjective}': () => this.readableAdjectives[Math.floor(Math.random() * this.readableAdjectives.length)],
            '{number}': () => (Math.floor(Math.random() * 999) + 1).toString(),
            '{timestamp}': () => Date.now().toString(36),
            '{uuid}': () => this.generateUUID().replace(/-/g, '').substring(0, 8),
            ...replacements
        };
        for (const [placeholder, generator] of Object.entries(placeholders)) {
            while (alias.includes(placeholder)) {
                const replacement = typeof generator === 'function' ? generator() : generator;
                alias = alias.replace(placeholder, replacement);
            }
        }
        return alias.toLowerCase();
    }
    /**
     * Generate aliases avoiding similar existing ones
     */
    generateUniqueAliases(count, existingAliases, options = {}) {
        const opts = {
            length: options.length ?? 8,
            includeNumbers: options.includeNumbers ?? true,
            includeSpecialChars: options.includeSpecialChars ?? false,
            prefix: options.prefix ?? '',
            suffix: options.suffix ?? '',
            excludeWords: options.excludeWords ?? [],
            pattern: options.pattern ?? types_1.GenerationPattern.RANDOM,
            count
        };
        const maxAttempts = count * 20;
        const generated = [];
        const allExisting = [...existingAliases, ...generated];
        let attempts = 0;
        while (generated.length < count && attempts < maxAttempts) {
            attempts++;
            const candidates = this.generateAliases({ ...opts, count: 1 });
            const candidate = candidates[0];
            if (candidate && !allExisting.includes(candidate)) {
                generated.push(candidate);
                allExisting.push(candidate);
            }
        }
        return generated;
    }
    /**
     * Generate alias suggestions based on a base name
     */
    generateSuggestions(baseName, existingAliases = []) {
        const suggestions = [];
        const normalizedBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Add numbered variations
        for (let i = 1; i <= 99; i++) {
            const suggestion = `${normalizedBase}${i}`;
            if (!existingAliases.includes(suggestion)) {
                suggestions.push(suggestion);
                if (suggestions.length >= 10)
                    break;
            }
        }
        // Add word combinations
        const words = ['mail', 'box', 'account', 'user', 'contact'];
        for (const word of words) {
            const suggestion = `${normalizedBase}${word}`;
            if (!existingAliases.includes(suggestion) && !suggestions.includes(suggestion)) {
                suggestions.push(suggestion);
                if (suggestions.length >= 10)
                    break;
            }
        }
        // Add prefix variations
        const prefixes = ['my', 'the', 'new'];
        for (const prefix of prefixes) {
            const suggestion = `${prefix}${normalizedBase}`;
            if (!existingAliases.includes(suggestion) && !suggestions.includes(suggestion)) {
                suggestions.push(suggestion);
                if (suggestions.length >= 10)
                    break;
            }
        }
        return suggestions.slice(0, 5);
    }
    /**
     * Validate generated alias meets requirements
     */
    validateGeneratedAlias(alias, options) {
        // Check length
        if (alias.length < 1 || alias.length > 64) {
            return false;
        }
        // Check characters
        const validChars = /^[a-zA-Z0-9._-]+$/;
        if (!validChars.test(alias)) {
            return false;
        }
        // Check for excluded words
        if (this.containsExcludedWords(alias, options.excludeWords)) {
            return false;
        }
        return true;
    }
}
exports.AliasGenerator = AliasGenerator;
//# sourceMappingURL=generator.js.map