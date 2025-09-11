import { AliasGenerationOptions } from './types';
export declare class AliasGenerator {
    private readonly readableWords;
    private readonly readableAdjectives;
    /**
     * Generate alias names based on options
     */
    generateAliases(options?: AliasGenerationOptions): string[];
    /**
     * Generate a single alias based on pattern
     */
    private generateSingleAlias;
    /**
     * Generate random alias
     */
    private generateRandomAlias;
    /**
     * Generate readable alias using word combinations
     */
    private generateReadableAlias;
    /**
     * Generate UUID-based alias
     */
    private generateUUIDAlias;
    /**
     * Generate timestamp-based alias
     */
    private generateTimestampAlias;
    /**
     * Generate random string of specified length
     */
    private generateRandomString;
    /**
     * Generate UUID
     */
    private generateUUID;
    /**
     * Check if alias contains excluded words
     */
    private containsExcludedWords;
    /**
     * Generate alias with specific pattern and constraints
     */
    generateCustomAlias(pattern: string, replacements?: Record<string, string>): string;
    /**
     * Generate aliases avoiding similar existing ones
     */
    generateUniqueAliases(count: number, existingAliases: string[], options?: AliasGenerationOptions): string[];
    /**
     * Generate alias suggestions based on a base name
     */
    generateSuggestions(baseName: string, existingAliases?: string[]): string[];
    /**
     * Validate generated alias meets requirements
     */
    private validateGeneratedAlias;
}
//# sourceMappingURL=generator.d.ts.map