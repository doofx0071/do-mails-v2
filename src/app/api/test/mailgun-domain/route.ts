import { NextRequest, NextResponse } from 'next/server'
import { MailgunAPI } from '@/lib/mailgun/api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain') || 'kuyadoof.dev'

    console.log(`🧪 Testing Mailgun domain API for: ${domain}`)

    const mailgunAPI = new MailgunAPI()
    
    if (!mailgunAPI.isConfigured()) {
      return NextResponse.json(
        { error: 'Mailgun is not configured' },
        { status: 500 }
      )
    }

    try {
      // Get raw domain info
      console.log(`📋 Getting domain info for ${domain}...`)
      const domainInfo = await mailgunAPI.getDomain(domain)
      
      console.log(`✅ Domain info received:`, JSON.stringify(domainInfo, null, 2))

      // Extract sending DNS records
      const sendingRecords = domainInfo.domain?.sending_dns_records || []
      console.log(`📊 Found ${sendingRecords.length} sending DNS records`)

      // Look for DKIM record specifically
      const dkimRecord = sendingRecords.find(record => 
        record.record_type === 'TXT' && record.name && record.name.includes('_domainkey')
      )

      console.log(`🔍 DKIM record search result:`, dkimRecord)

      return NextResponse.json({
        success: true,
        domain,
        domainInfo,
        sendingRecords,
        dkimRecord,
        debug: {
          totalSendingRecords: sendingRecords.length,
          recordTypes: sendingRecords.map(r => r.record_type),
          recordNames: sendingRecords.map(r => r.name),
        }
      })

    } catch (error) {
      console.error(`❌ Error getting domain info:`, error)
      return NextResponse.json(
        { 
          error: 'Failed to get domain info',
          details: error instanceof Error ? error.message : 'Unknown error',
          domain
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in Mailgun domain test API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
