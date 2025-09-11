import { 
  AliasName,
  AliasValidationResult,
  AliasAvailabilityResult,
  AliasManagementConfig,
  ValidationError,
  RESERVED_ALIASES,
  BLOCKED_PATTERNS,
  PROFANITY_WORDS,
  CHARACTER_SETS
} from './types'

export class AliasValidator {
  private config: AliasManagementConfig

  constructor(config: AliasManagementConfig = {}) {
    this.config = {
      maxAliasesPerDomain: config.maxAliasesPerDomain ?? 1000,
      maxAliasLength: config.maxAliasLength ?? 64,
      minAliasLength: config.minAliasLength ?? 1,
      allowedCharacters: config.allowedCharacters ?? 'abcdefghijklmnopqrstuvwxyz0123456789._-',
      reservedAliases: config.reservedAliases ?? RESERVED_ALIASES,
      blockedPatterns: config.blockedPatterns ?? BLOCKED_PATTERNS,
      enableProfanityFilter: config.enableProfanityFilter ?? true,
      enableSimilarityCheck: config.enableSimilarityCheck ?? true,
      similarityThreshold: config.similarityThreshold ?? 0.8
    }
  }

  /**
   * Validate alias name format and rules
   */
  validateAlias(aliasName: string): AliasValidationResult {
    const result: AliasValidationResult = {
      aliasName: aliasName.toLowerCase(),
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    }

    try {
      // Basic format validation
      this.validateFormat(aliasName, result)
      
      // Length validation
      this.validateLength(aliasName, result)
      
      // Character validation
      this.validateCharacters(aliasName, result)
      
      // Reserved alias validation
      this.validateReservedAliases(aliasName, result)
      
      // Blocked pattern validation
      this.validateBlockedPatterns(aliasName, result)
      
      // Profanity filter
      if (this.config.enableProfanityFilter) {
        this.validateProfanity(aliasName, result)
      }
      
      // Structure validation
      this.validateStructure(aliasName, result)
      
      // Set overall validity
      result.valid = result.errors.length === 0

    } catch (error: any) {
      result.valid = false
      result.errors.push(`Validation error: ${error.message}`)
    }

    return result
  }

  /**
   * Check if alias is available (not already taken)
   */
  async checkAvailability(
    aliasName: string, 
    domainName: string,
    existingAliases: string[] = []
  ): Promise<AliasAvailabilityResult> {
    const fullAddress = `${aliasName}@${domainName}`
    
    const result: AliasAvailabilityResult = {
      aliasName: aliasName.toLowerCase(),
      domainName: domainName.toLowerCase(),
      fullAddress: fullAddress.toLowerCase(),
      available: true,
      suggestions: []
    }

    // Check if alias already exists
    const normalizedExisting = existingAliases.map(alias => alias.toLowerCase())
    if (normalizedExisting.includes(aliasName.toLowerCase())) {
      result.available = false
      result.reason = 'Alias already exists'
      result.suggestions = this.generateSimilarAliases(aliasName, normalizedExisting)
    }

    return result
  }

  /**
   * Validate basic alias format
   */
  private validateFormat(aliasName: string, result: AliasValidationResult): void {
    if (!aliasName || typeof aliasName !== 'string') {
      result.errors.push('Alias name must be a non-empty string')
      return
    }

    // Basic regex validation
    const aliasRegex = /^[a-zA-Z0-9._-]+$/
    
    if (!aliasRegex.test(aliasName)) {
      result.errors.push('Alias name contains invalid characters')
      
      // Provide specific suggestions
      if (aliasName.includes(' ')) {
        result.suggestions.push('Remove spaces from alias name')
      }
      if (aliasName.includes('@')) {
        result.suggestions.push('Remove @ symbol from alias name')
      }
      if (/[^a-zA-Z0-9._-]/.test(aliasName)) {
        result.suggestions.push('Use only letters, numbers, dots, underscores, and hyphens')
      }
    }
  }

  /**
   * Validate alias length
   */
  private validateLength(aliasName: string, result: AliasValidationResult): void {
    if (aliasName.length < this.config.minAliasLength!) {
      result.errors.push(`Alias name too short (minimum ${this.config.minAliasLength} characters)`)
    }

    if (aliasName.length > this.config.maxAliasLength!) {
      result.errors.push(`Alias name too long (maximum ${this.config.maxAliasLength} characters)`)
    }
    
    if (aliasName.length > 50) {
      result.warnings.push('Very long alias names may be difficult to remember')
    }
  }

  /**
   * Validate alias characters
   */
  private validateCharacters(aliasName: string, result: AliasValidationResult): void {
    // Check for invalid characters
    const allowedChars = new Set(this.config.allowedCharacters)
    const invalidChars = [...aliasName].filter(char => !allowedChars.has(char))
    
    if (invalidChars.length > 0) {
      result.errors.push(`Invalid characters found: ${[...new Set(invalidChars)].join(', ')}`)
    }
    
    // Check for consecutive dots
    if (aliasName.includes('..')) {
      result.errors.push('Alias name cannot contain consecutive dots')
    }
    
    // Check for leading/trailing dots
    if (aliasName.startsWith('.')) {
      result.errors.push('Alias name cannot start with a dot')
    }
    if (aliasName.endsWith('.')) {
      result.errors.push('Alias name cannot end with a dot')
    }
    
    // Check for leading/trailing hyphens or underscores
    if (aliasName.startsWith('-') || aliasName.startsWith('_')) {
      result.warnings.push('Alias names starting with hyphens or underscores may cause issues')
    }
    if (aliasName.endsWith('-') || aliasName.endsWith('_')) {
      result.warnings.push('Alias names ending with hyphens or underscores may cause issues')
    }
  }

  /**
   * Validate against reserved aliases
   */
  private validateReservedAliases(aliasName: string, result: AliasValidationResult): void {
    const lowerAlias = aliasName.toLowerCase()
    
    if (this.config.reservedAliases!.includes(lowerAlias)) {
      result.errors.push(`Alias name is reserved: ${lowerAlias}`)
      result.suggestions.push(`Try: ${lowerAlias}1, ${lowerAlias}-mail, my-${lowerAlias}`)
    }

    // Check for variations of reserved aliases
    for (const reserved of this.config.reservedAliases!) {
      if (lowerAlias.includes(reserved) && lowerAlias !== reserved) {
        result.warnings.push(`Alias name contains reserved word: ${reserved}`)
      }
    }
  }

  /**
   * Validate against blocked patterns
   */
  private validateBlockedPatterns(aliasName: string, result: AliasValidationResult): void {
    const lowerAlias = aliasName.toLowerCase()
    
    for (const pattern of this.config.blockedPatterns!) {
      if (lowerAlias.includes(pattern)) {
        result.errors.push(`Alias name contains blocked pattern: ${pattern}`)
        result.suggestions.push(`Avoid using: ${pattern}`)
      }
    }
    
    // Check for common problematic patterns
    if (/^\d+$/.test(aliasName)) {
      result.warnings.push('Numeric-only aliases may be confusing')
    }
    
    if (aliasName.length <= 2) {
      result.warnings.push('Very short aliases may be hard to remember')
    }
  }

  /**
   * Validate against profanity
   */
  private validateProfanity(aliasName: string, result: AliasValidationResult): void {
    const lowerAlias = aliasName.toLowerCase()
    
    for (const word of PROFANITY_WORDS) {
      if (lowerAlias.includes(word)) {
        result.errors.push('Alias name contains inappropriate content')
        result.suggestions.push('Please choose a different alias name')
        break
      }
    }
  }

  /**
   * Validate alias structure
   */
  private validateStructure(aliasName: string, result: AliasValidationResult): void {
    // Check for too many consecutive special characters
    if (/[._-]{3,}/.test(aliasName)) {
      result.warnings.push('Avoid using many consecutive special characters')
    }
    
    // Check for alternating patterns that might be confusing
    if (/^([._-][a-zA-Z0-9]){3,}$/.test(aliasName)) {
      result.warnings.push('Alternating patterns may be confusing')
    }
    
    // Check for readability
    const specialCharCount = (aliasName.match(/[._-]/g) || []).length
    const totalLength = aliasName.length
    
    if (specialCharCount / totalLength > 0.5) {
      result.warnings.push('Too many special characters may reduce readability')
    }
  }

  /**
   * Generate similar alias suggestions
   */
  private generateSimilarAliases(aliasName: string, existingAliases: string[]): string[] {
    const suggestions: string[] = []
    const base = aliasName.toLowerCase()
    
    // Add numbers
    for (let i = 1; i <= 99; i++) {
      const suggestion = `${base}${i}`
      if (!existingAliases.includes(suggestion)) {
        suggestions.push(suggestion)
        if (suggestions.length >= 5) break
      }
    }
    
    // Add prefixes
    const prefixes = ['my', 'the', 'new']
    for (const prefix of prefixes) {
      const suggestion = `${prefix}-${base}`
      if (!existingAliases.includes(suggestion)) {
        suggestions.push(suggestion)
        if (suggestions.length >= 5) break
      }
    }
    
    // Add suffixes
    const suffixes = ['mail', 'email', 'box', 'account']
    for (const suffix of suffixes) {
      const suggestion = `${base}-${suffix}`
      if (!existingAliases.includes(suggestion)) {
        suggestions.push(suggestion)
        if (suggestions.length >= 5) break
      }
    }
    
    return suggestions.slice(0, 5)
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Check for similar existing aliases
   */
  findSimilarAliases(aliasName: string, existingAliases: string[]): string[] {
    if (!this.config.enableSimilarityCheck) {
      return []
    }
    
    const similar: string[] = []
    const lowerAlias = aliasName.toLowerCase()
    
    for (const existing of existingAliases) {
      const similarity = this.calculateSimilarity(lowerAlias, existing.toLowerCase())
      if (similarity >= this.config.similarityThreshold!) {
        similar.push(existing)
      }
    }
    
    return similar
  }

  /**
   * Normalize alias name
   */
  normalizeAlias(aliasName: string): string {
    return aliasName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '') // Remove any spaces
  }

  /**
   * Generate alias suggestions based on input
   */
  generateSuggestions(input: string, existingAliases: string[] = []): string[] {
    const suggestions: string[] = []
    const normalized = this.normalizeAlias(input)
    
    // If input is invalid, generate completely new suggestions
    const validation = this.validateAlias(normalized)
    if (!validation.valid) {
      // Generate random suggestions
      const randomSuggestions = this.generateRandomAliases(5, existingAliases)
      suggestions.push(...randomSuggestions)
    } else {
      // Generate variations of the valid input
      suggestions.push(...this.generateSimilarAliases(normalized, existingAliases))
    }
    
    return suggestions.slice(0, 5)
  }

  /**
   * Generate random alias suggestions
   */
  private generateRandomAliases(count: number, existingAliases: string[]): string[] {
    const suggestions: string[] = []
    const words = ['user', 'mail', 'inbox', 'contact', 'hello', 'info']
    
    while (suggestions.length < count) {
      const word = words[Math.floor(Math.random() * words.length)]
      const number = Math.floor(Math.random() * 999) + 1
      const suggestion = `${word}${number}`
      
      if (!existingAliases.includes(suggestion) && !suggestions.includes(suggestion)) {
        suggestions.push(suggestion)
      }
    }
    
    return suggestions
  }
}
