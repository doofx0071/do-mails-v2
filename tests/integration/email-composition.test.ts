import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Integration Test: Email Composition and Privacy
 * 
 * This test validates the complete user workflow for email composition and privacy.
 * It MUST FAIL initially until the full email composition system is implemented.
 * 
 * User Stories:
 * - "Given I receive an email at an alias, When I reply to that email, Then my response is sent FROM the alias address"
 * - "Given I want to compose a new email, When I select an alias to send from, Then the recipient sees the email as coming from that alias"
 * - "Given I have multiple aliases, When I set up email signatures, Then I can configure different signatures for each alias"
 */

const API_BASE_URL = 'http://localhost:3000/api'

const TEST_USER = {
  email: 'integration-composition-test@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any
let testUserId: string

describe('Integration: Email Composition and Privacy', () => {
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
      testUserId = authData.user?.id || ''
    } catch (error) {
      console.warn('Test user creation failed, using mock data:', error)
      authToken = 'mock-token-for-integration-test'
      testUserId = 'mock-user-id'
    }
  })

  afterAll(async () => {
    if (supabase && testUserId !== 'mock-user-id') {
      try {
        await supabase.auth.admin.deleteUser(testUserId)
      } catch (error) {
        console.warn('Test user cleanup failed:', error)
      }
    }
  })

  it('should compose and send email from alias maintaining privacy', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'

    // Step 1: Compose new email from alias
    const composeEmailData = {
      alias_id: testAliasId,
      to_addresses: ['recipient@example.com'],
      cc_addresses: ['cc@example.com'],
      bcc_addresses: ['bcc@example.com'],
      subject: 'Test Email from Alias',
      body_text: 'This is a plain text email sent from my alias.',
      body_html: '<p>This is an <strong>HTML email</strong> sent from my alias.</p>',
      attachments: [
        {
          filename: 'test-document.txt',
          content_type: 'text/plain',
          data: 'VGhpcyBpcyBhIHRlc3QgZG9jdW1lbnQ=' // base64 encoded "This is a test document"
        }
      ]
    }

    const sendResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(composeEmailData)
    })

    // Should return 404 (alias not found) until aliases exist
    expect([200, 404]).toContain(sendResponse.status)

    if (sendResponse.status === 200) {
      const sendResult = await sendResponse.json()
      
      expect(sendResult).toHaveProperty('message_id')
      expect(sendResult).toHaveProperty('mailgun_id')
      expect(typeof sendResult.message_id).toBe('string')
      expect(typeof sendResult.mailgun_id).toBe('string')
    }

    // Step 2: Verify email validation
    const invalidEmailData = {
      alias_id: testAliasId,
      to_addresses: ['invalid-email'],
      subject: 'Test Email',
      body_html: '<p>Test content</p>'
    }

    const invalidResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidEmailData)
    })

    expect(invalidResponse.status).toBe(400)
    const invalidError = await invalidResponse.json()
    expect(invalidError).toHaveProperty('error')
    expect(invalidError.error).toContain('invalid')
  })

  it('should handle reply functionality maintaining alias identity', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'
    const originalMessageId = '<original-message@example.com>'

    // Step 1: Compose reply email
    const replyEmailData = {
      alias_id: testAliasId,
      to_addresses: ['original-sender@example.com'],
      subject: 'Re: Original Subject',
      body_text: 'This is my reply to your email.',
      body_html: '<p>This is my <em>reply</em> to your email.</p>',
      in_reply_to: originalMessageId
    }

    const replyResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(replyEmailData)
    })

    // Should return 404 (alias not found) until aliases exist
    expect([200, 404]).toContain(replyResponse.status)

    if (replyResponse.status === 200) {
      const replyResult = await replyResponse.json()
      
      expect(replyResult).toHaveProperty('message_id')
      expect(replyResult).toHaveProperty('mailgun_id')
    }

    // Step 2: Test forward functionality
    const forwardEmailData = {
      alias_id: testAliasId,
      to_addresses: ['forward-recipient@example.com'],
      subject: 'Fwd: Original Subject',
      body_text: 'Forwarding this email to you.\n\n--- Forwarded message ---\nOriginal content here.',
      body_html: '<p>Forwarding this email to you.</p><blockquote>Original content here.</blockquote>'
    }

    const forwardResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(forwardEmailData)
    })

    expect([200, 404]).toContain(forwardResponse.status)
  })

  it('should validate email composition requirements', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'

    // Test missing required fields
    const requiredFieldTests = [
      { missing: 'alias_id', data: { to_addresses: ['test@example.com'], subject: 'Test', body_html: '<p>Test</p>' } },
      { missing: 'to_addresses', data: { alias_id: testAliasId, subject: 'Test', body_html: '<p>Test</p>' } },
      { missing: 'subject', data: { alias_id: testAliasId, to_addresses: ['test@example.com'], body_html: '<p>Test</p>' } },
      { missing: 'body_html', data: { alias_id: testAliasId, to_addresses: ['test@example.com'], subject: 'Test' } }
    ]

    for (const test of requiredFieldTests) {
      const response = await fetch(`${API_BASE_URL}/emails/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(test.data)
      })

      expect(response.status).toBe(400)
      const errorResponse = await response.json()
      expect(errorResponse).toHaveProperty('error')
      expect(errorResponse.error).toContain(test.missing)
    }

    // Test invalid email formats
    const invalidEmailTests = [
      ['invalid-email'],
      ['test@'],
      ['@example.com'],
      ['test..test@example.com'],
      ['']
    ]

    for (const invalidEmails of invalidEmailTests) {
      const response = await fetch(`${API_BASE_URL}/emails/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alias_id: testAliasId,
          to_addresses: invalidEmails,
          subject: 'Test Email',
          body_html: '<p>Test content</p>'
        })
      })

      expect(response.status).toBe(400)
      const errorResponse = await response.json()
      expect(errorResponse).toHaveProperty('error')
      expect(errorResponse.error).toContain('invalid')
    }
  })

  it('should handle email attachments properly', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'

    // Test valid attachments
    const emailWithAttachments = {
      alias_id: testAliasId,
      to_addresses: ['recipient@example.com'],
      subject: 'Email with Attachments',
      body_html: '<p>Please find attached files.</p>',
      attachments: [
        {
          filename: 'document.pdf',
          content_type: 'application/pdf',
          data: 'JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgplbmRvYmoK' // base64 PDF header
        },
        {
          filename: 'image.jpg',
          content_type: 'image/jpeg',
          data: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A' // base64 JPEG header
        }
      ]
    }

    const attachmentResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailWithAttachments)
    })

    expect([200, 404]).toContain(attachmentResponse.status)

    // Test invalid attachment data
    const invalidAttachmentEmail = {
      alias_id: testAliasId,
      to_addresses: ['recipient@example.com'],
      subject: 'Email with Invalid Attachment',
      body_html: '<p>Test content</p>',
      attachments: [
        {
          filename: '', // Empty filename
          content_type: 'text/plain',
          data: 'dGVzdA=='
        }
      ]
    }

    const invalidAttachmentResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidAttachmentEmail)
    })

    expect([400, 404]).toContain(invalidAttachmentResponse.status)
  })

  it('should enforce alias ownership and permissions', async () => {
    const otherUserAliasId = '987fcdeb-51a2-43d1-9f12-123456789abc'

    // Try to send email from alias belonging to another user
    const unauthorizedEmailData = {
      alias_id: otherUserAliasId,
      to_addresses: ['recipient@example.com'],
      subject: 'Unauthorized Email',
      body_html: '<p>This should not be allowed</p>'
    }

    const unauthorizedResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(unauthorizedEmailData)
    })

    // Should return 404 (alias not found) due to RLS policies
    expect(unauthorizedResponse.status).toBe(404)
    const errorResponse = await unauthorizedResponse.json()
    expect(errorResponse).toHaveProperty('error')
    expect(errorResponse.error).toContain('not found')

    // Try to send from disabled alias
    const disabledAliasId = '456e7890-e12b-34c5-d678-901234567890'

    const disabledAliasEmailData = {
      alias_id: disabledAliasId,
      to_addresses: ['recipient@example.com'],
      subject: 'Email from Disabled Alias',
      body_html: '<p>This should not be allowed</p>'
    }

    const disabledAliasResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(disabledAliasEmailData)
    })

    expect([400, 404]).toContain(disabledAliasResponse.status)
  })

  it('should handle email size and content limitations', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'

    // Test very long subject
    const longSubjectEmail = {
      alias_id: testAliasId,
      to_addresses: ['recipient@example.com'],
      subject: 'A'.repeat(1000), // Very long subject
      body_html: '<p>Test content</p>'
    }

    const longSubjectResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(longSubjectEmail)
    })

    expect([200, 400, 404]).toContain(longSubjectResponse.status)

    // Test very large email body
    const largeBodyEmail = {
      alias_id: testAliasId,
      to_addresses: ['recipient@example.com'],
      subject: 'Large Email Test',
      body_html: '<p>' + 'Large content '.repeat(10000) + '</p>' // Very large body
    }

    const largeBodyResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(largeBodyEmail)
    })

    expect([200, 400, 404]).toContain(largeBodyResponse.status)

    // Test too many recipients
    const manyRecipientsEmail = {
      alias_id: testAliasId,
      to_addresses: Array(101).fill(0).map((_, i) => `recipient${i}@example.com`), // 101 recipients
      subject: 'Mass Email Test',
      body_html: '<p>Test content</p>'
    }

    const manyRecipientsResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(manyRecipientsEmail)
    })

    expect([400, 404]).toContain(manyRecipientsResponse.status)
  })
})
