'use client'

import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Send } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Domain {
  id: string
  domain_name: string
  verification_status: string
}

interface Alias {
  id: string
  domain_id: string
  alias_name: string
  full_address: string
  is_enabled: boolean
}

interface AliasesResponse {
  aliases: Alias[]
}

interface EmailMessage {
  id: string
  thread_id: string
  alias_id: string
  message_id: string
  in_reply_to?: string
  references: string[]
  from_address: string
  to_addresses: string[]
  cc_addresses: string[]
  subject: string
  body_text?: string
  body_html?: string
  is_sent: boolean
  received_at: string
}

interface ComposeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  domains: Domain[]
  onSuccess: () => void
  replyToMessage?: EmailMessage // For reply functionality
  replyToAlias?: Alias // Auto-select alias for reply
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  domains,
  onSuccess,
  replyToMessage,
  replyToAlias
}: ComposeEmailDialogProps) {
  const [selectedAlias, setSelectedAlias] = useState('')
  const [toAddresses, setToAddresses] = useState('')
  const [ccAddresses, setCcAddresses] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const { toast } = useToast()

  // Auto-populate fields for reply
  const isReply = !!replyToMessage

  // Initialize form with reply data when dialog opens
  React.useEffect(() => {
    if (open && replyToMessage && replyToAlias) {
      // Auto-select the alias for reply
      setSelectedAlias(replyToAlias.id)

      // Set reply-to address (original sender)
      setToAddresses(replyToMessage.from_address)

      // Set subject with "Re:" prefix if not already present
      const originalSubject = replyToMessage.subject || ''
      const replySubject = originalSubject.startsWith('Re:')
        ? originalSubject
        : `Re: ${originalSubject}`
      setSubject(replySubject)

      // Add quoted original message to body
      const quotedText = replyToMessage.body_text
        ? `\n\n--- Original Message ---\nFrom: ${replyToMessage.from_address}\nDate: ${new Date(replyToMessage.received_at).toLocaleString()}\nSubject: ${replyToMessage.subject}\n\n${replyToMessage.body_text.split('\n').map(line => `> ${line}`).join('\n')}`
        : ''
      setBodyText(quotedText)

      const quotedHtml = replyToMessage.body_html
        ? `<br><br><div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px;"><strong>--- Original Message ---</strong><br><strong>From:</strong> ${replyToMessage.from_address}<br><strong>Date:</strong> ${new Date(replyToMessage.received_at).toLocaleString()}<br><strong>Subject:</strong> ${replyToMessage.subject}<br><br>${replyToMessage.body_html}</div>`
        : ''
      setBodyHtml(quotedHtml)
    }
  }, [open, replyToMessage, replyToAlias])

  // Fetch aliases for the from field
  const { data: aliasesData } = useQuery<AliasesResponse>({
    queryKey: ['aliases', 'enabled'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch('/api/aliases?enabled=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch aliases')
      }

      return response.json()
    },
    enabled: open
  })

  const sendEmailMutation = useMutation({
    mutationFn: async (data: {
      alias_id: string
      to_addresses: string[]
      cc_addresses?: string[]
      subject: string
      body_text?: string
      body_html?: string
      in_reply_to?: string
      references?: string[]
    }) => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      return response.json()
    },
    onSuccess: (data) => {
      toast({
        title: 'Email Sent',
        description: `Email sent successfully to ${data.to.join(', ')}`,
      })
      resetForm()
      onSuccess()
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Send Email',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const resetForm = () => {
    setSelectedAlias('')
    setToAddresses('')
    setCcAddresses('')
    setSubject('')
    setBodyText('')
    setBodyHtml('')
  }

  const parseEmailAddresses = (addresses: string): string[] => {
    return addresses
      .split(',')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0)
  }

  const validateEmailAddress = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedAlias) {
      toast({
        title: 'Invalid Input',
        description: 'Please select a from address',
        variant: 'destructive'
      })
      return
    }

    if (!toAddresses.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter at least one recipient',
        variant: 'destructive'
      })
      return
    }

    if (!subject.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a subject',
        variant: 'destructive'
      })
      return
    }

    if (!bodyText.trim() && !bodyHtml.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter email content',
        variant: 'destructive'
      })
      return
    }

    // Parse and validate email addresses
    const toParsed = parseEmailAddresses(toAddresses)
    const ccParsed = ccAddresses.trim() ? parseEmailAddresses(ccAddresses) : []

    // Validate all email addresses
    const allAddresses = [...toParsed, ...ccParsed]
    for (const addr of allAddresses) {
      if (!validateEmailAddress(addr)) {
        toast({
          title: 'Invalid Email Address',
          description: `"${addr}" is not a valid email address`,
          variant: 'destructive'
        })
        return
      }
    }

    // Prepare reply headers if this is a reply
    const replyHeaders: { in_reply_to?: string; references?: string[] } = {}
    if (replyToMessage) {
      replyHeaders.in_reply_to = replyToMessage.message_id
      replyHeaders.references = [
        ...replyToMessage.references,
        replyToMessage.message_id
      ].filter(Boolean)
    }

    sendEmailMutation.mutate({
      alias_id: selectedAlias,
      to_addresses: toParsed,
      cc_addresses: ccParsed.length > 0 ? ccParsed : undefined,
      subject: subject.trim(),
      body_text: bodyText.trim() || undefined,
      body_html: bodyHtml.trim() || undefined,
      ...replyHeaders
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!sendEmailMutation.isPending) {
      onOpenChange(newOpen)
      if (!newOpen) {
        resetForm()
      }
    }
  }

  const aliases = aliasesData?.aliases || []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReply ? 'Reply to Email' : 'Compose Email'}</DialogTitle>
          <DialogDescription>
            {isReply
              ? `Replying to ${replyToMessage?.from_address}`
              : 'Send an email using one of your verified aliases'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="from">From</Label>
              <Select value={selectedAlias} onValueChange={setSelectedAlias}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an alias" />
                </SelectTrigger>
                <SelectContent>
                  {aliases.map((alias) => (
                    <SelectItem key={alias.id} value={alias.id}>
                      {alias.full_address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {aliases.length === 0 && (
                <p className="text-sm text-muted-foreground text-red-600">
                  No enabled aliases available. Please create and enable an alias first.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                placeholder="recipient@example.com, another@example.com"
                value={toAddresses}
                onChange={(e) => setToAddresses(e.target.value)}
                disabled={sendEmailMutation.isPending}
              />
              <p className="text-sm text-muted-foreground">
                Separate multiple addresses with commas
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cc">CC (optional)</Label>
              <Input
                id="cc"
                placeholder="cc@example.com"
                value={ccAddresses}
                onChange={(e) => setCcAddresses(e.target.value)}
                disabled={sendEmailMutation.isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sendEmailMutation.isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Write your email message here..."
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                disabled={sendEmailMutation.isPending}
                rows={8}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={sendEmailMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendEmailMutation.isPending || !selectedAlias || !toAddresses.trim() || !subject.trim() || (!bodyText.trim() && !bodyHtml.trim()) || aliases.length === 0}
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
