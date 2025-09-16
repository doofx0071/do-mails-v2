// DNS verification utility for checking domain records
import { promises as dns } from 'dns'

export interface DNSVerificationResult {
  domain: string
  mxRecordsValid: boolean
  spfRecordValid: boolean
  verificationRecordValid: boolean
  allRecordsValid: boolean
  details: {
    mxRecords: string[]
    txtRecords: string[]
    expectedVerificationToken?: string
    foundVerificationToken?: boolean
  }
}

export class DNSVerifier {
  /**
   * Verify all DNS records for a domain
   */
  static async verifyDomainRecords(
    domain: string, 
    verificationToken: string
  ): Promise<DNSVerificationResult> {
    console.log(`🔍 Verifying DNS records for ${domain}...`)

    const result: DNSVerificationResult = {
      domain,
      mxRecordsValid: false,
      spfRecordValid: false,
      verificationRecordValid: false,
      allRecordsValid: false,
      details: {
        mxRecords: [],
        txtRecords: [],
        expectedVerificationToken: verificationToken,
        foundVerificationToken: false
      }
    }

    try {
      // Check MX records
      await this.verifyMXRecords(domain, result)
      
      // Check TXT records (SPF and verification)
      await this.verifyTXTRecords(domain, verificationToken, result)
      
      // Set overall status
      result.allRecordsValid = result.mxRecordsValid && 
                              result.spfRecordValid && 
                              result.verificationRecordValid

      console.log(`✅ DNS verification complete for ${domain}:`, {
        mx: result.mxRecordsValid,
        spf: result.spfRecordValid,
        verification: result.verificationRecordValid,
        overall: result.allRecordsValid
      })

      return result
    } catch (error) {
      console.error(`❌ DNS verification failed for ${domain}:`, error)
      return result
    }
  }

  /**
   * Verify MX records point to Mailgun
   */
  private static async verifyMXRecords(domain: string, result: DNSVerificationResult): Promise<void> {
    try {
      const mxRecords = await dns.resolveMx(domain)
      result.details.mxRecords = mxRecords.map(record => record.exchange)

      // Check if MX records include Mailgun servers
      const expectedMX = ['mxa.mailgun.org', 'mxb.mailgun.org']
      const foundMailgunMX = expectedMX.every(expected => 
        result.details.mxRecords.some(mx => mx === expected || mx === expected + '.')
      )

      result.mxRecordsValid = foundMailgunMX
      console.log(`MX records for ${domain}:`, result.details.mxRecords, 'Valid:', foundMailgunMX)
    } catch (error) {
      console.log(`No MX records found for ${domain}:`, error)
      result.mxRecordsValid = false
    }
  }

  /**
   * Verify TXT records (SPF and verification token)
   */
  private static async verifyTXTRecords(
    domain: string, 
    verificationToken: string, 
    result: DNSVerificationResult
  ): Promise<void> {
    try {
      // Check main domain TXT records for SPF
      const txtRecords = await dns.resolveTxt(domain)
      result.details.txtRecords = txtRecords.map(record => record.join(''))

      // Check SPF record
      const spfRecord = result.details.txtRecords.find(record => 
        record.includes('v=spf1') && record.includes('mailgun.org')
      )
      result.spfRecordValid = !!spfRecord

      console.log(`TXT records for ${domain}:`, {
        total: result.details.txtRecords.length,
        spfValid: result.spfRecordValid,
        records: result.details.txtRecords
      })
    } catch (error) {
      console.log(`No TXT records found for ${domain}:`, error)
      result.spfRecordValid = false
    }

    // Check verification token in _domails-verify subdomain
    try {
      const verificationDomain = `_domails-verify.${domain}`
      const verificationRecords = await dns.resolveTxt(verificationDomain)
      const verificationTokens = verificationRecords.map(record => record.join(''))
      
      const foundToken = verificationTokens.find(token => 
        token === verificationToken
      )
      
      result.verificationRecordValid = !!foundToken
      result.details.foundVerificationToken = !!foundToken

      console.log(`Verification records for ${verificationDomain}:`, {
        tokens: verificationTokens,
        expectedToken: verificationToken,
        valid: result.verificationRecordValid
      })
    } catch (error) {
      console.log(`No verification TXT record found for _domails-verify.${domain}:`, error)
      result.verificationRecordValid = false
      result.details.foundVerificationToken = false
    }
  }

  /**
   * Quick check if domain is ready (all records valid)
   */
  static async isDomainReady(domain: string, verificationToken: string): Promise<boolean> {
    try {
      const result = await this.verifyDomainRecords(domain, verificationToken)
      return result.allRecordsValid
    } catch (error) {
      console.error(`Error checking if ${domain} is ready:`, error)
      return false
    }
  }

  /**
   * Get human-readable verification status
   */
  static getVerificationStatus(result: DNSVerificationResult): {
    status: 'pending' | 'partial' | 'verified'
    message: string
    nextSteps: string[]
  } {
    if (result.allRecordsValid) {
      return {
        status: 'verified',
        message: 'All DNS records are properly configured',
        nextSteps: ['Your domain is ready to receive emails!']
      }
    }

    const nextSteps: string[] = []
    
    if (!result.mxRecordsValid) {
      nextSteps.push('Add MX records pointing to mxa.mailgun.org and mxb.mailgun.org')
    }
    
    if (!result.spfRecordValid) {
      nextSteps.push('Add SPF TXT record: v=spf1 include:mailgun.org ~all')
    }
    
    if (!result.verificationRecordValid) {
      nextSteps.push(`Add verification TXT record with token: ${result.details.expectedVerificationToken}`)
    }

    const validCount = [
      result.mxRecordsValid, 
      result.spfRecordValid, 
      result.verificationRecordValid
    ].filter(Boolean).length

    return {
      status: validCount > 0 ? 'partial' : 'pending',
      message: `${validCount}/3 DNS records configured correctly`,
      nextSteps
    }
  }
}

export default DNSVerifier