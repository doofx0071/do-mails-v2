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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* MX Records */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">MX Records</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add these MX records to your DNS provider
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {setupResult.dns_instructions.mx_records.map(
                    (record, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                      >
                        <div className="font-mono text-sm">
                          <div>
                            <strong>Type:</strong> {record.type}
                          </div>
                          <div>
                            <strong>Host:</strong> {record.host}
                          </div>
                          <div>
                            <strong>Priority:</strong> {record.priority}
                          </div>
                          <div>
                            <strong>Value:</strong> {record.value}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(record.value)}
                        >
                          <Copy className="h-4 w-4" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add these TXT records for SPF and verification
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                    <div className="font-mono text-sm">
                      <div>
                        <strong>Type:</strong>{' '}
                        {setupResult.dns_instructions.spf_record.type}
                      </div>
                      <div>
                        <strong>Host:</strong>{' '}
                        {setupResult.dns_instructions.spf_record.host}
                      </div>
                      <div>
                        <strong>Value:</strong>{' '}
                        {setupResult.dns_instructions.spf_record.value}
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
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                    <div className="font-mono text-sm">
                      <div>
                        <strong>Type:</strong>{' '}
                        {setupResult.dns_instructions.verification_record.type}
                      </div>
                      <div>
                        <strong>Host:</strong>{' '}
                        {setupResult.dns_instructions.verification_record.host}
                      </div>
                      <div>
                        <strong>Value:</strong>{' '}
                        {setupResult.dns_instructions.verification_record.value}
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
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              After adding these DNS records, verification will happen
              automatically.
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
