// Main exports for alias-management library
export * from './types'
export * from './validator'
export * from './generator'
export * from './manager'

import { AliasManager } from './manager'
import { AliasValidator } from './validator'
import { AliasGenerator } from './generator'
import { AliasManagementConfig } from './types'

/**
 * Main AliasManagement class that combines all functionality
 */
export class AliasManagement {
  private manager: AliasManager
  private validator: AliasValidator
  private generator: AliasGenerator

  constructor(config: AliasManagementConfig = {}) {
    this.manager = new AliasManager(config)
    this.validator = new AliasValidator(config)
    this.generator = new AliasGenerator()
  }

  /**
   * Get manager instance
   */
  get manage(): AliasManager {
    return this.manager
  }

  /**
   * Get validator instance
   */
  get validate(): AliasValidator {
    return this.validator
  }

  /**
   * Get generator instance
   */
  get generate(): AliasGenerator {
    return this.generator
  }

  /**
   * Create a new alias
   */
  async createAlias(domainId: string, aliasName: string, isEnabled: boolean = true) {
    return this.manager.createAlias({
      domainId,
      aliasName,
      isEnabled
    })
  }

  /**
   * Validate alias name
   */
  validateAlias(aliasName: string) {
    return this.validator.validateAlias(aliasName)
  }

  /**
   * Generate alias suggestions
   */
  generateAliases(options?: any) {
    return this.generator.generateAliases(options)
  }

  /**
   * Check alias availability
   */
  async checkAvailability(aliasName: string, domainName: string, existingAliases?: string[]) {
    return this.validator.checkAvailability(aliasName, domainName, existingAliases)
  }

  /**
   * Get alias statistics
   */
  async getStats(domainId?: string) {
    return this.manager.getAliasStats(domainId)
  }

  /**
   * Search aliases
   */
  async searchAliases(options?: any) {
    return this.manager.searchAliases(options)
  }

  /**
   * Update alias
   */
  async updateAlias(aliasId: string, updates: any) {
    return this.manager.updateAlias(aliasId, updates)
  }

  /**
   * Delete alias
   */
  async deleteAlias(aliasId: string) {
    return this.manager.deleteAlias(aliasId)
  }

  /**
   * Get alias by ID
   */
  async getAlias(aliasId: string) {
    return this.manager.getAlias(aliasId)
  }
}

/**
 * Create a new AliasManagement instance
 */
export function createAliasManager(config?: AliasManagementConfig): AliasManagement {
  return new AliasManagement(config)
}

/**
 * Default export
 */
export default AliasManagement
