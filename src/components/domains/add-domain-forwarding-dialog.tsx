'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/components/ui/use-toast'
import { Mail, Globe, Shield, Copy, CheckCircle, Plus } from 'lucide-react'
// Removed useAuth import - not using authentication for ImprovMX-style setup

const formSchema = z.object({
  domain_name: z
    .string()
    .min(1, 'Domain name is required')
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)+$/,
      'Please enter a valid domain name'
    ),
  forward_to_email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
})

interface AddDomainForwardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DNSRecord {
  type: string
  host: string
  priority?: number
  value: string
}

interface SetupResponse {
  success: boolean
  domain: {
    id: string
    domain_name: string
    forward_to_email: string
    verification_status: string
  }
  dns_instructions: {
    mx_records: DNSRecord[]
    spf_record: DNSRecord
    verification_record: DNSRecord
  }
  message: string
}

export function AddDomainForwardingDialog({
  open,
  onOpenChange,
}: AddDomainForwardingDialogProps) {
  const [setupResult, setSetupResult] = useState<SetupResponse | null>(null)
  const [showNewEmailInput, setShowNewEmailInput] = useState(false)
  const [existingEmails, setExistingEmails] = useState<string[]>([])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      domain_name: '',
      forward_to_email: '',
    },
  })

  // Fetch existing forwarding emails
  useEffect(() => {
    const fetchExistingEmails = async () => {
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
          const emails = data.domains
            ?.map((domain: any) => domain.default_forward_email)
            ?.filter((email: string) => email)
            ?.filter((email: string, index: number, arr: string[]) => arr.indexOf(email) === index) // Remove duplicates
          setExistingEmails(emails || [])
        }
      } catch (error) {
        console.error('Failed to fetch existing emails:', error)
      }
    }

    if (open) {
      fetchExistingEmails()
    }
  }, [open])

  const addDomainMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // Always use forwarding setup API since forwarding is always enabled
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch('/api/domains/setup-forwarding', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          domain_name: values.domain_name,
          forward_to_email: values.forward_to_email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || 'Failed to setup domain forwarding'
        )
      }

      return await response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })

      // Always close dialog and redirect to domains page for DNS setup
      onOpenChange(false)
      form.reset()
      setSetupResult(null)
      setShowNewEmailInput(false)
      
      const domainName = data.domain?.domain_name || data.domain_name
      const forwardEmail = data.domain?.forward_to_email || data.forward_to_email
      
      toast({
        title: 'Domain Added Successfully!',
        description: `${domainName} has been configured to forward to ${forwardEmail}. Please add the DNS records to complete setup.`,
      })
      
      // Optional: You could add a redirect to the specific domain page
      // if (data.domain?.id) {
      //   window.location.href = `/dashboard/domains/${data.domain.id}`
      // }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      description: 'DNS record copied to clipboard',
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    setSetupResult(null)
    setShowNewEmailInput(false)
    form.reset()
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    addDomainMutation.mutate(values)
  }

  const handleEmailSelection = (value: string) => {
    if (value === 'add_new') {
      setShowNewEmailInput(true)
      form.setValue('forward_to_email', '')
    } else {
      setShowNewEmailInput(false)
      form.setValue('forward_to_email', value)
    }
  }

  // Show DNS instructions after successful forwarding setup
  if (setupResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
              Setup Complete!
            </DialogTitle>
            <DialogDescription>{setupResult.message}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Domain
                    </label>
                    <div className="mt-1 font-mono text-lg">
                      {setupResult.domain.domain_name}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Forwards to
                    </label>
                    <div className="mt-1 font-mono text-lg">
                      {setupResult.domain.forward_to_email}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* MX Records */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 text-lg font-semibold">MX Records</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Add these MX records to your DNS provider
                  </p>
                  <div className="space-y-2">
                    {setupResult.dns_instructions.mx_records.map(
                      (record, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg bg-muted p-3"
                        >
                          <div className="font-mono text-sm">
                            <div>
                              <strong>Type:</strong> {record.type}
                            </div>
                            <div>
                              <strong>Host:</strong> {record.host}
                            </div>
                            <div>
                              <strong>Priority:</strong> {record.priority}
                            </div>
                            <div>
                              <strong>Value:</strong> {record.value}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(record.value)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* TXT Records */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 text-lg font-semibold">TXT Records</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Add these TXT records for SPF and verification
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div className="font-mono text-sm">
                        <div>
                          <strong>Type:</strong>{' '}
                          {setupResult.dns_instructions.spf_record.type}
                        </div>
                        <div>
                          <strong>Host:</strong>{' '}
                          {setupResult.dns_instructions.spf_record.host}
                        </div>
                        <div>
                          <strong>Value:</strong>{' '}
                          {setupResult.dns_instructions.spf_record.value}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(
                            setupResult.dns_instructions.spf_record.value
                          )
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div className="font-mono text-sm">
                        <div>
                          <strong>Type:</strong>{' '}
                          {
                            setupResult.dns_instructions.verification_record
                              .type
                          }
                        </div>
                        <div>
                          <strong>Host:</strong>{' '}
                          {
                            setupResult.dns_instructions.verification_record
                              .host
                          }
                        </div>
                        <div>
                          <strong>Value:</strong>{' '}
                          {
                            setupResult.dns_instructions.verification_record
                              .value
                          }
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(
                            setupResult.dns_instructions.verification_record
                              .value
                          )
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              After adding these DNS records, verification will happen
              automatically. You can check the status in your domains list.
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Domain</DialogTitle>
          <DialogDescription>
            Add a custom domain for email aliases and forwarding
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="domain_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example.com"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter your domain name without the www prefix
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="forward_to_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forward To Email</FormLabel>
                  <FormControl>
                    {!showNewEmailInput ? (
                      <Select onValueChange={handleEmailSelection} value={field.value || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an email or add new" />
                        </SelectTrigger>
                        <SelectContent>
                          {existingEmails.map((email) => (
                            <SelectItem key={email} value={email}>
                              {email}
                            </SelectItem>
                          ))}
                          <SelectItem value="add_new">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add new email
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          type="email"
                          placeholder="your.email@gmail.com"
                          {...field}
                          value={field.value || ''}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowNewEmailInput(false)
                            form.setValue('forward_to_email', '')
                          }}
                        >
                          Back to selection
                        </Button>
                      </div>
                    )}
                  </FormControl>
                  <FormDescription>
                    All emails to your domain will be forwarded to this address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />


            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Card className="text-center">
                    <CardContent className="p-4">
                      <Mail className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                      <h4 className="text-sm font-semibold">
                        Email Forwarding
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Forward all emails to your account
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="text-center">
                    <CardContent className="p-4">
                      <Globe className="mx-auto mb-2 h-8 w-8 text-green-600" />
                      <h4 className="text-sm font-semibold">Full Inbox</h4>
                      <p className="text-xs text-muted-foreground">
                        Access emails in unified inbox
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="text-center">
                    <CardContent className="p-4">
                      <Shield className="mx-auto mb-2 h-8 w-8 text-purple-600" />
                      <h4 className="text-sm font-semibold">
                        Reply with Domain
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Reply using your domain address
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> You'll need to add MX records to your
                    DNS provider. We use Mailgun's servers to receive emails
                    securely.
                  </p>
                </div>
              </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addDomainMutation.isPending}>
                {addDomainMutation.isPending ? 'Adding...' : 'Add Domain'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
