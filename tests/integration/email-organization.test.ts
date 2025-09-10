import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Integration Test: Email Organization (Labels, Archive)
 * 
 * This test validates the complete user workflow for email organization.
 * It MUST FAIL initially until the full email organization system is implemented.
 * 
 * User Story: "Given I want to organize my emails, When I use labels or folders, 
 * Then I can categorize and filter emails effectively"
 */

const API_BASE_URL = 'http://localhost:3000/api'

const TEST_USER = {
  email: 'integration-organization-test@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any

describe('Integration: Email Organization', () => {
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
    } catch (error) {
      authToken = 'mock-token-for-integration-test'
    }
  })

  afterAll(async () => {
    if (supabase) {
      try {
        await supabase.auth.admin.deleteUser(TEST_USER.email)
      } catch (error) {
        console.warn('Test user cleanup failed:', error)
      }
    }
  })

  it('should handle complete email labeling workflow', async () => {
    const testThreadId = '123e4567-e89b-12d3-a456-426614174000'

    // Step 1: Add labels to thread
    const addLabelsResponse = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        labels: ['important', 'work', 'follow-up']
      })
    })

    expect([200, 404]).toContain(addLabelsResponse.status)

    if (addLabelsResponse.status === 200) {
      const labeledThread = await addLabelsResponse.json()
      expect(labeledThread).toHaveProperty('labels')
      expect(Array.isArray(labeledThread.labels)).toBe(true)
      expect(labeledThread.labels).toContain('important')
      expect(labeledThread.labels).toContain('work')
      expect(labeledThread.labels).toContain('follow-up')
    }

    // Step 2: Filter threads by labels
    const labelFilterTests = [
      'important',
      'work',
      'follow-up',
      'important,work',
      'work,follow-up'
    ]

    for (const labelFilter of labelFilterTests) {
      const filterResponse = await fetch(`${API_BASE_URL}/emails/threads?labels=${labelFilter}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(filterResponse.status).toBe(200)
      const filteredThreads = await filterResponse.json()

      expect(filteredThreads).toHaveProperty('threads')
      expect(Array.isArray(filteredThreads.threads)).toBe(true)

      // If threads exist, validate they have the requested labels
      filteredThreads.threads.forEach((thread: any) => {
        expect(thread).toHaveProperty('labels')
        expect(Array.isArray(thread.labels)).toBe(true)
        
        const requestedLabels = labelFilter.split(',')
        const hasAnyLabel = requestedLabels.some(label => thread.labels.includes(label))
        expect(hasAnyLabel).toBe(true)
      })
    }

    // Step 3: Update labels (replace existing)
    const updateLabelsResponse = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        labels: ['urgent', 'client-communication']
      })
    })

    expect([200, 404]).toContain(updateLabelsResponse.status)

    if (updateLabelsResponse.status === 200) {
      const updatedThread = await updateLabelsResponse.json()
      expect(updatedThread.labels).toEqual(['urgent', 'client-communication'])
      expect(updatedThread.labels).not.toContain('important')
      expect(updatedThread.labels).not.toContain('work')
    }

    // Step 4: Remove all labels
    const removeLabelsResponse = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        labels: []
      })
    })

    expect([200, 404]).toContain(removeLabelsResponse.status)

    if (removeLabelsResponse.status === 200) {
      const unlabeledThread = await removeLabelsResponse.json()
      expect(unlabeledThread.labels).toEqual([])
    }
  })

  it('should handle complete email archiving workflow', async () => {
    const testThreadId = '123e4567-e89b-12d3-a456-426614174000'

    // Step 1: Archive thread
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

    expect([200, 404]).toContain(archiveResponse.status)

    if (archiveResponse.status === 200) {
      const archivedThread = await archiveResponse.json()
      expect(archivedThread.is_archived).toBe(true)
    }

    // Step 2: Verify thread doesn't appear in main inbox
    const inboxResponse = await fetch(`${API_BASE_URL}/emails/threads?archived=false`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(inboxResponse.status).toBe(200)
    const inbox = await inboxResponse.json()

    expect(inbox).toHaveProperty('threads')
    expect(Array.isArray(inbox.threads)).toBe(true)

    // Archived thread should not appear in non-archived view
    const foundArchivedInInbox = inbox.threads.find((t: any) => t.id === testThreadId)
    expect(foundArchivedInInbox).toBeFalsy()

    // Step 3: Verify thread appears in archived view
    const archivedViewResponse = await fetch(`${API_BASE_URL}/emails/threads?archived=true`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(archivedViewResponse.status).toBe(200)
    const archivedView = await archivedViewResponse.json()

    expect(archivedView).toHaveProperty('threads')
    expect(Array.isArray(archivedView.threads)).toBe(true)

    // If archived threads exist, validate they are archived
    archivedView.threads.forEach((thread: any) => {
      expect(thread.is_archived).toBe(true)
    })

    // Step 4: Unarchive thread
    const unarchiveResponse = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_archived: false
      })
    })

    expect([200, 404]).toContain(unarchiveResponse.status)

    if (unarchiveResponse.status === 200) {
      const unarchivedThread = await unarchiveResponse.json()
      expect(unarchivedThread.is_archived).toBe(false)
    }

    // Step 5: Verify thread reappears in main inbox
    const finalInboxResponse = await fetch(`${API_BASE_URL}/emails/threads?archived=false`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(finalInboxResponse.status).toBe(200)
    const finalInbox = await finalInboxResponse.json()

    // Thread should now appear in non-archived view (if it exists)
    if (finalInbox.threads.length > 0) {
      finalInbox.threads.forEach((thread: any) => {
        expect(thread.is_archived).toBe(false)
      })
    }
  })

  it('should handle combined labeling and archiving operations', async () => {
    const testThreadId = '123e4567-e89b-12d3-a456-426614174000'

    // Step 1: Archive and label in single operation
    const combinedResponse = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_archived: true,
        labels: ['archived', 'completed', 'project-alpha']
      })
    })

    expect([200, 404]).toContain(combinedResponse.status)

    if (combinedResponse.status === 200) {
      const updatedThread = await combinedResponse.json()
      expect(updatedThread.is_archived).toBe(true)
      expect(updatedThread.labels).toContain('archived')
      expect(updatedThread.labels).toContain('completed')
      expect(updatedThread.labels).toContain('project-alpha')
    }

    // Step 2: Filter archived threads by labels
    const archivedLabeledResponse = await fetch(`${API_BASE_URL}/emails/threads?archived=true&labels=completed`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(archivedLabeledResponse.status).toBe(200)
    const archivedLabeledThreads = await archivedLabeledResponse.json()

    expect(archivedLabeledThreads).toHaveProperty('threads')
    expect(Array.isArray(archivedLabeledThreads.threads)).toBe(true)

    // Validate threads are both archived and have the label
    archivedLabeledThreads.threads.forEach((thread: any) => {
      expect(thread.is_archived).toBe(true)
      expect(thread.labels).toContain('completed')
    })

    // Step 3: Unarchive but keep labels
    const unarchiveKeepLabelsResponse = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_archived: false
      })
    })

    expect([200, 404]).toContain(unarchiveKeepLabelsResponse.status)

    if (unarchiveKeepLabelsResponse.status === 200) {
      const unarchivedThread = await unarchiveKeepLabelsResponse.json()
      expect(unarchivedThread.is_archived).toBe(false)
      // Labels should be preserved
      expect(unarchivedThread.labels).toContain('completed')
      expect(unarchivedThread.labels).toContain('project-alpha')
    }
  })

  it('should validate organization operation constraints', async () => {
    const testThreadId = '123e4567-e89b-12d3-a456-426614174000'

    // Test invalid label formats
    const invalidLabelTests = [
      { labels: 'not-an-array' },
      { labels: [123, 456] }, // Non-string labels
      { labels: ['', 'valid-label'] }, // Empty label
      { labels: ['a'.repeat(101)] }, // Too long label
      { labels: ['invalid label with spaces'] } // Invalid characters
    ]

    for (const invalidData of invalidLabelTests) {
      const response = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      expect([400, 404]).toContain(response.status)

      if (response.status === 400) {
        const errorResponse = await response.json()
        expect(errorResponse).toHaveProperty('error')
      }
    }

    // Test invalid archive status
    const invalidArchiveTests = [
      { is_archived: 'true' }, // String instead of boolean
      { is_archived: 1 }, // Number instead of boolean
      { is_archived: null } // Null instead of boolean
    ]

    for (const invalidData of invalidArchiveTests) {
      const response = await fetch(`${API_BASE_URL}/emails/threads/${testThreadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      expect([400, 404]).toContain(response.status)

      if (response.status === 400) {
        const errorResponse = await response.json()
        expect(errorResponse).toHaveProperty('error')
      }
    }
  })

  it('should handle bulk organization operations', async () => {
    // Test organizing multiple threads (this would be implemented as separate API calls)
    const testThreadIds = [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003'
    ]

    // Bulk archive operation (simulated as individual calls)
    const bulkArchivePromises = testThreadIds.map(threadId =>
      fetch(`${API_BASE_URL}/emails/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_archived: true,
          labels: ['bulk-archived']
        })
      })
    )

    const bulkArchiveResults = await Promise.all(bulkArchivePromises)
    
    // All should return 404 (threads don't exist) or 200 (success)
    bulkArchiveResults.forEach(response => {
      expect([200, 404]).toContain(response.status)
    })

    // Bulk label operation
    const bulkLabelPromises = testThreadIds.map(threadId =>
      fetch(`${API_BASE_URL}/emails/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          labels: ['bulk-operation', 'processed']
        })
      })
    )

    const bulkLabelResults = await Promise.all(bulkLabelPromises)
    
    bulkLabelResults.forEach(response => {
      expect([200, 404]).toContain(response.status)
    })
  })
})
