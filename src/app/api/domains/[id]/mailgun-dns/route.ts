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
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
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
      // First check if domain exists in Mailgun
      console.log(`🔍 Checking if domain ${domainName} exists in Mailgun...`)

      let domainExists = false
      try {
        await mailgunAPI.getDomain(domainName)
        domainExists = true
        console.log(`✅ Domain ${domainName} exists in Mailgun`)
      } catch (error) {
        console.log(`❌ Domain ${domainName} not found in Mailgun:`, error)
        return NextResponse.json({
          success: false,
          error: 'Domain not found in Mailgun',
          message:
            'Please add the domain to Mailgun first or check if it was added correctly.',
          domain: domainName,
          verificationToken: domain.verification_token,
        })
      }

      // Get DNS records from Mailgun - use raw domain response directly
      console.log(`📋 Getting domain info for ${domainName}...`)
      const rawDomain = await mailgunAPI.getDomain(domainName)
      console.log(`🔍 Raw domain response:`, JSON.stringify(rawDomain, null, 2))

      // Extract DNS records - try both possible paths from Mailgun API
      let sendingRecords = rawDomain.domain?.sending_dns_records || []
      let receivingRecords = rawDomain.domain?.receiving_dns_records || []
      
      // Fallback: Check if records are in domainInfo (different API structure)
      if (sendingRecords.length === 0 && rawDomain.domainInfo?.sending_dns_records) {
        sendingRecords = rawDomain.domainInfo.sending_dns_records
      }
      if (receivingRecords.length === 0 && rawDomain.domainInfo?.receiving_dns_records) {
        receivingRecords = rawDomain.domainInfo.receiving_dns_records
      }
      
      // Direct access if the response structure is different
      if (sendingRecords.length === 0 && rawDomain.sending_dns_records) {
        sendingRecords = rawDomain.sending_dns_records
      }
      if (receivingRecords.length === 0 && rawDomain.receiving_dns_records) {
        receivingRecords = rawDomain.receiving_dns_records
      }

      console.log(
        `📊 Final extraction - Sending records: ${sendingRecords.length}`
      )
      console.log(
        `📊 Final extraction - Receiving records: ${receivingRecords.length}`
      )
      console.log(
        `🔍 Sending records (first 2):`,
        JSON.stringify(sendingRecords.slice(0, 2), null, 2)
      )
      
      // Debug: Log all possible paths to understand the structure
      console.log('🐛 Debug paths:')
      console.log('  rawDomain.domain?.sending_dns_records length:', rawDomain.domain?.sending_dns_records?.length || 'undefined')
      console.log('  rawDomain.domainInfo?.sending_dns_records length:', rawDomain.domainInfo?.sending_dns_records?.length || 'undefined') 
      console.log('  rawDomain.sending_dns_records length:', rawDomain.sending_dns_records?.length || 'undefined')

      const dnsRecords = {
        sending_dns_records: sendingRecords,
        receiving_dns_records: receivingRecords,
      }

      // Extract DKIM record
      let dkimRecord = null
      if (
        dnsRecords.sending_dns_records &&
        dnsRecords.sending_dns_records.length > 0
      ) {
        console.log(
          `🔍 Looking for DKIM record in ${dnsRecords.sending_dns_records.length} sending records...`
        )

        const dkimRecordData = dnsRecords.sending_dns_records.find(
          (record) =>
            record.record_type === 'TXT' && record.name.includes('_domainkey')
        )

        if (dkimRecordData) {
          dkimRecord = {
            host: dkimRecordData.name.replace(`.${domainName}`, ''),
            value: dkimRecordData.value,
          }
          console.log(`✅ Found DKIM record: ${dkimRecord.host}`)
        } else {
          console.log(`❌ No DKIM record found in sending records`)
        }
      } else {
        console.log(`❌ No sending DNS records found`)
      }

      // Extract tracking record
      let trackingRecord = null
      if (dnsRecords.sending_dns_records) {
        const trackingRecordData = dnsRecords.sending_dns_records.find(
          (record) =>
            record.record_type === 'CNAME' && record.name.startsWith('email.')
        )
        if (trackingRecordData) {
          trackingRecord = {
            host: trackingRecordData.name.replace(`.${domainName}`, ''),
            value: trackingRecordData.value,
          }
        }
      }

      console.log(`🎯 Final result for ${domainName}:`)
      console.log(`   DKIM Record:`, dkimRecord)
      console.log(`   Tracking Record:`, trackingRecord)
      console.log(`   Verification Token:`, domain.verification_token)

      return NextResponse.json({
        success: true,
        domain: domainName,
        dkimRecord,
        trackingRecord,
        verificationToken: domain.verification_token,
      })
    } catch (error) {
      console.error(
        `❌ Failed to get Mailgun DNS records for ${domainName}:`,
        error
      )
      return NextResponse.json(
        {
          error: 'Failed to get Mailgun DNS records',
          details: error instanceof Error ? error.message : 'Unknown error',
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
