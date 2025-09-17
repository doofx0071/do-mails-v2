import { NextRequest, NextResponse } from 'next/server'
import {
  createUserClient,
  extractAuthToken,
  verifyAuth,
} from '@/lib/supabase/server'
import { MailgunAPI } from '@/lib/mailgun/api'

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

    console.log(`📋 Getting Mailgun DNS records for domain: ${domainName}`)

    // Initialize Mailgun API
    const mailgunAPI = new MailgunAPI()
    
    if (!mailgunAPI.isConfigured()) {
      return NextResponse.json(
        { error: 'Mailgun is not configured' },
        { status: 500 }
      )
    }

    try {
      // Get DNS records from Mailgun
      const dnsRecords = await mailgunAPI.getDomainDNSRecords(domainName)
      
      // Extract DKIM record
      let dkimRecord = null
      if (dnsRecords.sending_dns_records) {
        const dkimRecordData = dnsRecords.sending_dns_records.find(record => 
          record.record_type === 'TXT' && record.name.includes('_domainkey')
        )
        if (dkimRecordData) {
          dkimRecord = {
            host: dkimRecordData.name.replace(`.${domainName}`, ''),
            value: dkimRecordData.value
          }
        }
      }

      // Extract tracking record
      let trackingRecord = null
      if (dnsRecords.sending_dns_records) {
        const trackingRecordData = dnsRecords.sending_dns_records.find(record => 
          record.record_type === 'CNAME' && record.name.startsWith('email.')
        )
        if (trackingRecordData) {
          trackingRecord = {
            host: trackingRecordData.name.replace(`.${domainName}`, ''),
            value: trackingRecordData.value
          }
        }
      }

      return NextResponse.json({
        success: true,
        domain: domainName,
        dkimRecord,
        trackingRecord,
        verificationToken: domain.verification_token
      })

    } catch (error) {
      console.error(`❌ Failed to get Mailgun DNS records for ${domainName}:`, error)
      return NextResponse.json(
        { 
          error: 'Failed to get Mailgun DNS records',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in Mailgun DNS records API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
