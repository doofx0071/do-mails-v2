'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  FileText,
  Code,
  Eye
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Alias {
  id: string
  alias_name: string
  full_address: string
  is_enabled: boolean
}

interface Signature {
  id: string
  alias_id: string
  signature_html: string
  signature_text: string
  is_default: boolean
  created_at: string
  updated_at: string
  alias: {
    id: string
    alias_name: string
    full_address: string
  }
}

interface SignaturesManagementProps {
  aliases: Alias[]
}

export function SignaturesManagement({ aliases }: SignaturesManagementProps) {
  const [selectedAliasId, setSelectedAliasId] = useState<string>('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSignature, setEditingSignature] = useState<Signature | null>(null)
  const [previewMode, setPreviewMode] = useState<'text' | 'html'>('text')
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch signatures
  const { data: signaturesData, isLoading } = useQuery<{ signatures: Signature[] }>({
    queryKey: ['signatures', selectedAliasId],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const params = new URLSearchParams()
      if (selectedAliasId) {
        params.append('alias_id', selectedAliasId)
      }

      const response = await fetch(`/api/emails/signatures?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch signatures')
      }

      return response.json()
    }
  })

  // Create signature mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      alias_id: string
      signature_html: string
      signature_text: string
      is_default?: boolean
    }) => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch('/api/emails/signatures', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create signature')
      }

      return response.json()
    },
    onSuccess: () => {
      toast({
        title: 'Signature Created',
        description: 'Email signature has been created successfully',
      })
      setShowCreateDialog(false)
      queryClient.invalidateQueries({ queryKey: ['signatures'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Update signature mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: {
      id: string
      data: {
        signature_html?: string
        signature_text?: string
        is_default?: boolean
      }
    }) => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/emails/signatures/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update signature')
      }

      return response.json()
    },
    onSuccess: () => {
      toast({
        title: 'Signature Updated',
        description: 'Email signature has been updated successfully',
      })
      setShowEditDialog(false)
      setEditingSignature(null)
      queryClient.invalidateQueries({ queryKey: ['signatures'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Delete signature mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('No auth token')

      const response = await fetch(`/api/emails/signatures/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete signature')
      }

      return response.json()
    },
    onSuccess: () => {
      toast({
        title: 'Signature Deleted',
        description: 'Email signature has been deleted successfully',
      })
      queryClient.invalidateQueries({ queryKey: ['signatures'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const signatures = signaturesData?.signatures || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Signatures</h2>
          <p className="text-muted-foreground">
            Manage signatures for your email aliases
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          disabled={aliases.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Signature
        </Button>
      </div>

      {/* Alias Filter */}
      <div className="flex items-center gap-4">
        <Label htmlFor="alias-select">Filter by alias:</Label>
        <Select value={selectedAliasId} onValueChange={setSelectedAliasId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All aliases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All aliases</SelectItem>
            {aliases.map((alias) => (
              <SelectItem key={alias.id} value={alias.id}>
                {alias.full_address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Signatures List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading signatures...</span>
        </div>
      ) : signatures.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No signatures found</h3>
              <p className="text-muted-foreground mb-4">
                {selectedAliasId 
                  ? 'No signatures found for the selected alias'
                  : 'Create your first email signature to get started'
                }
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Signature
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {signatures.map((signature) => (
            <Card key={signature.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {signature.alias.full_address}
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(signature.created_at).toLocaleDateString()}
                      {signature.updated_at !== signature.created_at && (
                        <span> • Updated {new Date(signature.updated_at).toLocaleDateString()}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {signature.is_default && (
                      <Badge variant="default">Default</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSignature(signature)
                        setShowEditDialog(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this signature?')) {
                          deleteMutation.mutate(signature.id)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={previewMode === 'text' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('text')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Text
                    </Button>
                    <Button
                      variant={previewMode === 'html' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('html')}
                    >
                      <Code className="h-4 w-4 mr-2" />
                      HTML
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-4 bg-muted/50">
                    {previewMode === 'text' ? (
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {signature.signature_text}
                      </pre>
                    ) : (
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: signature.signature_html }}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Signature Dialog */}
      <CreateSignatureDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        aliases={aliases}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Edit Signature Dialog */}
      {editingSignature && (
        <EditSignatureDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          signature={editingSignature}
          onSubmit={(data) => updateMutation.mutate({ id: editingSignature.id, data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  )
}

// Create Signature Dialog Component
interface CreateSignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aliases: Alias[]
  onSubmit: (data: {
    alias_id: string
    signature_html: string
    signature_text: string
    is_default?: boolean
  }) => void
  isLoading: boolean
}

function CreateSignatureDialog({
  open,
  onOpenChange,
  aliases,
  onSubmit,
  isLoading
}: CreateSignatureDialogProps) {
  const [aliasId, setAliasId] = useState('')
  const [signatureText, setSignatureText] = useState('')
  const [signatureHtml, setSignatureHtml] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!aliasId || !signatureText.trim()) return

    onSubmit({
      alias_id: aliasId,
      signature_text: signatureText.trim(),
      signature_html: signatureHtml.trim() || signatureText.trim(),
      is_default: isDefault
    })
  }

  const resetForm = () => {
    setAliasId('')
    setSignatureText('')
    setSignatureHtml('')
    setIsDefault(false)
  }

  React.useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Email Signature</DialogTitle>
          <DialogDescription>
            Create a new signature for one of your email aliases
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alias">Email Alias</Label>
            <Select value={aliasId} onValueChange={setAliasId} required>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature-text">Text Signature</Label>
            <Textarea
              id="signature-text"
              placeholder="Enter your signature in plain text..."
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature-html">HTML Signature (Optional)</Label>
            <Textarea
              id="signature-html"
              placeholder="Enter your signature in HTML format..."
              value={signatureHtml}
              onChange={(e) => setSignatureHtml(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              If left empty, the text signature will be used for HTML emails too
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !aliasId || !signatureText.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Signature
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Edit Signature Dialog Component
interface EditSignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  signature: Signature
  onSubmit: (data: {
    signature_html?: string
    signature_text?: string
    is_default?: boolean
  }) => void
  isLoading: boolean
}

function EditSignatureDialog({
  open,
  onOpenChange,
  signature,
  onSubmit,
  isLoading
}: EditSignatureDialogProps) {
  const [signatureText, setSignatureText] = useState(signature.signature_text)
  const [signatureHtml, setSignatureHtml] = useState(signature.signature_html)
  const [isDefault, setIsDefault] = useState(signature.is_default)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!signatureText.trim()) return

    onSubmit({
      signature_text: signatureText.trim(),
      signature_html: signatureHtml.trim() || signatureText.trim(),
      is_default: isDefault
    })
  }

  React.useEffect(() => {
    if (open) {
      setSignatureText(signature.signature_text)
      setSignatureHtml(signature.signature_html)
      setIsDefault(signature.is_default)
    }
  }, [open, signature])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Email Signature</DialogTitle>
          <DialogDescription>
            Edit signature for {signature.alias.full_address}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-signature-text">Text Signature</Label>
            <Textarea
              id="edit-signature-text"
              placeholder="Enter your signature in plain text..."
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-signature-html">HTML Signature</Label>
            <Textarea
              id="edit-signature-html"
              placeholder="Enter your signature in HTML format..."
              value={signatureHtml}
              onChange={(e) => setSignatureHtml(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !signatureText.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Signature
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
