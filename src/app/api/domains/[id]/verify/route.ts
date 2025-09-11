import { NextRequest, NextResponse } from 'next/server'
import { DomainVerification } from '@do-mails/domain-verification'
import {
  extractAuthToken,
  verifyAuth,
  createUserClient,
} from '@/lib/supabase/server'

// Initialize domain verification service
const domainVerifier = new DomainVerification({
  defaultTimeout: 10000,
  defaultRetries: 3,
  recordPrefix: '_domails-verify',
  blockedDomains: [
    'localhost',
    'example.com',
    'example.org',
    'example.net',
    'test.com',
    'invalid',
  ],
  cacheTimeout: 300000, // 5 minutes
})

/**
 * POST /api/domains/[id]/verify
 * Verify domain ownership using DNS TXT record
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

    // Create user-context client (respects RLS)
    const supabase = createUserClient(token)

    const domainId = params.id

    // Validate domain ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(domainId)) {
      return NextResponse.json(
        { error: 'Invalid domain ID format' },
        { status: 400 }
      )
    }

    // Get domain record and verify ownership
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id) // Ensure user owns this domain
      .single()

    if (domainError) {
      if (domainError.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json(
          { error: 'Domain not found or access denied' },
          { status: 404 }
        )
      }

      console.error('Database error fetching domain:', domainError)
      return NextResponse.json(
        { error: 'Failed to fetch domain' },
        { status: 500 }
      )
    }

    // Check if domain is already verified
    if (domain.verification_status === 'verified') {
      return NextResponse.json(
        {
          success: true,
          message: 'Domain is already verified',
          domain: {
            id: domain.id,
            domain_name: domain.domain_name,
            verification_status: domain.verification_status,
            verified_at: domain.verified_at,
          },
        },
        { status: 200 }
      )
    }

    // Perform DNS verification
    try {
      const verificationResult = await domainVerifier.verifyDomain(
        domain.domain_name,
        domain.verification_token
      )

      if (verificationResult.verified) {
        // Update domain status to verified
        const { data: updatedDomain, error: updateError } = await supabase
          .from('domains')
          .update({
            verification_status: 'verified',
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', domainId)
          .select()
          .single()

        if (updateError) {
          console.error('Database error updating domain:', updateError)
          return NextResponse.json(
            { error: 'Failed to update domain verification status' },
            { status: 500 }
          )
        }

        return NextResponse.json(
          {
            success: true,
            message: 'Domain verified successfully',
            domain: {
              id: updatedDomain.id,
              domain_name: updatedDomain.domain_name,
              verification_status: updatedDomain.verification_status,
              verified_at: updatedDomain.verified_at,
            },
            verification_details: {
              record_name: verificationResult.recordName,
              verification_time: verificationResult.verificationTime,
              dns_records_found: verificationResult.dnsRecords,
            },
          },
          {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          }
        )
      } else {
        // Verification failed - update status to failed
        const { error: updateError } = await supabase
          .from('domains')
          .update({
            verification_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', domainId)

        if (updateError) {
          console.error('Database error updating domain status:', updateError)
        }

        return NextResponse.json(
          {
            success: false,
            message: 'Domain verification failed',
            error: verificationResult.error,
            verification_details: {
              record_name: verificationResult.recordName,
              expected_token: domain.verification_token,
              dns_records_found: verificationResult.dnsRecords,
              instructions: domainVerifier.getVerificationInstructions(
                domain.domain_name,
                domain.verification_token
              ),
            },
          },
          {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          }
        )
      }
    } catch (verificationError: any) {
      console.error('Domain verification error:', verificationError)

      // Update domain status to failed
      const { error: updateError } = await supabase
        .from('domains')
        .update({
          verification_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId)

      if (updateError) {
        console.error('Database error updating domain status:', updateError)
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Domain verification failed due to DNS error',
          error: verificationError.message,
          verification_details: {
            record_name: `_domails-verify.${domain.domain_name}`,
            expected_token: domain.verification_token,
            instructions: domainVerifier.getVerificationInstructions(
              domain.domain_name,
              domain.verification_token
            ),
          },
        },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/domains/[id]/verify
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
