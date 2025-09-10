'use client'

import { useState } from 'react'
import { ThreadList, ThreadView } from '@/components/emails'

interface EmailThread {
  id: string
  alias_id: string
  subject: string
  participants: string[]
  message_count: number
  last_message_at: string
  is_archived: boolean
  labels: string[]
  created_at: string
  updated_at: string
  alias: {
    id: string
    alias_name: string
    full_address: string
  }
}

export default function DashboardPage() {
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null)

  const handleThreadSelect = (thread: EmailThread) => {
    setSelectedThread(thread)
  }

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Thread List */}
        <div className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <ThreadList 
            onThreadSelect={handleThreadSelect}
            selectedThreadId={selectedThread?.id}
          />
        </div>

        {/* Thread View */}
        <div className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          {selectedThread ? (
            <ThreadView threadId={selectedThread.id} />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="text-muted-foreground mb-2">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a thread from the list to view its messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
