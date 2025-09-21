import { NextRequest, NextResponse } from 'next/server'
import { MailgunAPI } from '@/lib/mailgun/api'
import { EmailProcessing } from '@do-mails/email-processing'
import {
  extractAuthToken,
  verifyAuth,
  createUserClient,
} from '@/lib/supabase/server'

/**
 * GET /api/debug/mailgun-domain?domain=kuyadoof.dev
 * Comprehensive debug endpoint to test Mailgun domain configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domainName = searchParams.get('domain')

    if (!domainName) {
      return NextResponse.json(
        { error: 'domain parameter required' },
        { status: 400 }
      )
    }

    console.log(
      `🔍 DEBUG: Testing Mailgun configuration for domain: ${domainName}`
    )

    const results: any = {
      domain: domainName,
      timestamp: new Date().toISOString(),
      tests: {},
    }

    // Test 1: Environment Variables
    console.log('🧪 Test 1: Environment Variables')
    results.tests.environment = {
      MAILGUN_API_KEY: process.env.MAILGUN_API_KEY ? '✅ Set' : '❌ Missing',
      MAILGUN_DOMAIN:
        process.env.MAILGUN_DOMAIN || 'Not set (using dynamic domains)',
      MAILGUN_BASE_URL:
        process.env.MAILGUN_BASE_URL || 'Default (https://api.mailgun.net)',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'Not set',
      APP_BASE_URL: process.env.APP_BASE_URL || 'Not set',
    }

    // Test 2: MailgunAPI Class (used by setup endpoints)
    console.log('🧪 Test 2: MailgunAPI Class (Setup Endpoints)')
    try {
      const mailgunAPI = new MailgunAPI()

      if (!mailgunAPI.isConfigured()) {
        results.tests.mailgunAPI = {
          configured: false,
          error: 'Mailgun API not configured',
        }
      } else {
        // Test domain existence
        try {
          const domainInfo = await mailgunAPI.getDomain(domainName)
          results.tests.mailgunAPI = {
            configured: true,
            domain_exists: !!domainInfo.domain,
            domain_status: domainInfo.domain?.state || 'unknown',
            domain_info: domainInfo.domain,
            raw_response: domainInfo,
          }
        } catch (error: any) {
          results.tests.mailgunAPI = {
            configured: true,
            domain_exists: false,
            error: error.message,
            error_details: error,
          }
        }
      }
    } catch (error: any) {
      results.tests.mailgunAPI = {
        configured: false,
        error: error.message,
        error_details: error,
      }
    }

    // Test 3: EmailProcessing Class (used by sending endpoints)
    console.log('🧪 Test 3: EmailProcessing Class (Sending Endpoints)')
    try {
      // 🔧 FIX: Correct the baseUrl issue
      const correctedBaseUrl = (
        process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
      ).replace('/v3', '')
      console.log(
        `Using corrected baseUrl: ${correctedBaseUrl} (original: ${process.env.MAILGUN_BASE_URL})`
      )

      const emailProcessor = new EmailProcessing({
        mailgun: {
          apiKey: process.env.MAILGUN_API_KEY!,
          domain: domainName.toLowerCase(),
          baseUrl: correctedBaseUrl, // Use corrected base URL
        },
        threading: {
          subjectNormalization: true,
          referencesTracking: true,
          participantGrouping: true,
          timeWindowHours: 24,
        },
      })

      // Test domain validation by attempting to send a test email (dry run)
      try {
        // This will fail but give us the exact error
        await emailProcessor.sendEmail({
          from: `test@${domainName}`,
          to: ['test@example.com'],
          subject: 'Test Email - Debug',
          text: 'This is a test email for debugging purposes.',
        })

        results.tests.emailProcessing = {
          configured: true,
          can_send: true,
          message: 'Email sending would succeed',
        }
      } catch (error: any) {
        results.tests.emailProcessing = {
          configured: true,
          can_send: false,
          error: error.message,
          error_code: error.code,
          error_details: error.details || error,
          mailgun_error: error.message.includes('Not Found')
            ? 'Domain not found in Mailgun'
            : 'Other error',
        }
      }
    } catch (error: any) {
      results.tests.emailProcessing = {
        configured: false,
        error: error.message,
        error_details: error,
      }
    }

    // Test 4: Direct Mailgun API Call
    console.log('🧪 Test 4: Direct Mailgun API Call')
    try {
      const response = await fetch(
        `https://api.mailgun.net/v3/domains/${domainName}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        results.tests.directAPI = {
          status: response.status,
          domain_exists: true,
          domain_data: data,
        }
      } else {
        const errorData = await response.text()
        results.tests.directAPI = {
          status: response.status,
          domain_exists: false,
          error: errorData,
          message: response.status === 404 ? 'Domain not found' : 'API error',
        }
      }
    } catch (error: any) {
      results.tests.directAPI = {
        error: error.message,
        message: 'Failed to make direct API call',
      }
    }

    // Test 5: List all domains in Mailgun account
    console.log('🧪 Test 5: List All Domains')
    try {
      const response = await fetch('https://api.mailgun.net/v3/domains', {
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const domains = data.items || []
        const targetDomain = domains.find(
          (d: any) =>
            d.name === domainName ||
            d.name === domainName.toLowerCase() ||
            d.name === domainName.toUpperCase()
        )

        results.tests.listDomains = {
          total_domains: domains.length,
          domain_names: domains.map((d: any) => d.name),
          target_domain_found: !!targetDomain,
          target_domain_data: targetDomain,
          case_variations: {
            exact: domains.some((d: any) => d.name === domainName),
            lowercase: domains.some(
              (d: any) => d.name === domainName.toLowerCase()
            ),
            uppercase: domains.some(
              (d: any) => d.name === domainName.toUpperCase()
            ),
          },
        }
      } else {
        results.tests.listDomains = {
          error: `API returned ${response.status}`,
          message: 'Failed to list domains',
        }
      }
    } catch (error: any) {
      results.tests.listDomains = {
        error: error.message,
        message: 'Failed to list domains',
      }
    }

    // Summary
    results.summary = {
      mailgun_api_configured: !!process.env.MAILGUN_API_KEY,
      domain_in_setup_check: results.tests.mailgunAPI?.domain_exists || false,
      domain_in_send_check: results.tests.emailProcessing?.can_send || false,
      domain_in_direct_api: results.tests.directAPI?.domain_exists || false,
      domain_in_list: results.tests.listDomains?.target_domain_found || false,
      likely_issue: 'TBD',
    }

    // Determine likely issue
    if (!results.summary.mailgun_api_configured) {
      results.summary.likely_issue = 'Mailgun API key not configured'
    } else if (!results.summary.domain_in_list) {
      results.summary.likely_issue = 'Domain not added to Mailgun account'
    } else if (
      results.summary.domain_in_setup_check &&
      !results.summary.domain_in_send_check
    ) {
      results.summary.likely_issue =
        'API endpoint or configuration mismatch between setup and sending'
    } else if (results.tests.listDomains?.case_variations) {
      const caseVars = results.tests.listDomains.case_variations
      if (caseVars.lowercase && !caseVars.exact) {
        results.summary.likely_issue =
          'Case sensitivity issue - domain exists in lowercase only'
      }
    } else {
      results.summary.likely_issue = 'Unknown - check detailed test results'
    }

    console.log(`🎯 DEBUG COMPLETE: ${results.summary.likely_issue}`)

    return NextResponse.json(results, { status: 200 })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
