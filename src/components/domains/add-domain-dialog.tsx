'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface AddDomainDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddDomainDialog({ open, onOpenChange, onSuccess }: AddDomainDialogProps) {
  const [domainName, setDomainName] = useState('')
  const { toast } = useToast()

  const addDomainMutation = useMutation({
    mutationFn: (domain: string) =>
      import('@/lib/api/client').then(({ domainsAPI }) =>
        domainsAPI.create({ domain_name: domain })
      ),
    onSuccess: (data) => {
      toast({
        title: 'Domain Added',
        description: `${data.domain_name} has been added successfully. You can now verify it.`,
      })
      setDomainName('')
      onSuccess()
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Add Domain',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!domainName.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a domain name',
        variant: 'destructive'
      })
      return
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(domainName.trim())) {
      toast({
        title: 'Invalid Domain',
        description: 'Please enter a valid domain name (e.g., example.com)',
        variant: 'destructive'
      })
      return
    }

    addDomainMutation.mutate(domainName.trim().toLowerCase())
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!addDomainMutation.isPending) {
      onOpenChange(newOpen)
      if (!newOpen) {
        setDomainName('')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Domain</DialogTitle>
          <DialogDescription>
            Add a custom domain to create email aliases. You'll need to verify ownership after adding it.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                disabled={addDomainMutation.isPending}
                autoComplete="off"
              />
              <p className="text-sm text-muted-foreground">
                Enter your domain without "www" (e.g., example.com)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={addDomainMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addDomainMutation.isPending || !domainName.trim()}
            >
              {addDomainMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Domain'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
