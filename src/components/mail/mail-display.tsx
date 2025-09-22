'use client'

import { format } from 'date-fns'
import {
  Archive,
  ArchiveX,
  Clock,
  MoreVertical,
  Reply,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { GmailEmailRenderer } from './gmail-email-renderer'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { EmailThread } from './mail'

interface MailDisplayProps {
  thread: EmailThread | null
  onReply?: (replyData: {
    to: string
    subject: string
    inReplyTo?: string
    references?: string[]
    fromAddress?: string
  }) => void
}

interface AttachmentMeta {
  id: string
  filename: string
  content_type?: string
  file_size?: number
}

interface ThreadMessage {
  id: string
  thread_id: string
  from_address: string
  to_addresses: string[]
  subject: string
  body_text?: string
  body_html?: string
  received_at: string
  created_at: string
  is_read: boolean
  is_sent: boolean
  attachments?: AttachmentMeta[]
}

export function MailDisplay({ thread, onReply }: MailDisplayProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle thread actions (archive, junk, trash)
  const handleThreadAction = async (
    threadId: string,
    action: 'archive' | 'junk' | 'trash'
  ) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch('/api/emails/threads/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ thread_ids: [threadId], action }),
      })

      if (!response.ok) {
        console.error('Thread action failed:', response.status)
      }
    } catch (error) {
      console.error('Thread action error:', error)
    }
  }

  // Load messages when thread changes
  useEffect(() => {
    if (!thread) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('No auth token')
        }

        const response = await fetch(`/api/emails/threads/${thread.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to load messages: ${response.status}`)
        }

        const data = await response.json()
        console.log('🔍 Loaded thread messages:', data.messages?.length || 0)
        setMessages(data.messages || [])

        // Mark thread as read when viewed (if it has unread messages)
        if (!thread.isRead) {
          markThreadAsRead(thread.id)
        }
      } catch (err) {
        console.error('Error loading thread messages:', err)
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [thread?.id, thread?.isRead])

  // Function to mark thread as read
  const markThreadAsRead = async (threadId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch('/api/emails/mark-read', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id: threadId,
        }),
      })

      if (response.ok) {
        console.log('✅ Thread marked as read:', threadId)
      }
    } catch (error) {
      console.error('Failed to mark thread as read:', error)
    }
  }

  // Handle reply button click (top-right)
  const handleReply = () => {
    if (!thread || !onReply || messages.length === 0) return

    const latestMessage = messages[messages.length - 1]
    const replyTo = latestMessage.is_sent
      ? latestMessage.to_addresses[0]
      : latestMessage.from_address

    const fromAddress = thread.recipient_address

    onReply({
      to: replyTo,
      subject: thread.subject.startsWith('Re:')
        ? thread.subject
        : `Re: ${thread.subject}`,
      inReplyTo: latestMessage.id,
      references: [latestMessage.id],
      fromAddress,
    })
  }

  if (!thread) {
    return null
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with actions */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!thread}
                onClick={() =>
                  thread && handleThreadAction(thread.id, 'archive')
                }
              >
                <Archive className="h-4 w-4" />
                <span className="sr-only">Archive</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!thread}
                onClick={() => thread && handleThreadAction(thread.id, 'junk')}
              >
                <ArchiveX className="h-4 w-4" />
                <span className="sr-only">Move to junk</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to junk</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!thread}
                onClick={() => thread && handleThreadAction(thread.id, 'trash')}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Move to trash</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to trash</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!thread}>
                <Clock className="h-4 w-4" />
                <span className="sr-only">Snooze</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Snooze</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!thread || !onReply}
                onClick={handleReply}
                aria-label="Reply"
                title="Reply"
              >
                <Reply className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!thread}>
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem>Star thread</DropdownMenuItem>
              <DropdownMenuItem>Add label</DropdownMenuItem>
              <DropdownMenuItem>Mute thread</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Thread header */}
      <div className="border-b bg-muted/30 p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage alt={thread.participants[0]} />
            <AvatarFallback>
              {thread.participants[0]
                ?.split('@')[0]
                ?.charAt(0)
                ?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{thread.subject}</h2>
              {thread.lastMessageAt && (
                <div className="text-sm text-muted-foreground">
                  {format(new Date(thread.lastMessageAt), 'PPpp')}
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">From:</span>{' '}
              {thread.participants.join(', ')}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Messages:</span>{' '}
              {messages.length || thread.messageCount}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Loading messages...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-red-600">
            <p>Error loading messages: {error}</p>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-6 p-8">
            {messages.map((message, _index) => (
              <div
                key={message.id}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="text-sm">
                  <GmailEmailRenderer
                    htmlContent={message.body_html}
                    textContent={message.body_text}
                    className="max-w-none"
                    messageData={{
                      from: message.from_address,
                      to: message.to_addresses,
                      subject: message.subject,
                      receivedAt: message.received_at,
                      isRead: message.is_read,
                    }}
                  />
                </div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {message.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={`/api/emails/attachments/${att.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                      >
                        <span className="max-w-[180px] truncate">
                          {att.filename}
                        </span>
                        {typeof att.file_size === 'number' && (
                          <span className="text-muted-foreground">
                            {(att.file_size / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No messages found in this thread.
          </div>
        )}
      </div>
    </div>
  )
}
