'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Mail } from '@/components/mail/mail'
import { ComposeEmailDialog } from '@/components/mail/compose-email-dialog'
import { EmailThread, EmailMessage, Account } from '@/components/mail/mail'
import { Mail as MailIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface ReplyData {
  to: string
  subject: string
  inReplyTo?: string
  references?: string[]
  fromAddress?: string
}

export default function MailPage() {
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [replyData, setReplyData] = useState<ReplyData | undefined>(undefined)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())
  const itemsPerPage = 50
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Fetch forwarding-based accounts
  const fetchAccounts = async () => {
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
        console.log('📧 Fetched domains:', data.domains?.length || 0)
        
        // Group domains by forwarding email
        const accountsMap = new Map<string, { domains: string[], count: number }>()
        
        data.domains?.forEach((domain: any) => {
          if (domain.default_forward_email) {
            const existing = accountsMap.get(domain.default_forward_email) || { domains: [], count: 0 }
            existing.domains.push(domain.domain_name)
            accountsMap.set(domain.default_forward_email, existing)
          }
        })

        // Convert to Account format
        const accountsList: Account[] = Array.from(accountsMap.entries()).map(([email, data]) => {
          const label = data.domains.length === 1 
            ? `${data.domains[0]} - ${email}`
            : `${data.domains.length} domains - ${email}`
            
          return {
            label,
            email,
            icon: (
              <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <title>Mail</title>
                <path
                  d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                  fill="currentColor"
                />
              </svg>
            ),
            domains: data.domains,
          }
        })

        console.log('🔍 Generated accounts:', accountsList)
        setAccounts(accountsList)
        
        // Set first account as selected if none selected
        if (!selectedAccount && accountsList.length > 0) {
          setSelectedAccount(accountsList[0].email)
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }

  // Fetch emails from API filtered by selected account
  const fetchEmails = useCallback(async (page: number = 1, silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      const token = localStorage.getItem('auth_token')
      if (!token || !selectedAccount) {
        if (!silent) setLoading(false)
        return
      }

      const offset = (page - 1) * itemsPerPage
      const response = await fetch(
        `/api/emails/threads?limit=${itemsPerPage}&offset=${offset}&forward_email=${encodeURIComponent(selectedAccount)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log('📧 Fetched threads:', data.threads?.length || 0)
        console.log('🔍 Raw threads sample:', data.threads?.slice(0, 2))

        // Update pagination state
        setTotalCount(data.total || 0)
        setHasMore(data.has_more || false)
        setCurrentPage(page)

        // Transform API data to match EmailThread interface
        const transformedThreads: EmailThread[] = (data.threads || []).map(
          (thread: any) => {
            const participants = thread.participants || []
            const labels = []
            if (thread.is_archived) labels.push('archived')
            const messages: EmailMessage[] = []

            return {
              id: thread.id,
              subject: thread.subject || 'No Subject',
              participants,
              lastMessageAt: thread.last_message_at || new Date().toISOString(),
              messageCount: thread.message_count || 0,
              isRead: thread.is_read ?? true, // Use actual read status from API
              labels,
              messages,
            }
          }
        )

        setThreads(transformedThreads)
        setLastRefreshTime(new Date())
        setError(null) // Clear any previous errors on success
        
        if (silent) {
          console.log('📧 Silent refresh completed')
        }
      } else {
        const errorMsg = response.status === 401 ? 'Session expired. Please log in again.' : 
                        response.status === 403 ? 'Access denied to email threads.' :
                        `Failed to load emails (${response.status})`
        console.error('Failed to fetch threads:', response.status)
        
        if (!silent) {
          setError(errorMsg)
          toast({
            title: 'Error',
            description: errorMsg,
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
      const errorMsg = error instanceof Error ? error.message : 'Network error. Check your connection.'
      
      if (!silent) {
        setError(errorMsg)
        toast({
          title: 'Error', 
          description: errorMsg,
          variant: 'destructive',
        })
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedAccount, itemsPerPage, toast])

  // Load accounts on component mount
  useEffect(() => {
    fetchAccounts()
  }, [])

  // Auto-refresh function (silent)
  const performAutoRefresh = useCallback(async () => {
    if (selectedAccount && !loading && !isRefreshing) {
      await fetchEmails(currentPage, true) // Silent refresh
    }
  }, [selectedAccount, currentPage, loading, isRefreshing, fetchEmails])

  // Load emails when account changes
  useEffect(() => {
    if (selectedAccount) {
      fetchEmails(1)
    }
  }, [selectedAccount, fetchEmails])

  // Auto-refresh setup
  useEffect(() => {
    // Clear any existing interval
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current)
    }

    // Set up auto-refresh every 30 seconds if account is selected
    if (selectedAccount) {
      autoRefreshInterval.current = setInterval(() => {
        performAutoRefresh()
      }, 30000) // 30 seconds
    }

    // Cleanup on unmount or account change
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current)
      }
    }
  }, [selectedAccount, performAutoRefresh])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current)
      }
    }
  }, [])

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchEmails(page)
  }

  // Handle account change
  const handleAccountChange = (accountEmail: string) => {
    setSelectedAccount(accountEmail)
    setCurrentPage(1) // Reset to first page when switching accounts
  }

  // Handle compose
  const handleCompose = () => {
    setReplyData(undefined) // Clear any reply data
    setComposeOpen(true)
  }

  // Handle reply
  const handleReply = (replyInfo: ReplyData) => {
    setReplyData(replyInfo)
    setComposeOpen(true)
  }

  // Handle compose dialog close
  const handleComposeClose = (open: boolean, emailSent?: boolean) => {
    setComposeOpen(open)
    if (!open) {
      setReplyData(undefined)
      // Only refresh threads if an email was actually sent
      if (emailSent && selectedAccount) {
        fetchEmails(currentPage, true) // Silent refresh
      }
    }
  }

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    if (!selectedAccount || isRefreshing) return
    
    setIsRefreshing(true)
    try {
      await fetchEmails(currentPage, true) // Silent refresh - don't show main loading component
      toast({
        title: 'Refreshed',
        description: 'Email list updated successfully',
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [selectedAccount, currentPage, fetchEmails, isRefreshing, toast])


  if (error && !threads.length) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <RefreshCw className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium mb-2">Failed to load emails</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => fetchEmails(currentPage)} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedAccount(null)
                setError(null)
              }}
              className="w-full"
            >
              Switch Account
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <MailIcon className="mx-auto mb-4 h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Loading your emails...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="h-full overflow-hidden">
        <Mail
          accounts={accounts}
          threads={threads}
          selectedAccount={selectedAccount}
          onAccountChange={handleAccountChange}
          onCompose={handleCompose}
          onReply={handleReply}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          lastRefreshTime={lastRefreshTime}
          refreshError={error && threads.length > 0 ? error : undefined}
          defaultLayout={[20, 32, 48]}
          defaultCollapsed={false}
          navCollapsedSize={4}
          pagination={{
            currentPage,
            totalCount,
            itemsPerPage,
            hasMore,
            onPageChange: handlePageChange,
          }}
        />
      </div>
      
      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={handleComposeClose}
        selectedAccount={selectedAccount}
        replyTo={replyData}
      />
    </>
  )
}
