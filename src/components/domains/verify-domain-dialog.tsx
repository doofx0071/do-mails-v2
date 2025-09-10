'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Copy, CheckCircle, AlertCircle } from 'lucide-react'
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

interface VerifyDomainDialogProps {
  domain: Domain | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerify: () => void
  isVerifying: boolean
}

export function VerifyDomainDialog({ 
  domain, 
  open, 
  onOpenChange, 
  onVerify, 
  isVerifying 
}: VerifyDomainDialogProps) {
  const { toast } = useToast()

  if (!domain) return null

  const recordName = `_domails-verify.${domain.domain_name}`
  const recordValue = domain.verification_token

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      })
    }).catch(() => {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      })
    })
  }

  const handleVerify = () => {
    onVerify()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Verify Domain Ownership</DialogTitle>
          <DialogDescription>
            Add a DNS TXT record to verify that you own {domain.domain_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                DNS Configuration Required
              </CardTitle>
              <CardDescription>
                Add the following TXT record to your domain's DNS settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Record Type</label>
                  <Badge variant="secondary">TXT</Badge>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Name/Host</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(recordName, 'Record name')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                  {recordName}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Value</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(recordValue, 'Record value')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                  {recordValue}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">TTL</label>
                </div>
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  300 (or minimum allowed)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Log in to your DNS provider's control panel</li>
                <li>Navigate to DNS management for <strong>{domain.domain_name}</strong></li>
                <li>Create a new TXT record with the details above</li>
                <li>Save the record and wait for DNS propagation (usually 5-15 minutes)</li>
                <li>Click "Verify Domain" below to complete verification</li>
              </ol>
            </CardContent>
          </Card>

          {domain.verification_status === 'failed' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Previous verification failed</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Make sure the DNS record is correctly configured and try again.
                  DNS changes can take up to 24 hours to propagate globally.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isVerifying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Domain'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
