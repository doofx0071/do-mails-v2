'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle, Copy, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface DNSVerificationResult {
  domain: string
  mxRecordsValid: boolean
  spfRecordValid: boolean
  verificationRecordValid: boolean
  allRecordsValid: boolean
  details: {
    mxRecords: string[]
    txtRecords: string[]
    expectedVerificationToken?: string
    foundVerificationToken?: boolean
  }
}

interface StatusInfo {
  status: 'pending' | 'partial' | 'verified'
  message: string
  nextSteps: string[]
}

interface DNSStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  domain?: {
    id: string
    domain_name: string
    verification_status: string
  }
  dnsVerification?: DNSVerificationResult
  statusInfo?: StatusInfo
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function DNSStatusDialog({
  open,
  onOpenChange,
  domain,
  dnsVerification,
  statusInfo,
  onRefresh,
  isRefreshing = false
}: DNSStatusDialogProps) {
  const { toast } = useToast()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      description: 'DNS record copied to clipboard',
    })
  }

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusBadge = (isValid: boolean) => {
    return (
      <Badge variant={isValid ? 'default' : 'destructive'} className="ml-2">
        {isValid ? 'Valid' : 'Missing'}
      </Badge>
    )
  }

  if (!domain || !dnsVerification || !statusInfo) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {statusInfo.status === 'verified' ? (
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
            )}
            DNS Status for {domain.domain_name}
          </DialogTitle>
          <DialogDescription>
            {statusInfo.message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Verification Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {statusInfo.status === 'verified' 
                      ? 'All DNS records are properly configured' 
                      : 'Some DNS records need attention'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={statusInfo.status === 'verified' ? 'default' : 'secondary'}
                    className="text-sm"
                  >
                    {statusInfo.status === 'verified' ? '✅ Verified' : '⏳ Pending'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DNS Record Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* MX Records */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  {getStatusIcon(dnsVerification.mxRecordsValid)}
                  <span className="ml-2">MX Records</span>
                  {getStatusBadge(dnsVerification.mxRecordsValid)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-2">
                  Required for receiving emails
                </p>
                <div className="space-y-1">
                  <div className="text-xs font-mono bg-muted p-2 rounded">
                    Expected: mxa.mailgun.org, mxb.mailgun.org
                  </div>
                  {dnsVerification.details.mxRecords.length > 0 && (
                    <div className="text-xs">
                      <strong>Found:</strong> {dnsVerification.details.mxRecords.join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SPF Record */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  {getStatusIcon(dnsVerification.spfRecordValid)}
                  <span className="ml-2">SPF Record</span>
                  {getStatusBadge(dnsVerification.spfRecordValid)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-2">
                  Authorizes sending emails
                </p>
                <div className="space-y-1">
                  <div className="text-xs font-mono bg-muted p-2 rounded flex items-center justify-between">
                    <span>v=spf1 include:mailgun.org ~all</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard('v=spf1 include:mailgun.org ~all')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Record */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  {getStatusIcon(dnsVerification.verificationRecordValid)}
                  <span className="ml-2">Verification</span>
                  {getStatusBadge(dnsVerification.verificationRecordValid)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-2">
                  Proves domain ownership
                </p>
                <div className="space-y-1">
                  <div className="text-xs font-mono bg-muted p-2 rounded flex items-center justify-between">
                    <span className="truncate mr-2">
                      {dnsVerification.details.expectedVerificationToken}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(dnsVerification.details.expectedVerificationToken || '')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps */}
          {statusInfo.nextSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {statusInfo.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                        {index + 1}
                      </span>
                      <span className="text-sm">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">How to add DNS records:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Log into your domain registrar (GoDaddy, Namecheap, etc.)</li>
                <li>Navigate to DNS management or DNS settings</li>
                <li>Add the required MX and TXT records shown above</li>
                <li>Save changes and wait 5-10 minutes for DNS propagation</li>
                <li>Click "Refresh" to check the updated status</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}