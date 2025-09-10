'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Mail, MoreHorizontal, Copy } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AddAliasDialog } from './add-alias-dialog'
import { useToast } from '@/components/ui/use-toast'

interface Alias {
  id: string
  domain_id: string
  alias_name: string
  full_address: string
  is_enabled: boolean
  last_email_received_at?: string
  created_at: string
  updated_at: string
}

interface Domain {
  id: string
  domain_name: string
  verification_status: string
}

interface AliasesResponse {
  aliases: Alias[]
}

interface DomainsResponse {
  domains: Domain[]
}

export function AliasList() {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<string>('all')
  const [enabledFilter, setEnabledFilter] = useState<string>('all')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch domains for filter
  const { data: domainsData } = useQuery<DomainsResponse>({
    queryKey: ['domains'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch('/api/domains?status=verified', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch domains')
      }

      return response.json()
    }
  })

  // Fetch aliases
  const { data, isLoading, error } = useQuery<AliasesResponse>({
    queryKey: ['aliases', selectedDomain, enabledFilter],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const params = new URLSearchParams()
      if (selectedDomain !== 'all') {
        params.append('domain_id', selectedDomain)
      }
      if (enabledFilter !== 'all') {
        params.append('enabled', enabledFilter)
      }

      const response = await fetch(`/api/aliases?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch aliases')
      }

      return response.json()
    }
  })

  // Toggle alias enabled status
  const toggleAliasMutation = useMutation({
    mutationFn: async ({ aliasId, isEnabled }: { aliasId: string, isEnabled: boolean }) => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/aliases/${aliasId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_enabled: isEnabled
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update alias')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliases'] })
      toast({
        title: 'Alias Updated',
        description: 'Alias status has been updated successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied!',
        description: 'Email address copied to clipboard',
      })
    }).catch(() => {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      })
    })
  }

  const handleToggleAlias = (alias: Alias) => {
    toggleAliasMutation.mutate({
      aliasId: alias.id,
      isEnabled: !alias.is_enabled
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading aliases...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <Mail className="h-5 w-5" />
            <span>Failed to load aliases: {(error as Error).message}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const aliases = data?.aliases || []
  const domains = domainsData?.domains || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Aliases</h2>
          <p className="text-muted-foreground">
            Manage your email aliases and their settings
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Alias
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Domain:</label>
          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {domains.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  {domain.domain_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <Select value={enabledFilter} onValueChange={setEnabledFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {aliases.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No aliases found</h3>
              <p className="text-muted-foreground mb-4">
                {selectedDomain !== 'all' || enabledFilter !== 'all'
                  ? 'No aliases match your current filters'
                  : 'Create your first email alias to get started'
                }
              </p>
              {selectedDomain === 'all' && enabledFilter === 'all' && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Alias
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {aliases.map((alias) => (
            <Card key={alias.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{alias.full_address}</CardTitle>
                      <CardDescription>
                        Created {new Date(alias.created_at).toLocaleDateString()}
                        {alias.last_email_received_at && (
                          <span className="ml-2">
                            • Last email {new Date(alias.last_email_received_at).toLocaleDateString()}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={alias.is_enabled ? "default" : "secondary"}>
                      {alias.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyToClipboard(alias.full_address)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Address
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {alias.is_enabled 
                      ? 'Receiving emails' 
                      : 'Not receiving emails'
                    }
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Enabled</label>
                    <Switch
                      checked={alias.is_enabled}
                      onCheckedChange={() => handleToggleAlias(alias)}
                      disabled={toggleAliasMutation.isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddAliasDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        domains={domains}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['aliases'] })
          setShowAddDialog(false)
        }}
      />
    </div>
  )
}
