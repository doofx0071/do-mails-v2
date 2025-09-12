import { supabase } from './client'
import type { User, Session } from '@supabase/supabase-js'
import { AuthError as SupabaseAuthError } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export interface SignInCredentials {
  email: string
  password: string
}

export interface SignUpCredentials {
  email: string
  password: string
  confirmPassword: string
}

export interface ResetPasswordCredentials {
  email: string
}

export class AuthService {
  /**
   * Sign in with email and password
   */
  static async signIn({ email, password }: SignInCredentials) {
    console.log('🔐 Attempting sign in for:', email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      console.error('❌ Sign in error:', error)

      // Provide more helpful error messages
      if (error.message.includes('Invalid login credentials')) {
        throw new SupabaseAuthError(
          'Invalid email or password. Please check your credentials and try again.'
        )
      } else if (error.message.includes('Email not confirmed')) {
        throw new SupabaseAuthError(
          'Please check your email and click the confirmation link before signing in.'
        )
      } else if (error.message.includes('Too many requests')) {
        throw new SupabaseAuthError(
          'Too many login attempts. Please wait a few minutes and try again.'
        )
      }

      throw new SupabaseAuthError(error.message)
    }

    console.log('✅ Sign in successful for:', data.user?.email)
    return data
  }

  /**
   * Sign up with email and password
   */
  static async signUp({ email, password, confirmPassword }: SignUpCredentials) {
    if (password !== confirmPassword) {
      throw new SupabaseAuthError('Passwords do not match')
    }

    if (password.length < 6) {
      throw new SupabaseAuthError('Password must be at least 6 characters long')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      throw new SupabaseAuthError(error.message)
    }

    return data
  }

  /**
   * Sign out current user
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new SupabaseAuthError(error.message)
    }

    // Clear any cached tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  /**
   * Reset password
   */
  static async resetPassword({ email }: ResetPasswordCredentials) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      throw new SupabaseAuthError(error.message)
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string) {
    if (newPassword.length < 6) {
      throw new SupabaseAuthError('Password must be at least 6 characters long')
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      throw new SupabaseAuthError(error.message)
    }
  }

  /**
   * Get current session
   */
  static async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      throw new SupabaseAuthError(error.message)
    }

    return session
  }

  /**
   * Get current user
   */
  static async getUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      throw new SupabaseAuthError(error.message)
    }

    return user
  }

  /**
   * Refresh session
   */
  static async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      throw new SupabaseAuthError(error.message)
    }

    return data
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ) {
    return supabase.auth.onAuthStateChange(callback)
  }

  /**
   * Get access token for API calls
   */
  static async getAccessToken(): Promise<string | null> {
    const session = await this.getSession()
    return session?.access_token || null
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const session = await this.getSession()
      return !!session?.user
    } catch {
      return false
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long')
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

// Auth error class
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

// Helper function to get auth headers for API calls
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AuthService.getAccessToken()

  if (!token) {
    throw new AuthError('No authentication token available')
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

// Helper function to handle auth errors
export function handleAuthError(error: any): string {
  if (error instanceof AuthError) {
    return error.message
  }

  if (error?.message) {
    return error.message
  }

  return 'An unexpected authentication error occurred'
}
