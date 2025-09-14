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
import {
  Loader2,
  Mail,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react'
import { AuthService } from '@/lib/supabase/auth'
import { useToast } from '@/components/ui/use-toast'
import { Logo } from '@/components/ui/logo'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate inputs
      if (!email || !password || !confirmPassword) {
        throw new Error('Please fill in all fields')
      }

      if (!AuthService.validateEmail(email)) {
        throw new Error('Please enter a valid email address')
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      const passwordValidation = AuthService.validatePassword(password)
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0])
      }

      // Sign up
      const { user } = await AuthService.signUp({
        email,
        password,
        confirmPassword,
      })

      if (user) {
        setSuccess(true)
        toast({
          title: 'Account created!',
          description: 'Please check your email to verify your account.',
        })
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      setError(error.message || 'An error occurred during sign up')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
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
            <div className="text-center">
              <Link href="/" className="inline-flex items-center space-x-2">
                <Mail className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">do-Mails</span>
              </Link>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Check Your Email
                </CardTitle>
                <CardDescription>
                  We've sent you a verification link
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    We've sent a verification email to <strong>{email}</strong>.
                    Please click the link in the email to verify your account.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder.
                  </p>
                  <Link
                    href="/auth/signin"
                    className="text-sm text-primary hover:underline"
                  >
                    Back to sign in
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
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
            <p className="mt-2 text-muted-foreground">Create your account</p>
          </div>

          {/* Sign Up Form */}
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>
                Create an account to start managing your email aliases
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
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters with uppercase, lowercase, and
                    numbers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
