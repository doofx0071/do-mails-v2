'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, AlertTriangle, Mail } from 'lucide-react'
import { toast } from 'sonner'

interface MailgunSetupDialogProps {
  domainId: string
  domainName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MailgunStatus {
  domain: string
  mailgun_configured: boolean
  mailgun_status: string
  domain_exists: boolean
  can_send_emails: boolean
  message: string
}

export function MailgunSetupDialog({
  domainId,
  domainName,
  open,
  onOpenChange,
}: MailgunSetupDialogProps) {
  const queryClient = useQueryClient()

  // Query to check current Mailgun status
  const { data: status, isLoading: statusLoading, refetch } = useQuery<MailgunStatus>({
    queryKey: ['mailgun-status', domainId],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/domains/${domainId}/setup-mailgun`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to check Mailgun status')
      }
      
      return response.json()
    },
    enabled: open,
  })

  // Mutation to setup Mailgun
  const setupMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/domains/${domainId}/setup-mailgun`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to setup Mailgun')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      toast.success('Mailgun setup completed successfully!')
      refetch() // Refresh status
      queryClient.invalidateQueries({ queryKey: ['domains'] })
    },
    onError: (error: Error) => {
      toast.error(`Setup failed: ${error.message}`)
    },
  })

  const getStatusBadge = (status?: MailgunStatus) => {
    if (!status) return null

    if (!status.mailgun_configured) {
      return <Badge variant="destructive">Not Configured</Badge>
    }

    if (!status.domain_exists) {
      return <Badge variant="destructive">Not Added</Badge>
    }

    switch (status.mailgun_status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>
      case 'unverified':
        return <Badge variant="secondary">Unverified</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{status.mailgun_status}</Badge>
    }
  }

  const getStatusIcon = (status?: MailgunStatus) => {
    if (!status) return <Loader2 className="h-4 w-4 animate-spin" />

    if (status.can_send_emails) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }

    if (!status.domain_exists) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }

    return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mailgun Setup - {domainName}
          </DialogTitle>
          <DialogDescription>
            Configure your domain in Mailgun to enable email sending and receiving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="space-y-3">
            <h4 className="font-medium">Current Status</h4>
            
            {statusLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Checking status...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mailgun Status:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    {getStatusBadge(status)}
                  </div>
                </div>
                
                {status && (
                  <Alert>
                    <AlertDescription>
                      {status.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Setup Actions */}
          {status && !status.can_send_emails && (
            <div className="space-y-3">
              <h4 className="font-medium">Setup Required</h4>
              
              {!status.mailgun_configured ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Mailgun is not configured. Please check your environment variables.
                  </AlertDescription>
                </Alert>
              ) : !status.domain_exists ? (
                <div className="space-y-3">
                  <Alert>
                    <AlertDescription>
                      This domain needs to be added to your Mailgun account to enable email sending.
                    </AlertDescription>
                  </Alert>
                  
                  <Button
                    onClick={() => setupMutation.mutate()}
                    disabled={setupMutation.isPending}
                    className="w-full"
                  >
                    {setupMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up Mailgun...
                      </>
                    ) : (
                      'Add Domain to Mailgun'
                    )}
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Domain exists in Mailgun but may need DNS verification. 
                    Check your Mailgun dashboard for DNS setup instructions.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Success State */}
          {status?.can_send_emails && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ✅ Domain is ready! You can now send and receive emails from {domainName}.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={statusLoading}
            >
              {statusLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Refresh Status
            </Button>
            
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
