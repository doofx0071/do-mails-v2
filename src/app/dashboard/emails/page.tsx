'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Mail,
  Search,
  Filter,
  Archive,
  Trash2,
  Star,
  Reply,
  Forward,
  MoreHorizontal,
  Inbox,
  Send,
  Clock,
  AlertCircle,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface EmailThread {
  id: string
  subject: string
  sender: string
  recipient: string
  preview: string
  timestamp: string
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  messageCount: number
  labels: string[]
}

export default function EmailsPage() {
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('inbox')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    message: '',
    aliasId: '',
    customFromAddress: '',
    useCustomFrom: false,
  })
  const [sending, setSending] = useState(false)
  const [aliases, setAliases] = useState<any[]>([])
  const [loadingAliases, setLoadingAliases] = useState(false)
  const [domains, setDomains] = useState<any[]>([])
  const [loadingDomains, setLoadingDomains] = useState(false)

  // Fetch aliases and domains when compose dialog opens
  useEffect(() => {
    if (composeOpen) {
      fetchAliases()
      fetchDomains()
    }
  }, [composeOpen])

  // Fetch real emails from API
  const fetchEmails = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch('/api/emails/threads', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Fetched threads:', data)

        // Transform API data to match EmailThread interface
        const transformedThreads: EmailThread[] = await Promise.all(
          (data.threads || []).map(async (thread: any) => {
            // Check if this thread contains sent messages
            let hasSentMessages = false
            try {
              const threadResponse = await fetch(
                `/api/emails/threads/${thread.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              )
              if (threadResponse.ok) {
                const threadData = await threadResponse.json()
                hasSentMessages =
                  threadData.messages?.some((msg: any) => msg.is_sent) || false
              }
            } catch (error) {
              console.error('Error checking thread messages:', error)
            }

            const labels = []
            if (thread.is_archived) labels.push('archived')
            if (hasSentMessages) labels.push('sent')

            return {
              id: thread.id,
              subject: thread.subject,
              participants: thread.participants,
              lastMessage: thread.last_message_at,
              messageCount: thread.message_count,
              isRead: true, // We'll determine this from messages later
              isStarred: false, // TODO: Add starred functionality
              labels,
              alias: thread.alias
                ? {
                    id: thread.alias.id,
                    name: thread.alias.alias_name,
                    fullAddress: thread.alias.full_address,
                  }
                : null,
              domain: thread.domain
                ? {
                    id: thread.domain.id,
                    name: thread.domain.domain_name,
                  }
                : null,
              recipientAddress: thread.recipient_address,
            }
          })
        )

        setThreads(transformedThreads)
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load emails on component mount
  useEffect(() => {
    fetchEmails()
  }, [])

  // Mock data for now - will be replaced with API calls
  useEffect(() => {
    const mockThreads: EmailThread[] = [
      {
        id: '1',
        subject: 'Welcome to do-Mails!',
        sender: 'welcome@do-mails.com',
        recipient: 'hello@yourdomain.com',
        preview:
          "Thank you for setting up your email alias system. Here's how to get started...",
        timestamp: '2 hours ago',
        isRead: false,
        isStarred: true,
        hasAttachments: false,
        messageCount: 1,
        labels: ['welcome'],
      },
      {
        id: '2',
        subject: 'Domain Verification Complete',
        sender: 'system@do-mails.com',
        recipient: 'admin@yourdomain.com',
        preview:
          'Your domain has been successfully verified and is ready to receive emails.',
        timestamp: '1 day ago',
        isRead: true,
        isStarred: false,
        hasAttachments: false,
        messageCount: 1,
        labels: ['system'],
      },
    ]

    setTimeout(() => {
      setThreads(mockThreads)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredThreads = threads.filter(
    (thread) =>
      thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.preview.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTabThreads = (tab: string) => {
    switch (tab) {
      case 'inbox':
        return filteredThreads.filter(
          (t) => !t.labels.includes('sent') && !t.labels.includes('archived')
        )
      case 'sent':
        return filteredThreads.filter((t) => t.labels.includes('sent'))
      case 'starred':
        return filteredThreads.filter((t) => t.isStarred)
      case 'archived':
        return filteredThreads.filter((t) => t.labels.includes('archived'))
      default:
        return filteredThreads
    }
  }

  const handleThreadAction = (threadId: string, action: string) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          switch (action) {
            case 'star':
              return { ...thread, isStarred: !thread.isStarred }
            case 'read':
              return { ...thread, isRead: !thread.isRead }
            case 'archive':
              return {
                ...thread,
                labels: [
                  ...thread.labels.filter((l) => l !== 'archived'),
                  'archived',
                ],
              }
            default:
              return thread
          }
        }
        return thread
      })
    )
  }

  const fetchAliases = async () => {
    setLoadingAliases(true)
    try {
      const token = localStorage.getItem('auth_token')
      console.log('🔑 Auth token:', token ? 'Found' : 'Not found')

      if (!token) {
        console.error('❌ No auth token found')
        return
      }

      console.log('📡 Fetching aliases...')
      const response = await fetch('/api/aliases', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log('📊 Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Aliases data:', data)
        setAliases(data.aliases || [])
        console.log('📧 Aliases count:', data.aliases?.length || 0)

        // Auto-select first alias if available
        if (data.aliases && data.aliases.length > 0 && !composeData.aliasId) {
          setComposeData((prev) => ({ ...prev, aliasId: data.aliases[0].id }))
          console.log('🎯 Auto-selected alias:', data.aliases[0].full_address)
        }
      } else {
        const errorData = await response.json()
        console.error('❌ API Error:', errorData)
      }
    } catch (error) {
      console.error('❌ Failed to fetch aliases:', error)
    } finally {
      setLoadingAliases(false)
    }
  }

  const fetchDomains = async () => {
    setLoadingDomains(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch('/api/domains', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const verifiedDomains = (data.domains || []).filter(
          (d) => d.verification_status === 'verified'
        )
        setDomains(verifiedDomains)
      }
    } catch (error) {
      console.error('Failed to fetch domains:', error)
    } finally {
      setLoadingDomains(false)
    }
  }

  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject || !composeData.message) {
      toast.error('Please fill in all required fields')
      return
    }

    // Check if using custom from address or alias
    if (composeData.useCustomFrom) {
      if (!composeData.customFromAddress) {
        toast.error('Please enter a from address')
        return
      }
    } else {
      if (!composeData.aliasId) {
        toast.error('Please select an alias')
        return
      }
    }

    setSending(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        alert('Please sign in to send emails')
        return
      }

      let response
      if (composeData.useCustomFrom) {
        // Use catch-all sending API
        response = await fetch('/api/emails/send-from-domain', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from_address: composeData.customFromAddress,
            to_addresses: [composeData.to],
            subject: composeData.subject,
            body_text: composeData.message,
            body_html: `<p>${composeData.message.replace(/\n/g, '<br>')}</p>`,
          }),
        })
      } else {
        // Use traditional alias-based sending API
        response = await fetch('/api/emails/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            alias_id: composeData.aliasId,
            to_addresses: [composeData.to],
            subject: composeData.subject,
            body_text: composeData.message,
            body_html: `<p>${composeData.message.replace(/\n/g, '<br>')}</p>`,
          }),
        })
      }

      if (response.ok) {
        toast.success('Email sent successfully!', {
          description:
            'Your email has been sent and will appear in the Sent tab.',
          duration: 3000,
        })
        setComposeData({
          to: '',
          subject: '',
          message: '',
          aliasId: '',
          customFromAddress: '',
          useCustomFrom: false,
        })
        setComposeOpen(false)
        // Switch to sent tab to show the sent email
        setSelectedTab('sent')
        // Refresh emails to show the sent email
        fetchEmails()
      } else {
        const error = await response.json()
        toast.error('Failed to send email', {
          description:
            error.error || 'Unknown error occurred. Please try again.',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Send email error:', error)
      toast.error('Failed to send email', {
        description: 'An unexpected error occurred. Please try again.',
        duration: 5000,
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emails</h1>
          <p className="text-muted-foreground">
            Manage your email conversations and threads
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Loading emails...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Emails</h1>
        <p className="text-muted-foreground">
          Manage your email conversations and threads
        </p>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center space-x-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Email Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Inbox
            <Badge variant="secondary" className="ml-1">
              {getTabThreads('inbox').filter((t) => !t.isRead).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent
          </TabsTrigger>
          <TabsTrigger value="starred" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Starred
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archived
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {getTabThreads(selectedTab).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No emails found</h3>
                <p className="text-center text-muted-foreground">
                  {selectedTab === 'inbox'
                    ? "You don't have any emails in your inbox yet."
                    : `No emails in ${selectedTab}.`}
                </p>
                {selectedTab === 'inbox' && (
                  <Button className="mt-4" variant="outline">
                    <Send className="mr-2 h-4 w-4" />
                    Send your first email
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {getTabThreads(selectedTab).map((thread) => (
                <Card
                  key={thread.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${!thread.isRead ? 'border-l-4 border-l-primary' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3
                            className={`truncate font-medium ${!thread.isRead ? 'font-semibold' : ''}`}
                          >
                            {thread.subject}
                          </h3>
                          {thread.hasAttachments && (
                            <Badge variant="outline" className="text-xs">
                              📎
                            </Badge>
                          )}
                          {thread.messageCount > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {thread.messageCount}
                            </Badge>
                          )}
                        </div>
                        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">{thread.sender}</span>
                          <span>→</span>
                          <span>{thread.recipient}</span>
                          <span>•</span>
                          <span>{thread.timestamp}</span>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {thread.preview}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleThreadAction(thread.id, 'star')
                          }}
                        >
                          <Star
                            className={`h-4 w-4 ${thread.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`}
                          />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleThreadAction(thread.id, 'read')
                              }
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Mark as {thread.isRead ? 'unread' : 'read'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleThreadAction(thread.id, 'archive')
                              }
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Reply className="mr-2 h-4 w-4" />
                              Reply
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Forward className="mr-2 h-4 w-4" />
                              Forward
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Emails</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {threads.filter((t) => !t.isRead).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Threads</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{threads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Starred</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {threads.filter((t) => t.isStarred).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compose Email Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
            <DialogDescription>
              Send a new email from your aliases or any address on your domain
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Toggle between alias and custom from address */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Send Mode</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <label className="text-sm">Use Alias</label>
                <input
                  type="checkbox"
                  checked={composeData.useCustomFrom}
                  onChange={(e) =>
                    setComposeData((prev) => ({
                      ...prev,
                      useCustomFrom: e.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                <label className="text-sm">Use Any Address</label>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="from" className="text-right">
                From
              </Label>
              {composeData.useCustomFrom ? (
                <div className="col-span-3 space-y-2">
                  <Input
                    placeholder="Enter any email address (e.g., hello@do-mails.space)"
                    value={composeData.customFromAddress}
                    onChange={(e) =>
                      setComposeData((prev) => ({
                        ...prev,
                        customFromAddress: e.target.value,
                      }))
                    }
                  />
                  <div className="text-xs text-muted-foreground">
                    Available domains:{' '}
                    {domains.map((d) => d.domain_name).join(', ')}
                  </div>
                </div>
              ) : (
                <Select
                  value={composeData.aliasId}
                  onValueChange={(value) =>
                    setComposeData((prev) => ({
                      ...prev,
                      aliasId: value,
                    }))
                  }
                  disabled={loadingAliases}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue
                      placeholder={
                        loadingAliases
                          ? 'Loading aliases...'
                          : 'Select an alias...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {aliases.map((alias) => (
                      <SelectItem key={alias.id} value={alias.id}>
                        {alias.full_address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="to" className="text-right">
                To
              </Label>
              <Input
                id="to"
                placeholder="recipient@example.com"
                className="col-span-3"
                value={composeData.to}
                onChange={(e) =>
                  setComposeData((prev) => ({ ...prev, to: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Subject
              </Label>
              <Input
                id="subject"
                placeholder="Email subject"
                className="col-span-3"
                value={composeData.subject}
                onChange={(e) =>
                  setComposeData((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right">
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                className="col-span-3 min-h-[120px]"
                value={composeData.message}
                onChange={(e) =>
                  setComposeData((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={
                sending ||
                !composeData.to ||
                !composeData.subject ||
                !composeData.message ||
                (composeData.useCustomFrom
                  ? !composeData.customFromAddress
                  : !composeData.aliasId)
              }
            >
              <Send className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
