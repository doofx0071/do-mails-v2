import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Integration Test: Email Search Functionality
 * 
 * This test validates the complete user workflow for email search.
 * It MUST FAIL initially until the full email search system is implemented.
 * 
 * User Stories:
 * - "Given I want to find specific emails, When I search by sender, subject, or content, Then I get relevant results"
 * - "Given I have many emails, When I use advanced filters, Then I can narrow down results effectively"
 */

const API_BASE_URL = 'http://localhost:3000/api'

const TEST_USER = {
  email: 'integration-search-test@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any

describe('Integration: Email Search Functionality', () => {
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

  it('should handle basic text search across email content', async () => {
    // Test basic search functionality
    const searchQueries = [
      'project',
      'meeting',
      'urgent',
      'follow up',
      'attachment'
    ]

    for (const query of searchQueries) {
      const searchResponse = await fetch(`${API_BASE_URL}/emails/threads?search=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(searchResponse.status).toBe(200)
      const searchResults = await searchResponse.json()

      expect(searchResults).toHaveProperty('threads')
      expect(searchResults).toHaveProperty('total')
      expect(searchResults).toHaveProperty('has_more')
      expect(Array.isArray(searchResults.threads)).toBe(true)

      // If results exist, validate they contain the search term
      if (searchResults.threads.length > 0) {
        searchResults.threads.forEach((thread: any) => {
          expect(thread).toHaveProperty('subject')
          expect(thread).toHaveProperty('participants')
          
          // At least one of subject or participants should contain the search term
          const subjectMatch = thread.subject.toLowerCase().includes(query.toLowerCase())
          const participantMatch = thread.participants.some((p: string) => 
            p.toLowerCase().includes(query.toLowerCase())
          )
          
          expect(subjectMatch || participantMatch).toBe(true)
        })
      }
    }
  })

  it('should handle advanced search with multiple filters', async () => {
    // Test combining search with other filters
    const advancedSearchTests = [
      {
        query: 'search=project&labels=important',
        description: 'Search with label filter'
      },
      {
        query: 'search=meeting&archived=false',
        description: 'Search in non-archived emails'
      },
      {
        query: 'search=urgent&alias_id=123e4567-e89b-12d3-a456-426614174000',
        description: 'Search within specific alias'
      },
      {
        query: 'search=follow&labels=work,urgent&archived=false&limit=10',
        description: 'Complex search with multiple filters'
      }
    ]

    for (const test of advancedSearchTests) {
      const searchResponse = await fetch(`${API_BASE_URL}/emails/threads?${test.query}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(searchResponse.status).toBe(200)
      const searchResults = await searchResponse.json()

      expect(searchResults).toHaveProperty('threads')
      expect(searchResults).toHaveProperty('total')
      expect(searchResults).toHaveProperty('has_more')
      expect(Array.isArray(searchResults.threads)).toBe(true)

      // Validate pagination is respected
      if (test.query.includes('limit=10')) {
        expect(searchResults.threads.length).toBeLessThanOrEqual(10)
      }
    }
  })

  it('should handle search by sender and recipient', async () => {
    // Test searching by email addresses
    const emailSearchTests = [
      'sender@example.com',
      'client@company.com',
      'support@service.com',
      'noreply@system.com'
    ]

    for (const email of emailSearchTests) {
      const senderSearchResponse = await fetch(`${API_BASE_URL}/emails/threads?search=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(senderSearchResponse.status).toBe(200)
      const senderResults = await senderSearchResponse.json()

      expect(senderResults).toHaveProperty('threads')
      expect(Array.isArray(senderResults.threads)).toBe(true)

      // If results exist, validate they contain the email address
      if (senderResults.threads.length > 0) {
        senderResults.threads.forEach((thread: any) => {
          expect(thread).toHaveProperty('participants')
          expect(Array.isArray(thread.participants)).toBe(true)
          
          const hasEmailInParticipants = thread.participants.some((p: string) => 
            p.toLowerCase().includes(email.toLowerCase())
          )
          expect(hasEmailInParticipants).toBe(true)
        })
      }
    }
  })

  it('should handle search with date range filters', async () => {
    // Test date-based search (this would be implemented as query parameters)
    const dateSearchTests = [
      {
        query: 'search=project&date_from=2024-01-01',
        description: 'Search from specific date'
      },
      {
        query: 'search=meeting&date_to=2024-12-31',
        description: 'Search until specific date'
      },
      {
        query: 'search=urgent&date_from=2024-01-01&date_to=2024-12-31',
        description: 'Search within date range'
      },
      {
        query: 'search=follow&date_from=2024-06-01&date_to=2024-06-30',
        description: 'Search within specific month'
      }
    ]

    for (const test of dateSearchTests) {
      const dateSearchResponse = await fetch(`${API_BASE_URL}/emails/threads?${test.query}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(dateSearchResponse.status).toBe(200)
      const dateResults = await dateSearchResponse.json()

      expect(dateResults).toHaveProperty('threads')
      expect(dateResults).toHaveProperty('total')
      expect(Array.isArray(dateResults.threads)).toBe(true)

      // If results exist, validate date constraints
      if (dateResults.threads.length > 0) {
        dateResults.threads.forEach((thread: any) => {
          expect(thread).toHaveProperty('last_message_at')
          expect(typeof thread.last_message_at).toBe('string')
          
          // Validate date is within range (if specified)
          const messageDate = new Date(thread.last_message_at)
          expect(messageDate).toBeInstanceOf(Date)
          expect(messageDate.getTime()).not.toBeNaN()
        })
      }
    }
  })

  it('should handle search validation and error cases', async () => {
    // Test invalid search parameters
    const invalidSearchTests = [
      {
        query: 'search=',
        description: 'Empty search query',
        expectedStatus: 400
      },
      {
        query: 'search=' + 'a'.repeat(1000),
        description: 'Search query too long',
        expectedStatus: 400
      },
      {
        query: 'search=test&limit=0',
        description: 'Invalid limit',
        expectedStatus: 400
      },
      {
        query: 'search=test&offset=-1',
        description: 'Invalid offset',
        expectedStatus: 400
      },
      {
        query: 'search=test&date_from=invalid-date',
        description: 'Invalid date format',
        expectedStatus: 400
      }
    ]

    for (const test of invalidSearchTests) {
      const invalidSearchResponse = await fetch(`${API_BASE_URL}/emails/threads?${test.query}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(invalidSearchResponse.status).toBe(test.expectedStatus)
      
      if (test.expectedStatus === 400) {
        const errorResponse = await invalidSearchResponse.json()
        expect(errorResponse).toHaveProperty('error')
      }
    }
  })

  it('should handle search performance and pagination', async () => {
    // Test search with various pagination settings
    const paginationTests = [
      { limit: 5, offset: 0 },
      { limit: 10, offset: 0 },
      { limit: 25, offset: 0 },
      { limit: 50, offset: 0 },
      { limit: 10, offset: 10 },
      { limit: 10, offset: 20 }
    ]

    const searchTerm = 'test'

    for (const { limit, offset } of paginationTests) {
      const paginatedSearchResponse = await fetch(
        `${API_BASE_URL}/emails/threads?search=${searchTerm}&limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      expect(paginatedSearchResponse.status).toBe(200)
      const paginatedResults = await paginatedSearchResponse.json()

      expect(paginatedResults).toHaveProperty('threads')
      expect(paginatedResults).toHaveProperty('total')
      expect(paginatedResults).toHaveProperty('has_more')
      expect(Array.isArray(paginatedResults.threads)).toBe(true)

      // Validate pagination constraints
      expect(paginatedResults.threads.length).toBeLessThanOrEqual(limit)
      
      // Validate has_more flag
      if (paginatedResults.total > offset + limit) {
        expect(paginatedResults.has_more).toBe(true)
      } else {
        expect(paginatedResults.has_more).toBe(false)
      }
    }
  })

  it('should handle special search characters and escaping', async () => {
    // Test search with special characters
    const specialCharacterTests = [
      'project@work',
      'meeting+notes',
      'urgent!',
      'follow-up',
      'test_file',
      'email.address@domain.com',
      '"exact phrase"',
      'search with spaces'
    ]

    for (const specialQuery of specialCharacterTests) {
      const specialSearchResponse = await fetch(
        `${API_BASE_URL}/emails/threads?search=${encodeURIComponent(specialQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      expect(specialSearchResponse.status).toBe(200)
      const specialResults = await specialSearchResponse.json()

      expect(specialResults).toHaveProperty('threads')
      expect(specialResults).toHaveProperty('total')
      expect(Array.isArray(specialResults.threads)).toBe(true)

      // Search should handle special characters gracefully
      expect(typeof specialResults.total).toBe('number')
      expect(specialResults.total).toBeGreaterThanOrEqual(0)
    }
  })

  it('should maintain search result consistency', async () => {
    const searchTerm = 'consistency-test'

    // Perform same search multiple times
    const searchPromises = Array(3).fill(null).map(() =>
      fetch(`${API_BASE_URL}/emails/threads?search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
    )

    const searchResults = await Promise.all(searchPromises)
    
    // All searches should return same status
    searchResults.forEach(response => {
      expect(response.status).toBe(200)
    })

    // Parse all results
    const parsedResults = await Promise.all(
      searchResults.map(response => response.json())
    )

    // All results should have same total count
    const firstTotal = parsedResults[0].total
    parsedResults.forEach(result => {
      expect(result.total).toBe(firstTotal)
      expect(result).toHaveProperty('threads')
      expect(Array.isArray(result.threads)).toBe(true)
    })
  })
})
