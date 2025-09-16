'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { AddDomainForwardingDialog } from './add-domain-forwarding-dialog'
import { VerifyDomainDialog } from './verify-domain-dialog'
import { DeleteDomainDialog } from './delete-domain-dialog'
import { useToast } from '@/components/ui/use-toast'

interface Domain {
  id: string
  domain_name: string
  verification_status: 'pending' | 'verified' | 'failed'
  verification_token: string
  verified_at?: string
  created_at: string
  updated_at: string
  forward_to_email?: string // For forwarding config domains
  source?: 'forwarding_config' | 'database' // Source type
}

interface DomainsResponse {
  domains: Domain[]
}

export function DomainList() {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [verifyingDomain, setVerifyingDomain] = useState<Domain | null>(null)
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  // Fetch domains with fallback to public API
  const { data, isLoading, error } = useQuery<DomainsResponse>({
    queryKey: ['domains'],
    queryFn: async () => {
      try {
        // Try authenticated API first
        const { domainsAPI } = await import('@/lib/api/client')
        return await domainsAPI.list()
      } catch (authError) {
        console.log('Authenticated API failed, trying public API:', authError)

        // Fallback to public API for forwarding config domains
        const response = await fetch('/api/domains/public')
        if (!response.ok) {
          throw new Error(`Failed to fetch domains: ${response.statusText}`)
        }
        return response.json()
      }
    },
  })

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: (domainId: string) =>
      import('@/lib/api/client').then(({ domainsAPI }) =>
        domainsAPI.verify(domainId)
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      setVerifyingDomain(null)

      if (data.success) {
        toast({
          title: 'Domain Verified',
          description: `${data.domain.domain_name} has been successfully verified!`,
        })
      } else {
        toast({
          title: 'Verification Failed',
          description: data.error || 'Domain verification failed',
          variant: 'destructive',
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Refresh status mutation
  const refreshStatusMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/domains/${domainId}/refresh-status`, {
        method: 'POST',
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to refresh status')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })

      if (data.success) {
        const status = data.domain.verification_status
        const message = data.message || 'Status refreshed'

        toast({
          title: status === 'verified' ? 'Domain Verified!' : 'Status Updated',
          description: message,
          variant: status === 'verified' ? 'default' : 'secondary',
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Refresh Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/domains/${domainId}/delete`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete domain')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      setDeletingDomain(null)

      toast({
        title: 'Domain Deleted',
        description: `${data.deleted_domain} has been successfully deleted`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Verified
          </Badge>
        )
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const handleVerifyDomain = (domain: Domain) => {
    setVerifyingDomain(domain)
  }

  const handleVerifyConfirm = () => {
    if (verifyingDomain) {
      verifyDomainMutation.mutate(verifyingDomain.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading domains...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span>Failed to load domains: {(error as Error).message}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const domains = data?.domains || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Domains</h2>
          <p className="text-muted-foreground">
            Manage your custom domains for email aliases and forwarding
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Domain
        </Button>
      </div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="mb-2 text-lg font-semibold">No domains yet</h3>
              <p className="mb-4 text-muted-foreground">
                Add your first domain to start creating email aliases and
                forwarding
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Domain
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {domains.map((domain) => (
            <Card key={domain.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(domain.verification_status)}
                    <CardTitle
                      className="flex cursor-pointer items-center gap-2 text-lg transition-colors hover:text-primary"
                      onClick={() =>
                        router.push(`/dashboard/domains/${domain.id}`)
                      }
                    >
                      {domain.domain_name}
                      <ExternalLink className="h-4 w-4 opacity-50" />
                    </CardTitle>
                  </div>
                  {getStatusBadge(domain.verification_status)}
                </div>
                <CardDescription>
                  Added {new Date(domain.created_at).toLocaleDateString()}
                  {domain.verified_at && (
                    <span className="ml-2">
                      • Verified{' '}
                      {new Date(domain.verified_at).toLocaleDateString()}
                    </span>
                  )}
                  {domain.forward_to_email && (
                    <div className="mt-1 text-sm">
                      <span className="font-medium">Forwarding to:</span>{' '}
                      {domain.forward_to_email}
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {domain.verification_status === 'pending' && (
                      <span>Add DNS records, then refresh to verify</span>
                    )}
                    {domain.verification_status === 'verified' && (
                      <span>✅ Ready to receive emails</span>
                    )}
                    {domain.verification_status === 'failed' && (
                      <span>Verification failed - check DNS records</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Refresh Status Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshStatusMutation.mutate(domain.id)}
                      disabled={
                        refreshStatusMutation.isPending ||
                        verifyDomainMutation.isPending
                      }
                    >
                      {refreshStatusMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh
                        </>
                      )}
                    </Button>

                    {/* Legacy Verify Button (if needed) */}
                    {domain.verification_status !== 'verified' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerifyDomain(domain)}
                        disabled={
                          verifyDomainMutation.isPending ||
                          refreshStatusMutation.isPending
                        }
                      >
                        {verifyDomainMutation.isPending &&
                        verifyingDomain?.id === domain.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          'Manual Verify'
                        )}
                      </Button>
                    )}

                    {/* Delete Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingDomain(domain)}
                      disabled={deleteDomainMutation.isPending}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddDomainForwardingDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      <VerifyDomainDialog
        domain={verifyingDomain}
        open={!!verifyingDomain}
        onOpenChange={(open) => !open && setVerifyingDomain(null)}
        onVerify={handleVerifyConfirm}
        isVerifying={verifyDomainMutation.isPending}
      />

      <DeleteDomainDialog
        domain={deletingDomain}
        open={!!deletingDomain}
        onOpenChange={(open) => !open && setDeletingDomain(null)}
        onConfirm={() =>
          deletingDomain && deleteDomainMutation.mutate(deletingDomain.id)
        }
        isDeleting={deleteDomainMutation.isPending}
      />
    </div>
  )
}
