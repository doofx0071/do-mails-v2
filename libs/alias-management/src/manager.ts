import { 
  EmailAlias,
  CreateAliasRequest,
  UpdateAliasRequest,
  AliasStats,
  AliasSearchOptions,
  AliasSearchResult,
  AliasUsage,
  AliasManagementConfig,
  AliasManagementError,
  DuplicateAliasError,
  AliasNotFoundError,
  QuotaExceededError
} from './types'
import { AliasValidator } from './validator'
import { AliasGenerator } from './generator'

export class AliasManager {
  private validator: AliasValidator
  private generator: AliasGenerator
  private config: AliasManagementConfig
  private aliases: Map<string, EmailAlias> // In-memory storage for demo
  private domainAliasCount: Map<string, number>

  constructor(config: AliasManagementConfig = {}) {
    this.config = {
      maxAliasesPerDomain: 1000,
      maxAliasLength: 64,
      minAliasLength: 1,
      allowedCharacters: 'abcdefghijklmnopqrstuvwxyz0123456789._-',
      reservedAliases: [
        'admin', 'administrator', 'root', 'postmaster', 'webmaster',
        'hostmaster', 'abuse', 'security', 'noreply', 'no-reply',
        'support', 'help', 'info', 'contact', 'sales', 'billing'
      ],
      blockedPatterns: [
        'test', 'temp', 'temporary', 'delete', 'remove', 'spam'
      ],
      enableProfanityFilter: true,
      enableSimilarityCheck: true,
      similarityThreshold: 0.8,
      ...config
    }

    this.validator = new AliasValidator(this.config)
    this.generator = new AliasGenerator()
    this.aliases = new Map()
    this.domainAliasCount = new Map()
  }

  /**
   * Create a new email alias
   */
  async createAlias(request: CreateAliasRequest): Promise<EmailAlias> {
    // Validate request
    const validation = this.validator.validateAlias(request.aliasName)
    if (!validation.valid) {
      throw new AliasManagementError(
        `Invalid alias name: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR',
        { validation, request }
      )
    }

    // Check quota
    const currentCount = this.domainAliasCount.get(request.domainId) || 0
    if (currentCount >= this.config.maxAliasesPerDomain) {
      throw new QuotaExceededError(
        `Maximum aliases per domain exceeded (${this.config.maxAliasesPerDomain})`,
        { domainId: request.domainId, currentCount, limit: this.config.maxAliasesPerDomain }
      )
    }

    // Check for duplicates
    const existingAliases = this.getAliasesByDomain(request.domainId)
    const availability = await this.validator.checkAvailability(
      request.aliasName,
      'example.com', // This would be the actual domain name in real implementation
      existingAliases.map(a => a.aliasName)
    )

    if (!availability.available) {
      throw new DuplicateAliasError(
        `Alias already exists: ${request.aliasName}`,
        { aliasName: request.aliasName, suggestions: availability.suggestions }
      )
    }

    // Create alias
    const alias: EmailAlias = {
      id: this.generateUUID(),
      domainId: request.domainId,
      aliasName: request.aliasName.toLowerCase(),
      fullAddress: `${request.aliasName.toLowerCase()}@example.com`, // Would use actual domain
      isEnabled: request.isEnabled,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Store alias
    this.aliases.set(alias.id, alias)
    this.domainAliasCount.set(request.domainId, currentCount + 1)

    return alias
  }

  /**
   * Update an existing alias
   */
  async updateAlias(aliasId: string, request: UpdateAliasRequest): Promise<EmailAlias> {
    const alias = this.aliases.get(aliasId)
    if (!alias) {
      throw new AliasNotFoundError(`Alias not found: ${aliasId}`)
    }

    // Validate new alias name if provided
    if (request.aliasName) {
      const validation = this.validator.validateAlias(request.aliasName)
      if (!validation.valid) {
        throw new AliasManagementError(
          `Invalid alias name: ${validation.errors.join(', ')}`,
          'VALIDATION_ERROR',
          { validation, request }
        )
      }

      // Check for duplicates (excluding current alias)
      const existingAliases = this.getAliasesByDomain(alias.domainId)
        .filter(a => a.id !== aliasId)
      
      const availability = await this.validator.checkAvailability(
        request.aliasName,
        'example.com',
        existingAliases.map(a => a.aliasName)
      )

      if (!availability.available) {
        throw new DuplicateAliasError(
          `Alias already exists: ${request.aliasName}`,
          { aliasName: request.aliasName, suggestions: availability.suggestions }
        )
      }
    }

    // Update alias
    const updatedAlias: EmailAlias = {
      ...alias,
      aliasName: request.aliasName?.toLowerCase() || alias.aliasName,
      isEnabled: request.isEnabled !== undefined ? request.isEnabled : alias.isEnabled,
      fullAddress: request.aliasName ? 
        `${request.aliasName.toLowerCase()}@example.com` : 
        alias.fullAddress,
      updatedAt: new Date()
    }

    this.aliases.set(aliasId, updatedAlias)
    return updatedAlias
  }

  /**
   * Delete an alias
   */
  async deleteAlias(aliasId: string): Promise<void> {
    const alias = this.aliases.get(aliasId)
    if (!alias) {
      throw new AliasNotFoundError(`Alias not found: ${aliasId}`)
    }

    this.aliases.delete(aliasId)
    
    // Update domain count
    const currentCount = this.domainAliasCount.get(alias.domainId) || 0
    this.domainAliasCount.set(alias.domainId, Math.max(0, currentCount - 1))
  }

  /**
   * Get alias by ID
   */
  async getAlias(aliasId: string): Promise<EmailAlias> {
    const alias = this.aliases.get(aliasId)
    if (!alias) {
      throw new AliasNotFoundError(`Alias not found: ${aliasId}`)
    }
    return alias
  }

  /**
   * Get aliases by domain
   */
  getAliasesByDomain(domainId: string): EmailAlias[] {
    return Array.from(this.aliases.values())
      .filter(alias => alias.domainId === domainId)
  }

  /**
   * Search aliases
   */
  async searchAliases(options: AliasSearchOptions = {}): Promise<AliasSearchResult> {
    let aliases = Array.from(this.aliases.values())

    // Apply filters
    if (options.domainId) {
      aliases = aliases.filter(alias => alias.domainId === options.domainId)
    }

    if (options.isEnabled !== undefined) {
      aliases = aliases.filter(alias => alias.isEnabled === options.isEnabled)
    }

    if (options.query) {
      const query = options.query.toLowerCase()
      aliases = aliases.filter(alias => 
        alias.aliasName.toLowerCase().includes(query) ||
        alias.fullAddress.toLowerCase().includes(query)
      )
    }

    if (options.hasActivity !== undefined) {
      aliases = aliases.filter(alias => 
        options.hasActivity ? alias.lastEmailReceivedAt : !alias.lastEmailReceivedAt
      )
    }

    if (options.createdAfter) {
      aliases = aliases.filter(alias => alias.createdAt >= options.createdAfter!)
    }

    if (options.createdBefore) {
      aliases = aliases.filter(alias => alias.createdAt <= options.createdBefore!)
    }

    // Apply sorting
    const sortBy = options.sortBy || 'created'
    const sortOrder = options.sortOrder || 'desc'

    aliases.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.aliasName.localeCompare(b.aliasName)
          break
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case 'activity':
          const aTime = a.lastEmailReceivedAt?.getTime() || 0
          const bTime = b.lastEmailReceivedAt?.getTime() || 0
          comparison = aTime - bTime
          break
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    // Apply pagination
    const offset = options.offset || 0
    const limit = options.limit || 50
    const total = aliases.length
    const paginatedAliases = aliases.slice(offset, offset + limit)

    return {
      aliases: paginatedAliases,
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : undefined
    }
  }

  /**
   * Generate alias suggestions
   */
  async generateAliasSuggestions(
    domainId: string,
    baseName?: string,
    count: number = 5
  ): Promise<string[]> {
    const existingAliases = this.getAliasesByDomain(domainId)
    const existingNames = existingAliases.map(a => a.aliasName)

    if (baseName) {
      return this.generator.generateSuggestions(baseName, existingNames)
    } else {
      return this.generator.generateUniqueAliases(count, existingNames, {
        length: 8,
        pattern: 'readable'
      })
    }
  }

  /**
   * Get alias statistics
   */
  async getAliasStats(domainId?: string): Promise<AliasStats> {
    let aliases = Array.from(this.aliases.values())
    
    if (domainId) {
      aliases = aliases.filter(alias => alias.domainId === domainId)
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const stats: AliasStats = {
      totalAliases: aliases.length,
      enabledAliases: aliases.filter(a => a.isEnabled).length,
      disabledAliases: aliases.filter(a => !a.isEnabled).length,
      aliasesWithActivity: aliases.filter(a => a.lastEmailReceivedAt).length,
      aliasesCreatedToday: aliases.filter(a => a.createdAt >= today).length,
      aliasesCreatedThisWeek: aliases.filter(a => a.createdAt >= weekAgo).length,
      aliasesCreatedThisMonth: aliases.filter(a => a.createdAt >= monthAgo).length
    }

    return stats
  }

  /**
   * Get alias usage information
   */
  async getAliasUsage(aliasId: string): Promise<AliasUsage> {
    const alias = await this.getAlias(aliasId)
    
    // This would typically query email database
    // For demo purposes, return mock data
    return {
      aliasId: alias.id,
      emailCount: 0,
      lastEmailAt: alias.lastEmailReceivedAt,
      firstEmailAt: alias.lastEmailReceivedAt,
      senderCount: 0,
      topSenders: [],
      averageEmailsPerDay: 0
    }
  }

  /**
   * Bulk operations
   */
  async bulkUpdateAliases(
    aliasIds: string[],
    updates: Partial<UpdateAliasRequest>
  ): Promise<EmailAlias[]> {
    const results: EmailAlias[] = []
    
    for (const aliasId of aliasIds) {
      try {
        const updated = await this.updateAlias(aliasId, updates)
        results.push(updated)
      } catch (error) {
        // Continue with other aliases even if one fails
        console.warn(`Failed to update alias ${aliasId}:`, error)
      }
    }
    
    return results
  }

  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}
