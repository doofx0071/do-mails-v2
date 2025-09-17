'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Copy,
  Globe,
  Mail,
  Shield,
  Loader2,
  Settings,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { getAuthHeaders } from '@/lib/supabase/auth'

interface Domain {
  id: string
  domain_name: string
  verification_status: 'pending' | 'verified' | 'failed'
  verification_token: string
  forward_to_email?: string
  verified_at?: string
  created_at: string
  updated_at: string
}

interface DNSRecord {
  type: string
  host: string
  priority?: number
  value: string
}

interface DNSStatus {
  domain: string
  mxRecordsValid: boolean
  spfRecordValid: boolean
  verificationRecordValid: boolean
  dkimRecordValid: boolean
  trackingRecordValid: boolean
  allRecordsValid: boolean
  details: {
    mxRecords: string[]
    txtRecords: string[]
    expectedVerificationToken?: string
    foundVerificationToken?: boolean
    dkimRecords?: string[]
  }
}

export default function DomainDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const domainId = params.id as string

  // Fetch domain details
  const {
    data: domain,
    isLoading: domainLoading,
    error: domainError,
  } = useQuery<Domain>({
    queryKey: ['domain', domainId],
    queryFn: async () => {
      const headers = await getAuthHeaders()

      const response = await fetch(`/api/domains/${domainId}`, {
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch domain details')
      }

      return response.json()
    },
  })

  // Fetch DNS status
  const { data: dnsStatus, isLoading: dnsLoading } = useQuery<DNSStatus>({
    queryKey: ['dns-status', domainId],
    queryFn: async () => {
      const headers = await getAuthHeaders()

      const response = await fetch(`/api/domains/${domainId}/dns-status`, {
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch DNS status')
      }

      return response.json()
    },
    enabled: !!domain,
  })

  // Fetch Mailgun DNS records
  const {
    data: mailgunDNS,
    isLoading: mailgunDNSLoading,
    error: mailgunDNSError,
  } = useQuery({
    queryKey: ['mailgun-dns', domainId],
    queryFn: async () => {
      console.log('🔍 Fetching Mailgun DNS records for domain:', domainId)
      const headers = await getAuthHeaders()
      console.log('🔑 Auth headers:', headers)

      const response = await fetch(`/api/domains/${domainId}/mailgun-dns`, {
        headers,
      })

      console.log('📡 Mailgun DNS API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Mailgun DNS API error:', errorText)
        throw new Error(
          `Failed to fetch Mailgun DNS records: ${response.status} ${errorText}`
        )
      }

      const data = await response.json()
      console.log('✅ Mailgun DNS data received:', data)
      console.log('🔍 DKIM Record structure:', data.dkimRecord)
      console.log('🔍 DKIM Record host:', data.dkimRecord?.host)
      console.log('🔍 DKIM Record value:', data.dkimRecord?.value)
      return data
    },
    enabled: !!domain,
  })

  // Refresh DNS status mutation
  const refreshDNSMutation = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders()

      const response = await fetch(`/api/domains/${domainId}/refresh-status`, {
        method: 'POST',
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to refresh DNS status')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dns-status', domainId] })
      queryClient.invalidateQueries({ queryKey: ['domain', domainId] })
      toast({
        title: 'DNS Status Refreshed',
        description: 'DNS records have been checked and status updated',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Refresh Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Verify in Mailgun mutation
  const verifyMailgunMutation = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders()

      const response = await fetch(`/api/domains/${domainId}/verify-mailgun`, {
        method: 'POST',
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to verify domain in Mailgun')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dns-status', domainId] })
      queryClient.invalidateQueries({ queryKey: ['domain', domainId] })
      toast({
        title: 'Mailgun Verification Triggered',
        description: `Domain verification has been triggered in Mailgun. Status: ${data.mailgun_status}`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Mailgun Verification Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Verified
          </Badge>
        )
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'pending':
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  if (domainLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading domain details...</span>
      </div>
    )
  }

  if (domainError || !domain) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>Failed to load domain details</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center space-x-2">
            {getStatusIcon(domain.verification_status)}
            <h1 className="text-2xl font-bold">{domain.domain_name}</h1>
            {getStatusBadge(domain.verification_status)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refreshDNSMutation.mutate()}
            disabled={refreshDNSMutation.isPending}
            variant="outline"
          >
            {refreshDNSMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh DNS
              </>
            )}
          </Button>
          <Button
            onClick={() => verifyMailgunMutation.mutate()}
            disabled={verifyMailgunMutation.isPending}
            variant="default"
          >
            {verifyMailgunMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify in Mailgun
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Domain Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            Domain Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Domain Name
              </label>
              <div className="mt-1 font-mono text-lg">{domain.domain_name}</div>
            </div>
            {domain.forward_to_email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Forwards To
                </label>
                <div className="mt-1 font-mono text-lg">
                  {domain.forward_to_email}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Added
              </label>
              <div className="mt-1">
                {new Date(domain.created_at).toLocaleDateString()}
              </div>
            </div>
            {domain.verified_at && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Verified
                </label>
                <div className="mt-1">
                  {new Date(domain.verified_at).toLocaleDateString()}
                </div>
              </div>
            )}
            <div className="col-span-1 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">
                Verification Token
              </label>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 break-all rounded border bg-muted/50 p-2 font-mono text-sm">
                  {domain.verification_token}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      domain.verification_token,
                      'Verification token'
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Add this as a TXT record for:{' '}
                <code className="rounded bg-muted px-1">
                  _domails-verify.{domain.domain_name}
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DKIM Warning for Reply Feature */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Reply Feature Requires DKIM
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                To reply from{' '}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
                  @{domain.domain_name}
                </code>{' '}
                without being marked as spam, you must add the DKIM record to
                your DNS. See the "Required DNS Records" section below for
                details.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DNS Status Overview */}
      {dnsStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              DNS Status Overview
            </CardTitle>
            <CardDescription>
              Real-time status of your DNS records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-2">
                {dnsStatus.mxRecordsValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">MX Records</span>
                <Badge
                  variant={dnsStatus.mxRecordsValid ? 'default' : 'destructive'}
                >
                  {dnsStatus.mxRecordsValid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {dnsStatus.spfRecordValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">SPF Record</span>
                <Badge
                  variant={dnsStatus.spfRecordValid ? 'default' : 'destructive'}
                >
                  {dnsStatus.spfRecordValid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {dnsStatus.verificationRecordValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">Verification</span>
                <Badge
                  variant={
                    dnsStatus.verificationRecordValid
                      ? 'default'
                      : 'destructive'
                  }
                >
                  {dnsStatus.verificationRecordValid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>
            </div>

            {dnsStatus.allRecordsValid && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">
                    All DNS records are properly configured!
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DNS Records Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* MX Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              MX Records
            </CardTitle>
            <CardDescription>
              Mail exchange records for email delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dnsLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Checking DNS...</span>
              </div>
            ) : dnsStatus?.details.mxRecords.length ? (
              <div className="space-y-3">
                {dnsStatus.details.mxRecords.map((record, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border bg-muted/50 p-3"
                  >
                    <div className="break-all font-mono text-sm">{record}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(record, 'MX Record')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                <p>No MX records found</p>
                <p className="text-sm">
                  Add the required MX records to your DNS provider
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TXT Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              TXT Records
            </CardTitle>
            <CardDescription>SPF and verification records</CardDescription>
          </CardHeader>
          <CardContent>
            {dnsLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Checking DNS...</span>
              </div>
            ) : dnsStatus?.details.txtRecords.length ? (
              <div className="space-y-3">
                {dnsStatus.details.txtRecords.map((record, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border bg-muted/50 p-3"
                  >
                    <div className="break-all font-mono text-sm">{record}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(record, 'TXT Record')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                <p>No TXT records found</p>
                <p className="text-sm">
                  Add the required TXT records to your DNS provider
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DNS Records Setup with Real-time Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              <div>
                <CardTitle>DNS Records Setup</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time verification status of your DNS records
                </p>
              </div>
            </div>
            <Button
              onClick={() => refreshDNSMutation.mutate()}
              disabled={refreshDNSMutation.isPending}
              variant="outline"
              size="sm"
            >
              {refreshDNSMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Status
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Core Email Records */}
            <div>
              <h4 className="mb-3 font-semibold text-blue-800 dark:text-blue-200">
                📧 Core Email Records
              </h4>
              <div className="space-y-3">
                {/* MX Records */}
                <div
                  className={`rounded-lg border p-4 ${
                    dnsStatus?.mxRecordsValid
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {dnsStatus?.mxRecordsValid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">MX Records</span>
                    </div>
                    <Badge
                      variant={
                        dnsStatus?.mxRecordsValid ? 'default' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {dnsStatus?.mxRecordsValid ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2 font-mono">
                      <span className="text-muted-foreground">Type: MX</span>
                      <span className="text-muted-foreground">Host: @</span>
                      <span className="text-muted-foreground">
                        Priority: 10
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      <div className="flex items-center justify-between">
                        <code className="text-xs">mxa.mailgun.org</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard('mxa.mailgun.org', 'MX record')
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <code className="text-xs">mxb.mailgun.org</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard('mxb.mailgun.org', 'MX record')
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SPF Record */}
                <div
                  className={`rounded-lg border p-4 ${
                    dnsStatus?.spfRecordValid
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {dnsStatus?.spfRecordValid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">SPF Record</span>
                    </div>
                    <Badge
                      variant={
                        dnsStatus?.spfRecordValid ? 'default' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {dnsStatus?.spfRecordValid ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <span className="text-muted-foreground">Type: TXT</span>
                      <span className="text-muted-foreground">Host: @</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="break-all text-xs">
                        v=spf1 include:mailgun.org ~all
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            'v=spf1 include:mailgun.org ~all',
                            'SPF record'
                          )
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Verification Record */}
                <div
                  className={`rounded-lg border p-4 ${
                    dnsStatus?.verificationRecordValid
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {dnsStatus?.verificationRecordValid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">Verification Record</span>
                    </div>
                    <Badge
                      variant={
                        dnsStatus?.verificationRecordValid
                          ? 'default'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {dnsStatus?.verificationRecordValid
                        ? 'Verified'
                        : 'Unverified'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <span className="text-muted-foreground">Type: TXT</span>
                      <span className="text-muted-foreground">
                        Host: _domails-verify
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="break-all text-xs">
                        {domain?.verification_token || 'Loading...'}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            domain?.verification_token || 'Loading...',
                            'Verification token'
                          )
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong>Required for domain ownership.</strong> Add this
                      TXT record to prove you own the domain.
                    </p>
                  </div>
                </div>

                {/* DKIM Record - Required for Replies */}
                <div
                  className={`rounded-lg border p-4 ${
                    dnsStatus?.dkimRecordValid
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {dnsStatus?.dkimRecordValid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">DKIM Record</span>
                    </div>
                    <Badge
                      variant={
                        dnsStatus?.dkimRecordValid ? 'default' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {dnsStatus?.dkimRecordValid ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <span className="text-muted-foreground">Type: TXT</span>
                      <span className="text-muted-foreground">
                        Host: {mailgunDNS?.dkimRecord?.host || 'pic._domainkey'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="break-all text-xs">
                        {mailgunDNSLoading
                          ? 'Loading DKIM value...'
                          : mailgunDNS?.dkimRecord?.value
                            ? mailgunDNS.dkimRecord.value
                            : mailgunDNS?.success === false
                              ? `Error: ${mailgunDNS?.error || 'Unknown error'}`
                              : 'Get DKIM value from Mailgun dashboard'}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            mailgunDNS?.dkimRecord?.value ||
                              'Visit Mailgun dashboard for DKIM value',
                            'DKIM record'
                          )
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {!mailgunDNSLoading && !mailgunDNS?.dkimRecord?.value && (
                      <div className="mt-2 rounded bg-amber-50 p-2 dark:bg-amber-950">
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          💡 <strong>Manual Setup:</strong> Visit your Mailgun
                          dashboard → Domain Settings → Copy the DKIM TXT record
                          value for pic._domainkey.{domain?.domain_name}
                        </p>
                        {mailgunDNSError && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            🚨 <strong>API Error:</strong>{' '}
                            {mailgunDNSError.message}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      <strong>Required to reply from your domain.</strong>{' '}
                      Without this, replies will be marked as spam. Get the DKIM
                      value from your Mailgun dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Records */}
            <div>
              <h4 className="mb-3 font-semibold text-blue-800 dark:text-blue-200">
                🔧 Optional (Analytics Features)
              </h4>
              <div className="space-y-3">
                {/* Tracking Record */}
                <div
                  className={`rounded-lg border p-4 ${
                    dnsStatus?.trackingRecordValid
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {dnsStatus?.trackingRecordValid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="font-medium">Tracking Record</span>
                    </div>
                    <Badge
                      variant={
                        dnsStatus?.trackingRecordValid ? 'default' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {dnsStatus?.trackingRecordValid ? 'Verified' : 'Optional'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <span className="text-muted-foreground">Type: CNAME</span>
                      <span className="text-muted-foreground">Host: email</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-xs">mailgun.org</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard('mailgun.org', 'Tracking record')
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Required for email tracking (opens, clicks, unsubscribes).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
