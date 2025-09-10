#!/usr/bin/env node

/**
 * API Endpoint Testing Script
 * 
 * This script tests all the API endpoints to ensure they work correctly
 * with the database after migration.
 * 
 * Prerequisites:
 * 1. Database migration completed
 * 2. Environment variables set up
 * 3. Next.js development server running (npm run dev)
 * 4. User account created in Supabase
 * 
 * Usage:
 * node scripts/test-api-endpoints.js
 */

const BASE_URL = 'http://localhost:3000/api'

// Test configuration
const TEST_CONFIG = {
  // You'll need to get this token by signing in through the UI first
  // or create a test user and get their JWT token
  authToken: process.env.TEST_AUTH_TOKEN || 'your-jwt-token-here',
  
  // Test data
  testDomain: 'test-domain-' + Date.now() + '.com',
  testAlias: 'test-alias-' + Date.now(),
}

class APITester {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl
    this.authToken = authToken
    this.testResults = []
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, options)
      const responseData = await response.text()
      
      let parsedData
      try {
        parsedData = JSON.parse(responseData)
      } catch {
        parsedData = responseData
      }

      return {
        status: response.status,
        ok: response.ok,
        data: parsedData
      }
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error.message
      }
    }
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'     // Reset
    }
    
    console.log(`${colors[type]}${message}${colors.reset}`)
  }

  async test(name, method, endpoint, data = null, expectedStatus = 200) {
    this.log(`\n🧪 Testing: ${name}`)
    this.log(`   ${method} ${endpoint}`)
    
    const result = await this.request(method, endpoint, data)
    
    if (result.status === expectedStatus) {
      this.log(`   ✅ Success (${result.status})`, 'success')
      this.testResults.push({ name, status: 'PASS', response: result })
      return result
    } else {
      this.log(`   ❌ Failed (${result.status}) - Expected ${expectedStatus}`, 'error')
      if (result.error) {
        this.log(`   Error: ${result.error}`, 'error')
      } else if (result.data && result.data.error) {
        this.log(`   Error: ${result.data.error}`, 'error')
      }
      this.testResults.push({ name, status: 'FAIL', response: result })
      return result
    }
  }

  async runAllTests() {
    this.log('🚀 Starting API Endpoint Tests\n', 'info')
    
    if (!this.authToken || this.authToken === 'your-jwt-token-here') {
      this.log('❌ No auth token provided. Please set TEST_AUTH_TOKEN environment variable.', 'error')
      this.log('   You can get a token by signing in through the UI and checking localStorage.', 'warning')
      return
    }

    let domainId, aliasId

    try {
      // Test 1: List domains (should be empty initially)
      await this.test('List domains', 'GET', '/domains')

      // Test 2: Create domain
      const createDomainResult = await this.test(
        'Create domain', 
        'POST', 
        '/domains', 
        { domain_name: TEST_CONFIG.testDomain },
        201
      )
      
      if (createDomainResult.ok && createDomainResult.data.id) {
        domainId = createDomainResult.data.id
        this.log(`   📝 Created domain ID: ${domainId}`, 'info')
      }

      // Test 3: List domains (should show our new domain)
      await this.test('List domains after creation', 'GET', '/domains')

      // Test 4: Verify domain (will fail but should return proper error)
      if (domainId) {
        await this.test(
          'Verify domain (expected to fail)', 
          'POST', 
          `/domains/${domainId}/verify`,
          null,
          400 // Expected to fail since DNS isn't set up
        )
      }

      // Test 5: List aliases (should be empty)
      await this.test('List aliases', 'GET', '/aliases')

      // Test 6: Create alias (should fail if domain not verified)
      if (domainId) {
        const createAliasResult = await this.test(
          'Create alias (may fail if domain not verified)', 
          'POST', 
          '/aliases', 
          { 
            domain_id: domainId, 
            alias_name: TEST_CONFIG.testAlias,
            is_enabled: true 
          },
          201
        )
        
        if (createAliasResult.ok && createAliasResult.data.id) {
          aliasId = createAliasResult.data.id
          this.log(`   📝 Created alias ID: ${aliasId}`, 'info')
        }
      }

      // Test 7: Get specific alias
      if (aliasId) {
        await this.test('Get specific alias', 'GET', `/aliases/${aliasId}`)
      }

      // Test 8: Update alias
      if (aliasId) {
        await this.test(
          'Update alias', 
          'PATCH', 
          `/aliases/${aliasId}`, 
          { is_enabled: false }
        )
      }

      // Test 9: List email threads (should be empty)
      await this.test('List email threads', 'GET', '/emails/threads')

      // Test 10: Send email (should fail without verified domain)
      if (aliasId) {
        await this.test(
          'Send email (expected to fail)', 
          'POST', 
          '/emails/send',
          {
            alias_id: aliasId,
            to_addresses: ['test@example.com'],
            subject: 'Test Email',
            body_html: '<p>This is a test email</p>',
            body_text: 'This is a test email'
          },
          400 // Expected to fail
        )
      }

      // Test 11: Webhook health check
      await this.test('Mailgun webhook health check', 'GET', '/webhooks/mailgun')

    } catch (error) {
      this.log(`💥 Unexpected error during testing: ${error.message}`, 'error')
    }

    // Print summary
    this.printSummary()
  }

  printSummary() {
    this.log('\n📊 Test Summary', 'info')
    this.log('=' * 50)
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length
    const failed = this.testResults.filter(r => r.status === 'FAIL').length
    
    this.log(`✅ Passed: ${passed}`, 'success')
    this.log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info')
    this.log(`📈 Total: ${this.testResults.length}`, 'info')
    
    if (failed > 0) {
      this.log('\n❌ Failed Tests:', 'error')
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(test => {
          this.log(`   • ${test.name}`, 'error')
        })
    }

    this.log('\n💡 Next Steps:', 'warning')
    this.log('1. Run database migration if not done: See scripts/migrate-database.md')
    this.log('2. Verify environment variables are set correctly')
    this.log('3. For domain verification, set up DNS records as shown in the UI')
    this.log('4. For email sending, verify domain first')
    this.log('5. Check server logs for detailed error messages')
  }
}

// Run tests
async function main() {
  const tester = new APITester(BASE_URL, TEST_CONFIG.authToken)
  await tester.runAllTests()
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { APITester, TEST_CONFIG }
