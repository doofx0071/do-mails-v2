import { getAuthHeaders } from '@/lib/supabase/auth'

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export interface APIResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

class APIClient {
  private baseURL: string

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    try {
      // Get auth headers
      const authHeaders = await getAuthHeaders()

      const response = await fetch(url, {
        ...options,
        headers: {
          ...authHeaders,
          ...options.headers,
        },
      })

      // Handle different response types
      let data: any
      const contentType = response.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      if (!response.ok) {
        throw new APIError(
          data?.error || data?.message || `HTTP ${response.status}`,
          response.status,
          data?.code
        )
      }

      return data
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network error - please check your connection', 0)
      }

      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        0
      )
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let fullEndpoint = endpoint

    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })

      if (searchParams.toString()) {
        fullEndpoint += `?${searchParams.toString()}`
      }
    }

    return this.request<T>(fullEndpoint)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

// Create singleton instance
export const apiClient = new APIClient()

// Domain API
export const domainsAPI = {
  list: (params?: { status?: string }) =>
    apiClient.get<{ domains: any[] }>('/domains', params),

  create: (data: { domain_name: string }) =>
    apiClient.post<any>('/domains', data),

  verify: (id: string) => apiClient.post<any>(`/domains/${id}/verify`),
}


// Emails API
export const emailsAPI = {
  threads: {
    list: (params?: {
      archived?: string
      alias_id?: string
      limit?: number
      offset?: number
    }) =>
      apiClient.get<{ threads: any[]; total: number; has_more: boolean }>(
        '/emails/threads',
        params
      ),

    get: (id: string) => apiClient.get<any>(`/emails/threads/${id}`),

    update: (id: string, data: { is_archived?: boolean; labels?: string[] }) =>
      apiClient.patch<any>(`/emails/threads/${id}`, data),
  },

  send: (data: {
    alias_id: string
    to_addresses: string[]
    cc_addresses?: string[]
    bcc_addresses?: string[]
    subject: string
    body_text?: string
    body_html?: string
    in_reply_to?: string
    references?: string[]
  }) => apiClient.post<any>('/emails/send', data),

  messages: {
    markRead: (id: string, isRead: boolean) =>
      apiClient.patch<any>(`/emails/messages/${id}/read`, { is_read: isRead }),
  },
}
