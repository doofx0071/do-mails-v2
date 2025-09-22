import { NextRequest, NextResponse } from 'next/server'
import {
  extractAuthToken,
  verifyAuth,
  createUserClient,
} from '@/lib/supabase/server'

/**
 * POST /api/emails/threads/bulk-update
 * Body: { thread_ids: string[], action: 'archive' | 'unarchive' | 'junk' | 'unjunk' | 'trash' | 'untrash' }
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractAuthToken(request)
    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let user
    try {
      user = await verifyAuth(token)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createUserClient(token)

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const threadIds: string[] = Array.isArray(body.thread_ids)
      ? body.thread_ids
      : []
    const action = body.action as
      | 'archive'
      | 'unarchive'
      | 'junk'
      | 'unjunk'
      | 'trash'
      | 'untrash'

    if (
      threadIds.length === 0 ||
      !['archive', 'unarchive', 'junk', 'unjunk', 'trash', 'untrash'].includes(
        action
      )
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Fetch threads the user owns (alias-based or domain-based) and limited to provided IDs
    const { data: threads, error: fetchError } = await supabase
      .from('email_threads')
      .select(
        `
        id,
        labels,
        is_archived,
        email_aliases(domains(user_id)),
        domains(user_id)
      `
      )
      .in('id', threadIds)

    if (fetchError) {
      console.error('Fetch threads error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch threads' },
        { status: 500 }
      )
    }

    // Filter to those owned by this user (belt and suspenders; RLS should already ensure)
    const owned = (threads || []).filter((t: any) => {
      const aliasUser = t.email_aliases?.domains?.user_id
      const domainUser = t.domains?.user_id
      return aliasUser === user.id || domainUser === user.id
    })

    // Prepare updates
    const updates = owned.map(async (t: any) => {
      const labels: string[] = Array.isArray(t.labels) ? [...t.labels] : []
      const update: any = { updated_at: new Date().toISOString() }

      if (action === 'archive') update.is_archived = true
      if (action === 'unarchive') update.is_archived = false
      if (action === 'junk' && !labels.includes('junk')) labels.push('junk')
      if (action === 'unjunk') {
        const idx = labels.indexOf('junk')
        if (idx >= 0) labels.splice(idx, 1)
      }
      if (action === 'trash' && !labels.includes('trash')) labels.push('trash')
      if (action === 'untrash') {
        const idx = labels.indexOf('trash')
        if (idx >= 0) labels.splice(idx, 1)
      }
      update.labels = labels

      const { error } = await supabase
        .from('email_threads')
        .update(update)
        .eq('id', t.id)
      if (error) {
        console.error('Update thread error:', t.id, error)
      }
    })

    await Promise.allSettled(updates)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e) {
    console.error('Bulk update error:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
