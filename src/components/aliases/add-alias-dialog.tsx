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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Shuffle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Domain {
  id: string
  domain_name: string
  verification_status: string
}

interface AddAliasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  domains: Domain[]
  onSuccess: () => void
}

export function AddAliasDialog({ open, onOpenChange, domains, onSuccess }: AddAliasDialogProps) {
  const [aliasName, setAliasName] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [isEnabled, setIsEnabled] = useState(true)
  const { toast } = useToast()

  const addAliasMutation = useMutation({
    mutationFn: async (data: { domain_id: string, alias_name: string, is_enabled: boolean }) => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch('/api/aliases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create alias')
      }

      return response.json()
    },
    onSuccess: (data) => {
      toast({
        title: 'Alias Created',
        description: `${data.full_address} has been created successfully.`,
      })
      resetForm()
      onSuccess()
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Create Alias',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const resetForm = () => {
    setAliasName('')
    setSelectedDomain('')
    setIsEnabled(true)
  }

  const generateRandomAlias = () => {
    const adjectives = ['happy', 'bright', 'swift', 'clever', 'gentle', 'bold', 'calm', 'wise']
    const nouns = ['cat', 'dog', 'bird', 'fish', 'star', 'moon', 'sun', 'tree']
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const number = Math.floor(Math.random() * 999) + 1
    
    setAliasName(`${adjective}${noun}${number}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!aliasName.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter an alias name',
        variant: 'destructive'
      })
      return
    }

    if (!selectedDomain) {
      toast({
        title: 'Invalid Input',
        description: 'Please select a domain',
        variant: 'destructive'
      })
      return
    }

    // Basic alias validation
    const aliasRegex = /^[a-zA-Z0-9._-]+$/
    if (!aliasRegex.test(aliasName.trim())) {
      toast({
        title: 'Invalid Alias Name',
        description: 'Alias name can only contain letters, numbers, dots, underscores, and hyphens',
        variant: 'destructive'
      })
      return
    }

    if (aliasName.trim().startsWith('.') || aliasName.trim().endsWith('.')) {
      toast({
        title: 'Invalid Alias Name',
        description: 'Alias name cannot start or end with a dot',
        variant: 'destructive'
      })
      return
    }

    addAliasMutation.mutate({
      domain_id: selectedDomain,
      alias_name: aliasName.trim().toLowerCase(),
      is_enabled: isEnabled
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!addAliasMutation.isPending) {
      onOpenChange(newOpen)
      if (!newOpen) {
        resetForm()
      }
    }
  }

  const selectedDomainData = domains.find(d => d.id === selectedDomain)
  const previewAddress = selectedDomainData && aliasName.trim() 
    ? `${aliasName.trim().toLowerCase()}@${selectedDomainData.domain_name}`
    : ''

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Email Alias</DialogTitle>
          <DialogDescription>
            Create a new email alias to receive emails at a custom address.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="domain">Domain</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.domain_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {domains.length === 0 && (
                <p className="text-sm text-muted-foreground text-red-600">
                  No verified domains available. Please add and verify a domain first.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="alias">Alias Name</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generateRandomAlias}
                  disabled={addAliasMutation.isPending}
                >
                  <Shuffle className="h-4 w-4 mr-1" />
                  Random
                </Button>
              </div>
              <Input
                id="alias"
                placeholder="myalias"
                value={aliasName}
                onChange={(e) => setAliasName(e.target.value)}
                disabled={addAliasMutation.isPending}
                autoComplete="off"
              />
              <p className="text-sm text-muted-foreground">
                Use letters, numbers, dots, underscores, and hyphens only
              </p>
            </div>

            {previewAddress && (
              <div className="grid gap-2">
                <Label>Preview</Label>
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  {previewAddress}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enable Alias</Label>
                <p className="text-sm text-muted-foreground">
                  Start receiving emails immediately
                </p>
              </div>
              <Switch
                id="enabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                disabled={addAliasMutation.isPending}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={addAliasMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addAliasMutation.isPending || !aliasName.trim() || !selectedDomain || domains.length === 0}
            >
              {addAliasMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Alias'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
