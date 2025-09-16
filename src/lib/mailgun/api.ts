// Mailgun API service for domain management
import crypto from 'crypto'

export interface MailgunDomain {
  name: string
  smtp_login?: string
  smtp_password?: string
  spam_action?: 'disabled' | 'block' | 'tag'
  wildcard?: boolean
  force_dkim_authority?: boolean
  dkim_key_size?: 1024 | 2048
  ips?: string[]
  pool_id?: string
  web_scheme?: 'http' | 'https'
}

export interface MailgunWebhook {
  url: string
  username?: string
  password?: string
}

export class MailgunAPI {
  private apiKey: string
  private baseUrl: string
  private domain: string

  constructor() {
    this.apiKey = process.env.MAILGUN_API_KEY || ''
    this.baseUrl = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net/v3'
    this.domain = process.env.MAILGUN_DOMAIN || ''
    
    if (!this.apiKey) {
      console.warn('⚠️ MAILGUN_API_KEY not configured')
    }
  }

  /**
   * Check if Mailgun is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.baseUrl)
  }

  /**
   * Make authenticated request to Mailgun API
   */
  private async makeRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Mailgun API not configured. Please set MAILGUN_API_KEY')
    }

    const url = `${this.baseUrl}${endpoint}`
    const auth = Buffer.from(`api:${this.apiKey}`).toString('base64')
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      },
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Mailgun API Error:', data)
      throw new Error(`Mailgun API error: ${data.message || response.statusText}`)
    }

    return data
  }

  /**
   * Add a domain to Mailgun
   */
  async addDomain(domainName: string, options: Partial<MailgunDomain> = {}): Promise<any> {
    console.log(`📧 Adding domain ${domainName} to Mailgun...`)

    const params = new URLSearchParams({
      name: domainName,
      spam_action: options.spam_action || 'disabled',
      wildcard: String(options.wildcard ?? true), // Enable wildcard for catch-all
      force_dkim_authority: String(options.force_dkim_authority ?? false),
      dkim_key_size: String(options.dkim_key_size || 2048),
      web_scheme: options.web_scheme || 'https'
    })

    try {
      const result = await this.makeRequest('/domains', {
        method: 'POST',
        body: params,
      })

      console.log(`✅ Domain ${domainName} added to Mailgun successfully`)
      return result
    } catch (error) {
      console.error(`❌ Failed to add domain ${domainName} to Mailgun:`, error)
      throw error
    }
  }

  /**
   * Get domain information from Mailgun
   */
  async getDomain(domainName: string): Promise<any> {
    try {
      return await this.makeRequest(`/domains/${domainName}`)
    } catch (error) {
      console.error(`Failed to get domain ${domainName}:`, error)
      throw error
    }
  }

  /**
   * Delete domain from Mailgun
   */
  async deleteDomain(domainName: string): Promise<any> {
    console.log(`🗑️ Removing domain ${domainName} from Mailgun...`)

    try {
      const result = await this.makeRequest(`/domains/${domainName}`, {
        method: 'DELETE',
      })

      console.log(`✅ Domain ${domainName} removed from Mailgun successfully`)
      return result
    } catch (error) {
      console.error(`❌ Failed to remove domain ${domainName} from Mailgun:`, error)
      throw error
    }
  }

  /**
   * List all domains in Mailgun account
   */
  async listDomains(): Promise<any> {
    try {
      return await this.makeRequest('/domains')
    } catch (error) {
      console.error('Failed to list Mailgun domains:', error)
      throw error
    }
  }

  /**
   * Verify domain in Mailgun
   */
  async verifyDomain(domainName: string): Promise<any> {
    console.log(`🔍 Verifying domain ${domainName} in Mailgun...`)

    try {
      const result = await this.makeRequest(`/domains/${domainName}/verify`, {
        method: 'PUT',
      })

      console.log(`✅ Domain ${domainName} verification status updated`)
      return result
    } catch (error) {
      console.error(`❌ Failed to verify domain ${domainName}:`, error)
      throw error
    }
  }

  /**
   * Set up webhook for domain
   */
  async setupWebhook(
    domainName: string, 
    webhookUrl: string, 
    events: string[] = ['delivered', 'permanent_fail', 'temporary_fail']
  ): Promise<any> {
    console.log(`🎣 Setting up webhook for domain ${domainName}...`)

    try {
      const results = []
      
      for (const event of events) {
        const params = new URLSearchParams({
          url: webhookUrl
        })

        const result = await this.makeRequest(`/domains/${domainName}/webhooks/${event}`, {
          method: 'POST',
          body: params,
        })

        results.push({ event, result })
      }

      console.log(`✅ Webhooks configured for domain ${domainName}`)
      return results
    } catch (error) {
      console.error(`❌ Failed to setup webhook for domain ${domainName}:`, error)
      throw error
    }
  }

  /**
   * Get webhook configuration for domain
   */
  async getWebhooks(domainName: string): Promise<any> {
    try {
      return await this.makeRequest(`/domains/${domainName}/webhooks`)
    } catch (error) {
      console.error(`Failed to get webhooks for domain ${domainName}:`, error)
      throw error
    }
  }

  /**
   * Send test email through Mailgun
   */
  async sendTestEmail(
    domainName: string,
    to: string,
    subject: string = 'Test Email',
    text: string = 'This is a test email to verify domain setup.'
  ): Promise<any> {
    console.log(`📤 Sending test email from ${domainName} to ${to}...`)

    const params = new URLSearchParams({
      from: `noreply@${domainName}`,
      to: to,
      subject: subject,
      text: text
    })

    try {
      const result = await this.makeRequest(`/domains/${domainName}/messages`, {
        method: 'POST',
        body: params,
      })

      console.log(`✅ Test email sent successfully`)
      return result
    } catch (error) {
      console.error(`❌ Failed to send test email:`, error)
      throw error
    }
  }

  /**
   * Get domain DNS records from Mailgun
   */
  async getDomainDNSRecords(domainName: string): Promise<any> {
    try {
      const domain = await this.getDomain(domainName)
      return {
        sending_dns_records: domain.domain?.sending_dns_records || [],
        receiving_dns_records: domain.domain?.receiving_dns_records || [],
      }
    } catch (error) {
      console.error(`Failed to get DNS records for domain ${domainName}:`, error)
      throw error
    }
  }
}

export default MailgunAPI