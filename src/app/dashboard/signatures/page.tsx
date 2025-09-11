'use client'

import { useQuery } from '@tanstack/react-query'
import { SignaturesManagement } from '@/components/emails/signatures-management'
import { Loader2 } from 'lucide-react'

interface Alias {
  id: string
  alias_name: string
  full_address: string
  is_enabled: boolean
}

export default function SignaturesPage() {
  // Fetch aliases for signatures management
  const { data: aliasesData, isLoading, error } = useQuery<{ aliases: Alias[] }>({
    queryKey: ['aliases'],
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
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading aliases...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Error loading aliases</h3>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    )
  }

  const aliases = aliasesData?.aliases || []

  return (
    <div className="container mx-auto py-6">
      <SignaturesManagement aliases={aliases} />
    </div>
  )
}
