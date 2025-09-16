import { NextRequest, NextResponse } from 'next/server'
import ForwardingConfigFileManager from '@/lib/forwarding-config-file'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    
    if (domain) {
      // Get specific domain forwarding config
      const config = await ForwardingConfigFileManager.getConfig(domain)
      const isEnabled = await ForwardingConfigFileManager.isForwardingEnabled(domain)
      const forwardingEmail = await ForwardingConfigFileManager.getForwardingEmail(domain)
      
      return NextResponse.json({
        domain,
        config,
        isEnabled,
        forwardingEmail
      })
    } else {
      // List all forwarding configs
      const allConfigs = await ForwardingConfigFileManager.listConfigs()
      
      return NextResponse.json({
        message: 'All forwarding configurations',
        configs: allConfigs,
        total: allConfigs.length
      })
    }
    
  } catch (error) {
    console.error('Test forwarding error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter required' },
        { status: 400 }
      )
    }
    
    const removed = await ForwardingConfigFileManager.removeConfig(domain)
    
    return NextResponse.json({
      success: true,
      domain,
      removed
    })
    
  } catch (error) {
    console.error('Delete forwarding config error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}