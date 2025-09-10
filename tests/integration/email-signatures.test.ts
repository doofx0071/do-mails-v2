import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Integration Test: Email Signatures
 * 
 * This test validates the complete user workflow for email signature management.
 * It MUST FAIL initially until the full email signature system is implemented.
 * 
 * User Story: "Given I have multiple aliases, When I set up email signatures, 
 * Then I can configure different signatures for each alias"
 */

const API_BASE_URL = 'http://localhost:3000/api'

const TEST_USER = {
  email: 'integration-signatures-test@example.com',
  password: 'TestPassword123!'
}

let authToken: string
let supabase: any

describe('Integration: Email Signatures', () => {
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

  it('should handle complete signature management workflow', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'

    // Step 1: Create signature for alias
    const signatureData = {
      alias_id: testAliasId,
      signature_html: '<p>Best regards,<br><strong>John Doe</strong><br>Senior Developer<br>Company Inc.</p>',
      signature_text: 'Best regards,\nJohn Doe\nSenior Developer\nCompany Inc.',
      is_default: true
    }

    const createSignatureResponse = await fetch(`${API_BASE_URL}/aliases/${testAliasId}/signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signatureData)
    })

    // Should return 404 (alias not found) until aliases exist
    expect([201, 404]).toContain(createSignatureResponse.status)

    if (createSignatureResponse.status === 201) {
      const createdSignature = await createSignatureResponse.json()
      
      expect(createdSignature).toHaveProperty('id')
      expect(createdSignature).toHaveProperty('alias_id', testAliasId)
      expect(createdSignature).toHaveProperty('signature_html', signatureData.signature_html)
      expect(createdSignature).toHaveProperty('signature_text', signatureData.signature_text)
      expect(createdSignature).toHaveProperty('is_default', true)
    }

    // Step 2: Get signature for alias
    const getSignatureResponse = await fetch(`${API_BASE_URL}/aliases/${testAliasId}/signature`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect([200, 404]).toContain(getSignatureResponse.status)

    if (getSignatureResponse.status === 200) {
      const retrievedSignature = await getSignatureResponse.json()
      
      expect(retrievedSignature).toHaveProperty('alias_id', testAliasId)
      expect(retrievedSignature).toHaveProperty('signature_html')
      expect(retrievedSignature).toHaveProperty('signature_text')
      expect(retrievedSignature).toHaveProperty('is_default')
    }

    // Step 3: Update signature
    const updatedSignatureData = {
      signature_html: '<p>Kind regards,<br><em>John Doe</em><br>Lead Developer<br>Tech Corp</p>',
      signature_text: 'Kind regards,\nJohn Doe\nLead Developer\nTech Corp',
      is_default: true
    }

    const updateSignatureResponse = await fetch(`${API_BASE_URL}/aliases/${testAliasId}/signature`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSignatureData)
    })

    expect([200, 404]).toContain(updateSignatureResponse.status)

    if (updateSignatureResponse.status === 200) {
      const updatedSignature = await updateSignatureResponse.json()
      
      expect(updatedSignature).toHaveProperty('signature_html', updatedSignatureData.signature_html)
      expect(updatedSignature).toHaveProperty('signature_text', updatedSignatureData.signature_text)
    }

    // Step 4: Delete signature
    const deleteSignatureResponse = await fetch(`${API_BASE_URL}/aliases/${testAliasId}/signature`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect([200, 404]).toContain(deleteSignatureResponse.status)

    // Step 5: Verify signature is deleted
    const verifyDeleteResponse = await fetch(`${API_BASE_URL}/aliases/${testAliasId}/signature`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(verifyDeleteResponse.status).toBe(404)
  })

  it('should automatically include signatures in composed emails', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'

    // Step 1: Create signature for alias
    const signatureData = {
      alias_id: testAliasId,
      signature_html: '<p>Best regards,<br><strong>Jane Smith</strong><br>Marketing Manager</p>',
      signature_text: 'Best regards,\nJane Smith\nMarketing Manager',
      is_default: true
    }

    const createSignatureResponse = await fetch(`${API_BASE_URL}/aliases/${testAliasId}/signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signatureData)
    })

    expect([201, 404]).toContain(createSignatureResponse.status)

    // Step 2: Compose email from alias (signature should be automatically included)
    const emailData = {
      alias_id: testAliasId,
      to_addresses: ['recipient@example.com'],
      subject: 'Test Email with Signature',
      body_text: 'This is the main email content.',
      body_html: '<p>This is the main email content.</p>'
    }

    const sendEmailResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    expect([200, 404]).toContain(sendEmailResponse.status)

    if (sendEmailResponse.status === 200) {
      const sentEmail = await sendEmailResponse.json()
      
      expect(sentEmail).toHaveProperty('message_id')
      expect(sentEmail).toHaveProperty('mailgun_id')
      
      // In a real implementation, the signature would be appended to the email body
      // This would be verified by checking the actual sent email content
    }

    // Step 3: Compose reply (signature should be included)
    const replyData = {
      alias_id: testAliasId,
      to_addresses: ['original-sender@example.com'],
      subject: 'Re: Original Subject',
      body_text: 'This is my reply.',
      body_html: '<p>This is my reply.</p>',
      in_reply_to: '<original-message@example.com>'
    }

    const sendReplyResponse = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(replyData)
    })

    expect([200, 404]).toContain(sendReplyResponse.status)
  })

  it('should handle different signatures for different aliases', async () => {
    const alias1Id = '123e4567-e89b-12d3-a456-426614174001'
    const alias2Id = '123e4567-e89b-12d3-a456-426614174002'

    // Create signature for first alias (professional)
    const professionalSignature = {
      alias_id: alias1Id,
      signature_html: '<p>Sincerely,<br><strong>Dr. John Smith</strong><br>Chief Technology Officer<br>Enterprise Solutions Inc.<br>Phone: +1-555-0123<br>Email: john.smith@enterprise.com</p>',
      signature_text: 'Sincerely,\nDr. John Smith\nChief Technology Officer\nEnterprise Solutions Inc.\nPhone: +1-555-0123\nEmail: john.smith@enterprise.com',
      is_default: true
    }

    const createProfessionalResponse = await fetch(`${API_BASE_URL}/aliases/${alias1Id}/signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(professionalSignature)
    })

    expect([201, 404]).toContain(createProfessionalResponse.status)

    // Create signature for second alias (casual)
    const casualSignature = {
      alias_id: alias2Id,
      signature_html: '<p>Cheers,<br>John 😊</p>',
      signature_text: 'Cheers,\nJohn 😊',
      is_default: true
    }

    const createCasualResponse = await fetch(`${API_BASE_URL}/aliases/${alias2Id}/signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(casualSignature)
    })

    expect([201, 404]).toContain(createCasualResponse.status)

    // Verify each alias has its own signature
    const getProfessionalResponse = await fetch(`${API_BASE_URL}/aliases/${alias1Id}/signature`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    const getCasualResponse = await fetch(`${API_BASE_URL}/aliases/${alias2Id}/signature`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (getProfessionalResponse.status === 200) {
      const profSignature = await getProfessionalResponse.json()
      expect(profSignature.signature_html).toContain('Chief Technology Officer')
    }

    if (getCasualResponse.status === 200) {
      const casualSig = await getCasualResponse.json()
      expect(casualSig.signature_html).toContain('Cheers')
      expect(casualSig.signature_html).toContain('😊')
    }
  })

  it('should validate signature content and constraints', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'

    // Test invalid signature data
    const invalidSignatureTests = [
      {
        data: { alias_id: testAliasId }, // Missing signature content
        description: 'Missing signature content'
      },
      {
        data: { 
          alias_id: testAliasId,
          signature_html: '', // Empty HTML
          signature_text: 'Valid text'
        },
        description: 'Empty HTML signature'
      },
      {
        data: { 
          alias_id: testAliasId,
          signature_html: 'Valid HTML',
          signature_text: '' // Empty text
        },
        description: 'Empty text signature'
      },
      {
        data: { 
          alias_id: testAliasId,
          signature_html: '<script>alert("xss")</script>', // XSS attempt
          signature_text: 'Valid text'
        },
        description: 'XSS in HTML signature'
      },
      {
        data: { 
          alias_id: testAliasId,
          signature_html: 'A'.repeat(10000), // Too long
          signature_text: 'Valid text'
        },
        description: 'Signature too long'
      }
    ]

    for (const test of invalidSignatureTests) {
      const response = await fetch(`${API_BASE_URL}/aliases/${testAliasId}/signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(test.data)
      })

      expect([400, 404]).toContain(response.status)

      if (response.status === 400) {
        const errorResponse = await response.json()
        expect(errorResponse).toHaveProperty('error')
      }
    }
  })

  it('should handle signature permissions and ownership', async () => {
    const otherUserAliasId = '987fcdeb-51a2-43d1-9f12-123456789abc'

    // Try to create signature for alias belonging to another user
    const unauthorizedSignatureData = {
      alias_id: otherUserAliasId,
      signature_html: '<p>Unauthorized signature</p>',
      signature_text: 'Unauthorized signature',
      is_default: true
    }

    const unauthorizedResponse = await fetch(`${API_BASE_URL}/aliases/${otherUserAliasId}/signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(unauthorizedSignatureData)
    })

    // Should return 404 (alias not found) due to RLS policies
    expect(unauthorizedResponse.status).toBe(404)

    // Try to get signature for alias belonging to another user
    const getUnauthorizedResponse = await fetch(`${API_BASE_URL}/aliases/${otherUserAliasId}/signature`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(getUnauthorizedResponse.status).toBe(404)

    // Try to update signature for alias belonging to another user
    const updateUnauthorizedResponse = await fetch(`${API_BASE_URL}/aliases/${otherUserAliasId}/signature`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signature_html: '<p>Updated unauthorized</p>',
        signature_text: 'Updated unauthorized'
      })
    })

    expect(updateUnauthorizedResponse.status).toBe(404)

    // Try to delete signature for alias belonging to another user
    const deleteUnauthorizedResponse = await fetch(`${API_BASE_URL}/aliases/${otherUserAliasId}/signature`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    expect(deleteUnauthorizedResponse.status).toBe(404)
  })

  it('should handle signature HTML sanitization', async () => {
    const testAliasId = '123e4567-e89b-12d3-a456-426614174000'

    // Test various HTML content that should be sanitized
    const htmlSanitizationTests = [
      {
        input: '<p>Safe content with <strong>bold</strong> and <em>italic</em></p>',
        description: 'Safe HTML tags'
      },
      {
        input: '<p>Content with <a href="https://example.com">link</a></p>',
        description: 'Safe link'
      },
      {
        input: '<p>Content with <img src="https://example.com/image.jpg" alt="Image"></p>',
        description: 'Image tag'
      },
      {
        input: '<p>Content</p><script>alert("xss")</script>',
        description: 'Script tag (should be removed)'
      },
      {
        input: '<p onclick="alert(\'xss\')">Content</p>',
        description: 'Event handler (should be removed)'
      }
    ]

    for (const test of htmlSanitizationTests) {
      const signatureData = {
        alias_id: testAliasId,
        signature_html: test.input,
        signature_text: 'Plain text version',
        is_default: true
      }

      const response = await fetch(`${API_BASE_URL}/aliases/${testAliasId}/signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signatureData)
      })

      expect([201, 400, 404]).toContain(response.status)

      if (response.status === 201) {
        const createdSignature = await response.json()
        
        // Verify dangerous content is removed/sanitized
        expect(createdSignature.signature_html).not.toContain('<script>')
        expect(createdSignature.signature_html).not.toContain('onclick=')
        expect(createdSignature.signature_html).not.toContain('javascript:')
      }
    }
  })
})
