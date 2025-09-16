import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import DNSVerifier from '@/lib/dns-verification'
import ForwardingConfigFileManager from '@/lib/forwarding-config-file'

/**
 * POST /api/domains/[id]/refresh-status
 * Refresh the verification status of a domain by checking DNS records
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 Refreshing domain status for ID:', params.id)

    // For authenticated routes (dashboard), use auth
    let supabase, user
    try {
      const authResult = await createAuthenticatedClient(request)
      supabase = authResult.supabase
      user = authResult.user
    } catch (authError) {
      // For non-authenticated requests, try to find domain in forwarding configs
      const allConfigs = await ForwardingConfigFileManager.listConfigs()
      const config = allConfigs.find(c => params.id.includes(c.domain) || c.domain.includes(params.id))
      
      if (!config) {
        return NextResponse.json(
          { error: 'Domain not found' },
          { status: 404 }
        )
      }

      // Verify DNS for forwarding config domain
      const dnsResult = await DNSVerifier.verifyDomainRecords(config.domain, config.verification_token)
      const statusInfo = DNSVerifier.getVerificationStatus(dnsResult)

      // Update forwarding config status
      if (dnsResult.allRecordsValid) {
        await ForwardingConfigFileManager.setVerificationStatus(config.domain, 'verified')
      }

      return NextResponse.json({
        success: true,
        domain: {
          id: params.id,
          domain_name: config.domain,
          verification_status: dnsResult.allRecordsValid ? 'verified' : 'pending'
        },
        dns_verification: dnsResult,
        status_info: statusInfo,
        message: statusInfo.message
      })
    }

    // Get domain from database (authenticated route)
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', params.id)
      .single()

    if (domainError) {
      if (domainError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Domain not found' },
          { status: 404 }
        )
      }

      console.error('Database error:', domainError)
      return NextResponse.json(
        { error: 'Failed to fetch domain' },
        { status: 500 }
      )
    }

    console.log(`🔍 Verifying DNS records for ${domain.domain_name}...`)

    // Perform DNS verification
    const dnsResult = await DNSVerifier.verifyDomainRecords(
      domain.domain_name, 
      domain.verification_token
    )
    
    const statusInfo = DNSVerifier.getVerificationStatus(dnsResult)

    // Update domain status in database based on DNS verification
    let newStatus: 'pending' | 'verified' | 'failed' = 'pending'
    
    if (dnsResult.allRecordsValid) {
      newStatus = 'verified'
    } else if (dnsResult.mxRecordsValid || dnsResult.spfRecordValid || dnsResult.verificationRecordValid) {
      newStatus = 'pending' // Some records found, keep trying
    } else {
      newStatus = 'pending' // No records found yet, keep as pending
    }

    // Update domain in database
    const { data: updatedDomain, error: updateError } = await supabase
      .from('domains')
      .update({
        verification_status: newStatus,
        verified_at: newStatus === 'verified' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating domain status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update domain status' },
        { status: 500 }
      )
    }

    // Also update forwarding config if it exists
    const forwardingConfig = await ForwardingConfigFileManager.getConfig(domain.domain_name)
    if (forwardingConfig && dnsResult.allRecordsValid) {
      await ForwardingConfigFileManager.setVerificationStatus(domain.domain_name, 'verified')
    }

    console.log(`✅ Domain status updated: ${domain.domain_name} -> ${newStatus}`)

    return NextResponse.json({
      success: true,
      domain: updatedDomain,
      dns_verification: dnsResult,
      status_info: statusInfo,
      message: statusInfo.message
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })

  } catch (error) {
    console.error('DNS refresh error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/domains/[id]/refresh-status
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}