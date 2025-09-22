'use client'

import * as React from 'react'
import { format } from 'date-fns'
import {
  AlertCircle,
  Archive,
  ArchiveX,
  ArrowLeft,
  File,
  Inbox,
  MessagesSquare,
  PenTool,
  RefreshCw,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  Users2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AccountSwitcher } from '@/components/mail/account-switcher'
import { MailDisplay } from '@/components/mail/mail-display'
import { MailList } from '@/components/mail/mail-list'
import { Nav } from '@/components/mail/nav'

// Types for our email system
export interface EmailThread {
  id: string
  subject: string
  participants: string[]
  lastMessageAt: string
  messageCount: number
  isRead: boolean
  labels: string[]
  messages: EmailMessage[]
  recipient_address?: string // The domain email address that received this thread
}

export interface EmailMessage {
  id: string
  threadId: string
  fromAddress: string
  toAddresses: string[]
  subject: string
  bodyPlain?: string
  bodyHtml?: string
  receivedAt: string
  createdAt: string
  isRead: boolean
}

export interface Account {
  label: string
  email: string
  icon: React.ReactNode
  domains?: string[]
}

export interface PaginationInfo {
  currentPage: number
  totalCount: number
  itemsPerPage: number
  hasMore: boolean
  onPageChange: (page: number) => void
}

interface MailProps {
  accounts: Account[]
  threads: EmailThread[]
  selectedAccount?: string | null
  onAccountChange?: (accountEmail: string) => void
  onCompose?: () => void
  onReply?: (replyData: {
    to: string
    subject: string
    inReplyTo?: string
    references?: string[]
    fromAddress?: string
  }) => void
  onRefresh?: () => void
  isRefreshing?: boolean
  lastRefreshTime?: Date
  refreshError?: string
  defaultLayout?: number[]
  defaultCollapsed?: boolean
  navCollapsedSize: number
  pagination?: PaginationInfo
  selectedFolder?: 'inbox' | 'archived' | 'junk' | 'trash' | 'sent'
  onFolderChange?: (
    folder: 'inbox' | 'archived' | 'junk' | 'trash' | 'sent'
  ) => void
}

export function Mail({
  accounts,
  threads,
  selectedAccount,
  onAccountChange,
  selectedFolder = 'inbox',
  onFolderChange,
  onCompose,
  onReply,
  onRefresh,
  isRefreshing,
  lastRefreshTime,
  refreshError,
  defaultLayout = [20, 32, 48],
  defaultCollapsed = false,
  navCollapsedSize,
  pagination,
}: MailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [viewMode, setViewMode] = React.useState<'list' | 'email'>('list')
  const [selectedThread, setSelectedThread] =
    React.useState<EmailThread | null>(null)

  // Calculate counts for navigation
  const inboxCount =
    pagination?.totalCount ||
    threads.filter(
      (t) => !t.labels.includes('sent') && !t.labels.includes('archived')
    ).length
  const sentCount = threads.filter((t) => t.labels.includes('sent')).length
  const unreadCount = threads.filter((t) => !t.isRead).length

  // Handle email selection
  const handleEmailSelect = (thread: EmailThread) => {
    setSelectedThread(thread)
    setViewMode('email')
  }

  // Handle back to list
  const handleBackToList = () => {
    setViewMode('list')
    setSelectedThread(null)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full overflow-hidden">
        {/* Sidebar - Always visible */}
        <div
          className={cn(
            'flex flex-col border-r bg-muted/10 transition-all duration-300',
            isCollapsed ? 'w-[50px]' : 'w-[240px]'
          )}
        >
          <div
            className={cn(
              'flex h-[52px] items-center justify-center',
              isCollapsed ? 'h-[52px]' : 'px-2'
            )}
          >
            <AccountSwitcher
              isCollapsed={isCollapsed}
              accounts={accounts}
              selectedAccount={selectedAccount}
              onAccountChange={onAccountChange}
            />
          </div>
          <Separator />
          <Nav
            isCollapsed={isCollapsed}
            links={[
              {
                title: 'Compose',
                icon: PenTool,
                variant: 'ghost',
                onClick: onCompose,
              },
              {
                title: 'Inbox',
                label: inboxCount.toString(),
                icon: Inbox,
                variant: selectedFolder === 'inbox' ? 'default' : 'ghost',
                onClick: () => onFolderChange?.('inbox'),
              },
              {
                title: 'Drafts',
                label: '0',
                icon: File,
                variant: 'ghost',
              },
              {
                title: 'Sent',
                label: sentCount.toString(),
                icon: Send,
                variant: selectedFolder === 'sent' ? 'default' : 'ghost',
                onClick: () => onFolderChange?.('sent'),
              },
              {
                title: 'Junk',
                label: '0',
                icon: ArchiveX,
                variant: selectedFolder === 'junk' ? 'default' : 'ghost',
                onClick: () => onFolderChange?.('junk'),
              },
              {
                title: 'Trash',
                label: '0',
                icon: Trash2,
                variant: selectedFolder === 'trash' ? 'default' : 'ghost',
                onClick: () => onFolderChange?.('trash'),
              },
              {
                title: 'Archive',
                label: '0',
                icon: Archive,
                variant: selectedFolder === 'archived' ? 'default' : 'ghost',
                onClick: () => onFolderChange?.('archived'),
              },
            ]}
          />
          {/* Collapse toggle button */}
          <div className="mt-auto p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full"
            >
              {isCollapsed ? '→' : '←'}
            </Button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex h-full flex-1 flex-col">
          {viewMode === 'list' ? (
            /* List View - Gmail Inbox Style */
            <Tabs defaultValue="all" className="flex h-full flex-1 flex-col">
              <div className="flex items-center border-b px-4 py-2">
                <h1 className="text-xl font-bold">
                  {selectedFolder === 'inbox'
                    ? 'Inbox'
                    : selectedFolder === 'archived'
                      ? 'Archive'
                      : selectedFolder === 'junk'
                        ? 'Junk'
                        : selectedFolder === 'trash'
                          ? 'Trash'
                          : 'Sent'}
                </h1>
                <div className="ml-auto flex items-center gap-4">
                  {/* Refresh button */}
                  {onRefresh && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="gap-2"
                      >
                        <RefreshCw
                          className={cn(
                            'h-4 w-4',
                            isRefreshing && 'animate-spin'
                          )}
                        />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                      </Button>
                      {lastRefreshTime && !refreshError && (
                        <span className="text-xs text-muted-foreground">
                          Last updated {format(lastRefreshTime, 'HH:mm:ss')}
                        </span>
                      )}
                      {refreshError && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-red-600">Refresh failed</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRefresh}
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                          >
                            Retry
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <TabsList>
                    <TabsTrigger
                      value="all"
                      className="text-zinc-600 dark:text-zinc-200"
                    >
                      All mail
                    </TabsTrigger>
                    <TabsTrigger
                      value="unread"
                      className="text-zinc-600 dark:text-zinc-200"
                    >
                      Unread
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
              <div className="border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <form>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search" className="pl-8" />
                  </div>
                </form>
              </div>
              <TabsContent value="all" className="m-0 flex-1 overflow-hidden">
                <MailList
                  items={threads}
                  onEmailSelect={handleEmailSelect}
                  pagination={pagination}
                  isRefreshing={isRefreshing}
                />
              </TabsContent>
              <TabsContent
                value="unread"
                className="m-0 flex-1 overflow-hidden"
              >
                <MailList
                  items={threads.filter((item) => !item.isRead)}
                  onEmailSelect={handleEmailSelect}
                  pagination={pagination}
                  isRefreshing={isRefreshing}
                />
              </TabsContent>
            </Tabs>
          ) : (
            /* Email View - Gmail Email Style */
            <div className="flex h-full flex-1 flex-col">
              {/* Back button header */}
              <div className="flex items-center border-b px-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                  className="mr-2"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to Inbox
                </Button>
                <h1 className="truncate text-lg font-medium">
                  {selectedThread?.subject}
                </h1>
              </div>
              {/* Email content */}
              <div className="flex-1 overflow-hidden">
                <MailDisplay thread={selectedThread} onReply={onReply} />
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
