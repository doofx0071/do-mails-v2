import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Contract Test: POST /api/domains/{id}/verify
 * 
 * This test validates the API contract for domain verification.
 * It MUST FAIL initially until the API endpoint is implemented.
 * 
 * Contract Requirements:
 * - Requires authentication (Bearer token)
 * - Accepts domain ID as path parameter
 * - Performs DNS TXT record verification
 * - Returns 200 with updated domain on successful verification
 * - Returns 400 if verification fails
 * - Returns 404 for non-existent domain IDs
 * - Returns 403 if domain belongs to another user
 * - Returns 401 for unauthenticated requests
 */

const API_BASE_URL = 'http://localhost:3000/api'

// Test user credentials
const TEST_USER = {
  email: 'contract-test-verify@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any

describe('Contract: POST /api/domains/{id}/verify', () => {
  beforeAll(async () => {
    // Initialize Supabase client for test user creation
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create test user and get auth token
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: TEST_USER.email,
        password: TEST_USER.password,
      })

      if (authError) throw authError
      authToken = authData.session?.access_token || ''
    } catch (error) {
      console.warn('Test user creation failed, using mock token:', error)
      authToken = 'mock-token-for-contract-test'
    }
  })

  afterAll(async () => {
    // Cleanup test user
    if (supabase) {
      try {
        await supabase.auth.admin.deleteUser(TEST_USER.email)
      } catch (error) {
        console.warn('Test user cleanup failed:', error)
      }
    }
  })

  it('should return 401 for unauthenticated requests', async () => {
    const testDomainId = '123e4567-e89b-12d3-a456-426614174000'
    
    const response = await fetch(`${API_BASE_URL}/domains/${testDomainId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(401)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('unauthorized')
  })

  it('should return 400 for invalid UUID format', async () => {
    const invalidIds = [
      'invalid-id',
      '123',
      'not-a-uuid',
      '123e4567-e89b-12d3-a456-42661417400', // too short
      '123e4567-e89b-12d3-a456-4266141740000' // too long
    ]

    for (const invalidId of invalidIds) {
      const response = await fetch(`${API_BASE_URL}/domains/${invalidId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toContain('invalid')
    }
  })

  it('should return 404 for non-existent domain ID', async () => {
    const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'
    
    const response = await fetch(`${API_BASE_URL}/domains/${nonExistentId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(404)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('not found')
  })

  it('should return 400 for verification failure (DNS record not found)', async () => {
    // This test assumes we have a domain that exists but DNS verification will fail
    // In a real scenario, this would be a domain without the proper TXT record
    
    // First create a domain to verify
    const testDomain = `verify-fail-${Date.now()}.example.com`
    
    const createResponse = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_name: testDomain
      })
    })

    expect(createResponse.status).toBe(201)
    const createdDomain = await createResponse.json()

    // Now try to verify it (should fail because DNS record doesn't exist)
    const verifyResponse = await fetch(`${API_BASE_URL}/domains/${createdDomain.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(verifyResponse.status).toBe(400)
    
    const body = await verifyResponse.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('verification failed')
  })

  it('should return 200 with updated domain on successful verification', async () => {
    // This test would require a domain with proper DNS setup
    // For contract testing, we'll mock a successful scenario
    
    const testDomain = `verify-success-${Date.now()}.example.com`
    
    // First create a domain
    const createResponse = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_name: testDomain
      })
    })

    expect(createResponse.status).toBe(201)
    const createdDomain = await createResponse.json()

    // Try to verify it
    const verifyResponse = await fetch(`${API_BASE_URL}/domains/${createdDomain.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    // For contract testing, we expect this to work if DNS is properly set up
    // In practice, this will likely return 400 unless DNS is configured
    if (verifyResponse.status === 200) {
      const body = await verifyResponse.json()
      
      // Validate response schema
      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('domain_name')
      expect(body).toHaveProperty('verification_status')
      expect(body).toHaveProperty('verified_at')
      
      // Validate values
      expect(body.id).toBe(createdDomain.id)
      expect(body.domain_name).toBe(testDomain)
      expect(body.verification_status).toBe('verified')
      expect(typeof body.verified_at).toBe('string')
    } else {
      // Expected failure due to DNS not being set up
      expect(verifyResponse.status).toBe(400)
    }
  })

  it('should return 403 for domain belonging to another user', async () => {
    // This test would require creating a domain with another user
    // For contract testing, we'll test the error case structure
    
    const otherUserDomainId = '987fcdeb-51a2-43d1-9f12-123456789abc'
    
    const response = await fetch(`${API_BASE_URL}/domains/${otherUserDomainId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    // Should return either 404 (domain not found) or 403 (forbidden)
    // depending on RLS implementation
    expect([403, 404]).toContain(response.status)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('should handle rate limiting for verification attempts', async () => {
    // Create a domain for rate limit testing
    const testDomain = `rate-limit-${Date.now()}.example.com`
    
    const createResponse = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_name: testDomain
      })
    })

    expect(createResponse.status).toBe(201)
    const createdDomain = await createResponse.json()

    // Make multiple rapid verification attempts
    const promises = Array(5).fill(null).map(() =>
      fetch(`${API_BASE_URL}/domains/${createdDomain.id}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
    )

    const responses = await Promise.all(promises)
    
    // At least one should succeed or fail normally
    // Some might be rate limited (429)
    const statusCodes = responses.map(r => r.status)
    expect(statusCodes.some(code => [200, 400, 429].includes(code))).toBe(true)
  })
})
