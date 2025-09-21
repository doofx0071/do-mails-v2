'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Send, X } from 'lucide-react'

const composeSchema = z.object({
  from_address: z.string().min(1, 'From address is required').email('Invalid email format'),
  to_addresses: z.string().min(1, 'To address is required'),
  subject: z.string().min(1, 'Subject is required'),
  body_html: z.string().min(1, 'Message content is required'),
  cc_addresses: z.string().optional(),
  bcc_addresses: z.string().optional(),
})

type ComposeFormData = z.infer<typeof composeSchema>

interface ComposeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedAccount?: string | null
  replyTo?: {
    to: string
    subject: string
    inReplyTo?: string
    references?: string[]
    fromAddress?: string
  }
}

interface DomainAddress {
  domain: string
  address: string
  forwardEmail: string
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  selectedAccount,
  replyTo,
}: ComposeEmailDialogProps) {
  const [sending, setSending] = useState(false)
  const [availableAddresses, setAvailableAddresses] = useState<DomainAddress[]>([])
  const [customFromAddress, setCustomFromAddress] = useState('')
  const [showCustomFromInput, setShowCustomFromInput] = useState(false)
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

  // Fetch available sending addresses when dialog opens
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
          
          // First, get recent recipient addresses from email threads
          const threadResponse = await fetch(`/api/emails/threads?forward_email=${encodeURIComponent(selectedAccount)}&limit=20`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          
          const recentAddresses = new Set<string>()
          
          if (threadResponse.ok) {
            const threadData = await threadResponse.json()
            threadData.threads?.forEach((thread: any) => {
              if (thread.recipient_address) {
                recentAddresses.add(thread.recipient_address)
              }
            })
          }
          
          data.domains?.forEach((domain: any) => {
            if (domain.default_forward_email && selectedAccount && domain.default_forward_email === selectedAccount) {
              // Add recent recipient addresses for this domain
              recentAddresses.forEach(address => {
                if (address.endsWith(`@${domain.domain_name}`)) {
                  addresses.push({
                    domain: domain.domain_name,
                    address: address,
                    forwardEmail: domain.default_forward_email,
                  })
                }
              })
              
              // Add common email prefixes only if we don't have recent addresses
              if (addresses.length === 0) {
                const commonPrefixes = ['hello', 'contact', 'info', 'support', 'sales', 'hi', 'team', 'mail', 'admin']
                commonPrefixes.forEach(prefix => {
                  addresses.push({
                    domain: domain.domain_name,
                    address: `${prefix}@${domain.domain_name}`,
                    forwardEmail: domain.default_forward_email,
                  })
                })
              }
              
              // Always add custom address option
              addresses.push({
                domain: domain.domain_name,
                address: `custom@${domain.domain_name}`,
                forwardEmail: domain.default_forward_email,
              })
            }
          })
          
          // Remove duplicates and sort addresses
          const uniqueAddresses = addresses.filter((addr, index, self) => 
            index === self.findIndex(a => a.address === addr.address)
          ).sort((a, b) => {
            // Sort recent addresses first, then common prefixes
            const aIsRecent = recentAddresses.has(a.address)
            const bIsRecent = recentAddresses.has(b.address)
            
            if (aIsRecent && !bIsRecent) return -1
            if (!aIsRecent && bIsRecent) return 1
            return a.address.localeCompare(b.address)
          })
          
          setAvailableAddresses(uniqueAddresses)
          
          // Set first address as default (prioritize recent or reply address)
          if (uniqueAddresses.length > 0 && !form.getValues('from_address')) {
            form.setValue('from_address', uniqueAddresses[0].address)
          }
        }
      } catch (error) {
        console.error('Failed to fetch domains:', error)
      }
    }

    if (open && selectedAccount) {
      fetchAddresses()
    }
  }, [open, selectedAccount, form])

  // Set reply defaults
  useEffect(() => {
    if (replyTo) {
      form.setValue('to_addresses', replyTo.to)
      form.setValue('subject', replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`)
      
      // If reply has a specific fromAddress, use that
      if (replyTo.fromAddress) {
        form.setValue('from_address', replyTo.fromAddress)
      }
    }
  }, [replyTo, form])

  const onSubmit = async (values: ComposeFormData) => {
    try {
      setSending(true)
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        throw new Error('No auth token found')
      }

      // Parse email addresses
      const toAddresses = values.to_addresses
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)

      const ccAddresses = values.cc_addresses
        ? values.cc_addresses.split(',').map(email => email.trim()).filter(email => email.length > 0)
        : []

      const bccAddresses = values.bcc_addresses
        ? values.bcc_addresses.split(',').map(email => email.trim()).filter(email => email.length > 0)
        : []

      // Find the domain for the from address
      const fromDomain = values.from_address.split('@')[1]
      
      if (!fromDomain) {
        throw new Error('Invalid from address format')
      }
      
      const response = await fetch('/api/domains', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const domainsData = await response.json()
      const domain = domainsData.domains?.find((d: any) => d.domain_name === fromDomain)
      
      if (!domain) {
        throw new Error(`Domain "${fromDomain}" not found in your account. Please add and verify this domain first.`)
      }
      
      if (domain.verification_status !== 'verified') {
        throw new Error(`Domain "${fromDomain}" is not verified yet. Please complete domain verification first.`)
      }

      // Send email using domain-based API
      const sendResponse = await fetch('/api/emails/send-from-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        }),
      })

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      toast({
        title: 'Email sent!',
        description: `Your email has been sent successfully.`,
      })

      // Reset form and close dialog
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Send error:', error)
      toast({
        title: 'Failed to send email',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {replyTo ? 'Reply to Email' : 'Compose Email'}
          </DialogTitle>
          <DialogDescription>
            {replyTo ? 'Send your reply using your domain address' : 'Send an email from your custom domain'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="from_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  {!showCustomFromInput ? (
                    <Select 
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setShowCustomFromInput(true)
                          field.onChange('')
                        } else {
                          field.onChange(value)
                        }
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sending address" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableAddresses.map((addr) => (
                          <SelectItem key={addr.address} value={addr.address}>
                            <div className="flex flex-col">
                              <span>{addr.address}</span>
                              <span className="text-xs text-muted-foreground">
                                via {addr.domain}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2 text-primary">
                            <span>✏️ Enter custom address</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <FormControl>
                        <Input 
                          placeholder="your-name@your-domain.com" 
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.value)
                            setCustomFromAddress(e.target.value)
                          }}
                        />
                      </FormControl>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowCustomFromInput(false)
                            field.onChange(availableAddresses[0]?.address || '')
                          }}
                        >
                          Back to presets
                        </Button>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="to_addresses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="recipient@example.com, another@example.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cc_addresses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CC (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="cc@example.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bcc_addresses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BCC (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="bcc@example.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter email subject" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body_html"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write your message here..." 
                      className="min-h-[200px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? 'Sending...' : 'Send Email'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}