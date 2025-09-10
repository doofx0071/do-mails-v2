import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Contract Test: POST /api/emails/send
 * 
 * This test validates the API contract for sending emails.
 * It MUST FAIL initially until the API endpoint is implemented.
 */

const API_BASE_URL = 'http://localhost:3000/api'

const TEST_USER = {
  email: 'contract-test-send@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any

describe('Contract: POST /api/emails/send', () => {
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
    const response = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alias_id: '123e4567-e89b-12d3-a456-426614174000',
        to_addresses: ['test@example.com'],
        subject: 'Test Email',
        body_html: '<p>Test content</p>'
      })
    })

    expect(response.status).toBe(401)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('unauthorized')
  })

  it('should return 400 for missing required fields', async () => {
    const requiredFields = ['alias_id', 'to_addresses', 'subject', 'body_html']
    
    for (const missingField of requiredFields) {
      const requestBody = {
        alias_id: '123e4567-e89b-12d3-a456-426614174000',
        to_addresses: ['test@example.com'],
        subject: 'Test Email',
        body_html: '<p>Test content</p>'
      }
      
      delete requestBody[missingField as keyof typeof requestBody]
      
      const response = await fetch(`${API_BASE_URL}/emails/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toContain(missingField)
    }
  })

  it('should return 400 for invalid email addresses', async () => {
    const invalidEmails = [
      ['invalid-email'],
      ['test@'],
      ['@example.com'],
      ['test..test@example.com'],
      ['test@example'],
      ['']
    ]

    for (const invalidEmailList of invalidEmails) {
      const response = await fetch(`${API_BASE_URL}/emails/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alias_id: '123e4567-e89b-12d3-a456-426614174000',
          to_addresses: invalidEmailList,
          subject: 'Test Email',
          body_html: '<p>Test content</p>'
        })
      })

      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toContain('invalid')
    }
  })

  it('should return 400 for invalid alias_id format', async () => {
    const response = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alias_id: 'invalid-uuid',
        to_addresses: ['test@example.com'],
        subject: 'Test Email',
        body_html: '<p>Test content</p>'
      })
    })

    expect(response.status).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('invalid')
  })

  it('should return 404 for non-existent alias', async () => {
    const response = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alias_id: '123e4567-e89b-12d3-a456-426614174000',
        to_addresses: ['test@example.com'],
        subject: 'Test Email',
        body_html: '<p>Test content</p>'
      })
    })

    expect(response.status).toBe(404)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('alias not found')
  })

  it('should validate email content fields', async () => {
    // Test empty subject
    const response1 = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alias_id: '123e4567-e89b-12d3-a456-426614174000',
        to_addresses: ['test@example.com'],
        subject: '',
        body_html: '<p>Test content</p>'
      })
    })

    expect([400, 404]).toContain(response1.status)

    // Test empty body
    const response2 = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alias_id: '123e4567-e89b-12d3-a456-426614174000',
        to_addresses: ['test@example.com'],
        subject: 'Test Email',
        body_html: ''
      })
    })

    expect([400, 404]).toContain(response2.status)
  })

  it('should accept valid email send request', async () => {
    const response = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        alias_id: '123e4567-e89b-12d3-a456-426614174000',
        to_addresses: ['test@example.com'],
        cc_addresses: ['cc@example.com'],
        bcc_addresses: ['bcc@example.com'],
        subject: 'Test Email',
        body_text: 'Plain text content',
        body_html: '<p>HTML content</p>',
        attachments: [
          {
            filename: 'test.txt',
            content_type: 'text/plain',
            data: 'dGVzdCBjb250ZW50' // base64 encoded "test content"
          }
        ]
      })
    })

    // Should return 404 (alias not found) or 200 (success)
    // 400 would indicate validation error
    expect([200, 404]).toContain(response.status)

    if (response.status === 200) {
      const body = await response.json()
      expect(body).toHaveProperty('message_id')
      expect(body).toHaveProperty('mailgun_id')
      expect(typeof body.message_id).toBe('string')
      expect(typeof body.mailgun_id).toBe('string')
    }
  })
})
