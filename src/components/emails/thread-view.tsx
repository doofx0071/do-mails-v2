'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, 
  Mail, 
  Archive, 
  ArchiveRestore, 
  Reply, 
  MoreHorizontal,
  User,
  Calendar,
  Paperclip
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'

interface EmailMessage {
  id: string
  thread_id: string
  alias_id: string
  message_id: string
  in_reply_to?: string
  references: string[]
  from_address: string
  to_addresses: string[]
  cc_addresses: string[]
  bcc_addresses: string[]
  subject: string
  body_text?: string
  body_html?: string
  is_read: boolean
  is_sent: boolean
  mailgun_message_id?: string
  received_at: string
  created_at: string
  attachments: any[]
}

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
  messages: EmailMessage[]
}

interface ThreadViewProps {
  threadId: string
}

export function ThreadView({ threadId }: ThreadViewProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch thread with messages
  const { data: thread, isLoading, error } = useQuery<EmailThread>({
    queryKey: ['email-thread', threadId],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/emails/threads/${threadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch thread')
      }

      return response.json()
    },
    enabled: !!threadId
  })

  // Archive/unarchive thread mutation
  const archiveMutation = useMutation({
    mutationFn: async (isArchived: boolean) => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/emails/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_archived: isArchived
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update thread')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-thread', threadId] })
      queryClient.invalidateQueries({ queryKey: ['email-threads'] })
      toast({
        title: 'Thread Updated',
        description: `Thread ${thread?.is_archived ? 'unarchived' : 'archived'} successfully.`,
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

  // Mark message as read mutation
  const markReadMutation = useMutation({
    mutationFn: async ({ messageId, isRead }: { messageId: string, isRead: boolean }) => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/emails/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_read: isRead
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update message')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-thread', threadId] })
    }
  })

  const toggleMessageExpanded = (messageId: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
      // Mark as read when expanded
      const message = thread?.messages.find(m => m.id === messageId)
      if (message && !message.is_read && !message.is_sent) {
        markReadMutation.mutate({ messageId, isRead: true })
      }
    }
    setExpandedMessages(newExpanded)
  }

  const handleArchiveToggle = () => {
    if (thread) {
      archiveMutation.mutate(!thread.is_archived)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getMessagePreview = (message: EmailMessage) => {
    const text = message.body_text || message.body_html?.replace(/<[^>]*>/g, '') || ''
    return text.substring(0, 100) + (text.length > 100 ? '...' : '')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading thread...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <Mail className="h-5 w-5" />
            <span>Failed to load thread: {(error as Error).message}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!thread) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a thread</h3>
            <p className="text-muted-foreground">
              Choose a conversation from the list to view its messages
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Thread Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{thread.subject || '(No Subject)'}</CardTitle>
              <CardDescription className="mt-2">
                <div className="flex items-center gap-4">
                  <span>via {thread.alias.full_address}</span>
                  <span>{thread.message_count} messages</span>
                  <span>Last activity {formatDate(thread.last_message_at)}</span>
                </div>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {thread.is_archived && (
                <Badge variant="secondary">
                  <Archive className="h-3 w-3 mr-1" />
                  Archived
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleArchiveToggle}>
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
      </Card>

      {/* Messages */}
      <div className="space-y-4">
        {thread.messages.map((message, index) => {
          const isExpanded = expandedMessages.has(message.id)
          const isLastMessage = index === thread.messages.length - 1
          
          return (
            <Card key={message.id} className={`${!message.is_read && !message.is_sent ? 'ring-2 ring-blue-200' : ''}`}>
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleMessageExpanded(message.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {message.is_sent ? 'You' : message.from_address}
                        </span>
                        {!message.is_read && !message.is_sent && (
                          <Badge variant="secondary" className="text-xs">Unread</Badge>
                        )}
                        {message.is_sent && (
                          <Badge variant="outline" className="text-xs">Sent</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        to {message.to_addresses.join(', ')}
                        {message.cc_addresses.length > 0 && (
                          <span> • cc {message.cc_addresses.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(message.received_at)}
                  </div>
                </div>
                {!isExpanded && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {getMessagePreview(message)}
                  </div>
                )}
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  <Separator className="mb-4" />
                  
                  {message.attachments.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Paperclip className="h-4 w-4" />
                        {message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}
                      </div>
                      <div className="space-y-1">
                        {message.attachments.map((attachment, idx) => (
                          <div key={idx} className="text-sm text-muted-foreground">
                            {attachment.filename} ({attachment.size})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="prose prose-sm max-w-none">
                    {message.body_html ? (
                      <div dangerouslySetInnerHTML={{ __html: message.body_html }} />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans">
                        {message.body_text}
                      </pre>
                    )}
                  </div>
                  
                  {isLastMessage && (
                    <div className="mt-4 pt-4 border-t">
                      <Button size="sm">
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
