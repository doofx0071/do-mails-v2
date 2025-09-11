// Main exports for domain-verification library
export * from './types'
export * from './dns'
export * from './validator'
export * from './verifier'

import { DomainVerifier } from './verifier'
import { DomainValidator } from './validator'
import { DNSService } from './dns'
import { DomainVerificationConfig } from './types'

/**
 * Main DomainVerification class that combines all functionality
 */
export class DomainVerification {
  private verifier: DomainVerifier
  private validator: DomainValidator
  private dnsService: DNSService
  private config: DomainVerificationConfig & {
    defaultTimeout: number
    defaultRetries: number
    recordPrefix: string
    blockedDomains: string[]
    cacheTimeout: number
  }

  constructor(config: DomainVerificationConfig = {}) {
    this.config = {
      defaultTimeout: config.defaultTimeout ?? 10000,
      defaultRetries: config.defaultRetries ?? 3,
      recordPrefix: config.recordPrefix ?? '_domails-verify',
      allowedDomains: config.allowedDomains ?? undefined,
      blockedDomains: config.blockedDomains ?? [
        'localhost',
        'example.com',
        'example.org',
        'example.net',
        'test.com',
        'invalid'
      ],
      dnsServers: config.dnsServers ?? undefined,
      cacheTimeout: config.cacheTimeout ?? 300000
    }

    this.verifier = new DomainVerifier(this.config)
    this.validator = new DomainValidator(this.config.allowedDomains, this.config.blockedDomains)
    this.dnsService = new DNSService(this.config.dnsServers, this.config.defaultTimeout)
  }

  /**
   * Get verifier instance
   */
  get verify(): DomainVerifier {
    return this.verifier
  }

  /**
   * Get validator instance
   */
  get validate(): DomainValidator {
    return this.validator
  }

  /**
   * Get DNS service instance
   */
  get dns(): DNSService {
    return this.dnsService
  }

  /**
   * Verify domain ownership
   */
  async verifyDomain(domain: string, token: string) {
    return this.verifier.verifyDomain({
      domain,
      token,
      recordName: '_domails-verify',
      timeout: this.config.defaultTimeout,
      retries: this.config.defaultRetries
    })
  }

  /**
   * Validate domain format
   */
  validateDomain(domain: string) {
    return this.validator.validateDomain(domain)
  }

  /**
   * Generate verification token
   */
  generateToken(options?: any) {
    return this.verifier.generateVerificationToken(options)
  }

  /**
   * Get verification instructions
   */
  getInstructions(domain: string, token: string) {
    return this.verifier.getVerificationInstructions(domain, token)
  }

  /**
   * Perform domain health check
   */
  async healthCheck(domain: string) {
    return this.verifier.performHealthCheck(domain)
  }

  /**
   * Query DNS records
   */
  async queryDNS(domain: string, recordType: any) {
    return this.dnsService.queryRecords(domain, recordType)
  }
}

/**
 * Create a new DomainVerification instance
 */
export function createDomainVerifier(config?: DomainVerificationConfig): DomainVerification {
  return new DomainVerification(config)
}

/**
 * Default export
 */
export default DomainVerification
