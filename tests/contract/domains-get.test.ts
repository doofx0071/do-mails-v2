import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Contract Test: GET /api/domains
 * 
 * This test validates the API contract for listing user domains.
 * It MUST FAIL initially until the API endpoint is implemented.
 * 
 * Contract Requirements:
 * - Requires authentication (Bearer token)
 * - Returns 200 with domains array
 * - Supports optional status filter query parameter
 * - Returns only user's own domains (RLS enforcement)
 * - Returns 401 for unauthenticated requests
 */

const API_BASE_URL = 'http://localhost:3000/api'

// Test user credentials for contract testing
const TEST_USER = {
  email: 'contract-test@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any

describe('Contract: GET /api/domains', () => {
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
    const response = await fetch(`${API_BASE_URL}/domains`)

    expect(response.status).toBe(401)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('unauthorized')
  })

  it('should return 200 with domains array for authenticated requests', async () => {
    const response = await fetch(`${API_BASE_URL}/domains`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const body = await response.json()
    expect(body).toHaveProperty('domains')
    expect(Array.isArray(body.domains)).toBe(true)
  })

  it('should support status filter query parameter', async () => {
    const statuses = ['pending', 'verified', 'failed']
    
    for (const status of statuses) {
      const response = await fetch(`${API_BASE_URL}/domains?status=${status}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      
      const body = await response.json()
      expect(body).toHaveProperty('domains')
      expect(Array.isArray(body.domains)).toBe(true)
    }
  })

  it('should return 400 for invalid status filter', async () => {
    const response = await fetch(`${API_BASE_URL}/domains?status=invalid`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('should return domains with correct schema', async () => {
    const response = await fetch(`${API_BASE_URL}/domains`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(200)
    
    const body = await response.json()
    expect(body).toHaveProperty('domains')
    
    // If domains exist, validate schema
    if (body.domains.length > 0) {
      const domain = body.domains[0]
      expect(domain).toHaveProperty('id')
      expect(domain).toHaveProperty('domain_name')
      expect(domain).toHaveProperty('verification_status')
      expect(domain).toHaveProperty('verification_token')
      expect(domain).toHaveProperty('created_at')
      
      // Validate types
      expect(typeof domain.id).toBe('string')
      expect(typeof domain.domain_name).toBe('string')
      expect(['pending', 'verified', 'failed']).toContain(domain.verification_status)
      expect(typeof domain.verification_token).toBe('string')
      expect(typeof domain.created_at).toBe('string')
    }
  })

  it('should handle CORS preflight requests', async () => {
    const response = await fetch(`${API_BASE_URL}/domains`, {
      method: 'OPTIONS'
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBeTruthy()
    expect(response.headers.get('access-control-allow-methods')).toContain('GET')
  })
})
