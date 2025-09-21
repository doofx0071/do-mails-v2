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
      queryClient.invalidateQueries({ queryKey: ['mailgun-dns', domainId] })
      toast({
        title: 'DNS Status Refreshed',
        description: 'DNS records and DKIM values have been updated',
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
    <div className="space-y-6">
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
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Domain Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Domain Information</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="font-medium text-muted-foreground mb-1">Domain Name</div>
              <div className="font-mono">{domain.domain_name}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground mb-1">Added</div>
              <div>{new Date(domain.created_at).toLocaleDateString()}</div>
            </div>
            {domain.verified_at && (
              <div>
                <div className="font-medium text-muted-foreground mb-1">Verified</div>
                <div>{new Date(domain.verified_at).toLocaleDateString()}</div>
              </div>
            )}
            <div>
              <div className="font-medium text-muted-foreground mb-1">Default Forward Email</div>
              <div className="font-mono">
                {domain.forward_to_email || domain.default_forward_email || (
                  <span className="text-muted-foreground italic">Catch-all forwarding</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* DNS Records Setup with Real-time Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            <CardTitle>DNS Records Setup</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* MX Records */}
            <div
              className={`rounded-lg border p-3 ${
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
                  <span className="font-medium text-sm">MX Records</span>
                </div>
                <Badge
                  variant={
                    dnsStatus?.mxRecordsValid ? 'default' : 'destructive'
                  }
                  className="text-xs"
                >
                  {dnsStatus?.mxRecordsValid ? 'Verified' : 'Required'}
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="grid grid-cols-3 gap-2 font-mono text-muted-foreground">
                  <span>Type: MX</span>
                  <span>Host: @</span>
                  <span>Priority: 10</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <code className="text-xs bg-muted/50 px-1 rounded">mxa.mailgun.org</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() =>
                        copyToClipboard('mxa.mailgun.org', 'MX record')
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="text-xs bg-muted/50 px-1 rounded">mxb.mailgun.org</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
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
              className={`rounded-lg border p-3 ${
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
                  <span className="font-medium text-sm">SPF Record</span>
                </div>
                <Badge
                  variant={
                    dnsStatus?.spfRecordValid ? 'default' : 'destructive'
                  }
                  className="text-xs"
                >
                  {dnsStatus?.spfRecordValid ? 'Verified' : 'Required'}
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="grid grid-cols-2 gap-2 font-mono text-muted-foreground">
                  <span>Type: TXT</span>
                  <span>Host: @</span>
                </div>
                <div className="flex items-center justify-between">
                  <code className="break-all text-xs bg-muted/50 px-1 rounded">
                    v=spf1 include:mailgun.org ~all
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
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
              className={`rounded-lg border p-3 ${
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
                  <span className="font-medium text-sm">Verification Record</span>
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
                    : 'Required'}
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="grid grid-cols-2 gap-2 font-mono text-muted-foreground">
                  <span>Type: TXT</span>
                  <span>Host: _domails-verify</span>
                </div>
                <div className="flex items-center justify-between">
                  <code className="break-all text-xs bg-muted/50 px-1 rounded">
                    {domain?.verification_token || 'Loading...'}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
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
              </div>
            </div>

            {/* DKIM Record */}
            <div
              className={`rounded-lg border p-3 ${
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
                  <span className="font-medium text-sm">DKIM Record</span>
                </div>
                <Badge
                  variant={
                    dnsStatus?.dkimRecordValid ? 'default' : 'destructive'
                  }
                  className="text-xs"
                >
                  {dnsStatus?.dkimRecordValid ? 'Verified' : 'Required'}
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="grid grid-cols-2 gap-2 font-mono text-muted-foreground">
                  <span>Type: TXT</span>
                  <span>Host: pic._domainkey</span>
                </div>
                <div className="flex items-center justify-between">
                  <code className="break-all text-xs bg-muted/50 px-1 rounded max-w-[200px] truncate">
                    {mailgunDNSLoading ? (
                      'Loading DKIM...'
                    ) : mailgunDNS?.success === false ? (
                      <span className="text-red-600">Domain not in Mailgun</span>
                    ) : mailgunDNS?.dkimRecord?.value ? (
                      mailgunDNS.dkimRecord.value
                    ) : mailgunDNSError ? (
                      <span className="text-red-600">Failed to fetch</span>
                    ) : (
                      <span className="text-amber-600">No DKIM record found</span>
                    )}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => {
                      const dkimValue = mailgunDNS?.dkimRecord?.value
                      if (dkimValue) {
                        copyToClipboard(dkimValue, 'DKIM record')
                      } else {
                        toast({
                          title: 'No DKIM Value',
                          description: 'DKIM record not available. Please ensure domain is added to Mailgun.',
                          variant: 'destructive'
                        })
                      }
                    }}
                    disabled={!mailgunDNS?.dkimRecord?.value}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {mailgunDNSError && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded dark:bg-red-950">
                    <strong>Error:</strong> {mailgunDNSError.message}
                  </div>
                )}
                {mailgunDNS?.success === false && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded dark:bg-amber-950">
                    <strong>Domain not in Mailgun:</strong> {mailgunDNS.message || 'Please add this domain to Mailgun first.'}
                  </div>
                )}
                {!mailgunDNSLoading && !mailgunDNSError && mailgunDNS?.success !== false && !mailgunDNS?.dkimRecord?.value && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded dark:bg-amber-950">
                    <strong>No DKIM record:</strong> Domain exists in Mailgun but DKIM record is not available. It may still be generating.
                  </div>
                )}
              </div>
            </div>

            {/* Tracking Record */}
            <div
              className={`rounded-lg border p-3 ${
                dnsStatus?.trackingRecordValid
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {dnsStatus?.trackingRecordValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium text-sm">Tracking Record</span>
                </div>
                <Badge
                  variant={
                    dnsStatus?.trackingRecordValid ? 'default' : 'destructive'
                  }
                  className="text-xs"
                >
                  {dnsStatus?.trackingRecordValid ? 'Verified' : 'Required'}
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="grid grid-cols-2 gap-2 font-mono text-muted-foreground">
                  <span>Type: CNAME</span>
                  <span>Host: email</span>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-xs bg-muted/50 px-1 rounded">mailgun.org</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() =>
                      copyToClipboard('mailgun.org', 'Tracking record')
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
