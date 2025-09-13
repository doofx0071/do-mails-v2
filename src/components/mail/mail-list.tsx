'use client'

import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
  isThisYear,
} from 'date-fns'
import { Mail as MailIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useMail } from '@/components/mail/use-mail'
import { EmailThread } from './mail'

interface MailListProps {
  items: EmailThread[]
  onEmailSelect?: (thread: EmailThread) => void
}

function formatEmailTime(date: Date): string {
  if (isToday(date)) {
    return format(date, 'h:mm a')
  } else if (isThisYear(date)) {
    return format(date, 'MMM d')
  } else {
    return format(date, 'M/d/yy')
  }
}

function getAvatarUrl(email: string): string {
  // Use Gravatar first, fallback to a more theme-appropriate avatar service
  const emailHash = btoa(email.toLowerCase().trim()).replace(
    /[^a-zA-Z0-9]/g,
    ''
  )
  // Using a more subtle avatar service that works better with themes
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(email)}&backgroundColor=transparent&shapeColor=6b7280,9ca3af,d1d5db`
}

export function MailList({ items, onEmailSelect }: MailListProps) {
  const [mail, setMail] = useMail()

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MailIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No emails found</h3>
          <p className="text-sm text-muted-foreground">
            Your inbox is empty or no emails match the current filter
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-0 p-0">
        {items.map((item) => (
          <button
            key={item.id}
            className={cn(
              'flex items-center gap-3 rounded-none border-b border-border/30 px-4 py-3 text-left text-sm transition-all hover:bg-accent/50',
              mail.selected === item.id && 'bg-muted'
            )}
            onClick={() => {
              if (onEmailSelect) {
                onEmailSelect(item)
              } else {
                setMail({
                  ...mail,
                  selected: item.id,
                })
              }
            }}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={
                  item.participants.length > 0
                    ? getAvatarUrl(item.participants[0])
                    : undefined
                }
                alt={
                  item.participants.length > 0
                    ? item.participants[0].split('@')[0]
                    : 'Unknown'
                }
              />
              <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                {item.participants.length > 0
                  ? item.participants[0]
                      .split('@')[0]
                      ?.charAt(0)
                      ?.toUpperCase() || 'U'
                  : 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-medium">
                    {item.participants.length > 0
                      ? item.participants[0].split('@')[0]
                      : 'Unknown'}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {item.subject}
                  </span>
                  {!item.isRead && (
                    <span className="flex h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                  )}
                </div>
                <div className="flex-shrink-0 text-xs text-muted-foreground">
                  {formatEmailTime(new Date(item.lastMessageAt))}
                </div>
              </div>

              <div className="line-clamp-1 text-xs text-muted-foreground">
                {item.messages[0]?.bodyPlain?.substring(0, 100) || ''}
              </div>
            </div>

            {item.labels.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {item.labels.slice(0, 2).map((label) => (
                  <Badge
                    key={label}
                    variant={getBadgeVariantFromLabel(label)}
                    className="text-xs"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}

function getBadgeVariantFromLabel(
  label: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['work'].includes(label.toLowerCase())) {
    return 'default'
  }

  if (['personal'].includes(label.toLowerCase())) {
    return 'outline'
  }

  if (['important'].includes(label.toLowerCase())) {
    return 'destructive'
  }

  return 'secondary'
}
