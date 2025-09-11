export * from './types';
export * from './validator';
export * from './generator';
export * from './manager';
import { AliasManager } from './manager';
import { AliasValidator } from './validator';
import { AliasGenerator } from './generator';
import { AliasManagementConfig } from './types';
/**
 * Main AliasManagement class that combines all functionality
 */
export declare class AliasManagement {
    private manager;
    private validator;
    private generator;
    constructor(config?: AliasManagementConfig);
    /**
     * Get manager instance
     */
    get manage(): AliasManager;
    /**
     * Get validator instance
     */
    get validate(): AliasValidator;
    /**
     * Get generator instance
     */
    get generate(): AliasGenerator;
    /**
     * Create a new alias
     */
    createAlias(domainId: string, aliasName: string, isEnabled?: boolean): Promise<{
        id: string;
        domainId: string;
        aliasName: string;
        fullAddress: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastEmailReceivedAt?: Date | undefined;
    }>;
    /**
     * Validate alias name
     */
    validateAlias(aliasName: string): {
        aliasName: string;
        valid: boolean;
        errors: string[];
        warnings: string[];
        suggestions: string[];
    };
    /**
     * Generate alias suggestions
     */
    generateAliases(options?: any): string[];
    /**
     * Check alias availability
     */
    checkAvailability(aliasName: string, domainName: string, existingAliases?: string[]): Promise<{
        aliasName: string;
        fullAddress: string;
        suggestions: string[];
        domainName: string;
        available: boolean;
        reason?: string | undefined;
    }>;
    /**
     * Get alias statistics
     */
    getStats(domainId?: string): Promise<{
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
    /**
     * Search aliases
     */
    searchAliases(options?: any): Promise<import("./types").AliasSearchResult>;
    /**
     * Update alias
     */
    updateAlias(aliasId: string, updates: any): Promise<{
        id: string;
        domainId: string;
        aliasName: string;
        fullAddress: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastEmailReceivedAt?: Date | undefined;
    }>;
    /**
     * Delete alias
     */
    deleteAlias(aliasId: string): Promise<void>;
    /**
     * Get alias by ID
     */
    getAlias(aliasId: string): Promise<{
        id: string;
        domainId: string;
        aliasName: string;
        fullAddress: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastEmailReceivedAt?: Date | undefined;
    }>;
}
/**
 * Create a new AliasManagement instance
 */
export declare function createAliasManager(config?: AliasManagementConfig): AliasManagement;
/**
 * Default export
 */
export default AliasManagement;
//# sourceMappingURL=index.d.ts.map