// File-based storage for domain forwarding configurations
// This provides persistence across server restarts

import fs from 'fs/promises'
import path from 'path'

interface ForwardingConfig {
  domain: string
  forward_to: string
  created_at: string
  verification_token: string
  status: 'pending' | 'verified'
  enabled: boolean
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'forwarding-configs.json')

export class ForwardingConfigFileManager {
  /**
   * Ensure data directory exists
   */
  private static async ensureDataDir(): Promise<void> {
    const dataDir = path.dirname(CONFIG_FILE_PATH)
    try {
      await fs.access(dataDir)
    } catch {
      await fs.mkdir(dataDir, { recursive: true })
    }
  }

  /**
   * Load all configurations from file
   */
  private static async loadConfigs(): Promise<Record<string, ForwardingConfig>> {
    try {
      await this.ensureDataDir()
      const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // File doesn't exist or is invalid, return empty object
      return {}
    }
  }

  /**
   * Save all configurations to file
   */
  private static async saveConfigs(configs: Record<string, ForwardingConfig>): Promise<void> {
    await this.ensureDataDir()
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(configs, null, 2))
  }

  /**
   * Add or update forwarding configuration for a domain
   */
  static async setConfig(domain: string, config: Omit<ForwardingConfig, 'domain'>): Promise<void> {
    const domainKey = domain.toLowerCase()
    const configs = await this.loadConfigs()
    
    configs[domainKey] = {
      domain: domainKey,
      ...config
    }
    
    await this.saveConfigs(configs)
    console.log(`📧 Forwarding config saved to file for ${domainKey} -> ${config.forward_to}`)
  }

  /**
   * Get forwarding configuration for a domain
   */
  static async getConfig(domain: string): Promise<ForwardingConfig | null> {
    const domainKey = domain.toLowerCase()
    const configs = await this.loadConfigs()
    return configs[domainKey] || null
  }

  /**
   * Check if domain has forwarding enabled
   */
  static async isForwardingEnabled(domain: string): Promise<boolean> {
    const config = await this.getConfig(domain)
    return config ? config.enabled && (config.status === 'verified' || config.status === 'pending') : false
  }

  /**
   * Get forwarding email for a domain
   */
  static async getForwardingEmail(domain: string): Promise<string | null> {
    const config = await this.getConfig(domain)
    const isEnabled = await this.isForwardingEnabled(domain)
    return config && isEnabled ? config.forward_to : null
  }

  /**
   * List all forwarding configurations
   */
  static async listConfigs(): Promise<ForwardingConfig[]> {
    const configs = await this.loadConfigs()
    return Object.values(configs)
  }

  /**
   * Remove forwarding configuration for a domain
   */
  static async removeConfig(domain: string): Promise<boolean> {
    const domainKey = domain.toLowerCase()
    const configs = await this.loadConfigs()
    
    if (configs[domainKey]) {
      delete configs[domainKey]
      await this.saveConfigs(configs)
      return true
    }
    
    return false
  }

  /**
   * Enable/disable forwarding for a domain
   */
  static async setEnabled(domain: string, enabled: boolean): Promise<boolean> {
    const config = await this.getConfig(domain)
    if (!config) return false
    
    config.enabled = enabled
    await this.setConfig(domain, config)
    return true
  }

  /**
   * Update verification status for a domain
   */
  static async setVerificationStatus(domain: string, status: 'pending' | 'verified'): Promise<boolean> {
    const config = await this.getConfig(domain)
    if (!config) return false
    
    config.status = status
    await this.setConfig(domain, config)
    return true
  }
}

export default ForwardingConfigFileManager