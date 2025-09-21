import { NextRequest, NextResponse } from 'next/server'
import { EmailProcessing } from '@do-mails/email-processing'
import { MailgunAPI } from '@/lib/mailgun/api'

/**
 * POST /api/debug/test-send
 * Test email sending with detailed debugging
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, from, to, subject = 'Debug Test Email' } = body

    if (!domain || !from || !to) {
      return NextResponse.json(
        { error: 'domain, from, and to parameters required' },
        { status: 400 }
      )
    }

    console.log(
      `🧪 DEBUG SEND: Testing email from ${from} via domain ${domain}`
    )

    const results: any = {
      domain,
      from,
      to,
      timestamp: new Date().toISOString(),
      tests: {},
    }

    // Test 1: Check domain exists in Mailgun
    console.log('🔍 Step 1: Checking domain in Mailgun...')
    try {
      const mailgunAPI = new MailgunAPI()
      const domainInfo = await mailgunAPI.getDomain(domain)

      results.tests.domainCheck = {
        exists: !!domainInfo.domain,
        status: domainInfo.domain?.state || 'unknown',
        details: domainInfo.domain,
      }

      console.log(`✅ Domain check: ${domainInfo.domain?.state || 'not found'}`)
    } catch (error: any) {
      results.tests.domainCheck = {
        exists: false,
        error: error.message,
      }
      console.log(`❌ Domain check failed: ${error.message}`)
    }

    // Test 2: Try sending with exact domain case
    console.log('🔍 Step 2: Attempting send with exact domain case...')
    try {
      const emailProcessor = new EmailProcessing({
        mailgun: {
          apiKey: process.env.MAILGUN_API_KEY!,
          domain: domain, // Exact case
          baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net',
        },
        threading: {
          subjectNormalization: true,
          referencesTracking: true,
          participantGrouping: true,
          timeWindowHours: 24,
        },
      })

      const response = await emailProcessor.sendEmail({
        from,
        to: [to],
        subject: `${subject} (Exact Case)`,
        text: `This is a debug test email sent via domain: ${domain} (exact case)`,
        html: `<p>This is a debug test email sent via domain: <strong>${domain}</strong> (exact case)</p>`,
      })

      results.tests.sendExactCase = {
        success: true,
        response,
      }
      console.log(`✅ Send with exact case: SUCCESS`)
    } catch (error: any) {
      results.tests.sendExactCase = {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      }
      console.log(`❌ Send with exact case: ${error.message}`)
    }

    // Test 3: Try sending with lowercase domain
    console.log('🔍 Step 3: Attempting send with lowercase domain...')
    try {
      const emailProcessor = new EmailProcessing({
        mailgun: {
          apiKey: process.env.MAILGUN_API_KEY!,
          domain: domain.toLowerCase(), // Lowercase
          baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net',
        },
        threading: {
          subjectNormalization: true,
          referencesTracking: true,
          participantGrouping: true,
          timeWindowHours: 24,
        },
      })

      const response = await emailProcessor.sendEmail({
        from,
        to: [to],
        subject: `${subject} (Lowercase)`,
        text: `This is a debug test email sent via domain: ${domain.toLowerCase()} (lowercase)`,
        html: `<p>This is a debug test email sent via domain: <strong>${domain.toLowerCase()}</strong> (lowercase)</p>`,
      })

      results.tests.sendLowercase = {
        success: true,
        response,
      }
      console.log(`✅ Send with lowercase: SUCCESS`)
    } catch (error: any) {
      results.tests.sendLowercase = {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      }
      console.log(`❌ Send with lowercase: ${error.message}`)
    }

    // Test 4: Direct Mailgun API call
    console.log('🔍 Step 4: Direct Mailgun API send...')
    try {
      const formData = new URLSearchParams()
      formData.append('from', from)
      formData.append('to', to)
      formData.append('subject', `${subject} (Direct API)`)
      formData.append(
        'text',
        `This is a debug test email sent via direct Mailgun API for domain: ${domain}`
      )

      const response = await fetch(
        `https://api.mailgun.net/v3/${domain}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        }
      )

      if (response.ok) {
        const data = await response.json()
        results.tests.directAPI = {
          success: true,
          response: data,
        }
        console.log(`✅ Direct API send: SUCCESS`)
      } else {
        const errorData = await response.text()
        results.tests.directAPI = {
          success: false,
          status: response.status,
          error: errorData,
        }
        console.log(`❌ Direct API send: ${response.status} - ${errorData}`)
      }
    } catch (error: any) {
      results.tests.directAPI = {
        success: false,
        error: error.message,
      }
      console.log(`❌ Direct API send error: ${error.message}`)
    }

    // Test 5: Try with lowercase domain in direct API
    console.log('🔍 Step 5: Direct API with lowercase domain...')
    try {
      const formData = new URLSearchParams()
      formData.append('from', from)
      formData.append('to', to)
      formData.append('subject', `${subject} (Direct API Lowercase)`)
      formData.append(
        'text',
        `This is a debug test email sent via direct Mailgun API for domain: ${domain.toLowerCase()}`
      )

      const response = await fetch(
        `https://api.mailgun.net/v3/${domain.toLowerCase()}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        }
      )

      if (response.ok) {
        const data = await response.json()
        results.tests.directAPILowercase = {
          success: true,
          response: data,
        }
        console.log(`✅ Direct API lowercase: SUCCESS`)
      } else {
        const errorData = await response.text()
        results.tests.directAPILowercase = {
          success: false,
          status: response.status,
          error: errorData,
        }
        console.log(
          `❌ Direct API lowercase: ${response.status} - ${errorData}`
        )
      }
    } catch (error: any) {
      results.tests.directAPILowercase = {
        success: false,
        error: error.message,
      }
      console.log(`❌ Direct API lowercase error: ${error.message}`)
    }

    // Summary
    const successfulTests = Object.values(results.tests).filter(
      (test: any) => test.success
    ).length
    results.summary = {
      total_tests: Object.keys(results.tests).length,
      successful_tests: successfulTests,
      working_method: null,
      recommendation: null,
    }

    // Determine working method
    if (results.tests.sendExactCase?.success) {
      results.summary.working_method = 'EmailProcessing with exact case'
    } else if (results.tests.sendLowercase?.success) {
      results.summary.working_method = 'EmailProcessing with lowercase'
    } else if (results.tests.directAPI?.success) {
      results.summary.working_method = 'Direct API with exact case'
    } else if (results.tests.directAPILowercase?.success) {
      results.summary.working_method = 'Direct API with lowercase'
    }

    // Recommendation
    if (successfulTests === 0) {
      results.summary.recommendation =
        'Domain not properly configured in Mailgun - check domain setup'
    } else if (
      results.tests.sendLowercase?.success &&
      !results.tests.sendExactCase?.success
    ) {
      results.summary.recommendation =
        'Use lowercase domain names in EmailProcessing configuration'
    } else if (
      results.tests.directAPI?.success &&
      !results.tests.sendExactCase?.success
    ) {
      results.summary.recommendation =
        'Issue with EmailProcessing library - use direct API calls'
    } else {
      results.summary.recommendation =
        'Email sending is working - check original error context'
    }

    console.log(
      `🎯 TEST COMPLETE: ${results.summary.working_method || 'No working method found'}`
    )

    return NextResponse.json(results, { status: 200 })
  } catch (error) {
    console.error('Test send error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
