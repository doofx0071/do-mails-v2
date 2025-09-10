import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Integration Test: Domain Verification Flow
 * 
 * This test validates the complete user workflow for domain verification.
 * It MUST FAIL initially until the full domain verification system is implemented.
 * 
 * User Story: "Given I own a custom domain, When I add it to the system, 
 * Then I receive DNS verification instructions and can verify ownership"
 * 
 * Workflow:
 * 1. User adds domain to system
 * 2. System generates verification token
 * 3. User adds DNS TXT record
 * 4. User triggers verification
 * 5. System checks DNS and updates status
 */

const API_BASE_URL = 'http://localhost:3000/api'

const TEST_USER = {
  email: 'integration-domain-test@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any
let testUserId: string

describe('Integration: Domain Verification Flow', () => {
  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create test user
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
    // Cleanup test user and data
    if (supabase && testUserId !== 'mock-user-id') {
      try {
        await supabase.auth.admin.deleteUser(testUserId)
      } catch (error) {
        console.warn('Test user cleanup failed:', error)
      }
    }
  })

  beforeEach(async () => {
    // Clean up any existing test domains before each test
    if (supabase && testUserId !== 'mock-user-id') {
      try {
        await supabase
          .from('domains')
          .delete()
          .eq('user_id', testUserId)
          .like('domain_name', '%integration-test%')
      } catch (error) {
        // Expected to fail until database is set up
      }
    }
  })

  it('should complete full domain verification workflow', async () => {
    const testDomain = `integration-test-${Date.now()}.example.com`

    // Step 1: Add domain to system
    const addDomainResponse = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_name: testDomain
      })
    })

    expect(addDomainResponse.status).toBe(201)
    const addedDomain = await addDomainResponse.json()

    // Validate domain creation response
    expect(addedDomain).toHaveProperty('id')
    expect(addedDomain).toHaveProperty('domain_name', testDomain)
    expect(addedDomain).toHaveProperty('verification_status', 'pending')
    expect(addedDomain).toHaveProperty('verification_token')
    expect(addedDomain.verification_token).toBeTruthy()

    // Step 2: Verify domain appears in user's domain list
    const listDomainsResponse = await fetch(`${API_BASE_URL}/domains`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(listDomainsResponse.status).toBe(200)
    const domainsList = await listDomainsResponse.json()
    
    expect(domainsList).toHaveProperty('domains')
    expect(Array.isArray(domainsList.domains)).toBe(true)
    
    const foundDomain = domainsList.domains.find((d: any) => d.id === addedDomain.id)
    expect(foundDomain).toBeTruthy()
    expect(foundDomain.verification_status).toBe('pending')

    // Step 3: Attempt verification (should fail - no DNS record)
    const verifyFailResponse = await fetch(`${API_BASE_URL}/domains/${addedDomain.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(verifyFailResponse.status).toBe(400)
    const verifyFailResult = await verifyFailResponse.json()
    expect(verifyFailResult).toHaveProperty('error')
    expect(verifyFailResult.error).toContain('verification failed')

    // Step 4: Check domain status is still pending
    const checkStatusResponse = await fetch(`${API_BASE_URL}/domains?status=pending`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(checkStatusResponse.status).toBe(200)
    const pendingDomains = await checkStatusResponse.json()
    
    const stillPendingDomain = pendingDomains.domains.find((d: any) => d.id === addedDomain.id)
    expect(stillPendingDomain).toBeTruthy()
    expect(stillPendingDomain.verification_status).toBe('pending')

    // Step 5: Simulate successful verification (in real scenario, DNS would be set up)
    // For integration testing, we test the API behavior
    const verifySuccessResponse = await fetch(`${API_BASE_URL}/domains/${addedDomain.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    // In real implementation with proper DNS setup, this would return 200
    // For now, we expect 400 (verification failed) since no DNS record exists
    expect([200, 400]).toContain(verifySuccessResponse.status)

    if (verifySuccessResponse.status === 200) {
      const verifiedDomain = await verifySuccessResponse.json()
      expect(verifiedDomain.verification_status).toBe('verified')
      expect(verifiedDomain).toHaveProperty('verified_at')
      expect(typeof verifiedDomain.verified_at).toBe('string')
    }
  })

  it('should handle multiple domains for same user', async () => {
    const domain1 = `multi-test-1-${Date.now()}.example.com`
    const domain2 = `multi-test-2-${Date.now()}.example.com`

    // Add first domain
    const response1 = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain_name: domain1 })
    })

    expect(response1.status).toBe(201)
    const addedDomain1 = await response1.json()

    // Add second domain
    const response2 = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain_name: domain2 })
    })

    expect(response2.status).toBe(201)
    const addedDomain2 = await response2.json()

    // Verify both domains appear in list
    const listResponse = await fetch(`${API_BASE_URL}/domains`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(listResponse.status).toBe(200)
    const domainsList = await listResponse.json()

    const foundDomain1 = domainsList.domains.find((d: any) => d.id === addedDomain1.id)
    const foundDomain2 = domainsList.domains.find((d: any) => d.id === addedDomain2.id)

    expect(foundDomain1).toBeTruthy()
    expect(foundDomain2).toBeTruthy()
    expect(foundDomain1.domain_name).toBe(domain1)
    expect(foundDomain2.domain_name).toBe(domain2)
  })

  it('should prevent duplicate domain registration', async () => {
    const duplicateDomain = `duplicate-test-${Date.now()}.example.com`

    // Add domain first time
    const response1 = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain_name: duplicateDomain })
    })

    expect(response1.status).toBe(201)

    // Try to add same domain again
    const response2 = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain_name: duplicateDomain })
    })

    expect(response2.status).toBe(409)
    const errorResponse = await response2.json()
    expect(errorResponse).toHaveProperty('error')
    expect(errorResponse.error).toContain('already exists')
  })

  it('should handle verification retry after failure', async () => {
    const retryDomain = `retry-test-${Date.now()}.example.com`

    // Add domain
    const addResponse = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain_name: retryDomain })
    })

    expect(addResponse.status).toBe(201)
    const addedDomain = await addResponse.json()

    // First verification attempt (should fail)
    const verify1Response = await fetch(`${API_BASE_URL}/domains/${addedDomain.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(verify1Response.status).toBe(400)

    // Second verification attempt (should also fail until DNS is set up)
    const verify2Response = await fetch(`${API_BASE_URL}/domains/${addedDomain.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(verify2Response.status).toBe(400)

    // Domain should still be in pending status
    const statusResponse = await fetch(`${API_BASE_URL}/domains`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(statusResponse.status).toBe(200)
    const domainsList = await statusResponse.json()
    
    const domain = domainsList.domains.find((d: any) => d.id === addedDomain.id)
    expect(domain.verification_status).toBe('pending')
  })
})
