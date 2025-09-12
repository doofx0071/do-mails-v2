'use client'

import { format } from 'date-fns'
import {
  Archive,
  ArchiveX,
  Clock,
  Forward,
  MoreVertical,
  Reply,
  ReplyAll,
  Trash2,
  Loader2,
  Mail as MailIcon,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { sanitizeEmailHtml } from '@/lib/email-sanitizer'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { EmailThread, EmailMessage } from './mail'

interface MailDisplayProps {
  thread: EmailThread | null
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
}

export function MailDisplay({ thread }: MailDisplayProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      } catch (err) {
        console.error('Error loading thread messages:', err)
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [thread?.id])

  const today = new Date()

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MailIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No message selected</h3>
          <p className="text-sm text-muted-foreground">
            Choose a message from the list to view its contents
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with actions */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!thread}>
                <Archive className="h-4 w-4" />
                <span className="sr-only">Archive</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!thread}>
                <ArchiveX className="h-4 w-4" />
                <span className="sr-only">Move to junk</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to junk</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!thread}>
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
              <Button variant="ghost" size="icon" disabled={!thread}>
                <Reply className="h-4 w-4" />
                <span className="sr-only">Reply</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!thread}>
                <ReplyAll className="h-4 w-4" />
                <span className="sr-only">Reply all</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!thread}>
                <Forward className="h-4 w-4" />
                <span className="sr-only">Forward</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="mx-2 h-6" />
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
          <div className="space-y-6 p-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">
                        {message.is_sent
                          ? 'You'
                          : message.from_address.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {message.is_sent ? 'You' : message.from_address}
                      </div>
                      {message.to_addresses.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          to {message.to_addresses.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(
                      new Date(message.received_at),
                      'MMM d, yyyy h:mm a'
                    )}
                  </div>
                </div>
                <div className="text-sm">
                  {message.body_html ? (
                    <div
                      className="email-content prose prose-sm prose-headings:text-foreground prose-p:text-foreground prose-a:text-blue-600 prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground prose-blockquote:text-muted-foreground prose-th:text-foreground prose-td:text-foreground prose-img:rounded-md max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeEmailHtml(message.body_html),
                      }}
                      style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        maxWidth: '100%',
                      }}
                    />
                  ) : message.body_text ? (
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.body_text}
                    </div>
                  ) : (
                    <div className="italic text-muted-foreground">
                      No content available
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No messages found in this thread.
          </div>
        )}
      </div>

      {/* Reply section */}
      <div className="border-t bg-muted/30 p-4">
        <form>
          <div className="space-y-4">
            <Textarea
              className="min-h-[100px] resize-none"
              placeholder={`Reply to ${thread.participants[0]?.split('@')[0] || 'sender'}...`}
            />
            <div className="flex items-center justify-between">
              <Label
                htmlFor="mute"
                className="flex items-center gap-2 text-xs font-normal"
              >
                <Switch id="mute" aria-describedby="mute-description" />
                Mute this thread
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Save Draft
                </Button>
                <Button onClick={(e) => e.preventDefault()} size="sm">
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
