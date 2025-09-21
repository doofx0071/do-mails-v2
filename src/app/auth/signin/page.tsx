'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, AlertCircle, ArrowLeft } from 'lucide-react'
import { AuthService } from '@/lib/supabase/auth'
import { useToast } from '@/components/ui/use-toast'
import { Logo } from '@/components/ui/logo'

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
    <div className="relative min-h-screen w-full bg-white dark:bg-gray-950">
      {/* Noise Texture Background - Light Mode */}
      <div
        className="absolute inset-0 z-0 dark:hidden"
        style={{
          background: '#ffffff',
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.35) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Noise Texture Background - Dark Mode */}
      <div
        className="absolute inset-0 z-0 hidden dark:block"
        style={{
          background: '#030712',
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        {/* Back Button */}
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center space-x-2">
              <Logo withText={true} width={150} height={45} />
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

        </div>
      </div>
    </div>
  )
}
