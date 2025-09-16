import { NextRequest, NextResponse } from 'next/server'
import MailgunAPI from '@/lib/mailgun/api'

/**
 * GET /api/test/mailgun
 * Test Mailgun API configuration and list domains
 */
export async function GET() {
  try {
    const mailgunAPI = new MailgunAPI()
    
    if (!mailgunAPI.isConfigured()) {
      return NextResponse.json({
        configured: false,
        message: 'Mailgun API not configured. Please set MAILGUN_API_KEY in your environment variables.',
        required_env_vars: [
          'MAILGUN_API_KEY',
          'WEBHOOK_URL (optional)',
          'NEXT_PUBLIC_APP_URL (optional)'
        ]
      }, { status: 200 })
    }

    // Add debug information
    const debugInfo = {
      api_key_set: !!process.env.MAILGUN_API_KEY,
      api_key_length: process.env.MAILGUN_API_KEY?.length || 0,
      api_key_preview: process.env.MAILGUN_API_KEY ? 
        `${process.env.MAILGUN_API_KEY.substring(0, 8)}...${process.env.MAILGUN_API_KEY.slice(-8)}` : 'not set',
      base_url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net/v3',
      domain: process.env.MAILGUN_DOMAIN || 'not set'
    }
    
    console.log('Mailgun debug info:', debugInfo)

    // Test API by testing a simple endpoint first
    try {
      console.log('Testing Mailgun API connection...')
      const domains = await mailgunAPI.listDomains()
      
      return NextResponse.json({
        configured: true,
        message: 'Mailgun API is properly configured',
        debug: debugInfo,
        total_domains: domains.total_count || 0,
        domains: domains.items?.map((d: any) => ({
          name: d.name,
          state: d.state,
          created_at: d.created_at
        })) || []
      }, { status: 200 })
    } catch (apiError) {
      // Return detailed error information
      return NextResponse.json({
        configured: false,
        error: 'Failed to connect to Mailgun API',
        debug: debugInfo,
        details: apiError instanceof Error ? apiError.message : String(apiError),
        endpoint_tested: `${debugInfo.base_url}/domains`
      }, { status: 200 })
    }

  } catch (error) {
    console.error('Mailgun test error:', error)
    return NextResponse.json({
      configured: false,
      error: 'Failed to connect to Mailgun API',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}