import { NextRequest, NextResponse } from 'next/server'
import {
  createUserClient,
  extractAuthToken,
  verifyAuth,
} from '@/lib/supabase/server'
import { MailgunAPI } from '@/lib/mailgun/api'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract and validate auth token
    const token = extractAuthToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Bearer token required' },
        { status: 401 }
      )
    }

    // Verify authentication and get user
    let user
    try {
      user = await verifyAuth(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const domainId = params.id

    // Create Supabase client with the token (RLS will handle user filtering)
    const supabase = createUserClient(token)

    // Fetch domain details - RLS automatically filters by user
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    const domainName = domain.domain_name

    console.log(`🔍 Triggering Mailgun verification for domain: ${domainName}`)

    // Initialize Mailgun API
    const mailgunAPI = new MailgunAPI()
    
    if (!mailgunAPI.isConfigured()) {
      return NextResponse.json(
        { error: 'Mailgun is not configured' },
        { status: 500 }
      )
    }

    try {
      // Trigger Mailgun domain verification
      const verificationResult = await mailgunAPI.verifyDomain(domainName)
      console.log(`✅ Mailgun verification triggered for ${domainName}:`, verificationResult)

      // Get updated domain status from Mailgun
      const domainInfo = await mailgunAPI.getDomain(domainName)
      const mailgunStatus = domainInfo.domain?.state || 'unknown'

      console.log(`📊 Mailgun domain status for ${domainName}: ${mailgunStatus}`)

      return NextResponse.json({
        success: true,
        domain: domainName,
        mailgun_verification: verificationResult,
        mailgun_status: mailgunStatus,
        message: `Mailgun verification triggered for ${domainName}. Status: ${mailgunStatus}`
      })

    } catch (error) {
      console.error(`❌ Failed to verify domain ${domainName} in Mailgun:`, error)
      return NextResponse.json(
        { 
          error: 'Failed to verify domain in Mailgun',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in Mailgun verification API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
