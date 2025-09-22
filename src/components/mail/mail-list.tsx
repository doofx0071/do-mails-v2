'use client'

import * as React from 'react'

import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
  isThisYear,
} from 'date-fns'
import { Mail as MailIcon, ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { useMail } from '@/components/mail/use-mail'
import { EmailThread, PaginationInfo } from './mail'

interface MailListProps {
  items: EmailThread[]
  onEmailSelect?: (thread: EmailThread) => void
  pagination?: PaginationInfo
  isRefreshing?: boolean
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

export function MailList({
  items,
  onEmailSelect,
  pagination,
  isRefreshing,
}: MailListProps) {
  const [mail, setMail] = useMail()
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  const allSelected =
    selectedIds.length > 0 && selectedIds.length === items.length

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : items.map((i) => i.id))
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const undoBulk = async (
    ids: string[],
    action: 'unarchive' | 'unjunk' | 'untrash'
  ) => {
    const token = localStorage.getItem('auth_token')
    if (!token || ids.length === 0) return
    await fetch('/api/emails/threads/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ thread_ids: ids, action }),
    })
  }

  const performBulk = async (
    action: 'archive' | 'unarchive' | 'junk' | 'trash'
  ) => {
    const token = localStorage.getItem('auth_token')
    const ids = [...selectedIds]
    if (!token || ids.length === 0) return

    const res = await fetch('/api/emails/threads/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ thread_ids: ids, action }),
    })

    const count = ids.length
    if (!res.ok) {
      console.error('Bulk update failed', res.status)
      toast({
        title: 'Bulk action failed',
        description: `Server responded ${res.status}`,
      })
    } else {
      const inverse =
        action === 'archive'
          ? 'unarchive'
          : action === 'unarchive'
            ? 'archive'
            : action === 'junk'
              ? 'unjunk'
              : action === 'trash'
                ? 'untrash'
                : undefined
      const label = action.charAt(0).toUpperCase() + action.slice(1)
      toast({
        title: `${label} applied`,
        description: `${count} thread${count > 1 ? 's' : ''} updated`,
        action: inverse ? (
          <ToastAction
            altText="Undo"
            onClick={() => undoBulk(ids, inverse as any)}
          >
            Undo
          </ToastAction>
        ) : undefined,
      })
    }

    setSelectedIds([])
  }

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
    <div className="relative flex h-full flex-col">
      {isRefreshing && (
        <div className="absolute left-0 right-0 top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-center px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Refreshing...
            </div>
          </div>
        </div>
      )}
      {/* Bulk actions toolbar */}
      {selectedIds.length > 0 && (
        <div className="border-b bg-background/80 p-2">
          <div className="flex items-center gap-3 text-sm">
            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
            <span className="text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => performBulk('archive')}
              >
                Archive
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => performBulk('unarchive')}
              >
                Unarchive
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => performBulk('junk')}
              >
                Junk
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => performBulk('trash')}
              >
                Trash
              </Button>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0">
          {items.map((item) => (
            <div
              role="button"
              tabIndex={0}
              key={item.id}
              className={cn(
                'flex items-center gap-3 rounded-none border-b border-border/30 px-4 py-3 text-left text-sm transition-all hover:bg-accent/50',
                mail.selected === item.id && 'bg-muted',
                !item.isRead &&
                  'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (onEmailSelect) {
                    onEmailSelect(item)
                  } else {
                    setMail({
                      ...mail,
                      selected: item.id,
                    })
                  }
                }
              }}
            >
              <Checkbox
                className="h-4 w-4"
                checked={selectedIds.includes(item.id)}
                onCheckedChange={(checked) => {
                  toggleOne(item.id)
                }}
                onClick={(e) => e.stopPropagation()}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={cn(
                        'truncate',
                        !item.isRead
                          ? 'font-bold text-foreground'
                          : 'font-medium text-foreground'
                      )}
                    >
                      {item.participants.length > 0
                        ? item.participants[0].split('@')[0]
                        : 'Unknown'}
                    </span>
                    <span
                      className={cn(
                        'truncate text-sm',
                        !item.isRead
                          ? 'font-semibold text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item.subject}
                    </span>
                    {!item.isRead && (
                      <div className="flex items-center gap-1">
                        <span className="flex h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 text-[10px] font-medium"
                        >
                          NEW
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      'flex-shrink-0 text-xs',
                      !item.isRead
                        ? 'font-semibold text-blue-600'
                        : 'text-muted-foreground'
                    )}
                  >
                    {formatEmailTime(new Date(item.lastMessageAt))}
                  </div>
                </div>

                <div
                  className={cn(
                    'line-clamp-1 text-xs',
                    !item.isRead
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
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
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Pagination Controls */}
      {pagination && pagination.totalCount > pagination.itemsPerPage && (
        <div className="border-t bg-background p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing{' '}
              {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
              {Math.min(
                pagination.currentPage * pagination.itemsPerPage,
                pagination.totalCount
              )}{' '}
              of {pagination.totalCount} emails
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  pagination.onPageChange(pagination.currentPage - 1)
                }
                disabled={pagination.currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from(
                  {
                    length: Math.ceil(
                      pagination.totalCount / pagination.itemsPerPage
                    ),
                  },
                  (_, i) => i + 1
                )
                  .filter((page) => {
                    const current = pagination.currentPage
                    return (
                      page === 1 ||
                      page ===
                        Math.ceil(
                          pagination.totalCount / pagination.itemsPerPage
                        ) ||
                      (page >= current - 1 && page <= current + 1)
                    )
                  })
                  .map((page, index, array) => (
                    <div key={page} className="flex items-center">
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-1 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={
                          page === pagination.currentPage ? 'default' : 'ghost'
                        }
                        size="sm"
                        onClick={() => pagination.onPageChange(page)}
                        className="h-8 w-8 p-0"
                      >
                        {page}
                      </Button>
                    </div>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  pagination.onPageChange(pagination.currentPage + 1)
                }
                disabled={!pagination.hasMore}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
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
