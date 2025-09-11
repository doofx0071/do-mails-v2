import { EmailAlias, CreateAliasRequest, UpdateAliasRequest, AliasStats, AliasSearchOptions, AliasSearchResult, AliasUsage, AliasManagementConfig } from './types';
export declare class AliasManager {
    private validator;
    private generator;
    private config;
    private aliases;
    private domainAliasCount;
    constructor(config?: AliasManagementConfig);
    /**
     * Create a new email alias
     */
    createAlias(request: CreateAliasRequest): Promise<EmailAlias>;
    /**
     * Update an existing alias
     */
    updateAlias(aliasId: string, request: UpdateAliasRequest): Promise<EmailAlias>;
    /**
     * Delete an alias
     */
    deleteAlias(aliasId: string): Promise<void>;
    /**
     * Get alias by ID
     */
    getAlias(aliasId: string): Promise<EmailAlias>;
    /**
     * Get aliases by domain
     */
    getAliasesByDomain(domainId: string): EmailAlias[];
    /**
     * Search aliases
     */
    searchAliases(options?: AliasSearchOptions): Promise<AliasSearchResult>;
    /**
     * Generate alias suggestions
     */
    generateAliasSuggestions(domainId: string, baseName?: string, count?: number): Promise<string[]>;
    /**
     * Get alias statistics
     */
    getAliasStats(domainId?: string): Promise<AliasStats>;
    /**
     * Get alias usage information
     */
    getAliasUsage(aliasId: string): Promise<AliasUsage>;
    /**
     * Bulk operations
     */
    bulkUpdateAliases(aliasIds: string[], updates: Partial<UpdateAliasRequest>): Promise<EmailAlias[]>;
    /**
     * Generate UUID
     */
    private generateUUID;
}
//# sourceMappingURL=manager.d.ts.map