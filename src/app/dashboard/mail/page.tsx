"use client"

import { useState, useEffect } from "react"
import { Mail } from "@/components/mail/mail"
import { EmailThread, EmailMessage, Account } from "@/components/mail/mail"
import { Mail as MailIcon } from "lucide-react"

// Account data - you can customize this
const accounts: Account[] = [
  {
    label: "do-Mails",
    email: "demo@veenusra.com",
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <title>Mail</title>
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="currentColor" />
      </svg>
    ),
  },
]

export default function MailPage() {
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch emails from API
  const fetchEmails = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

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
            // Fetch thread messages to get full details
            let messages: EmailMessage[] = []
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
                messages = (threadData.messages || []).map((msg: any) => ({
                  id: msg.id,
                  threadId: thread.id,
                  fromAddress: msg.from_address,
                  toAddresses: msg.to_addresses || [],
                  subject: msg.subject,
                  bodyPlain: msg.body_plain,
                  bodyHtml: msg.body_html,
                  receivedAt: msg.received_at,
                  createdAt: msg.created_at,
                  isRead: true, // TODO: Add read status
                }))
              }
            } catch (error) {
              console.error('Error fetching thread messages:', error)
            }

            // Determine labels
            const labels = []
            if (thread.is_archived) labels.push('archived')
            
            // Check if thread contains sent messages
            const hasSentMessages = messages.some((msg) => 
              msg.fromAddress.includes('@do-mails.space') // Adjust based on your domain
            )
            if (hasSentMessages) labels.push('sent')

            // Extract participants
            const participants = Array.from(new Set([
              ...messages.map(msg => msg.fromAddress),
              ...messages.flatMap(msg => msg.toAddresses)
            ])).filter(email => email && email.trim() !== '')

            return {
              id: thread.id,
              subject: thread.subject || 'No Subject',
              participants,
              lastMessageAt: thread.last_message_at || new Date().toISOString(),
              messageCount: thread.message_count || messages.length,
              isRead: true, // TODO: Implement read status
              labels,
              messages,
            }
          })
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
    fetchEmails()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <MailIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading your emails...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden flex-col md:flex h-screen">
      <Mail
        accounts={accounts}
        threads={threads}
        defaultLayout={[20, 32, 48]}
        defaultCollapsed={false}
        navCollapsedSize={4}
      />
    </div>
  )
}
