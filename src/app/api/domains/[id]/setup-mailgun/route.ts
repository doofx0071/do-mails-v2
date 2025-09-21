import { NextRequest, NextResponse } from 'next/server'
import {
  createUserClient,
  extractAuthToken,
  verifyAuth,
} from '@/lib/supabase/server'
import { MailgunAPI } from '@/lib/mailgun/api'

/**
 * POST /api/domains/[id]/setup-mailgun
 * Manually add a verified domain to Mailgun (for domains that weren't auto-added)
 */
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

    // Check if domain is verified
    if (domain.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'Domain must be verified before setting up Mailgun' },
        { status: 400 }
      )
    }

    const domainName = domain.domain_name

    console.log(`🚀 Setting up Mailgun for verified domain: ${domainName}`)

    // Initialize Mailgun API
    const mailgunAPI = new MailgunAPI()
    
    if (!mailgunAPI.isConfigured()) {
      return NextResponse.json(
        { error: 'Mailgun is not configured' },
        { status: 500 }
      )
    }

    try {
      // Check if domain already exists in Mailgun
      let domainExists = false
      try {
        const existingDomain = await mailgunAPI.getDomain(domainName)
        domainExists = !!existingDomain.domain
        console.log(`📋 Domain ${domainName} already exists in Mailgun: ${domainExists}`)
      } catch (error) {
        // Domain doesn't exist, which is fine
        domainExists = false
      }

      let addDomainResult = null
      if (!domainExists) {
        // Add domain to Mailgun with wildcard enabled for catch-all
        console.log(`📧 Adding domain ${domainName} to Mailgun...`)
        addDomainResult = await mailgunAPI.addDomain(domainName.toLowerCase(), {
          wildcard: true,
          spam_action: 'disabled',
        })
        console.log(`✅ Domain added to Mailgun successfully`)
      } else {
        console.log(`ℹ️ Domain ${domainName} already exists in Mailgun, skipping add`)
      }

      // Set up webhook for the domain
      const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mailgun`
        : process.env.APP_BASE_URL
          ? `${process.env.APP_BASE_URL}/api/webhooks/mailgun`
          : null

      let webhookResult = null
      let inboundRouteResult = null

      if (webhookUrl) {
        console.log('🎣 Setting up webhook...')
        try {
          webhookResult = await mailgunAPI.setupWebhook(domainName.toLowerCase(), webhookUrl)
          console.log(`✅ Webhook configured for ${domainName}`)
        } catch (webhookError) {
          console.warn(`⚠️ Webhook setup failed (may already exist):`, webhookError.message)
          webhookResult = { error: webhookError.message }
        }
        
        // Set up inbound route for catch-all email forwarding
        console.log('📬 Setting up inbound route...')
        try {
          inboundRouteResult = await mailgunAPI.setupInboundRoute(
            domainName.toLowerCase(),
            webhookUrl
          )
          
          // Update domain with Mailgun setup info
          await supabase
            .from('domains')
            .update({
              mailgun_inbound_route_id: inboundRouteResult.route?.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', domainId)
          
          console.log(`✅ Inbound route configured for ${domainName}`)
        } catch (routeError) {
          console.warn(`⚠️ Inbound route setup failed (may already exist):`, routeError.message)
          inboundRouteResult = { error: routeError.message }
        }
      } else {
        console.warn('⚠️ No webhook URL configured, skipping webhook and route setup')
      }

      // Get updated domain status from Mailgun
      const domainInfo = await mailgunAPI.getDomain(domainName)
      const mailgunStatus = domainInfo.domain?.state || 'unknown'

      console.log(`📊 Mailgun setup completed for ${domainName}. Status: ${mailgunStatus}`)

      return NextResponse.json({
        success: true,
        domain: domainName,
        mailgun_status: mailgunStatus,
        setup_results: {
          domain_added: addDomainResult || 'already_exists',
          webhook_setup: webhookResult,
          inbound_route: inboundRouteResult,
        },
        message: `Mailgun setup completed for ${domainName}. You can now send emails from this domain.`
      })

    } catch (error) {
      console.error(`❌ Failed to setup Mailgun for ${domainName}:`, error)
      return NextResponse.json(
        { 
          error: 'Failed to setup domain in Mailgun',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in Mailgun setup API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/domains/[id]/setup-mailgun
 * Check Mailgun setup status for a domain
 */
export async function GET(
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

    // Initialize Mailgun API
    const mailgunAPI = new MailgunAPI()
    
    if (!mailgunAPI.isConfigured()) {
      return NextResponse.json({
        domain: domainName,
        mailgun_configured: false,
        mailgun_status: 'not_configured',
        message: 'Mailgun is not configured'
      })
    }

    try {
      // Check if domain exists in Mailgun
      const domainInfo = await mailgunAPI.getDomain(domainName)
      const mailgunStatus = domainInfo.domain?.state || 'unknown'
      
      return NextResponse.json({
        domain: domainName,
        mailgun_configured: true,
        mailgun_status: mailgunStatus,
        domain_exists: !!domainInfo.domain,
        can_send_emails: mailgunStatus === 'active',
        message: mailgunStatus === 'active' 
          ? 'Domain is ready for sending emails'
          : `Domain exists but status is: ${mailgunStatus}`
      })

    } catch (error) {
      // Domain doesn't exist in Mailgun
      return NextResponse.json({
        domain: domainName,
        mailgun_configured: true,
        mailgun_status: 'not_found',
        domain_exists: false,
        can_send_emails: false,
        message: 'Domain not found in Mailgun account. Use POST to set it up.'
      })
    }

  } catch (error) {
    console.error('Error checking Mailgun status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
