import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import ForwardingConfigDBManager from '@/lib/forwarding-config-db'
import MailgunAPI from '@/lib/mailgun/api'
import { generateVerificationToken, isUUID } from '@/lib/utils/uuid'

/**
 * POST /api/domains/setup-forwarding
 * ImprovMX-style domain setup: domain + email = instant forwarding
 * This creates a domain with catch-all forwarding to the specified email
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== ImprovMX Setup API Called ===')
    
    const supabase = createServiceClient()
    
    // Parse request body
    const body = await request.json()
    const { domain_name, forward_to_email } = body
    
    // Extract session from cookies manually - let's see what cookies we have
    const cookieHeader = request.headers.get('cookie') || ''
    console.log('🍪 Cookie header:', cookieHeader.substring(0, 200) + '...')
    
    let user = null
    let authError = null
    
    // Try multiple possible cookie patterns
    const supabaseCookiePatterns = [
      /sb-[^=]+-auth-token=([^;]+)/,
      /supabase-auth-token=([^;]+)/,
      /sb-auth-token=([^;]+)/
    ]
    
    let sessionToken = null
    for (const pattern of supabaseCookiePatterns) {
      const match = cookieHeader.match(pattern)
      if (match) {
        sessionToken = decodeURIComponent(match[1])
        console.log('✅ Found session token with pattern:', pattern)
        break
      }
    }
    
    if (sessionToken) {
      try {
        const sessionData = JSON.parse(sessionToken)
        console.log('🔑 Session data keys:', Object.keys(sessionData))
        
        if (sessionData.access_token) {
          const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser(sessionData.access_token)
          user = authUser
          authError = getUserError
          console.log('✅ Successfully extracted user from session')
        } else {
          authError = { message: 'No access token in session' }
          console.log('❌ No access token in parsed session data')
        }
      } catch (parseError) {
        authError = { message: 'Failed to parse session cookie' }
        console.log('❌ Failed to parse session cookie:', parseError)
      }
    } else {
      authError = { message: 'Auth session missing!' }
      console.log('❌ No Supabase session cookie found')
    }
    
    console.log('📦 Setup request:', { domain_name, forward_to_email, user_id: user?.id, auth_error: authError?.message })

    if (!domain_name || !forward_to_email) {
      return NextResponse.json(
        { error: 'Domain name and forwarding email are required' },
        { status: 400 }
      )
    }

    // Check authentication - allow both user sessions and service-to-service calls
    let ownerUserId = user?.id
    const serviceKey = process.env.INTERNAL_SERVICE_KEY
    const providedServiceKey = request.headers.get('x-service-key')
    const providedUserId = request.headers.get('x-user-id')
    
    if (!ownerUserId && serviceKey && providedServiceKey === serviceKey && providedUserId) {
      // Service-to-service call with valid key and user ID
      if (!isUUID(providedUserId)) {
        return NextResponse.json(
          { error: 'Invalid x-user-id format: must be UUID' },
          { status: 400 }
        )
      }
      ownerUserId = providedUserId
      console.log('🔑 Service-to-service authentication with user_id:', ownerUserId)
    }
    
    if (!ownerUserId) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in or provide valid service credentials.' },
        { status: 401 }
      )
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(domain_name)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(forward_to_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    console.log('✅ Validation passed')

    // Generate verification token using secure method
    const verificationToken = generateVerificationToken()
    
    console.log('🔐 Generated token:', verificationToken)
    console.log('👤 Using user_id:', ownerUserId)

    // Store forwarding configuration using the ForwardingConfigDBManager
    await ForwardingConfigDBManager.setConfig(domain_name.toLowerCase(), {
      forward_to: forward_to_email,
      created_at: new Date().toISOString(),
      verification_token: verificationToken,
      status: 'pending',
      enabled: true // Enable forwarding immediately for ImprovMX-style experience
    })
    
    console.log('✅ Forwarding configuration saved for', domain_name.toLowerCase())
    
    // Automatically add domain to Mailgun
    let mailgunResult = null
    try {
      const mailgunAPI = new MailgunAPI()
      if (mailgunAPI.isConfigured()) {
        console.log('🚀 Adding domain to Mailgun automatically...')
        
        // Add domain to Mailgun with wildcard enabled for catch-all
        mailgunResult = await mailgunAPI.addDomain(domain_name.toLowerCase(), {
          wildcard: true,
          spam_action: 'disabled'
        })
        
        // Set up webhook for the domain
        const webhookUrl = process.env.NEXT_PUBLIC_APP_URL 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mailgun`
          : process.env.APP_BASE_URL 
          ? `${process.env.APP_BASE_URL}/api/webhooks/mailgun`
          : null
        
        if (webhookUrl) {
          console.log('🎣 Setting up webhook at:', webhookUrl)
          await mailgunAPI.setupWebhook(domain_name.toLowerCase(), webhookUrl)
          console.log('✅ Mailgun webhook configured for', domain_name.toLowerCase())
        } else {
          console.warn('⚠️ No webhook URL configured (NEXT_PUBLIC_APP_URL or APP_BASE_URL), skipping webhook setup')
        }
        
        console.log('✅ Domain added to Mailgun successfully:', domain_name.toLowerCase())
      } else {
        console.warn('⚠️ Mailgun API not configured, skipping automatic domain creation')
      }
    } catch (mailgunError) {
      console.warn('⚠️ Failed to add domain to Mailgun:', mailgunError)
      console.warn('Domain will still work for forwarding, but may need manual Mailgun setup')
      // Continue with domain creation even if Mailgun fails
    }
    
    // Upsert domain in database with proper user_id
    let domain
    try {
      console.log('🎯 Upserting domain in database...')
      
      // First try to find existing domain for this user
      const { data: existingDomain, error: fetchError } = await supabase
        .from('domains')
        .select('id, domain_name, verification_status, mailgun_webhooks')
        .eq('user_id', ownerUserId)
        .eq('domain_name', domain_name.toLowerCase())
        .maybeSingle()

      if (fetchError) {
        console.error('❌ Error fetching existing domain:', fetchError)
        throw fetchError
      }

      if (existingDomain) {
        console.log('🔄 Using existing domain:', existingDomain.id)
        domain = existingDomain
      } else {
        // Create new domain record with proper user_id
        console.log('✨ Creating new domain in database...')
        const { data: newDomain, error: createError } = await supabase
          .from('domains')
          .insert({
            user_id: ownerUserId,
            domain_name: domain_name.toLowerCase(),
            verification_token: verificationToken,
            verification_status: 'pending',
            mailgun_webhooks: {}
          })
          .select('id, domain_name, verification_status, mailgun_webhooks')
          .single()

        if (createError) {
          console.error('❌ Failed to create domain in database:', createError)
          throw createError
        }
        
        domain = newDomain
        console.log('✅ Domain created in database with ID:', domain.id)
      }
    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError)
      return NextResponse.json(
        { error: 'Failed to create domain record', details: dbError.message },
        { status: 500 }
      )
    }

    // Return setup instructions (ImprovMX-style)
    return NextResponse.json({
      success: true,
      domain: {
        id: domain.id,
        domain_name: domain.domain_name,
        forward_to_email: forward_to_email,
        verification_status: domain.verification_status
      },
      mailgun: {
        configured: !!mailgunResult,
        status: mailgunResult ? 'added' : 'manual_setup_required',
        message: mailgunResult 
          ? 'Domain automatically added to Mailgun' 
          : 'Domain needs to be manually added to Mailgun account'
      },
      dns_instructions: {
        mx_records: [
          {
            type: 'MX',
            host: '@',
            priority: 10,
            value: 'mxa.mailgun.org.'
          },
          {
            type: 'MX', 
            host: '@',
            priority: 10,
            value: 'mxb.mailgun.org.'
          }
        ],
        spf_record: {
          type: 'TXT',
          host: '@',
          value: 'v=spf1 include:mailgun.org ~all'
        },
        verification_record: {
          type: 'TXT',
          host: '_domails-verify',
          value: verificationToken
        }
      },
      message: mailgunResult
        ? `Domain ${domain_name} has been automatically configured in Mailgun! All emails sent to *@${domain_name} will be forwarded to ${forward_to_email}. Please add the DNS records to complete setup.`
        : `All emails sent to *@${domain_name} will be forwarded to ${forward_to_email}. Please add the DNS records and manually configure the domain in Mailgun to complete setup.`
    }, { status: 200 })

  } catch (error) {
    console.error('Domain setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/domains/setup-forwarding
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}