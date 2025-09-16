// Database-based storage for domain forwarding configurations
// This works on serverless platforms like Vercel
import { createServiceClient } from '@/lib/supabase/server'

interface ForwardingConfig {
  domain: string
  forward_to: string
  created_at: string
  verification_token: string
  status: 'pending' | 'verified'
  enabled: boolean
}

export class ForwardingConfigDBManager {
  private static supabase = createServiceClient()

  /**
   * Add or update forwarding configuration for a domain
   */
  static async setConfig(domain: string, config: Omit<ForwardingConfig, 'domain'>): Promise<void> {
    const domainKey = domain.toLowerCase()
    
    try {
      // Try to update existing record first
      const { error: updateError } = await this.supabase
        .from('domain_forwarding_configs')
        .upsert({
          domain: domainKey,
          forward_to: config.forward_to,
          created_at: config.created_at,
          verification_token: config.verification_token,
          status: config.status,
          enabled: config.enabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'domain'
        })

      if (updateError) {
        console.error('Failed to save forwarding config to database:', updateError)
        throw updateError
      }

      console.log(`📧 Forwarding config saved to database for ${domainKey} -> ${config.forward_to}`)
    } catch (error) {
      console.error('Error saving forwarding config:', error)
      throw error
    }
  }

  /**
   * Get forwarding configuration for a domain
   */
  static async getConfig(domain: string): Promise<ForwardingConfig | null> {
    const domainKey = domain.toLowerCase()
    
    try {
      const { data, error } = await this.supabase
        .from('domain_forwarding_configs')
        .select('*')
        .eq('domain', domainKey)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error getting forwarding config for ${domainKey}:`, error)
      return null
    }
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
    try {
      const { data, error } = await this.supabase
        .from('domain_forwarding_configs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error listing forwarding configs:', error)
      return []
    }
  }

  /**
   * Remove forwarding configuration for a domain
   */
  static async removeConfig(domain: string): Promise<boolean> {
    const domainKey = domain.toLowerCase()
    
    try {
      const { error } = await this.supabase
        .from('domain_forwarding_configs')
        .delete()
        .eq('domain', domainKey)

      if (error) {
        throw error
      }

      console.log(`🗑️ Forwarding config deleted for ${domainKey}`)
      return true
    } catch (error) {
      console.error(`Error deleting forwarding config for ${domainKey}:`, error)
      return false
    }
  }

  /**
   * Enable/disable forwarding for a domain
   */
  static async setEnabled(domain: string, enabled: boolean): Promise<boolean> {
    const domainKey = domain.toLowerCase()
    
    try {
      const { error } = await this.supabase
        .from('domain_forwarding_configs')
        .update({ 
          enabled,
          updated_at: new Date().toISOString()
        })
        .eq('domain', domainKey)

      if (error) {
        throw error
      }

      return true
    } catch (error) {
      console.error(`Error updating forwarding status for ${domainKey}:`, error)
      return false
    }
  }

  /**
   * Update verification status for a domain
   */
  static async setVerificationStatus(domain: string, status: 'pending' | 'verified'): Promise<boolean> {
    const domainKey = domain.toLowerCase()
    
    try {
      const { error } = await this.supabase
        .from('domain_forwarding_configs')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('domain', domainKey)

      if (error) {
        throw error
      }

      return true
    } catch (error) {
      console.error(`Error updating verification status for ${domainKey}:`, error)
      return false
    }
  }
}

export default ForwardingConfigDBManager