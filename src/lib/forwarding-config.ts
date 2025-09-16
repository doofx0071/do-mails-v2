// Simple in-memory storage for domain forwarding configurations
// In production, this would be stored in a database table

interface ForwardingConfig {
  domain: string
  forward_to: string
  created_at: string
  verification_token: string
  status: 'pending' | 'verified'
  enabled: boolean
}

// In-memory storage (for development/testing)
const forwardingConfigs = new Map<string, ForwardingConfig>()

export class ForwardingConfigManager {
  /**
   * Add or update forwarding configuration for a domain
   */
  static setConfig(domain: string, config: Omit<ForwardingConfig, 'domain'>): void {
    const domainKey = domain.toLowerCase()
    forwardingConfigs.set(domainKey, {
      domain: domainKey,
      ...config
    })
    console.log(`📧 Forwarding config set for ${domainKey} -> ${config.forward_to}`)
  }

  /**
   * Get forwarding configuration for a domain
   */
  static getConfig(domain: string): ForwardingConfig | null {
    const domainKey = domain.toLowerCase()
    return forwardingConfigs.get(domainKey) || null
  }

  /**
   * Check if domain has forwarding enabled
   */
  static isForwardingEnabled(domain: string): boolean {
    const config = this.getConfig(domain)
    return config ? config.enabled && (config.status === 'verified' || config.status === 'pending') : false
  }

  /**
   * Get forwarding email for a domain
   */
  static getForwardingEmail(domain: string): string | null {
    const config = this.getConfig(domain)
    return config && this.isForwardingEnabled(domain) ? config.forward_to : null
  }

  /**
   * List all forwarding configurations
   */
  static listConfigs(): ForwardingConfig[] {
    return Array.from(forwardingConfigs.values())
  }

  /**
   * Remove forwarding configuration for a domain
   */
  static removeConfig(domain: string): boolean {
    const domainKey = domain.toLowerCase()
    return forwardingConfigs.delete(domainKey)
  }

  /**
   * Enable/disable forwarding for a domain
   */
  static setEnabled(domain: string, enabled: boolean): boolean {
    const config = this.getConfig(domain)
    if (!config) return false
    
    config.enabled = enabled
    this.setConfig(domain, config)
    return true
  }

  /**
   * Update verification status for a domain
   */
  static setVerificationStatus(domain: string, status: 'pending' | 'verified'): boolean {
    const config = this.getConfig(domain)
    if (!config) return false
    
    config.status = status
    this.setConfig(domain, config)
    return true
  }
}

export default ForwardingConfigManager