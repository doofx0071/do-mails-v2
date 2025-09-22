'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Send,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  Image,
  Link,
  Bold,
  Italic,
  Underline,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const composeSchema = z.object({
  from_address: z
    .string()
    .min(1, 'From address is required')
    .email('Invalid email format'),
  to_addresses: z.string().min(1, 'To address is required'),
  subject: z.string().min(1, 'Subject is required'),
  body_html: z.string().min(1, 'Message content is required'),
  cc_addresses: z.string().optional(),
  bcc_addresses: z.string().optional(),
})

type ComposeFormData = z.infer<typeof composeSchema>

interface DomainAddress {
  domain: string
  address: string
  forwardEmail: string
}

interface GmailComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean, emailSent?: boolean) => void
  selectedAccount?: string | null
  replyTo?: {
    to: string
    subject: string
    inReplyTo?: string
    references?: string[]
    fromAddress?: string
  }
}

export function GmailComposeDialog({
  open,
  onOpenChange,
  selectedAccount,
  replyTo,
}: GmailComposeDialogProps) {
  const [sending, setSending] = useState(false)
  const [availableAddresses, setAvailableAddresses] = useState<DomainAddress[]>(
    []
  )
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const form = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      from_address: '',
      to_addresses: '',
      cc_addresses: '',
      bcc_addresses: '',
      subject: '',
      body_html: '',
    },
  })

  // Custom From support (new compose only)
  const [showCustomFromInput, setShowCustomFromInput] = useState(false)
  const [customFromAddress, setCustomFromAddress] = useState('')

  // Fetch available sending addresses when dialog opens (skip for reply mode)
  useEffect(() => {
    const fetchAddresses = async () => {
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
          const addresses: DomainAddress[] = []

          data.domains?.forEach((domain: any) => {
            if (
              domain.default_forward_email &&
              selectedAccount &&
              domain.default_forward_email === selectedAccount
            ) {
              // Add common email prefixes
              const commonPrefixes = [
                'hello',
                'contact',
                'info',
                'support',
                'sales',
                'hi',
                'team',
                'mail',
                'admin',
              ]
              commonPrefixes.forEach((prefix) => {
                addresses.push({
                  domain: domain.domain_name,
                  address: `${prefix}@${domain.domain_name}`,
                  forwardEmail: domain.default_forward_email,
                })
              })
            }
          })

          setAvailableAddresses(addresses)

          // Set first address as default only if not in reply mode
          if (
            addresses.length > 0 &&
            !form.getValues('from_address') &&
            !replyTo
          ) {
            form.setValue('from_address', addresses[0].address)
          }
        }
      } catch (error) {
        console.error('Failed to fetch domains:', error)
      }
    }

    if (open && selectedAccount && !replyTo) {
      // Only fetch addresses if not in reply mode
      fetchAddresses()
    }
  }, [open, selectedAccount, form, replyTo])

  // Set reply defaults
  useEffect(() => {
    if (replyTo && replyTo.fromAddress) {
      // For replies, set the form data
      form.setValue('to_addresses', replyTo.to)
      form.setValue(
        'subject',
        replyTo.subject.startsWith('Re:')
          ? replyTo.subject
          : `Re: ${replyTo.subject}`
      )

      // For replies, only show the specific reply address
      const domain = replyTo.fromAddress.split('@')[1]
      const replyAddressObj = {
        domain: domain,
        address: replyTo.fromAddress,
        forwardEmail: selectedAccount || '',
      }

      // Replace the entire addresses list with just the reply address
      setAvailableAddresses([replyAddressObj])
      form.setValue('from_address', replyTo.fromAddress)

      console.log('✅ Reply mode - only showing:', replyTo.fromAddress)
    }
  }, [replyTo, form, selectedAccount])

  // Handle file attachments
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Convert File to base64 payload expected by API
  const fileToAttachment = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer()
    // Convert ArrayBuffer to base64 in chunks to avoid call stack limits
    let binary = ''
    const bytes = new Uint8Array(arrayBuffer)
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode(...chunk)
    }
    const base64 = btoa(binary)
    return {
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      data: base64,
    }
  }

  const onSubmit = async (values: ComposeFormData) => {
    const attemptSend = async (attempt: number = 0): Promise<void> => {
      try {
        setSending(true)
        setLastError(null)
        const token = localStorage.getItem('auth_token')

        if (!token) {
          throw new Error('Authentication required. Please log in again.')
        }

        // Parse email addresses
        const toAddresses = values.to_addresses
          .split(',')
          .map((email) => email.trim())
          .filter((email) => email.length > 0)

        const ccAddresses = values.cc_addresses
          ? values.cc_addresses
              .split(',')
              .map((email) => email.trim())
              .filter((email) => email.length > 0)
          : []

        const bccAddresses = values.bcc_addresses
          ? values.bcc_addresses
              .split(',')
              .map((email) => email.trim())
              .filter((email) => email.length > 0)
          : []

        // Find the domain for the from address
        const fromDomain = values.from_address.split('@')[1]

        if (!fromDomain) {
          throw new Error('Invalid from address format')
        }

        // If composing new (not replying) and using custom from, ensure domain is permitted
        if (!replyTo && showCustomFromInput) {
          const allowedDomains = Array.from(
            new Set(
              availableAddresses
                .map((a) => a.domain || a.address.split('@')[1])
                .filter(Boolean)
            )
          )
          if (!allowedDomains.includes(fromDomain)) {
            throw new Error('From address domain is not one of your verified domains')
          }
        }

        const response = await fetch('/api/domains', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const domainsData = await response.json()
        const domain = domainsData.domains?.find(
          (d: any) => d.domain_name === fromDomain
        )

        if (!domain) {
          throw new Error(
            `Domain "${fromDomain}" not found in your account. Please add and verify this domain first.`
          )
        }

        if (domain.verification_status !== 'verified') {
          throw new Error(
            `Domain "${fromDomain}" is not verified yet. Please complete domain verification first.`
          )
        }

        // Prepare attachments payload (base64) and send via domain API
        const attachmentsPayload = await Promise.all(
          attachments.map((f) => fileToAttachment(f))
        )

        const sendResponse = await fetch('/api/emails/send-from-domain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            domain_id: domain.id,
            from_address: values.from_address,
            to_addresses: toAddresses,
            cc_addresses: ccAddresses,
            bcc_addresses: bccAddresses,
            subject: values.subject,
            body_html: values.body_html,
            in_reply_to: replyTo?.inReplyTo,
            references: replyTo?.references || [],
            attachments: attachmentsPayload,
          }),
        })

        if (!sendResponse.ok) {
          const errorData = await sendResponse.json()
          const errorMessage = errorData.error || 'Failed to send email'

          // Check if this is a retryable error
          const isRetryableError =
            sendResponse.status >= 500 ||
            sendResponse.status === 429 ||
            errorMessage.toLowerCase().includes('timeout') ||
            errorMessage.toLowerCase().includes('network')

          if (isRetryableError && attempt < 2) {
            // Retry up to 3 times (attempt 0, 1, 2)
            console.log(`Retrying send attempt ${attempt + 1}/3...`)
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * (attempt + 1))
            ) // Exponential backoff
            return attemptSend(attempt + 1)
          }

          throw new Error(errorMessage)
        }

        // Success
        toast({
          title: 'Email sent!',
          description: `Your email has been sent successfully.`,
        })

        // Reset form and close dialog - signal that email was sent
        form.reset()
        setAttachments([])
        setRetryCount(0)
        onOpenChange(false, true)
      } catch (error) {
        console.error('Send error:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred'
        setLastError(errorMessage)

        // Show error with retry option for certain errors
        const canRetry =
          attempt < 2 &&
          (errorMessage.toLowerCase().includes('network') ||
            errorMessage.toLowerCase().includes('timeout') ||
            errorMessage.toLowerCase().includes('server error'))

        toast({
          title: 'Failed to send email',
          description: canRetry
            ? `${errorMessage}. Click 'Send Email' to retry.`
            : errorMessage,
          variant: 'destructive',
        })

        if (attempt >= 2) {
          setRetryCount(attempt + 1)
        }
      } finally {
        setSending(false)
      }
    }

    // Start the send process
    await attemptSend(0)
  }

  if (!open) return null

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-2xl transition-all duration-200',
        isMaximized
          ? 'inset-4'
          : isMinimized
            ? 'bottom-0 right-6 h-10 w-80'
            : 'bottom-0 right-6 h-[600px] w-96'
      )}
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {replyTo ? 'Reply' : 'New Message'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-6 w-6 p-0"
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex h-full flex-col">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex h-full flex-col"
            >
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {/* From */}
                <FormField
                  control={form.control}
                  name="from_address"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="w-12 text-xs">From</FormLabel>
                        <FormControl>
                          {replyTo ? (
                            // Reply mode: lock to the reply address
                            <Input
                              value={field.value}
                              readOnly
                              className="h-8 rounded-none border-0 border-b text-sm focus:ring-0 bg-muted"
                            />
                          ) : (
                            // New compose: always use input field
                            <Input
                              placeholder="you@yourdomain.com"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              list="from-suggestions"
                              className="h-8 rounded-none border-0 border-b text-sm focus:ring-0"
                            />
                          )}
                        </FormControl>
                        <datalist id="from-suggestions">
                          {availableAddresses.map((addr) => (
                            <option key={addr.address} value={addr.address} />
                          ))}
                        </datalist>
                                  <span className="text-sm">
                                    {addr.address}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* To */}
                <FormField
                  control={form.control}
                  name="to_addresses"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="w-12 text-xs">To</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Recipients"
                            {...field}
                            className="h-8 rounded-none border-0 border-b text-sm focus-visible:ring-0"
                          />
                        </FormControl>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCc(!showCc)}
                            className="h-6 px-2 text-xs"
                          >
                            Cc
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowBcc(!showBcc)}
                            className="h-6 px-2 text-xs"
                          >
                            Bcc
                          </Button>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CC */}
                {showCc && (
                  <FormField
                    control={form.control}
                    name="cc_addresses"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormLabel className="w-12 text-xs">Cc</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Carbon copy"
                              {...field}
                              className="h-8 rounded-none border-0 border-b text-sm focus-visible:ring-0"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* BCC */}
                {showBcc && (
                  <FormField
                    control={form.control}
                    name="bcc_addresses"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormLabel className="w-12 text-xs">Bcc</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Blind carbon copy"
                              {...field}
                              className="h-8 rounded-none border-0 border-b text-sm focus-visible:ring-0"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Subject */}
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="w-12 text-xs">Subject</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Subject"
                            {...field}
                            className="h-8 rounded-none border-0 border-b text-sm focus-visible:ring-0"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Attachments */}
                {attachments.length > 0 && (
                  <div className="space-y-1 rounded border p-2">
                    <div className="mb-1 text-xs text-gray-600">
                      Attachments:
                    </div>
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs"
                      >
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="mx-2 text-gray-500">
                          {Math.round(file.size / 1024)}KB
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-4 w-4 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Body */}
                <FormField
                  control={form.control}
                  name="body_html"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Compose your message..."
                          className="max-h-[200px] min-h-[120px] resize-none border-0 text-sm focus-visible:ring-0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Footer */}
              <div className="flex flex-shrink-0 items-center justify-between border-t bg-white p-3">
                <div className="flex items-center gap-1">
                  <Button type="submit" disabled={sending} size="sm">
                    {sending ? 'Sending...' : 'Send'}
                    <Send className="ml-1 h-3 w-3" />
                  </Button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 p-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 p-0"
                  >
                    <Image className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  )
}
