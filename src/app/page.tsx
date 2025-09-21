'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { Mail, Shield, Globe, Inbox, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/providers/auth-provider'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="relative h-screen w-full overflow-hidden bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null
  }
  return (
    <div className="relative h-screen w-full overflow-hidden bg-white dark:bg-gray-950">
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
      <div className="relative z-10">
        {/* Header */}
        <header className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            {/* Logo - Protected from copying */}
            <div
              className="flex select-none items-center space-x-3"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
            >
              <div
                className="pointer-events-none"
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitUserDrag: 'none',
                  WebkitTouchCallout: 'none',
                } as React.CSSProperties}
              >
                <Logo withText={true} width={160} height={48} />
              </div>
            </div>

            {/* Navigation - Empty for clean design */}
            <nav className="hidden items-center space-x-6 md:flex">
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <ThemeToggle />
              <Link href="/auth/signin" className="hidden sm:block">
                <Button variant="outline" size="sm" className="font-medium">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex flex-col">
          {/* Hero Content */}
          <div className="flex-1 flex items-center justify-center py-4 sm:py-8">
            <div className="mx-auto max-w-6xl text-center">
              <h1 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
                Personal Email
                <span className="block text-blue-600 dark:text-blue-400">
                  Alias Management
                </span>
              </h1>

              <p className="mx-auto mb-6 sm:mb-8 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300 px-4 sm:px-0">
                My personal system to create unlimited email aliases, manage domains, and organize
                communications with privacy-first approach.
              </p>

              <div className="mb-6 sm:mb-8 flex justify-center px-4 sm:px-0">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="w-full max-w-xs sm:w-auto px-8 py-3 text-base font-medium"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              {/* Features Grid - Compact & Responsive */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 lg:gap-6 px-4 sm:px-0">
                {/* Feature 1 */}
                <div className="group rounded-2xl border border-gray-200 bg-white/50 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-600">
                  <div className="mb-2 sm:mb-3 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-100 transition-transform duration-300 group-hover:scale-110 dark:bg-blue-900/30">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="mb-1 sm:mb-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                    Domain Management
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    Add and verify custom domains with DNS configuration.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="group rounded-2xl border border-gray-200 bg-white/50 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-600">
                  <div className="mb-2 sm:mb-3 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-green-100 transition-transform duration-300 group-hover:scale-110 dark:bg-green-900/30">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="mb-1 sm:mb-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                    Unlimited Aliases
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    Create unlimited email aliases with instant activation.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="group rounded-2xl border border-gray-200 bg-white/50 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-600">
                  <div className="mb-2 sm:mb-3 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-purple-100 transition-transform duration-300 group-hover:scale-110 dark:bg-purple-900/30">
                    <Inbox className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="mb-1 sm:mb-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                    Unified Inbox
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    Manage emails in Gmail-like interface with filtering.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="group rounded-2xl border border-gray-200 bg-white/50 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-600">
                  <div className="mb-2 sm:mb-3 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-orange-100 transition-transform duration-300 group-hover:scale-110 dark:bg-orange-900/30">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="mb-1 sm:mb-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                    Privacy First
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    Reply from aliases to maintain privacy and security.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </main>

          {/* Simple Footer */}
          <footer className="py-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © 2024 do-Mails — Personal email alias management tool
            </p>
          </footer>
      </div>
    </div>
  )
}
