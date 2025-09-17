'use client'

// PRIORITY 3: Reply functionality UI component
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Send, AlertCircle, CheckCircle } from 'lucide-react'

interface Domain {
  id: string
  domain: string
  verified: boolean
}

interface SendEmailFormProps {
  userId?: string
  replyTo?: string
  inReplyTo?: string
  references?: string
  defaultSubject?: string
  onEmailSent?: (messageId: string) => void
}

export default function SendEmailForm({
  userId,
  replyTo,
  inReplyTo,
  references,
  defaultSubject = '',
  onEmailSent,
}: SendEmailFormProps) {
  const [domains, setDomains] = useState<Domain[]>([])
  const [selectedDomain, setSelectedDomain] = useState<string>('')
  const [fromAddress, setFromAddress] = useState<string>('')
  const [toAddress, setToAddress] = useState<string>(replyTo || '')
  const [ccAddress, setCcAddress] = useState<string>('')
  const [bccAddress, setBccAddress] = useState<string>('')
  const [subject, setSubject] = useState<string>(defaultSubject)
  const [content, setContent] = useState<string>('')
  const [isHtml, setIsHtml] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isLoadingDomains, setIsLoadingDomains] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  // Load available domains
  useEffect(() => {
    if (userId) {
      loadDomains()
    }
  }, [userId])

  const loadDomains = async () => {
    try {
      setIsLoadingDomains(true)
      const response = await fetch(`/api/send-email?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setDomains(data.domains)
        if (data.domains.length > 0) {
          setSelectedDomain(data.domains[0].domain)
        }
      } else {
        setError('Failed to load domains')
      }
    } catch (err) {
      setError('Error loading domains')
      console.error('Error loading domains:', err)
    } finally {
      setIsLoadingDomains(false)
    }
  }

  const handleDomainChange = (domain: string) => {
    setSelectedDomain(domain)
    // Update from address if user has entered a local part
    if (fromAddress.includes('@')) {
      const localPart = fromAddress.split('@')[0]
      setFromAddress(`${localPart}@${domain}`)
    }
  }

  const handleFromAddressChange = (value: string) => {
    setFromAddress(value)
    // Auto-append domain if user just types local part
    if (value && !value.includes('@') && selectedDomain) {
      setFromAddress(`${value}@${selectedDomain}`)
    }
  }

  const handleSendEmail = async () => {
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      // Validate form
      if (!fromAddress || !toAddress || !subject || !content) {
        setError('Please fill in all required fields')
        return
      }

      if (!fromAddress.includes('@') || !toAddress.includes('@')) {
        setError('Please enter valid email addresses')
        return
      }

      // Prepare email data
      const emailData = {
        from: fromAddress,
        to: toAddress.split(',').map(email => email.trim()),
        cc: ccAddress ? ccAddress.split(',').map(email => email.trim()) : undefined,
        bcc: bccAddress ? bccAddress.split(',').map(email => email.trim()) : undefined,
        subject,
        content,
        isHtml,
        inReplyTo,
        references,
      }

      // Send email
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(`Email sent successfully! Message ID: ${result.messageId}`)
        
        // Clear form
        setToAddress('')
        setCcAddress('')
        setBccAddress('')
        setSubject('')
        setContent('')
        
        // Call callback if provided
        if (onEmailSent) {
          onEmailSent(result.messageId)
        }
      } else {
        setError(result.error || 'Failed to send email')
      }
    } catch (err) {
      setError('Error sending email')
      console.error('Error sending email:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingDomains) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading domains...
        </CardContent>
      </Card>
    )
  }

  if (domains.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No verified domains available for sending emails. Please add and verify a domain first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="domain">Domain</Label>
            <Select value={selectedDomain} onValueChange={handleDomainChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.domain}>
                    {domain.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="from">From *</Label>
            <Input
              id="from"
              type="email"
              value={fromAddress}
              onChange={(e) => handleFromAddressChange(e.target.value)}
              placeholder={`user@${selectedDomain}`}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="to">To *</Label>
          <Input
            id="to"
            type="email"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="recipient@example.com"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cc">CC</Label>
            <Input
              id="cc"
              type="email"
              value={ccAddress}
              onChange={(e) => setCcAddress(e.target.value)}
              placeholder="cc@example.com"
            />
          </div>

          <div>
            <Label htmlFor="bcc">BCC</Label>
            <Input
              id="bcc"
              type="email"
              value={bccAddress}
              onChange={(e) => setBccAddress(e.target.value)}
              placeholder="bcc@example.com"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="subject">Subject *</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="html-mode"
            checked={isHtml}
            onCheckedChange={setIsHtml}
          />
          <Label htmlFor="html-mode">HTML Content</Label>
        </div>

        <div>
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isHtml ? "Enter HTML content..." : "Enter your message..."}
            rows={8}
            required
          />
        </div>

        <Button
          onClick={handleSendEmail}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
