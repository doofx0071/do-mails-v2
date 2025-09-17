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

      // Get DNS records from Mailgun
      console.log(`📋 Getting DNS records for ${domainName}...`)

      // Get the raw domain response first to see the structure
      const rawDomain = await mailgunAPI.getDomain(domainName)
      console.log(`🔍 Raw domain response:`, JSON.stringify(rawDomain, null, 2))

      const dnsRecords = await mailgunAPI.getDomainDNSRecords(domainName)
      console.log(
        `📊 DNS records response:`,
        JSON.stringify(dnsRecords, null, 2)
      )

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
