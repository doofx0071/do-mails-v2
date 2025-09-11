import { AliasValidationResult, AliasAvailabilityResult, AliasManagementConfig } from './types';
export declare class AliasValidator {
    private config;
    constructor(config?: AliasManagementConfig);
    /**
     * Validate alias name format and rules
     */
    validateAlias(aliasName: string): AliasValidationResult;
    /**
     * Check if alias is available (not already taken)
     */
    checkAvailability(aliasName: string, domainName: string, existingAliases?: string[]): Promise<AliasAvailabilityResult>;
    /**
     * Validate basic alias format
     */
    private validateFormat;
    /**
     * Validate alias length
     */
    private validateLength;
    /**
     * Validate alias characters
     */
    private validateCharacters;
    /**
     * Validate against reserved aliases
     */
    private validateReservedAliases;
    /**
     * Validate against blocked patterns
     */
    private validateBlockedPatterns;
    /**
     * Validate against profanity
     */
    private validateProfanity;
    /**
     * Validate alias structure
     */
    private validateStructure;
    /**
     * Generate similar alias suggestions
     */
    private generateSimilarAliases;
    /**
     * Calculate similarity between two strings
     */
    private calculateSimilarity;
    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance;
    /**
     * Check for similar existing aliases
     */
    findSimilarAliases(aliasName: string, existingAliases: string[]): string[];
    /**
     * Normalize alias name
     */
    normalizeAlias(aliasName: string): string;
    /**
     * Generate alias suggestions based on input
     */
    generateSuggestions(input: string, existingAliases?: string[]): string[];
    /**
     * Generate random alias suggestions
     */
    private generateRandomAliases;
}
//# sourceMappingURL=validator.d.ts.map