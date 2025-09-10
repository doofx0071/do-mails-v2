import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Contract Test: GET /api/aliases
 * 
 * This test validates the API contract for listing email aliases.
 * It MUST FAIL initially until the API endpoint is implemented.
 * 
 * Contract Requirements:
 * - Requires authentication (Bearer token)
 * - Returns 200 with aliases array
 * - Supports optional domain_id filter
 * - Supports optional enabled filter
 * - Returns only user's own aliases (RLS enforcement)
 * - Returns 401 for unauthenticated requests
 */

const API_BASE_URL = 'http://localhost:3000/api'

const TEST_USER = {
  email: 'contract-test-aliases@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any

describe('Contract: GET /api/aliases', () => {
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
      console.warn('Test user creation failed, using mock token:', error)
      authToken = 'mock-token-for-contract-test'
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

  it('should return 401 for unauthenticated requests', async () => {
    const response = await fetch(`${API_BASE_URL}/aliases`)

    expect(response.status).toBe(401)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('unauthorized')
  })

  it('should return 200 with aliases array for authenticated requests', async () => {
    const response = await fetch(`${API_BASE_URL}/aliases`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const body = await response.json()
    expect(body).toHaveProperty('aliases')
    expect(Array.isArray(body.aliases)).toBe(true)
  })

  it('should support domain_id filter query parameter', async () => {
    const testDomainId = '123e4567-e89b-12d3-a456-426614174000'
    
    const response = await fetch(`${API_BASE_URL}/aliases?domain_id=${testDomainId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(200)
    
    const body = await response.json()
    expect(body).toHaveProperty('aliases')
    expect(Array.isArray(body.aliases)).toBe(true)
  })

  it('should support enabled filter query parameter', async () => {
    const enabledValues = [true, false]
    
    for (const enabled of enabledValues) {
      const response = await fetch(`${API_BASE_URL}/aliases?enabled=${enabled}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      
      const body = await response.json()
      expect(body).toHaveProperty('aliases')
      expect(Array.isArray(body.aliases)).toBe(true)
    }
  })

  it('should return aliases with correct schema', async () => {
    const response = await fetch(`${API_BASE_URL}/aliases`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(200)
    
    const body = await response.json()
    expect(body).toHaveProperty('aliases')
    
    // If aliases exist, validate schema
    if (body.aliases.length > 0) {
      const alias = body.aliases[0]
      expect(alias).toHaveProperty('id')
      expect(alias).toHaveProperty('domain_id')
      expect(alias).toHaveProperty('alias_name')
      expect(alias).toHaveProperty('full_address')
      expect(alias).toHaveProperty('is_enabled')
      expect(alias).toHaveProperty('created_at')
      
      // Validate types
      expect(typeof alias.id).toBe('string')
      expect(typeof alias.domain_id).toBe('string')
      expect(typeof alias.alias_name).toBe('string')
      expect(typeof alias.full_address).toBe('string')
      expect(typeof alias.is_enabled).toBe('boolean')
      expect(typeof alias.created_at).toBe('string')
      
      // Validate email format
      expect(alias.full_address).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    }
  })

  it('should return 400 for invalid domain_id format', async () => {
    const response = await fetch(`${API_BASE_URL}/aliases?domain_id=invalid-uuid`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('invalid')
  })

  it('should return 400 for invalid enabled parameter', async () => {
    const response = await fetch(`${API_BASE_URL}/aliases?enabled=invalid`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })
})
