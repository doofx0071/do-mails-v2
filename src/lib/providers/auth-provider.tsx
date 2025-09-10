'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { AuthService, type AuthState } from '@/lib/supabase/auth'

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, confirmPassword: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        
        // Store token for API calls if session exists
        if (session?.access_token) {
          localStorage.setItem('auth_token', session.access_token)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.access_token) {
        localStorage.setItem('auth_token', session.access_token)
      } else {
        localStorage.removeItem('auth_token')
      }

      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          // User signed in successfully
          break
        case 'SIGNED_OUT':
          // User signed out
          router.push('/auth/signin')
          break
        case 'TOKEN_REFRESHED':
          // Token was refreshed
          if (session?.access_token) {
            localStorage.setItem('auth_token', session.access_token)
          }
          break
        case 'USER_UPDATED':
          // User profile was updated
          break
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [router])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      await AuthService.signIn({ email, password })
      // The auth state change listener will handle the rest
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, confirmPassword: string) => {
    setLoading(true)
    try {
      await AuthService.signUp({ email, password, confirmPassword })
      // The auth state change listener will handle the rest
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await AuthService.signOut()
      // The auth state change listener will handle the rest
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    await AuthService.resetPassword({ email })
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
