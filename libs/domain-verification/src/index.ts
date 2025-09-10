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

  constructor(config: DomainVerificationConfig = {}) {
    this.verifier = new DomainVerifier(config)
    this.validator = new DomainValidator(config.allowedDomains, config.blockedDomains)
    this.dnsService = new DNSService(config.dnsServers, config.defaultTimeout)
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
      recordName: '_domails-verify'
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
