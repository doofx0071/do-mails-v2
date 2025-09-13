'use client'

import { useState, useEffect } from 'react'
import { Mail } from '@/components/mail/mail'
import { EmailThread, EmailMessage, Account } from '@/components/mail/mail'
import { Mail as MailIcon } from 'lucide-react'

// Account data - you can customize this
const accounts: Account[] = [
  {
    label: 'do-Mails',
    email: 'demo@veenusra.com',
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <title>Mail</title>
        <path
          d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
          fill="currentColor"
        />
      </svg>
    ),
  },
]

export default function MailPage() {
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const itemsPerPage = 50

  // Fetch emails from API
  const fetchEmails = async (page: number = 1) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      const offset = (page - 1) * itemsPerPage
      const response = await fetch(
        `/api/emails/threads?limit=${itemsPerPage}&offset=${offset}`,
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
        // Use participants directly from threads API - no need to fetch individual threads for list view
        const transformedThreads: EmailThread[] = (data.threads || []).map(
          (thread: any) => {
            // Use participants directly from the threads API response
            const participants = thread.participants || []

            // Determine labels
            const labels = []
            if (thread.is_archived) labels.push('archived')

            // For list view, we don't need full message content
            // Messages will be loaded when user clicks on a thread
            const messages: EmailMessage[] = []

            console.log(`✅ Thread ${thread.id} participants:`, participants)

            return {
              id: thread.id,
              subject: thread.subject || 'No Subject',
              participants,
              lastMessageAt: thread.last_message_at || new Date().toISOString(),
              messageCount: thread.message_count || 0,
              isRead: true, // TODO: Implement read status
              labels,
              messages, // Empty for list view, will be loaded on demand
            }
          }
        )

        console.log(
          '🔍 Transformed threads sample:',
          transformedThreads.slice(0, 2)
        )
        setThreads(transformedThreads)
      } else {
        console.error('Failed to fetch threads:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load emails on component mount
  useEffect(() => {
    fetchEmails(1)
  }, [])

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchEmails(page)
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
    <div className="h-full overflow-hidden">
      <Mail
        accounts={accounts}
        threads={threads}
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
  )
}
