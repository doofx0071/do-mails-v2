import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Create Supabase client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types for our database schema
export interface Database {
  public: {
    Tables: {
      domains: {
        Row: {
          id: string
          user_id: string
          domain_name: string
          verification_status: 'pending' | 'verified' | 'failed'
          verification_token: string
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain_name: string
          verification_status?: 'pending' | 'verified' | 'failed'
          verification_token: string
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          domain_name?: string
          verification_status?: 'pending' | 'verified' | 'failed'
          verification_token?: string
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_aliases: {
        Row: {
          id: string
          domain_id: string
          alias_name: string
          is_enabled: boolean
          last_email_received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          domain_id: string
          alias_name: string
          is_enabled?: boolean
          last_email_received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          domain_id?: string
          alias_name?: string
          is_enabled?: boolean
          last_email_received_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_threads: {
        Row: {
          id: string
          alias_id: string
          subject: string
          participants: string[]
          message_count: number
          last_message_at: string
          is_archived: boolean
          labels: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          alias_id: string
          subject: string
          participants: string[]
          message_count?: number
          last_message_at: string
          is_archived?: boolean
          labels?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          alias_id?: string
          subject?: string
          participants?: string[]
          message_count?: number
          last_message_at?: string
          is_archived?: boolean
          labels?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      email_messages: {
        Row: {
          id: string
          thread_id: string
          alias_id: string
          message_id: string
          in_reply_to: string | null
          references: string[]
          from_address: string
          to_addresses: string[]
          cc_addresses: string[]
          bcc_addresses: string[]
          subject: string
          body_text: string | null
          body_html: string | null
          is_read: boolean
          is_sent: boolean
          mailgun_message_id: string | null
          received_at: string
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          alias_id: string
          message_id: string
          in_reply_to?: string | null
          references?: string[]
          from_address: string
          to_addresses: string[]
          cc_addresses?: string[]
          bcc_addresses?: string[]
          subject: string
          body_text?: string | null
          body_html?: string | null
          is_read?: boolean
          is_sent?: boolean
          mailgun_message_id?: string | null
          received_at: string
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          alias_id?: string
          message_id?: string
          in_reply_to?: string | null
          references?: string[]
          from_address?: string
          to_addresses?: string[]
          cc_addresses?: string[]
          bcc_addresses?: string[]
          subject?: string
          body_text?: string | null
          body_html?: string | null
          is_read?: boolean
          is_sent?: boolean
          mailgun_message_id?: string | null
          received_at?: string
          created_at?: string
        }
      }
      email_attachments: {
        Row: {
          id: string
          message_id: string
          filename: string
          content_type: string
          size: number
          storage_path: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          filename: string
          content_type: string
          size: number
          storage_path: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          filename?: string
          content_type?: string
          size?: number
          storage_path?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
