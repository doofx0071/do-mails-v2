'use client'

import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { Mail, Shield, Globe, Inbox, ArrowRight, Check } from 'lucide-react'

export default function Home() {
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

            {/* Navigation */}
            <nav className="hidden items-center space-x-6 md:flex">
              <Link
                href="#features"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Pricing
              </Link>
              <Link
                href="#about"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                About
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <ThemeToggle />
              <Link href="/auth/signin" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="text-sm">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero Content */}
          <div className="py-12 text-center sm:py-16 lg:py-20">
            <div className="mx-auto max-w-4xl">
              <h1 className="mb-6 text-4xl font-bold leading-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
                Professional Email
                <span className="block text-blue-600 dark:text-blue-400">
                  Alias Management
                </span>
              </h1>

              <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-300 sm:text-xl">
                Create unlimited email aliases, manage domains, and organize
                your communications with our powerful, privacy-first email
                management system.
              </p>

              <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="w-full px-8 py-3 text-base sm:w-auto"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full px-8 py-3 text-base sm:w-auto"
                  >
                    View Demo
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>No Credit Card Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>14-Day Free Trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Cancel Anytime</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <section id="features" className="py-16 sm:py-20">
            <div className="mb-12 text-center sm:mb-16">
              <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                Everything You Need
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
                Powerful features designed to give you complete control over
                your email communications
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
              {/* Feature 1 */}
              <div className="group rounded-2xl border border-gray-200 bg-white/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-600">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition-transform duration-300 group-hover:scale-110 dark:bg-blue-900/30">
                  <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                  Domain Management
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  Add and verify your custom domains with automatic DNS
                  configuration and real-time validation.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group rounded-2xl border border-gray-200 bg-white/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-600">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 transition-transform duration-300 group-hover:scale-110 dark:bg-green-900/30">
                  <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                  Unlimited Aliases
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  Create unlimited email aliases under your verified domains
                  with instant activation and management.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group rounded-2xl border border-gray-200 bg-white/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-600">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 transition-transform duration-300 group-hover:scale-110 dark:bg-purple-900/30">
                  <Inbox className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                  Unified Inbox
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  Manage all your emails in a single, Gmail-like interface with
                  advanced filtering and organization.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group rounded-2xl border border-gray-200 bg-white/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-600">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 transition-transform duration-300 group-hover:scale-110 dark:bg-orange-900/30">
                  <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                  Privacy First
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  Reply from alias addresses to maintain your privacy with
                  end-to-end encryption and secure storage.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 sm:py-20">
            <div className="text-center">
              <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white/50 p-8 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/50 sm:p-12">
                <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                  Ready to Get Started?
                </h2>
                <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
                  Join thousands of users who trust do-Mails for their email
                  management needs.
                </p>
                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                  <Link href="/auth/signup">
                    <Button
                      size="lg"
                      className="w-full px-8 py-3 text-base sm:w-auto"
                    >
                      Start Your Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/auth/signin">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full px-8 py-3 text-base sm:w-auto"
                    >
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              {/* Company Info */}
              <div className="md:col-span-2">
                <div
                  className="mb-4 flex select-none items-center space-x-3"
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
                    <Logo withText={true} width={120} height={36} />
                  </div>
                </div>
                <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
                  Professional email alias management system designed for
                  privacy, security, and ease of use.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                  Product
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="#features"
                      className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#pricing"
                      className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/auth/signup"
                      className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      Get Started
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                  Support
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="#"
                      className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-8 text-center dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                © 2024 do-Mails. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
