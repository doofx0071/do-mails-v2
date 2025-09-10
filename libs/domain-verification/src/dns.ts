import { promises as dns } from 'dns'
import { 
  DNSRecord, 
  DNSQueryResult, 
  DNSRecordType,
  DNSError,
  TimeoutError
} from './types'

export class DNSService {
  private dnsServers?: string[]
  private defaultTimeout: number

  constructor(dnsServers?: string[], timeout: number = 10000) {
    this.dnsServers = dnsServers
    this.defaultTimeout = timeout
    
    // Configure DNS servers if provided
    if (dnsServers && dnsServers.length > 0) {
      dns.setServers(dnsServers)
    }
  }

  /**
   * Query DNS records for a domain
   */
  async queryRecords(
    domain: string, 
    recordType: DNSRecordType, 
    timeout?: number
  ): Promise<DNSQueryResult> {
    const startTime = Date.now()
    const queryTimeout = timeout || this.defaultTimeout

    try {
      const records = await this.performDNSQuery(domain, recordType, queryTimeout)
      const queryTime = Date.now() - startTime

      return {
        domain,
        recordType,
        records,
        queryTime,
        timestamp: new Date()
      }
    } catch (error: any) {
      throw new DNSError(
        `DNS query failed for ${domain} (${recordType}): ${error.message}`,
        { domain, recordType, originalError: error }
      )
    }
  }

  /**
   * Query TXT records specifically
   */
  async queryTXTRecords(domain: string, timeout?: number): Promise<string[]> {
    try {
      const result = await this.queryRecords(domain, DNSRecordType.TXT, timeout)
      return result.records.map(record => record.value)
    } catch (error: any) {
      throw new DNSError(
        `Failed to query TXT records for ${domain}: ${error.message}`,
        { domain, originalError: error }
      )
    }
  }

  /**
   * Query MX records
   */
  async queryMXRecords(domain: string, timeout?: number): Promise<string[]> {
    try {
      const result = await this.queryRecords(domain, DNSRecordType.MX, timeout)
      return result.records.map(record => record.value)
    } catch (error: any) {
      throw new DNSError(
        `Failed to query MX records for ${domain}: ${error.message}`,
        { domain, originalError: error }
      )
    }
  }

  /**
   * Query A records
   */
  async queryARecords(domain: string, timeout?: number): Promise<string[]> {
    try {
      const result = await this.queryRecords(domain, DNSRecordType.A, timeout)
      return result.records.map(record => record.value)
    } catch (error: any) {
      throw new DNSError(
        `Failed to query A records for ${domain}: ${error.message}`,
        { domain, originalError: error }
      )
    }
  }

  /**
   * Check if domain exists (has any DNS records)
   */
  async domainExists(domain: string, timeout?: number): Promise<boolean> {
    try {
      // Try to resolve any record type
      const promises = [
        this.queryARecords(domain, timeout).catch(() => []),
        this.queryMXRecords(domain, timeout).catch(() => []),
        this.queryTXTRecords(domain, timeout).catch(() => [])
      ]

      const results = await Promise.all(promises)
      return results.some(records => records.length > 0)
    } catch (error) {
      return false
    }
  }

  /**
   * Perform the actual DNS query with timeout
   */
  private async performDNSQuery(
    domain: string, 
    recordType: DNSRecordType, 
    timeout: number
  ): Promise<DNSRecord[]> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`DNS query timeout after ${timeout}ms`))
      }, timeout)

      try {
        let records: DNSRecord[] = []

        switch (recordType) {
          case DNSRecordType.A:
            const aRecords = await dns.resolve4(domain)
            records = aRecords.map(ip => ({
              name: domain,
              type: DNSRecordType.A,
              value: ip
            }))
            break

          case DNSRecordType.AAAA:
            const aaaaRecords = await dns.resolve6(domain)
            records = aaaaRecords.map(ip => ({
              name: domain,
              type: DNSRecordType.AAAA,
              value: ip
            }))
            break

          case DNSRecordType.MX:
            const mxRecords = await dns.resolveMx(domain)
            records = mxRecords.map(mx => ({
              name: domain,
              type: DNSRecordType.MX,
              value: `${mx.priority} ${mx.exchange}`
            }))
            break

          case DNSRecordType.TXT:
            const txtRecords = await dns.resolveTxt(domain)
            records = txtRecords.map(txt => ({
              name: domain,
              type: DNSRecordType.TXT,
              value: Array.isArray(txt) ? txt.join('') : txt
            }))
            break

          case DNSRecordType.CNAME:
            const cnameRecords = await dns.resolveCname(domain)
            records = cnameRecords.map(cname => ({
              name: domain,
              type: DNSRecordType.CNAME,
              value: cname
            }))
            break

          case DNSRecordType.NS:
            const nsRecords = await dns.resolveNs(domain)
            records = nsRecords.map(ns => ({
              name: domain,
              type: DNSRecordType.NS,
              value: ns
            }))
            break

          case DNSRecordType.SOA:
            const soaRecord = await dns.resolveSoa(domain)
            records = [{
              name: domain,
              type: DNSRecordType.SOA,
              value: `${soaRecord.nsname} ${soaRecord.hostmaster} ${soaRecord.serial} ${soaRecord.refresh} ${soaRecord.retry} ${soaRecord.expire} ${soaRecord.minttl}`
            }]
            break

          default:
            throw new DNSError(`Unsupported record type: ${recordType}`)
        }

        clearTimeout(timeoutId)
        resolve(records)
      } catch (error: any) {
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  }

  /**
   * Reverse DNS lookup
   */
  async reverseLookup(ip: string, timeout?: number): Promise<string[]> {
    const queryTimeout = timeout || this.defaultTimeout

    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`Reverse DNS lookup timeout after ${queryTimeout}ms`))
      }, queryTimeout)

      try {
        const hostnames = await dns.reverse(ip)
        clearTimeout(timeoutId)
        resolve(hostnames)
      } catch (error: any) {
        clearTimeout(timeoutId)
        reject(new DNSError(
          `Reverse DNS lookup failed for ${ip}: ${error.message}`,
          { ip, originalError: error }
        ))
      }
    })
  }

  /**
   * Get all DNS servers currently configured
   */
  getDNSServers(): string[] {
    return dns.getServers()
  }

  /**
   * Set DNS servers
   */
  setDNSServers(servers: string[]): void {
    this.dnsServers = servers
    dns.setServers(servers)
  }

  /**
   * Reset DNS servers to system default
   */
  resetDNSServers(): void {
    this.dnsServers = undefined
    // Reset to system default by setting empty array then getting servers
    dns.setServers([])
  }

  /**
   * Test DNS server connectivity
   */
  async testDNSServer(server: string, timeout?: number): Promise<boolean> {
    const originalServers = this.getDNSServers()
    
    try {
      // Temporarily set to test server
      dns.setServers([server])
      
      // Try to resolve a known domain
      await this.queryARecords('google.com', timeout || 5000)
      
      return true
    } catch (error) {
      return false
    } finally {
      // Restore original servers
      dns.setServers(originalServers)
    }
  }
}
