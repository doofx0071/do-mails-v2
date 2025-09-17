import { NextRequest, NextResponse } from 'next/server'
import {
  createUserClient,
  extractAuthToken,
  verifyAuth,
} from '@/lib/supabase/server'
import MailgunAPI from '@/lib/mailgun/api'

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

    console.log(`📬 Setting up inbound route for domain: ${domainName}`)

    // Initialize Mailgun API
    const mailgunAPI = new MailgunAPI()
    
    if (!mailgunAPI.isConfigured()) {
      return NextResponse.json(
        { error: 'Mailgun is not configured' },
        { status: 500 }
      )
    }

    // Get webhook URL
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mailgun`
      : process.env.APP_BASE_URL
        ? `${process.env.APP_BASE_URL}/api/webhooks/mailgun`
        : null

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL not configured (NEXT_PUBLIC_APP_URL or APP_BASE_URL required)' },
        { status: 500 }
      )
    }

    try {
      // Set up inbound route for catch-all email forwarding
      const inboundRoute = await mailgunAPI.setupInboundRoute(
        domainName.toLowerCase(),
        webhookUrl
      )

      // Update domain with inbound route ID
      const { error: updateError } = await supabase
        .from('domains')
        .update({
          mailgun_inbound_route_id: inboundRoute.route?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId)

      if (updateError) {
        console.warn('Failed to update domain with inbound route ID:', updateError)
      }

      console.log(`✅ Inbound route created for ${domainName}:`, inboundRoute.route?.id)

      return NextResponse.json({
        success: true,
        domain: domainName,
        inbound_route: inboundRoute.route,
        webhook_url: webhookUrl,
        message: 'Inbound route configured successfully'
      })

    } catch (mailgunError: any) {
      console.error('Mailgun inbound route setup error:', mailgunError)
      
      // Check if route already exists
      if (mailgunError.message?.includes('already exists') || 
          mailgunError.message?.includes('conflict')) {
        return NextResponse.json({
          success: true,
          domain: domainName,
          message: 'Inbound route already exists for this domain',
          webhook_url: webhookUrl
        })
      }

      return NextResponse.json(
        { 
          error: 'Failed to set up inbound route',
          details: mailgunError.message || String(mailgunError)
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Inbound route setup error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
