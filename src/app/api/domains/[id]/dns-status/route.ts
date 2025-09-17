import { NextRequest, NextResponse } from 'next/server'
import {
  createUserClient,
  extractAuthToken,
  verifyAuth,
} from '@/lib/supabase/server'
import { promises as dns } from 'dns'

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
      mxRecords = mxResults.map((mx) => `${mx.priority} ${mx.exchange}`)

      // Check if Mailgun MX records are present
      const mailgunMxFound = mxResults.some(
        (mx) =>
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
      txtRecords = txtResults.map((txt) => txt.join(''))

      // Check for SPF record
      spfRecordValid = txtRecords.some(
        (record) =>
          record.includes('v=spf1') && record.includes('include:mailgun.org')
      )
    } catch (error) {
      console.log(`No TXT records found for ${domainName}:`, error)
    }

    try {
      // Check verification record in _domails-verify subdomain
      const verificationDomain = `_domails-verify.${domainName}`
      const verificationResults = await dns.resolveTxt(verificationDomain)
      const verificationRecords = verificationResults.map((txt) => txt.join(''))

      // Check for verification token
      verificationRecordValid = verificationRecords.some((record) =>
        record.includes(verificationToken)
      )
    } catch (error) {
      console.log(
        `No verification records found for _domails-verify.${domainName}:`,
        error
      )
    }

    // Check DKIM record
    let dkimRecordValid = false
    let dkimRecords: string[] = []
    try {
      const dkimDomain = `pic._domainkey.${domainName}`
      const dkimResults = await dns.resolveTxt(dkimDomain)
      dkimRecords = dkimResults.map((txt) => txt.join(''))

      // Check for DKIM record (should contain k=rsa and p=)
      dkimRecordValid = dkimRecords.some(
        (record) => record.includes('k=rsa') && record.includes('p=')
      )
    } catch (error) {
      console.log(
        `No DKIM records found for pic._domainkey.${domainName}:`,
        error
      )
    }

    // Check tracking CNAME record (optional)
    let trackingRecordValid = false
    try {
      const trackingDomain = `email.${domainName}`
      const trackingResults = await dns.resolveCname(trackingDomain)

      // Check if CNAME points to mailgun.org
      trackingRecordValid = trackingResults.includes('mailgun.org')
    } catch (error) {
      console.log(`No tracking CNAME found for email.${domainName}:`, error)
    }

    const allRecordsValid =
      mxRecordsValid &&
      spfRecordValid &&
      verificationRecordValid &&
      dkimRecordValid

    const dnsStatus = {
      domain: domainName,
      mxRecordsValid,
      spfRecordValid,
      verificationRecordValid,
      dkimRecordValid,
      trackingRecordValid,
      allRecordsValid,
      details: {
        mxRecords,
        txtRecords,
        expectedVerificationToken: verificationToken,
        dkimRecords,
        foundVerificationToken: verificationRecordValid,
      },
    }

    // Update domain verification status if all records are valid
    if (allRecordsValid && domain.verification_status !== 'verified') {
      await supabase
        .from('domains')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
        })
        .eq('id', domainId)
    } else if (!allRecordsValid && domain.verification_status === 'verified') {
      await supabase
        .from('domains')
        .update({
          verification_status: 'failed',
          verified_at: null,
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
