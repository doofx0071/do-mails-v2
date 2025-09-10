import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Integration Test: Unified Inbox Experience
 * 
 * This test validates the complete user workflow for unified inbox management.
 * It MUST FAIL initially until the full inbox system is implemented.
 * 
 * User Stories:
 * - "Given emails are sent to my various aliases, When I open my inbox, Then all emails appear in a single unified view"
 * - "Given I receive multiple emails in a conversation, When I view them, Then they are grouped into threaded conversations"
 * - "Given I want to organize my emails, When I use labels or folders, Then I can categorize and filter emails effectively"
 */

const API_BASE_URL = 'http://localhost:3000/api'

const TEST_USER = {
  email: 'integration-inbox-test@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any
let testUserId: string

describe('Integration: Unified Inbox Experience', () => {
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: TEST_USER.email,
        password: TEST_USER.password,
      })

      if (authError) throw authError
      authToken = authData.session?.access_token || ''
      testUserId = authData.user?.id || ''
    } catch (error) {
      console.warn('Test user creation failed, using mock data:', error)
      authToken = 'mock-token-for-integration-test'
      testUserId = 'mock-user-id'
    }
  })

  afterAll(async () => {
    if (supabase && testUserId !== 'mock-user-id') {
      try {
        await supabase.auth.admin.deleteUser(testUserId)
      } catch (error) {
        console.warn('Test user cleanup failed:', error)
      }
    }
  })

  it('should display unified inbox with emails from multiple aliases', async () => {
    // Step 1: Get initial inbox state (should be empty)
    const initialInboxResponse = await fetch(`${API_BASE_URL}/emails/threads`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(initialInboxResponse.status).toBe(200)
    const initialInbox = await initialInboxResponse.json()

    expect(initialInbox).toHaveProperty('threads')
    expect(initialInbox).toHaveProperty('total')
    expect(initialInbox).toHaveProperty('has_more')
    expect(Array.isArray(initialInbox.threads)).toBe(true)

    // For new user, inbox should be empty
    expect(initialInbox.total).toBe(0)
    expect(initialInbox.threads.length).toBe(0)
    expect(initialInbox.has_more).toBe(false)

    // Step 2: Simulate receiving emails via webhook (this would normally come from Mailgun)
    // For integration testing, we test the inbox display functionality
    
    // Test pagination
    const paginatedResponse = await fetch(`${API_BASE_URL}/emails/threads?limit=10&offset=0`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(paginatedResponse.status).toBe(200)
    const paginatedInbox = await paginatedResponse.json()

    expect(paginatedInbox).toHaveProperty('threads')
    expect(paginatedInbox).toHaveProperty('total')
    expect(paginatedInbox).toHaveProperty('has_more')

    // Step 3: Test filtering by alias (when emails exist)
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'
    
    const filteredResponse = await fetch(`${API_BASE_URL}/emails/threads?alias_id=${testAliasId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(filteredResponse.status).toBe(200)
    const filteredInbox = await filteredResponse.json()

    expect(filteredInbox).toHaveProperty('threads')
    expect(Array.isArray(filteredInbox.threads)).toBe(true)

    // Step 4: Test archived emails filter
    const archivedResponse = await fetch(`${API_BASE_URL}/emails/threads?archived=true`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(archivedResponse.status).toBe(200)
    const archivedInbox = await archivedResponse.json()

    expect(archivedInbox).toHaveProperty('threads')
    expect(Array.isArray(archivedInbox.threads)).toBe(true)

    // Step 5: Test label filtering
    const labeledResponse = await fetch(`${API_BASE_URL}/emails/threads?labels=important,work`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(labeledResponse.status).toBe(200)
    const labeledInbox = await labeledResponse.json()

    expect(labeledInbox).toHaveProperty('threads')
    expect(Array.isArray(labeledInbox.threads)).toBe(true)
  })

  it('should handle email thread management and organization', async () => {
    const testThreadId = '123e4567-e89b-12d3-a456-426614174000'

    // Step 1: Try to get a specific thread (should return 404 until threads exist)
    const getThreadResponse = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(getThreadResponse.status).toBe(404) // Expected until threads exist

    // Step 2: Test thread archiving
    const archiveResponse = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_archived: true
      })
    })

    expect(archiveResponse.status).toBe(404) // Expected until thread exists

    // Step 3: Test label management
    const labelResponse = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        labels: ['important', 'work', 'follow-up']
      })
    })

    expect(labelResponse.status).toBe(404) // Expected until thread exists

    // Step 4: Test combined operations
    const combinedResponse = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_archived: false,
        labels: ['unread', 'priority']
      })
    })

    expect(combinedResponse.status).toBe(404) // Expected until thread exists
  })

  it('should handle message read status management', async () => {
    const testMessageId = '123e4567-e89b-12d3-a456-426614174000'

    // Step 1: Mark message as read
    const markReadResponse = await fetch(`${API_BASE_URL}/emails/messages/${testMessageId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(markReadResponse.status).toBe(404) // Expected until message exists

    // Step 2: Test idempotent behavior (marking already read message as read)
    const markReadAgainResponse = await fetch(`${API_BASE_URL}/emails/messages/${testMessageId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(markReadAgainResponse.status).toBe(404) // Expected until message exists
  })

  it('should validate inbox pagination and performance', async () => {
    // Test various pagination scenarios
    const paginationTests = [
      { limit: 10, offset: 0 },
      { limit: 25, offset: 0 },
      { limit: 50, offset: 0 },
      { limit: 10, offset: 10 },
      { limit: 100, offset: 0 } // Max limit
    ]

    for (const { limit, offset } of paginationTests) {
      const response = await fetch(`${API_BASE_URL}/emails/threads?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      
      const inbox = await response.json()
      expect(inbox).toHaveProperty('threads')
      expect(inbox).toHaveProperty('total')
      expect(inbox).toHaveProperty('has_more')
      
      // Validate pagination constraints
      expect(inbox.threads.length).toBeLessThanOrEqual(limit)
    }

    // Test invalid pagination parameters
    const invalidPaginationTests = [
      { limit: 0, offset: 0 },
      { limit: 101, offset: 0 }, // Over max limit
      { limit: 10, offset: -1 }, // Negative offset
      { limit: -1, offset: 0 } // Negative limit
    ]

    for (const { limit, offset } of invalidPaginationTests) {
      const response = await fetch(`${API_BASE_URL}/emails/threads?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(400)
      
      const errorResponse = await response.json()
      expect(errorResponse).toHaveProperty('error')
    }
  })

  it('should handle complex filtering combinations', async () => {
    // Test multiple filters combined
    const complexFilterTests = [
      'alias_id=123e4567-e89b-12d3-a456-426614174000&archived=false',
      'labels=important&archived=false&limit=20',
      'alias_id=123e4567-e89b-12d3-a456-426614174000&labels=work,urgent',
      'archived=true&labels=completed&limit=10&offset=5'
    ]

    for (const filterQuery of complexFilterTests) {
      const response = await fetch(`${API_BASE_URL}/emails/threads?${filterQuery}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      
      const inbox = await response.json()
      expect(inbox).toHaveProperty('threads')
      expect(inbox).toHaveProperty('total')
      expect(inbox).toHaveProperty('has_more')
      expect(Array.isArray(inbox.threads)).toBe(true)
    }
  })

  it('should maintain consistent inbox state across operations', async () => {
    // Step 1: Get initial inbox count
    const initialResponse = await fetch(`${API_BASE_URL}/emails/threads`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(initialResponse.status).toBe(200)
    const initialInbox = await initialResponse.json()
    const initialTotal = initialInbox.total

    // Step 2: Perform various operations and verify consistency
    const operations = [
      () => fetch(`${API_BASE_URL}/emails/threads?archived=false`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      }),
      () => fetch(`${API_BASE_URL}/emails/threads?archived=true`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      }),
      () => fetch(`${API_BASE_URL}/emails/threads?limit=50&offset=0`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      })
    ]

    for (const operation of operations) {
      const response = await operation()
      expect(response.status).toBe(200)
      
      const inbox = await response.json()
      expect(inbox).toHaveProperty('threads')
      expect(inbox).toHaveProperty('total')
      expect(Array.isArray(inbox.threads)).toBe(true)
    }

    // Step 3: Verify total count remains consistent
    const finalResponse = await fetch(`${API_BASE_URL}/emails/threads`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(finalResponse.status).toBe(200)
    const finalInbox = await finalResponse.json()
    
    // Total should remain the same (no emails were added/removed)
    expect(finalInbox.total).toBe(initialTotal)
  })
})
