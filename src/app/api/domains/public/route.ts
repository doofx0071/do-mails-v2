import { NextRequest, NextResponse } from 'next/server'
import ForwardingConfigFileManager from '@/lib/forwarding-config-file'

/**
 * GET /api/domains/public
 * List domains from forwarding config without requiring authentication
 * This is used for ImprovMX-style domains that don't have user association
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 Loading public forwarding config domains...')
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    // Validate status parameter if provided
    if (status && !['pending', 'verified', 'failed'].includes(status)) {
      return NextResponse.json(
        {
          error: 'Invalid status parameter. Must be: pending, verified, or failed',
        },
        { status: 400 }
      )
    }

    // Load domains from forwarding config file
    const configs = await ForwardingConfigFileManager.listConfigs()
    
    // Convert forwarding configs to domain format
    let domains = configs.map(config => ({
      id: `forwarding-${config.domain}`,
      domain_name: config.domain,
      verification_status: config.status === 'verified' ? 'verified' : 'pending',
      verification_token: config.verification_token,
      created_at: config.created_at,
      updated_at: config.created_at,
      user_id: null, // These are public domains without specific user
      forward_to_email: config.forward_to, // Additional field for forwarding domains
      source: 'forwarding_config' // Mark source for identification
    }))
    
    // Apply status filter if provided
    if (status) {
      domains = domains.filter(d => d.verification_status === status)
    }

    console.log(`Found ${domains.length} public forwarding config domains`)

    return NextResponse.json(
      { domains },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    )
  } catch (error) {
    console.error('Error loading public domains:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/domains/public
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}