import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { promises as dns } from 'dns'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthenticatedClient(request)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const domainId = params.id

    // Fetch domain details
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    const domainName = domain.domain_name
    const verificationToken = domain.verification_token

    // Check DNS records
    let mxRecords: string[] = []
    let txtRecords: string[] = []
    let mxRecordsValid = false
    let spfRecordValid = false
    let verificationRecordValid = false

    try {
      // Check MX records
      const mxResults = await dns.resolveMx(domainName)
      mxRecords = mxResults.map(mx => `${mx.priority} ${mx.exchange}`)
      
      // Check if Mailgun MX records are present
      const mailgunMxFound = mxResults.some(mx => 
        mx.exchange.includes('mailgun.org') || 
        mx.exchange.includes('mxa.mailgun.org') ||
        mx.exchange.includes('mxb.mailgun.org')
      )
      mxRecordsValid = mailgunMxFound

    } catch (error) {
      console.log(`No MX records found for ${domainName}:`, error)
    }

    try {
      // Check TXT records
      const txtResults = await dns.resolveTxt(domainName)
      txtRecords = txtResults.map(txt => txt.join(''))
      
      // Check for SPF record
      spfRecordValid = txtRecords.some(record => 
        record.includes('v=spf1') && record.includes('include:mailgun.org')
      )
      
      // Check for verification record
      verificationRecordValid = txtRecords.some(record => 
        record.includes(verificationToken)
      )

    } catch (error) {
      console.log(`No TXT records found for ${domainName}:`, error)
    }

    const allRecordsValid = mxRecordsValid && spfRecordValid && verificationRecordValid

    const dnsStatus = {
      domain: domainName,
      mxRecordsValid,
      spfRecordValid,
      verificationRecordValid,
      allRecordsValid,
      details: {
        mxRecords,
        txtRecords,
        expectedVerificationToken: verificationToken,
        foundVerificationToken: verificationRecordValid
      }
    }

    // Update domain verification status if all records are valid
    if (allRecordsValid && domain.verification_status !== 'verified') {
      await supabase
        .from('domains')
        .update({ 
          verification_status: 'verified',
          verified_at: new Date().toISOString()
        })
        .eq('id', domainId)
    } else if (!allRecordsValid && domain.verification_status === 'verified') {
      await supabase
        .from('domains')
        .update({ 
          verification_status: 'failed',
          verified_at: null
        })
        .eq('id', domainId)
    }

    return NextResponse.json(dnsStatus)

  } catch (error) {
    console.error('Error checking DNS status:', error)
    return NextResponse.json(
      { error: 'Failed to check DNS status' },
      { status: 500 }
    )
  }
}
