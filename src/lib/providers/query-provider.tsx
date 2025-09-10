'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: any) => {
              // Don't retry on 401/403 errors (auth issues)
              if (error?.status === 401 || error?.status === 403) {
                return false
              }
              // Retry up to 3 times for other errors
              return failureCount < 3
            },
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: (failureCount, error: any) => {
              // Don't retry mutations on auth errors
              if (error?.status === 401 || error?.status === 403) {
                return false
              }
              // Retry once for other errors
              return failureCount < 1
            },
            onError: (error: any) => {
              // Global error handling for mutations
              console.error('Mutation error:', error)
              
              // Handle auth errors globally
              if (error?.status === 401) {
                // Clear auth token and redirect to login
                localStorage.removeItem('auth_token')
                window.location.href = '/auth/signin'
              }
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
