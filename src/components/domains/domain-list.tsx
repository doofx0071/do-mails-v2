'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { AddDomainDialog } from './add-domain-dialog'
import { VerifyDomainDialog } from './verify-domain-dialog'
import { useToast } from '@/components/ui/use-toast'

interface Domain {
  id: string
  domain_name: string
  verification_status: 'pending' | 'verified' | 'failed'
  verification_token: string
  verified_at?: string
  created_at: string
  updated_at: string
}

interface DomainsResponse {
  domains: Domain[]
}

export function DomainList() {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [verifyingDomain, setVerifyingDomain] = useState<Domain | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch domains
  const { data, isLoading, error } = useQuery<DomainsResponse>({
    queryKey: ['domains'],
    queryFn: () => import('@/lib/api/client').then(({ domainsAPI }) => domainsAPI.list())
  })

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: (domainId: string) =>
      import('@/lib/api/client').then(({ domainsAPI }) => domainsAPI.verify(domainId)),
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
          variant: 'destructive'
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Error',
        description: error.message,
        variant: 'destructive'
      })
    }
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
        return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>
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
            Manage your custom domains for email alias creation
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </Button>
      </div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No domains yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first domain to start creating email aliases
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
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
                    <CardTitle className="text-lg">{domain.domain_name}</CardTitle>
                  </div>
                  {getStatusBadge(domain.verification_status)}
                </div>
                <CardDescription>
                  Added {new Date(domain.created_at).toLocaleDateString()}
                  {domain.verified_at && (
                    <span className="ml-2">
                      • Verified {new Date(domain.verified_at).toLocaleDateString()}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {domain.verification_status === 'pending' && (
                      <span>Verification required to create aliases</span>
                    )}
                    {domain.verification_status === 'verified' && (
                      <span>Ready to create email aliases</span>
                    )}
                    {domain.verification_status === 'failed' && (
                      <span>Verification failed - please try again</span>
                    )}
                  </div>
                  {domain.verification_status !== 'verified' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyDomain(domain)}
                      disabled={verifyDomainMutation.isPending}
                    >
                      {verifyDomainMutation.isPending && verifyingDomain?.id === domain.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify Domain'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddDomainDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['domains'] })
          setShowAddDialog(false)
        }}
      />

      <VerifyDomainDialog
        domain={verifyingDomain}
        open={!!verifyingDomain}
        onOpenChange={(open) => !open && setVerifyingDomain(null)}
        onVerify={handleVerifyConfirm}
        isVerifying={verifyDomainMutation.isPending}
      />
    </div>
  )
}
