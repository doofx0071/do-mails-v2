'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Mail, Archive, ArchiveRestore, Users, Clock, Tag, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { ComposeEmailDialog } from './compose-email-dialog'
import { SearchFilter } from './search-filter'

interface EmailThread {
  id: string
  alias_id: string
  subject: string
  participants: string[]
  message_count: number
  last_message_at: string
  is_archived: boolean
  labels: string[]
  created_at: string
  updated_at: string
  alias: {
    id: string
    alias_name: string
    full_address: string
  }
}

interface Domain {
  id: string
  domain_name: string
  verification_status: string
}

interface ThreadsResponse {
  threads: EmailThread[]
  total: number
  has_more: boolean
  limit: number
  offset: number
}

interface DomainsResponse {
  domains: Domain[]
}

interface ThreadListProps {
  onThreadSelect: (thread: EmailThread) => void
  selectedThreadId?: string
}

export function ThreadList({ onThreadSelect, selectedThreadId }: ThreadListProps) {
  const [showComposeDialog, setShowComposeDialog] = useState(false)
  const [archivedFilter, setArchivedFilter] = useState<string>('false')
  const [selectedAlias, setSelectedAlias] = useState<string>('all')
  const [searchFilters, setSearchFilters] = useState<{
    query?: string
    alias_id?: string
    sender?: string
    subject?: string
    date_from?: Date
    date_to?: Date
    archived?: boolean
  }>({})
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch domains for alias filter
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

  // Fetch threads
  const { data, isLoading, error } = useQuery<ThreadsResponse>({
    queryKey: ['email-threads', archivedFilter, selectedAlias, searchFilters],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const params = new URLSearchParams()
      if (archivedFilter !== 'all') {
        params.append('archived', archivedFilter)
      }
      if (selectedAlias !== 'all') {
        params.append('alias_id', selectedAlias)
      }
      params.append('limit', '50')

      const response = await fetch(`/api/emails/threads?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch threads')
      }

      return response.json()
    }
  })

  // Archive/Unarchive thread mutation
  const archiveMutation = useMutation({
    mutationFn: async ({ threadId, isArchived }: { threadId: string; isArchived: boolean }) => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/emails/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_archived: isArchived })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update thread')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.isArchived ? 'Thread Archived' : 'Thread Unarchived',
        description: `Thread has been ${variables.isArchived ? 'archived' : 'unarchived'} successfully`,
      })
      // Refresh threads list
      queryClient.invalidateQueries({ queryKey: ['email-threads'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getParticipantsText = (participants: string[], aliasAddress: string) => {
    const others = participants.filter(p => p !== aliasAddress)
    if (others.length === 0) return 'No participants'
    if (others.length === 1) return others[0]
    if (others.length === 2) return others.join(', ')
    return `${others[0]} and ${others.length - 1} others`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading threads...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <Mail className="h-5 w-5" />
            <span>Failed to load threads: {(error as Error).message}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const threads = data?.threads || []
  const domains = domainsData?.domains || []

  // Fetch aliases for search filter
  const { data: aliasesData } = useQuery<{ aliases: Alias[] }>({
    queryKey: ['aliases'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch('/api/aliases?enabled=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch aliases')
      }

      return response.json()
    }
  })

  const allAliases = aliasesData?.aliases || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Threads</h2>
          <p className="text-muted-foreground">
            Manage your email conversations
          </p>
        </div>
        <Button onClick={() => setShowComposeDialog(true)}>
          <Mail className="h-4 w-4 mr-2" />
          Compose
        </Button>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        aliases={allAliases}
        filters={searchFilters}
        onFiltersChange={setSearchFilters}
        onClearFilters={() => setSearchFilters({})}
      />

      {/* Legacy Filters - Keep for now but can be removed later */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <Select value={archivedFilter} onValueChange={setArchivedFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">Active</SelectItem>
              <SelectItem value="true">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {threads.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No email threads</h3>
              <p className="text-muted-foreground mb-4">
                {archivedFilter === 'true' 
                  ? 'No archived conversations found'
                  : 'No active conversations found'
                }
              </p>
              <Button onClick={() => setShowComposeDialog(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Send Your First Email
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <Card
              key={thread.id}
              className={`transition-colors hover:bg-muted/50 ${
                selectedThreadId === thread.id ? 'ring-2 ring-primary' : ''
              } ${thread.is_archived ? 'opacity-75' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onThreadSelect(thread)}
                  >
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base truncate">
                        {thread.subject || '(No Subject)'}
                      </CardTitle>
                      {thread.is_archived && (
                        <Badge variant="secondary" className="text-xs">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Users className="h-3 w-3" />
                      <span className="truncate">
                        {getParticipantsText(thread.participants, thread.alias.full_address)}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(thread.last_message_at)}
                    </div>

                    {/* Thread Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            archiveMutation.mutate({
                              threadId: thread.id,
                              isArchived: !thread.is_archived
                            })
                          }}
                          disabled={archiveMutation.isPending}
                        >
                          {thread.is_archived ? (
                            <>
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Unarchive
                            </>
                          ) : (
                            <>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>via {thread.alias.full_address}</span>
                  </div>
                  <Badge variant="outline">
                    {thread.message_count} message{thread.message_count !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Labels */}
                {thread.labels && thread.labels.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {thread.labels.map((label, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ComposeEmailDialog
        open={showComposeDialog}
        onOpenChange={setShowComposeDialog}
        domains={domains}
        onSuccess={() => {
          setShowComposeDialog(false)
          // Refresh threads list
          // queryClient.invalidateQueries({ queryKey: ['email-threads'] })
        }}
      />
    </div>
  )
}
