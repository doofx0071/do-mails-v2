'use client'

import { formatDistanceToNow } from 'date-fns'
import { Mail as MailIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMail } from '@/components/mail/use-mail'
import { EmailThread } from './mail'

interface MailListProps {
  items: EmailThread[]
  onEmailSelect?: (thread: EmailThread) => void
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
    <ScrollArea className="h-screen">
      <div className="flex flex-col gap-1 p-2">
        {items.map((item) => (
          <button
            key={item.id}
            className={cn(
              'flex flex-col items-start gap-3 rounded-lg border p-4 text-left text-sm transition-all hover:bg-accent hover:shadow-sm',
              mail.selected === item.id && 'border-primary bg-muted shadow-sm'
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
            <div className="flex w-full items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {item.participants.length > 0
                    ? item.participants[0]
                        .split('@')[0]
                        ?.charAt(0)
                        ?.toUpperCase() || 'U'
                    : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-semibold">
                      {item.participants.length > 0
                        ? item.participants[0].split('@')[0]
                        : 'Unknown'}
                    </div>
                    {!item.isRead && (
                      <span className="flex h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <div className="truncate text-xs font-medium text-muted-foreground">
                    {item.participants.length > 0
                      ? item.participants[0]
                      : 'Unknown sender'}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.lastMessageAt), {
                  addSuffix: true,
                })}
              </div>
            </div>

            <div className="w-full">
              <div className="mb-1 line-clamp-1 text-sm font-medium">
                {item.subject}
              </div>
              <div className="line-clamp-2 text-xs text-muted-foreground">
                {item.messages[0]?.bodyPlain?.substring(0, 300) ||
                  `${item.messageCount} message${item.messageCount !== 1 ? 's' : ''} • Click to view`}
              </div>
            </div>

            {item.labels.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {item.labels.map((label) => (
                  <Badge
                    key={label}
                    variant={getBadgeVariantFromLabel(label)}
                    className="text-xs"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            ) : null}
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
