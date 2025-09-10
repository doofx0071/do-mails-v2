import { 
  DomainVerificationRequest,
  DomainVerificationResult,
  DomainVerificationConfig,
  VerificationToken,
  DomainHealthCheck,
  TokenGenerationOptions,
  DomainVerificationError,
  ValidationError,
  TimeoutError
} from './types'
import { DNSService } from './dns'
import { DomainValidator } from './validator'

export class DomainVerifier {
  private dnsService: DNSService
  private validator: DomainValidator
  private config: DomainVerificationConfig
  private verificationCache: Map<string, DomainVerificationResult>

  constructor(config: DomainVerificationConfig = {}) {
    this.config = {
      defaultTimeout: 10000,
      defaultRetries: 3,
      recordPrefix: '_domails-verify',
      blockedDomains: [
        'localhost',
        'example.com',
        'example.org',
        'example.net',
        'test.com',
        'invalid'
      ],
      cacheTimeout: 300000, // 5 minutes
      ...config
    }

    this.dnsService = new DNSService(config.dnsServers, this.config.defaultTimeout)
    this.validator = new DomainValidator(config.allowedDomains, this.config.blockedDomains)
    this.verificationCache = new Map()
  }

  /**
   * Verify domain ownership using DNS TXT record
   */
  async verifyDomain(request: DomainVerificationRequest): Promise<DomainVerificationResult> {
    const startTime = Date.now()
    
    try {
      // Validate domain first
      const validation = this.validator.validateDomain(request.domain)
      if (!validation.valid) {
        throw new ValidationError(
          `Invalid domain: ${validation.errors.join(', ')}`,
          { domain: request.domain, validation }
        )
      }

      // Check cache first
      const cacheKey = `${request.domain}:${request.token}`
      const cached = this.verificationCache.get(cacheKey)
      if (cached && this.isCacheValid(cached)) {
        return cached
      }

      // Perform verification
      const result = await this.performVerification(request, startTime)
      
      // Cache successful results
      if (result.verified) {
        this.verificationCache.set(cacheKey, result)
        
        // Clean up cache after timeout
        setTimeout(() => {
          this.verificationCache.delete(cacheKey)
        }, this.config.cacheTimeout)
      }

      return result
    } catch (error: any) {
      const verificationTime = Date.now() - startTime
      
      return {
        domain: request.domain,
        verified: false,
        token: request.token,
        recordName: request.recordName || this.config.recordPrefix,
        error: error.message,
        timestamp: new Date(),
        dnsRecords: [],
        verificationTime
      }
    }
  }

  /**
   * Perform the actual DNS verification
   */
  private async performVerification(
    request: DomainVerificationRequest, 
    startTime: number
  ): Promise<DomainVerificationResult> {
    const recordName = `${request.recordName || this.config.recordPrefix}.${request.domain}`
    const timeout = request.timeout || this.config.defaultTimeout
    const maxRetries = request.retries || this.config.defaultRetries

    let lastError: Error | null = null
    let dnsRecords: string[] = []

    // Retry logic
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Query TXT records
        dnsRecords = await this.dnsService.queryTXTRecords(recordName, timeout)
        
        // Check if our token is present
        const tokenFound = dnsRecords.some(record => 
          record.trim() === request.token.trim()
        )

        const verificationTime = Date.now() - startTime

        if (tokenFound) {
          return {
            domain: request.domain,
            verified: true,
            token: request.token,
            recordName,
            recordValue: request.token,
            timestamp: new Date(),
            dnsRecords,
            verificationTime
          }
        } else {
          // Token not found, but DNS query succeeded
          return {
            domain: request.domain,
            verified: false,
            token: request.token,
            recordName,
            error: `Verification token not found in DNS records. Found: ${dnsRecords.join(', ')}`,
            timestamp: new Date(),
            dnsRecords,
            verificationTime
          }
        }
      } catch (error: any) {
        lastError = error
        
        // If this is the last attempt, don't wait
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    // All retries failed
    const verificationTime = Date.now() - startTime
    throw new DomainVerificationError(
      `Verification failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
      'VERIFICATION_FAILED',
      { 
        domain: request.domain, 
        recordName, 
        attempts: maxRetries + 1,
        lastError,
        verificationTime
      }
    )
  }

  /**
   * Generate a verification token
   */
  generateVerificationToken(options: TokenGenerationOptions = {}): VerificationToken {
    const {
      length = 32,
      includeTimestamp = false,
      prefix = '',
      charset = 'alphanumeric'
    } = options

    let characters: string
    switch (charset) {
      case 'hex':
        characters = '0123456789abcdef'
        break
      case 'base64':
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        break
      case 'alphanumeric':
      default:
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    }

    let token = prefix
    
    // Add timestamp if requested
    if (includeTimestamp) {
      token += Date.now().toString(36) + '_'
    }

    // Generate random part
    for (let i = 0; i < length; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    return token
  }

  /**
   * Get verification instructions for a domain
   */
  getVerificationInstructions(domain: string, token: string): {
    recordName: string
    recordType: string
    recordValue: string
    instructions: string[]
  } {
    const recordName = `${this.config.recordPrefix}.${domain}`
    
    return {
      recordName,
      recordType: 'TXT',
      recordValue: token,
      instructions: [
        `1. Log in to your DNS provider's control panel`,
        `2. Navigate to DNS management for domain: ${domain}`,
        `3. Create a new TXT record with these details:`,
        `   - Name/Host: ${recordName}`,
        `   - Type: TXT`,
        `   - Value: ${token}`,
        `   - TTL: 300 (or minimum allowed)`,
        `4. Save the record and wait for DNS propagation (usually 5-15 minutes)`,
        `5. Click "Verify Domain" to complete verification`
      ]
    }
  }

  /**
   * Perform domain health check
   */
  async performHealthCheck(domain: string): Promise<DomainHealthCheck> {
    const startTime = Date.now()
    const result: DomainHealthCheck = {
      domain,
      accessible: false,
      httpsSupported: false,
      mxRecords: [],
      txtRecords: [],
      errors: [],
      timestamp: new Date()
    }

    try {
      // Check if domain exists in DNS
      const domainExists = await this.dnsService.domainExists(domain)
      if (!domainExists) {
        result.errors.push('Domain does not exist in DNS')
        return result
      }

      // Query MX records
      try {
        result.mxRecords = await this.dnsService.queryMXRecords(domain)
      } catch (error: any) {
        result.errors.push(`MX query failed: ${error.message}`)
      }

      // Query TXT records
      try {
        result.txtRecords = await this.dnsService.queryTXTRecords(domain)
      } catch (error: any) {
        result.errors.push(`TXT query failed: ${error.message}`)
      }

      // Test HTTP accessibility
      try {
        const httpResult = await this.testHttpAccess(domain)
        result.accessible = httpResult.accessible
        result.responseTime = httpResult.responseTime
        result.httpStatus = httpResult.status
        result.httpsSupported = httpResult.httpsSupported
        result.certificateValid = httpResult.certificateValid
      } catch (error: any) {
        result.errors.push(`HTTP test failed: ${error.message}`)
      }

    } catch (error: any) {
      result.errors.push(`Health check failed: ${error.message}`)
    }

    return result
  }

  /**
   * Test HTTP/HTTPS access to domain
   */
  private async testHttpAccess(domain: string): Promise<{
    accessible: boolean
    responseTime?: number
    status?: number
    httpsSupported: boolean
    certificateValid?: boolean
  }> {
    // This is a simplified implementation
    // In a real implementation, you would use http/https modules
    return {
      accessible: true,
      responseTime: 200,
      status: 200,
      httpsSupported: true,
      certificateValid: true
    }
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(result: DomainVerificationResult): boolean {
    const age = Date.now() - result.timestamp.getTime()
    return age < this.config.cacheTimeout
  }

  /**
   * Clear verification cache
   */
  clearCache(): void {
    this.verificationCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.verificationCache.size,
      entries: Array.from(this.verificationCache.keys())
    }
  }
}
