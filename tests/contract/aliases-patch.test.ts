import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Contract Test: PATCH /api/aliases/{id}
 * 
 * This test validates the API contract for updating email aliases.
 * It MUST FAIL initially until the API endpoint is implemented.
 * 
 * Contract Requirements:
 * - Requires authentication (Bearer token)
 * - Accepts alias ID as path parameter
 * - Accepts is_enabled in request body
 * - Returns 200 with updated alias object
 * - Returns 404 for non-existent alias IDs
 * - Returns 403 if alias belongs to another user
 * - Returns 401 for unauthenticated requests
 */

const API_BASE_URL = 'http://localhost:3000/api'

const TEST_USER = {
  email: 'contract-test-aliases-patch@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any

describe('Contract: PATCH /api/aliases/{id}', () => {
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
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'
    
    const response = await fetch(`${API_BASE_URL}/aliases/${testAliasId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_enabled: false
      })
    })

    expect(response.status).toBe(401)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('unauthorized')
  })

  it('should return 400 for invalid UUID format', async () => {
    const invalidIds = ['invalid-id', '123', 'not-a-uuid']

    for (const invalidId of invalidIds) {
      const response = await fetch(`${API_BASE_URL}/aliases/${invalidId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_enabled: false
        })
      })

      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toContain('invalid')
    }
  })

  it('should return 404 for non-existent alias ID', async () => {
    const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'
    
    const response = await fetch(`${API_BASE_URL}/aliases/${nonExistentId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_enabled: false
      })
    })

    expect(response.status).toBe(404)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('not found')
  })

  it('should return 400 for invalid is_enabled value', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'
    const invalidValues = ['invalid', 'yes', 'no', 1, 0, null]

    for (const invalidValue of invalidValues) {
      const response = await fetch(`${API_BASE_URL}/aliases/${testAliasId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_enabled: invalidValue
        })
      })

      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body).toHaveProperty('error')
    }
  })

  it('should return 400 for empty request body', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'
    
    const response = await fetch(`${API_BASE_URL}/aliases/${testAliasId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('is_enabled')
  })

  it('should return 200 with updated alias for valid request', async () => {
    // First create a domain and alias to update
    const testDomain = `patch-test-${Date.now()}.example.com`
    
    const domainResponse = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_name: testDomain
      })
    })

    expect(domainResponse.status).toBe(201)
    const createdDomain = await domainResponse.json()

    // Create an alias
    const aliasResponse = await fetch(`${API_BASE_URL}/aliases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_id: createdDomain.id,
        alias_name: 'patch-test'
      })
    })

    expect(aliasResponse.status).toBe(201)
    const createdAlias = await aliasResponse.json()

    // Now update the alias
    const updateResponse = await fetch(`${API_BASE_URL}/aliases/${createdAlias.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_enabled: false
      })
    })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.headers.get('content-type')).toContain('application/json')

    const body = await updateResponse.json()
    
    // Validate response schema
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('domain_id')
    expect(body).toHaveProperty('alias_name')
    expect(body).toHaveProperty('full_address')
    expect(body).toHaveProperty('is_enabled')
    expect(body).toHaveProperty('updated_at')
    
    // Validate values
    expect(body.id).toBe(createdAlias.id)
    expect(body.is_enabled).toBe(false)
    expect(typeof body.updated_at).toBe('string')
  })

  it('should handle enabling and disabling aliases', async () => {
    // Create domain and alias
    const testDomain = `enable-disable-${Date.now()}.example.com`
    
    const domainResponse = await fetch(`${API_BASE_URL}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_name: testDomain
      })
    })

    expect(domainResponse.status).toBe(201)
    const createdDomain = await domainResponse.json()

    const aliasResponse = await fetch(`${API_BASE_URL}/aliases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_id: createdDomain.id,
        alias_name: 'enable-disable-test'
      })
    })

    expect(aliasResponse.status).toBe(201)
    const createdAlias = await aliasResponse.json()

    // Disable the alias
    const disableResponse = await fetch(`${API_BASE_URL}/aliases/${createdAlias.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_enabled: false
      })
    })

    expect(disableResponse.status).toBe(200)
    const disabledAlias = await disableResponse.json()
    expect(disabledAlias.is_enabled).toBe(false)

    // Re-enable the alias
    const enableResponse = await fetch(`${API_BASE_URL}/aliases/${createdAlias.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_enabled: true
      })
    })

    expect(enableResponse.status).toBe(200)
    const enabledAlias = await enableResponse.json()
    expect(enabledAlias.is_enabled).toBe(true)
  })
})
