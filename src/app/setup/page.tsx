'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Check, Copy, Mail, Globe, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface DNSRecord {
  type: string
  host: string
  priority?: number
  value: string
}

interface SetupResult {
  success: boolean
  domain: {
    id: string
    domain_name: string
    forward_to_email: string
    verification_status: string
  }
  dns_instructions: {
    mx_records: DNSRecord[]
    spf_record: DNSRecord
    verification_record: DNSRecord
  }
  message: string
}

export default function SetupPage() {
  const [domain, setDomain] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null)

  const handleSetup = async () => {
    if (!domain || !email) {
      toast.error('Please enter both domain and email address')
      return
    }

    setLoading(true)
    try {
      // Get auth token for API call
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch('/api/domains/setup-forwarding', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          domain_name: domain,
          forward_to_email: email,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSetupResult(result)
        toast.success('Domain setup successful!')
      } else {
        toast.error(result.error || 'Setup failed')
      }
    } catch (error) {
      toast.error('Failed to setup domain')
      console.error('Setup error:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  if (setupResult) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <Badge className="mb-4" variant="secondary">
              <Check className="mr-2 h-4 w-4" />
              Domain Configured
            </Badge>
            <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              Setup Complete!
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              {setupResult.message}
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                Domain Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Domain
                  </label>
                  <div className="mt-1 font-mono text-lg">
                    {setupResult.domain.domain_name}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Forwards to
                  </label>
                  <div className="mt-1 font-mono text-lg">
                    {setupResult.domain.forward_to_email}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* MX Records */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">MX Records</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add these MX records to your DNS provider
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {setupResult.dns_instructions.mx_records.map(
                    (record, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                            <div>
                              <span className="font-medium text-muted-foreground">
                                Type:
                              </span>
                              <div className="font-mono">{record.type}</div>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">
                                Host:
                              </span>
                              <div className="break-all font-mono">
                                {record.host}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">
                                Priority:
                              </span>
                              <div className="font-mono">{record.priority}</div>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <span className="font-medium text-muted-foreground">
                                Value:
                              </span>
                              <div className="break-all font-mono text-xs sm:text-sm">
                                {record.value}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(record.value)}
                          className="w-full sm:w-auto"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Value
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* TXT Records */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">TXT Records</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add these TXT records for SPF and verification
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* SPF Record */}
                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <span className="font-medium text-muted-foreground">
                            Type:
                          </span>
                          <div className="font-mono">
                            {setupResult.dns_instructions.spf_record.type}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">
                            Host:
                          </span>
                          <div className="break-all font-mono">
                            {setupResult.dns_instructions.spf_record.host}
                          </div>
                        </div>
                        <div className="col-span-1 sm:col-span-1">
                          <span className="font-medium text-muted-foreground">
                            Value:
                          </span>
                          <div className="break-all font-mono text-xs sm:text-sm">
                            {setupResult.dns_instructions.spf_record.value}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          setupResult.dns_instructions.spf_record.value
                        )
                      }
                      className="w-full sm:w-auto"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy SPF
                    </Button>
                  </div>

                  {/* Verification Record */}
                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <span className="font-medium text-muted-foreground">
                            Type:
                          </span>
                          <div className="font-mono">
                            {
                              setupResult.dns_instructions.verification_record
                                .type
                            }
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">
                            Host:
                          </span>
                          <div className="break-all font-mono">
                            {
                              setupResult.dns_instructions.verification_record
                                .host
                            }
                          </div>
                        </div>
                        <div className="col-span-1 sm:col-span-1">
                          <span className="font-medium text-muted-foreground">
                            Value:
                          </span>
                          <div className="break-all font-mono text-xs sm:text-sm">
                            {
                              setupResult.dns_instructions.verification_record
                                .value
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          setupResult.dns_instructions.verification_record.value
                        )
                      }
                      className="w-full sm:w-auto"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Verification
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DKIM Records - Email Authentication */}
            {setupResult.dns_instructions.dkim_records &&
              setupResult.dns_instructions.dkim_records.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      DKIM Records
                      <Badge variant="secondary" className="text-xs">
                        Optional
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add these TXT records for DKIM email authentication.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {setupResult.dns_instructions.dkim_records.map(
                        (record, index) => (
                          <div
                            key={index}
                            className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="space-y-1">
                              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                                <div>
                                  <span className="font-medium text-muted-foreground">
                                    Type:
                                  </span>
                                  <div className="font-mono">{record.type}</div>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">
                                    Host:
                                  </span>
                                  <div className="break-all font-mono">
                                    {record.host}
                                  </div>
                                </div>
                                <div className="col-span-1 sm:col-span-1">
                                  <span className="font-medium text-muted-foreground">
                                    Value:
                                  </span>
                                  <div className="break-all font-mono text-xs sm:text-sm">
                                    {record.value}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(record.value)}
                              className="w-full sm:w-auto"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy DKIM
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Tracking Records - Optional for Advanced Features */}
            {setupResult.dns_instructions.tracking_records &&
              setupResult.dns_instructions.tracking_records.length > 0 && (
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      Tracking Records
                      <Badge variant="secondary" className="text-xs">
                        Optional
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      <strong>Optional:</strong> Add these CNAME records for
                      email tracking (opens, clicks, unsubscribes). Required
                      only if you need detailed email analytics and tracking
                      features.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {setupResult.dns_instructions.tracking_records.map(
                        (record, index) => (
                          <div
                            key={index}
                            className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="space-y-1">
                              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                                <div>
                                  <span className="font-medium text-muted-foreground">
                                    Type:
                                  </span>
                                  <div className="font-mono">{record.type}</div>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">
                                    Host:
                                  </span>
                                  <div className="break-all font-mono">
                                    {record.host}
                                  </div>
                                </div>
                                <div className="col-span-1 sm:col-span-1">
                                  <span className="font-medium text-muted-foreground">
                                    Value:
                                  </span>
                                  <div className="break-all font-mono text-xs sm:text-sm">
                                    {record.value}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(record.value)}
                              className="w-full sm:w-auto"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Tracking
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

          <div className="mt-8 text-center">
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <h3 className="mb-2 font-semibold text-blue-800 dark:text-blue-200">
                📧 Complete Email Platform Setup
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>
                  For full functionality (receive + reply from your domain):
                </strong>
                <br />• <strong>Required:</strong> MX Records + TXT Records (SPF
                + Verification + DKIM)
                <br />• <strong>Optional:</strong> Tracking Records (for email
                analytics)
                <br />
                <em>
                  DKIM is required to reply from your custom domain without
                  being marked as spam.
                </em>
              </p>
            </div>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              After adding the required DNS records, verification will happen
              automatically. Add optional records later if you need advanced
              features.
            </p>
            <Button onClick={() => (window.location.href = '/dashboard')}>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
            Set &amp; Forget Email Forwarding
          </h1>
          <p className="mb-2 text-xl text-gray-600 dark:text-gray-300">
            Set up in seconds to send &amp; receive emails from your custom
            domain.
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Absolutely free. Rock-solid infrastructure. World-class support.
          </p>
        </div>

        {/* Setup Form */}
        <Card className="mx-auto mb-12 max-w-2xl">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your domain name
                </label>
                <Input
                  type="text"
                  placeholder="yourdomain.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="flex items-center justify-center">
                <Badge variant="outline" className="px-4 py-2 text-sm">
                  FORWARDS TO
                </Badge>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your email address
                </label>
                <Input
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-lg"
                />
              </div>

              <Button
                onClick={handleSetup}
                disabled={loading}
                className="w-full py-6 text-lg"
                size="lg"
              >
                {loading ? 'Setting up...' : 'Create Free Alias'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                No credit card required.{' '}
                <span className="cursor-pointer text-blue-600 hover:underline">
                  Full privacy protection.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="text-center">
            <CardContent className="p-6">
              <Mail className="mx-auto mb-4 h-12 w-12 text-blue-600" />
              <h3 className="mb-2 text-lg font-semibold">Email Forwarding</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Forward all emails from your domain to your existing email
                address instantly.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Globe className="mx-auto mb-4 h-12 w-12 text-green-600" />
              <h3 className="mb-2 text-lg font-semibold">Full Inbox</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Access your forwarded emails in a unified inbox with reply
                capability.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Shield className="mx-auto mb-4 h-12 w-12 text-purple-600" />
              <h3 className="mb-2 text-lg font-semibold">Privacy First</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reply using your domain address while keeping your personal
                email private.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
