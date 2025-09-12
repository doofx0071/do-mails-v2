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
} from 'lucide-react'
import { useState, useEffect } from 'react'

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
      <div className="p-8 text-center text-muted-foreground">
        No message selected
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center p-2">
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
        <div className="ml-auto flex items-center gap-2">
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
        </div>
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
      <Separator />
      {thread && (
        <div className="flex flex-1 flex-col">
          <div className="flex items-start p-4">
            <div className="flex items-start gap-4 text-sm">
              <Avatar>
                <AvatarImage alt={thread.participants[0]} />
                <AvatarFallback>
                  {thread.participants[0]
                    ?.split(' ')
                    .map((chunk) => chunk[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <div className="font-semibold">{thread.participants[0]}</div>
                <div className="line-clamp-1 text-xs">{thread.subject}</div>
                <div className="line-clamp-1 text-xs">
                  <span className="font-medium">Reply-To:</span>{' '}
                  {thread.participants[0]}
                </div>
              </div>
            </div>
            {thread.lastMessageAt && (
              <div className="ml-auto text-xs text-muted-foreground">
                {format(new Date(thread.lastMessageAt), 'PPpp')}
              </div>
            )}
          </div>
          <Separator />
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
              <div className="space-y-4 p-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className="border-b pb-4 last:border-b-0"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {message.is_sent
                              ? 'You'
                              : message.from_address.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {message.is_sent ? 'You' : message.from_address}
                        </span>
                        {message.to_addresses.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            to {message.to_addresses.join(', ')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(
                          new Date(message.received_at),
                          'MMM d, yyyy h:mm a'
                        )}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">
                      {message.body_html ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: message.body_html,
                          }}
                        />
                      ) : (
                        message.body_text || 'No content'
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-muted-foreground">
                No messages found in this thread.
              </div>
            )}
          </div>
          <Separator className="mt-auto" />
          <div className="p-4">
            <form>
              <div className="grid gap-4">
                <Textarea
                  className="p-4"
                  placeholder={`Reply to ${thread.participants[0]}...`}
                />
                <div className="flex items-center">
                  <Label
                    htmlFor="mute"
                    className="flex items-center gap-2 text-xs font-normal"
                  >
                    <Switch id="mute" aria-describedby="mute-description" />
                    Mute this thread
                  </Label>
                  <Button
                    onClick={(e) => e.preventDefault()}
                    size="sm"
                    className="ml-auto"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
