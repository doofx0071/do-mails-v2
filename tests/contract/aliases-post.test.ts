import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Contract Test: POST /api/aliases
 * 
 * This test validates the API contract for creating email aliases.
 * It MUST FAIL initially until the API endpoint is implemented.
 * 
 * Contract Requirements:
 * - Requires authentication (Bearer token)
 * - Requires domain_id in request body
 * - Optional alias_name (generates random if not provided)
 * - Returns 201 with created alias object
 * - Returns 400 for invalid alias names
 * - Returns 400 for unverified domains
 * - Returns 409 for duplicate aliases
 * - Returns 401 for unauthenticated requests
 */

const API_BASE_URL = 'http://localhost:3000/api'

const TEST_USER = {
  email: 'contract-test-aliases-post@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any

describe('Contract: POST /api/aliases', () => {
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
    const response = await fetch(`${API_BASE_URL}/aliases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_id: '123e4567-e89b-12d3-a456-426614174000',
        alias_name: 'test'
      })
    })

    expect(response.status).toBe(401)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('unauthorized')
  })

  it('should return 400 for missing domain_id', async () => {
    const response = await fetch(`${API_BASE_URL}/aliases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alias_name: 'test'
      })
    })

    expect(response.status).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('domain_id')
  })

  it('should return 400 for invalid domain_id format', async () => {
    const response = await fetch(`${API_BASE_URL}/aliases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_id: 'invalid-uuid',
        alias_name: 'test'
      })
    })

    expect(response.status).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('invalid')
  })

  it('should return 400 for invalid alias names', async () => {
    const testDomainId = '123e4567-e89b-12d3-a456-426614174000'
    const invalidAliases = [
      'invalid alias', // spaces
      'invalid@alias', // @ symbol
      'invalid.alias.', // trailing dot
      '.invalid', // leading dot
      'a'.repeat(65), // too long
      '', // empty
      'invalid..alias' // double dots
    ]

    for (const invalidAlias of invalidAliases) {
      const response = await fetch(`${API_BASE_URL}/aliases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain_id: testDomainId,
          alias_name: invalidAlias
        })
      })

      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toContain('invalid')
    }
  })

  it('should return 201 with created alias for valid request', async () => {
    // First create a domain
    const testDomain = `alias-test-${Date.now()}.example.com`
    
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

    // Now create an alias
    const aliasName = `test-${Date.now()}`
    
    const response = await fetch(`${API_BASE_URL}/aliases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_id: createdDomain.id,
        alias_name: aliasName
      })
    })

    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toContain('application/json')

    const body = await response.json()
    
    // Validate response schema
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('domain_id')
    expect(body).toHaveProperty('alias_name')
    expect(body).toHaveProperty('full_address')
    expect(body).toHaveProperty('is_enabled')
    expect(body).toHaveProperty('created_at')
    
    // Validate values
    expect(typeof body.id).toBe('string')
    expect(body.domain_id).toBe(createdDomain.id)
    expect(body.alias_name).toBe(aliasName)
    expect(body.full_address).toBe(`${aliasName}@${testDomain}`)
    expect(body.is_enabled).toBe(true)
    expect(typeof body.created_at).toBe('string')
  })

  it('should generate random alias when alias_name not provided', async () => {
    // First create a domain
    const testDomain = `random-alias-${Date.now()}.example.com`
    
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

    // Create alias without alias_name
    const response = await fetch(`${API_BASE_URL}/aliases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_id: createdDomain.id
      })
    })

    expect(response.status).toBe(201)

    const body = await response.json()
    
    // Should have generated a random alias name
    expect(body).toHaveProperty('alias_name')
    expect(typeof body.alias_name).toBe('string')
    expect(body.alias_name.length).toBeGreaterThan(5)
    expect(body.full_address).toBe(`${body.alias_name}@${testDomain}`)
  })

  it('should return 409 for duplicate alias names on same domain', async () => {
    // First create a domain
    const testDomain = `duplicate-alias-${Date.now()}.example.com`
    
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

    const aliasName = 'duplicate-test'

    // First alias should succeed
    const firstResponse = await fetch(`${API_BASE_URL}/aliases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_id: createdDomain.id,
        alias_name: aliasName
      })
    })

    expect(firstResponse.status).toBe(201)

    // Second alias with same name should fail
    const secondResponse = await fetch(`${API_BASE_URL}/aliases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain_id: createdDomain.id,
        alias_name: aliasName
      })
    })

    expect(secondResponse.status).toBe(409)
    
    const body = await secondResponse.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('already exists')
  })
})
