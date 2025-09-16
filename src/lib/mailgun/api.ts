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
    this.domain = process.env.MAILGUN_DOMAIN || ''
    
    // Auto-detect region if MAILGUN_BASE_URL not provided
    const region = process.env.MAILGUN_REGION?.toUpperCase()
    if (process.env.MAILGUN_BASE_URL) {
      this.baseUrl = process.env.MAILGUN_BASE_URL
    } else {
      this.baseUrl = region === 'EU' ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3'
    }
    
    // Validate configuration
    if (!this.apiKey) {
      console.warn('⚠️ MAILGUN_API_KEY not configured')
    }
    
    // Warn if base URL doesn't look like a Mailgun endpoint
    if (!this.baseUrl.includes('mailgun.net')) {
      console.warn(`⚠️ MAILGUN_BASE_URL '${this.baseUrl}' doesn't appear to be a Mailgun endpoint`)
    }
    
    console.log(`🗺️ Mailgun API configured for region: ${region || 'US'} at ${this.baseUrl}`)
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
    // Mailgun uses HTTP Basic Auth with username='api' and password=API_KEY (no prefix needed)
    const auth = Buffer.from(`api:${this.apiKey}`).toString('base64')
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        ...options.headers,
      },
    })

    let bodyText = ''
    let data: any = null
    try {
      data = await response.json()
    } catch {
      try { 
        bodyText = await response.text() 
      } catch { 
        bodyText = 'Unable to read response body'
      }
    }
    
    if (!response.ok) {
      console.error(`Mailgun API Error ${response.status} ${response.statusText} on ${options.method || 'GET'} ${url}`)
      if (data) console.error('Response JSON:', JSON.stringify(data).slice(0, 500))
      if (!data && bodyText) console.error('Response Text:', bodyText.slice(0, 500))
      const msg = data?.message || `${response.status} ${response.statusText}`
      throw new Error(`Mailgun API error on ${endpoint}: ${msg}`)
    }

    return data ?? bodyText
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
      // Use v3 API for listing domains (v4 doesn't exist for domains endpoint)
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
   * Ensure domain exists in Mailgun before setting up webhooks
   */
  async ensureDomainExists(domainName: string): Promise<void> {
    try {
      await this.getDomain(domainName)
      console.log(`✅ Domain ${domainName} exists in Mailgun`)
    } catch (e: any) {
      if (String(e?.message || '').toLowerCase().includes('not found')) {
        throw new Error(`Mailgun domain ${domainName} not found. Ensure addDomain completed and propagated before webhook setup.`)
      }
      throw e
    }
  }

  /**
   * Set up webhook for domain (idempotent)
   */
  async setupWebhook(
    domainName: string, 
    webhookUrl: string, 
    events: string[] = ['delivered', 'permanent_fail', 'temporary_fail', 'complained', 'unsubscribed', 'opened', 'clicked']
  ): Promise<any> {
    console.log(`🎣 Setting up webhooks for domain ${domainName}...`)

    try {
      // Ensure domain exists first
      await this.ensureDomainExists(domainName)
      
      const results: Array<{event: string; action: 'created' | 'updated'; result: any}> = []
      
      for (const event of events) {
        try {
          // Check if webhook exists
          await this.makeRequest(`/domains/${domainName}/webhooks/${event}`, { method: 'GET' })
          // Exists – update it
          const updateParams = new URLSearchParams({ url: webhookUrl })
          const updated = await this.makeRequest(`/domains/${domainName}/webhooks/${event}`, {
            method: 'PUT',
            body: updateParams,
          })
          results.push({ event, action: 'updated', result: updated })
        } catch (getErr: any) {
          // Not found – create it
          if (String(getErr?.message || '').toLowerCase().includes('not found')) {
            const createParams = new URLSearchParams({ id: event, url: webhookUrl })
            const created = await this.makeRequest(`/domains/${domainName}/webhooks`, {
              method: 'POST',
              body: createParams,
            })
            results.push({ event, action: 'created', result: created })
          } else {
            console.error(`❌ Failed checking webhook ${event} on ${domainName}:`, getErr)
            throw getErr
          }
        }
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
      const result = await this.makeRequest(`/${domainName}/messages`, {
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