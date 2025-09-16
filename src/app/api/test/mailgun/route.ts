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

    // Test API by listing domains
    const domains = await mailgunAPI.listDomains()
    
    return NextResponse.json({
      configured: true,
      message: 'Mailgun API is properly configured',
      total_domains: domains.total_count || 0,
      domains: domains.items?.map((d: any) => ({
        name: d.name,
        state: d.state,
        created_at: d.created_at
      })) || []
    }, { status: 200 })

  } catch (error) {
    console.error('Mailgun test error:', error)
    return NextResponse.json({
      configured: false,
      error: 'Failed to connect to Mailgun API',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}