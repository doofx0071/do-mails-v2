'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import SendEmailForm from '@/components/email/send-email-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'

export default function ComposePage() {
  const [userId, setUserId] = useState<string>('')
  const searchParams = useSearchParams()
  
  // Get URL parameters for reply functionality
  const replyTo = searchParams.get('replyTo')
  const inReplyTo = searchParams.get('inReplyTo')
  const references = searchParams.get('references')
  const subject = searchParams.get('subject')

  useEffect(() => {
    // Get user ID from auth token or session
    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        // Decode JWT to get user ID (basic implementation)
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserId(payload.sub || payload.user_id || '')
      } catch (error) {
        console.error('Error decoding token:', error)
      }
    }
  }, [])

  const handleEmailSent = (messageId: string) => {
    console.log('Email sent successfully:', messageId)
    // You can add success notification here
    // Optionally redirect back to mail page
  }

  const isReply = !!(replyTo || inReplyTo)

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard/mail">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Mail
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Send className="h-6 w-6" />
              {isReply ? 'Reply' : 'Compose Email'}
            </h1>
            <p className="text-muted-foreground">
              {isReply 
                ? 'Reply using your custom domain email address'
                : 'Send emails using your custom domain addresses'
              }
            </p>
          </div>
        </div>
      </div>

      {userId ? (
        <SendEmailForm
          userId={userId}
          replyTo={replyTo || undefined}
          inReplyTo={inReplyTo || undefined}
          references={references || undefined}
          defaultSubject={subject || ''}
          onEmailSent={handleEmailSent}
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Please log in to send emails.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>How to Use Custom Domain Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">📧 Sending Emails</h4>
              <p className="text-sm text-muted-foreground">
                Use any address from your verified domains (e.g., user@kuyadoof.dev) to send professional emails.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">↩️ Replying to Emails</h4>
              <p className="text-sm text-muted-foreground">
                When viewing emails in your inbox, click "Reply" to respond using your custom domain address.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">🔗 Email Threading</h4>
              <p className="text-sm text-muted-foreground">
                Replies automatically maintain email threading with proper In-Reply-To and References headers.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">📎 Attachments & HTML</h4>
              <p className="text-sm text-muted-foreground">
                Support for both plain text and HTML emails. Attachment support coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
