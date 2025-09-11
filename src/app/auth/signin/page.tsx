'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, AlertCircle } from 'lucide-react'
import { AuthService } from '@/lib/supabase/auth'
import { useToast } from '@/components/ui/use-toast'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Please fill in all fields')
      }

      if (!AuthService.validateEmail(email)) {
        throw new Error('Please enter a valid email address')
      }

      // Sign in
      const { user, session } = await AuthService.signIn({ email, password })

      if (!user || !session) {
        throw new Error('Sign in failed. Please try again.')
      }

      // Store token for API calls (temporary until we fully migrate to Supabase auth)
      localStorage.setItem('auth_token', session.access_token)

      console.log('Authentication successful, user:', user.email)
      console.log('Auth provider will handle redirect...')

      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      })

      // The auth provider will handle the redirect automatically
      
    } catch (error: any) {
      console.error('Sign in error:', error)
      setError(error.message || 'An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2">
            <Mail className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">do-Mails</span>
          </Link>
          <p className="mt-2 text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        {/* Sign In Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="text-primary hover:underline"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Account Info */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium mb-2">Demo Account</p>
              <p>Email: demo@veenusra.com</p>
              <p>Password: demo123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
