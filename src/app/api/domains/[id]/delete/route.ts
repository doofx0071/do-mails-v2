import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import ForwardingConfigFileManager from '@/lib/forwarding-config-file'
import MailgunAPI from '@/lib/mailgun/api'

/**
 * DELETE /api/domains/[id]/delete
 * Delete a domain and its associated forwarding configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🗑️ Deleting domain with ID:', params.id)

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

      // Delete from forwarding config
      const deleted = await ForwardingConfigFileManager.removeConfig(config.domain)
      
      // Also try to delete from Mailgun
      let mailgunDeleted = false
      try {
        const mailgunAPI = new MailgunAPI()
        if (mailgunAPI.isConfigured()) {
          await mailgunAPI.deleteDomain(config.domain)
          mailgunDeleted = true
          console.log('✅ Domain deleted from Mailgun:', config.domain)
        }
      } catch (mailgunError) {
        console.warn('⚠️ Failed to delete domain from Mailgun:', mailgunError)
      }
      
      if (deleted) {
        console.log('✅ Forwarding config deleted for:', config.domain)
        return NextResponse.json({
          success: true,
          message: `Domain ${config.domain} deleted successfully`,
          deleted_domain: config.domain,
          mailgun_deleted: mailgunDeleted
        })
      } else {
        return NextResponse.json(
          { error: 'Failed to delete domain configuration' },
          { status: 500 }
        )
      }
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

    console.log(`🗑️ Deleting domain: ${domain.domain_name}`)

    // Delete associated aliases first (if any exist)
    const { error: aliasDeleteError } = await supabase
      .from('email_aliases')
      .delete()
      .eq('domain_id', params.id)

    if (aliasDeleteError) {
      console.warn('Warning: Could not delete associated aliases:', aliasDeleteError)
      // Continue with domain deletion even if alias deletion fails
    }

    // Delete domain from database
    const { error: deleteError } = await supabase
      .from('domains')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting domain:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete domain' },
        { status: 500 }
      )
    }

    // Also delete forwarding config if it exists
    await ForwardingConfigFileManager.removeConfig(domain.domain_name)
    
    // Try to delete from Mailgun as well
    let mailgunDeleted = false
    try {
      const mailgunAPI = new MailgunAPI()
      if (mailgunAPI.isConfigured()) {
        await mailgunAPI.deleteDomain(domain.domain_name)
        mailgunDeleted = true
        console.log('✅ Domain deleted from Mailgun:', domain.domain_name)
      }
    } catch (mailgunError) {
      console.warn('⚠️ Failed to delete domain from Mailgun:', mailgunError)
    }

    console.log(`✅ Domain deleted successfully: ${domain.domain_name}`)

    return NextResponse.json({
      success: true,
      message: `Domain ${domain.domain_name} deleted successfully`,
      deleted_domain: domain.domain_name,
      mailgun_deleted: mailgunDeleted
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })

  } catch (error) {
    console.error('Domain deletion error:', error)
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
 * OPTIONS /api/domains/[id]/delete
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}