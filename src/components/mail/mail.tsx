'use client'

import * as React from 'react'
import {
  AlertCircle,
  Archive,
  ArchiveX,
  File,
  Inbox,
  MessagesSquare,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  Users2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AccountSwitcher } from '@/components/mail/account-switcher'
import { MailDisplay } from '@/components/mail/mail-display'
import { MailList } from '@/components/mail/mail-list'
import { Nav } from '@/components/mail/nav'
import { useMail } from '@/components/mail/use-mail'

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
}

interface MailProps {
  accounts: Account[]
  threads: EmailThread[]
  defaultLayout?: number[]
  defaultCollapsed?: boolean
  navCollapsedSize: number
}

export function Mail({
  accounts,
  threads,
  defaultLayout = [20, 32, 48],
  defaultCollapsed = false,
  navCollapsedSize,
}: MailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [mail] = useMail()

  // Calculate counts for navigation
  const inboxCount = threads.filter(
    (t) => !t.labels.includes('sent') && !t.labels.includes('archived')
  ).length
  const sentCount = threads.filter((t) => t.labels.includes('sent')).length
  const unreadCount = threads.filter((t) => !t.isRead).length

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          if (typeof window !== 'undefined') {
            document.cookie = `react-resizable-panels:layout:mail=${JSON.stringify(sizes)}`
          }
        }}
        className="h-full items-stretch"
      >
        <ResizablePanel
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={20}
          onCollapse={() => {
            setIsCollapsed(true)
            if (typeof window !== 'undefined') {
              document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(true)}`
            }
          }}
          onResize={() => {
            setIsCollapsed(false)
            if (typeof window !== 'undefined') {
              document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(false)}`
            }
          }}
          className={cn(
            isCollapsed &&
              'min-w-[50px] transition-all duration-300 ease-in-out'
          )}
        >
          <div
            className={cn(
              'flex h-[52px] items-center justify-center',
              isCollapsed ? 'h-[52px]' : 'px-2'
            )}
          >
            <AccountSwitcher isCollapsed={isCollapsed} accounts={accounts} />
          </div>
          <Separator />
          <Nav
            isCollapsed={isCollapsed}
            links={[
              {
                title: 'Inbox',
                label: inboxCount.toString(),
                icon: Inbox,
                variant: 'default',
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
                variant: 'ghost',
              },
              {
                title: 'Junk',
                label: '0',
                icon: ArchiveX,
                variant: 'ghost',
              },
              {
                title: 'Trash',
                label: '0',
                icon: Trash2,
                variant: 'ghost',
              },
              {
                title: 'Archive',
                label: '0',
                icon: Archive,
                variant: 'ghost',
              },
            ]}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          <Tabs defaultValue="all">
            <div className="flex items-center px-4 py-2">
              <h1 className="text-xl font-bold">Inbox</h1>
              <TabsList className="ml-auto">
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
            <Separator />
            <div className="bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <form>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search" className="pl-8" />
                </div>
              </form>
            </div>
            <TabsContent value="all" className="m-0">
              <MailList items={threads} />
            </TabsContent>
            <TabsContent value="unread" className="m-0">
              <MailList items={threads.filter((item) => !item.isRead)} />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[2]} minSize={30}>
          <MailDisplay
            thread={threads.find((item) => item.id === mail.selected) || null}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}
