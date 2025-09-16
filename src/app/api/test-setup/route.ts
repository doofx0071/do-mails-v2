import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Test Setup API Called ===')
    
    const supabase = createServiceClient()
    console.log('✅ Supabase client created')
    
    const body = await request.json()
    console.log('📦 Request body:', body)
    
    const { domain_name, forward_to_email } = body
    
    if (!domain_name || !forward_to_email) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Domain name and forwarding email are required' },
        { status: 400 }
      )
    }
    
    console.log('✅ Fields validated')
    
    // Test database connection
    try {
      const { data: testResult } = await supabase
        .from('domains')
        .select('count(*)')
        .limit(1)
      
      console.log('✅ Database connection test:', testResult)
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed', details: String(dbError) },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test setup API working',
      received: { domain_name, forward_to_email }
    })
    
  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Test setup API endpoint is active'
  })
}