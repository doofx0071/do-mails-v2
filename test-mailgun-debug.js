#!/usr/bin/env node

/**
 * Comprehensive Mailgun debugging script
 * Run this to test the deployed version and identify the exact issue
 */

const BASE_URL = 'https://app.do-mails.space'
const DOMAIN = 'kuyadoof.dev'

async function runDebugTests() {
  console.log('🔍 MAILGUN DEBUG TESTS')
  console.log('======================')
  console.log(`Testing domain: ${DOMAIN}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log('')

  // Test 1: Domain Debug Endpoint
  console.log('📋 Test 1: Domain Configuration Debug')
  console.log('-------------------------------------')
  try {
    const response = await fetch(`${BASE_URL}/api/debug/mailgun-domain?domain=${DOMAIN}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Debug endpoint accessible')
      console.log(`📊 Summary: ${data.summary?.likely_issue || 'Unknown'}`)
      console.log('')
      
      // Show key findings
      if (data.tests?.mailgunAPI) {
        console.log(`🔧 MailgunAPI (Setup): ${data.tests.mailgunAPI.domain_exists ? '✅ Domain exists' : '❌ Domain not found'}`)
        if (data.tests.mailgunAPI.domain_status) {
          console.log(`   Status: ${data.tests.mailgunAPI.domain_status}`)
        }
      }
      
      if (data.tests?.emailProcessing) {
        console.log(`📧 EmailProcessing (Send): ${data.tests.emailProcessing.can_send ? '✅ Can send' : '❌ Cannot send'}`)
        if (data.tests.emailProcessing.error) {
          console.log(`   Error: ${data.tests.emailProcessing.error}`)
        }
      }
      
      if (data.tests?.listDomains) {
        console.log(`📝 Domain List: ${data.tests.listDomains.target_domain_found ? '✅ Found in list' : '❌ Not in list'}`)
        console.log(`   Total domains: ${data.tests.listDomains.total_domains || 0}`)
        if (data.tests.listDomains.domain_names) {
          console.log(`   Available domains: ${data.tests.listDomains.domain_names.join(', ')}`)
        }
        if (data.tests.listDomains.case_variations) {
          const cv = data.tests.listDomains.case_variations
          console.log(`   Case variations: exact=${cv.exact}, lowercase=${cv.lowercase}, uppercase=${cv.uppercase}`)
        }
      }
      
      console.log('')
      console.log(`🎯 Likely Issue: ${data.summary?.likely_issue}`)
      
    } else {
      console.log(`❌ Debug endpoint failed: ${response.status}`)
      const text = await response.text()
      console.log(`   Error: ${text}`)
    }
  } catch (error) {
    console.log(`❌ Debug endpoint error: ${error.message}`)
  }

  console.log('')

  // Test 2: Test Send Endpoint
  console.log('📤 Test 2: Email Send Testing')
  console.log('------------------------------')
  try {
    const response = await fetch(`${BASE_URL}/api/debug/test-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain: DOMAIN,
        from: `test@${DOMAIN}`,
        to: 'test@example.com',
        subject: 'Debug Test Email'
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Test send endpoint accessible')
      console.log('')
      
      // Show test results
      Object.entries(data.tests).forEach(([testName, result]) => {
        const success = result.success ? '✅' : '❌'
        console.log(`${success} ${testName}: ${result.success ? 'SUCCESS' : result.error || 'FAILED'}`)
      })
      
      console.log('')
      console.log(`🎯 Working Method: ${data.summary?.working_method || 'None found'}`)
      console.log(`💡 Recommendation: ${data.summary?.recommendation || 'Unknown'}`)
      
    } else {
      console.log(`❌ Test send endpoint failed: ${response.status}`)
      const text = await response.text()
      console.log(`   Error: ${text}`)
    }
  } catch (error) {
    console.log(`❌ Test send endpoint error: ${error.message}`)
  }

  console.log('')

  // Test 3: Try the actual send endpoint that's failing
  console.log('🚀 Test 3: Actual Send Endpoint (Current Issue)')
  console.log('-----------------------------------------------')
  try {
    // Note: This would require authentication, so we'll just show what to test
    console.log('⚠️  This test requires authentication. To test manually:')
    console.log('')
    console.log('1. Go to your deployed app')
    console.log('2. Try to send an email from kuyadoof.dev')
    console.log('3. Check the browser console and network tab')
    console.log('4. Look for the new debug logs showing:')
    console.log('   - "🔧 Using Mailgun domain: [domain] (original: [domain])"')
    console.log('   - Updated error details with mailgunDomain and caseMatch')
    console.log('')
    console.log('Expected fix: Domain should now be converted to lowercase')
    console.log('If it still fails, the debug endpoints above will show why')
    
  } catch (error) {
    console.log(`❌ Actual send test error: ${error.message}`)
  }

  console.log('')
  console.log('🎯 NEXT STEPS:')
  console.log('==============')
  console.log('1. Check the debug results above')
  console.log('2. If domain is not in Mailgun list, use the "Mailgun Setup" button')
  console.log('3. If case sensitivity is the issue, the fix should resolve it')
  console.log('4. If other issues, check the detailed debug output')
  console.log('')
  console.log('🔧 FIXES APPLIED:')
  console.log('- Domain names are now converted to lowercase for Mailgun API')
  console.log('- Enhanced error logging with case conversion details')
  console.log('- Debug endpoints to identify exact configuration issues')
  console.log('')
}

// Run the tests
runDebugTests().catch(console.error)
