import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Contract Test: POST /api/domains
 * 
 * This test validates the API contract for adding new domains.
 * It MUST FAIL initially until the API endpoint is implemented.
 * 
 * Contract Requirements:
 * - Requires authentication (Bearer token)
 * - Accepts domain_name in request body
 * - Returns 201 with created domain object
 * - Generates verification_token automatically
 * - Returns 400 for invalid domain names
 * - Returns 409 for duplicate domains
 * - Returns 401 for unauthenticated requests
 */

const API_BASE_URL = 'http://localhost:3000/api'

// Test user credentials
const TEST_USER = {
  email: 'contract-test-post@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any

describe('Contract: POST /api/domains', () => {
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
    const response = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_name: 'test.example.com'
      })
    })

    expect(response.status).toBe(401)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('unauthorized')
  })

  it('should return 400 for missing domain_name', async () => {
    const response = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('domain_name')
  })

  it('should return 400 for invalid domain format', async () => {
    const invalidDomains = [
      'invalid-domain',
      'not.a.valid.domain.name.that.is.too.long',
      'spaces in domain.com',
      '.invalid.com',
      'invalid..com',
      'invalid-.com'
    ]

    for (const invalidDomain of invalidDomains) {
      const response = await fetch(`${API_BASE_URL}/domains`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain_name: invalidDomain
        })
      })

      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toContain('invalid')
    }
  })

  it('should return 201 with created domain for valid request', async () => {
    const testDomain = `test-${Date.now()}.example.com`
    
    const response = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_name: testDomain
      })
    })

    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toContain('application/json')

    const body = await response.json()
    
    // Validate response schema
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('domain_name')
    expect(body).toHaveProperty('verification_status')
    expect(body).toHaveProperty('verification_token')
    expect(body).toHaveProperty('created_at')
    
    // Validate values
    expect(typeof body.id).toBe('string')
    expect(body.domain_name).toBe(testDomain)
    expect(body.verification_status).toBe('pending')
    expect(typeof body.verification_token).toBe('string')
    expect(body.verification_token.length).toBeGreaterThan(10)
    expect(typeof body.created_at).toBe('string')
    
    // Validate UUID format for id
    expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('should return 409 for duplicate domain names', async () => {
    const testDomain = `duplicate-${Date.now()}.example.com`
    
    // First request should succeed
    const firstResponse = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_name: testDomain
      })
    })

    expect(firstResponse.status).toBe(201)

    // Second request with same domain should fail
    const secondResponse = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_name: testDomain
      })
    })

    expect(secondResponse.status).toBe(409)
    
    const body = await secondResponse.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('already exists')
  })

  it('should handle malformed JSON', async () => {
    const response = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: 'invalid json'
    })

    expect(response.status).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('should validate content-type header', async () => {
    const response = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        domain_name: 'test.example.com'
      })
    })

    expect(response.status).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('content-type')
  })
})
