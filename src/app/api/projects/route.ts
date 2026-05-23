import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { project_id, status, allowed_emails } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    const supabase = createServerSideClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Build update payload — only include fields that were provided
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'active', 'closed', 'archived']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = status
    }

    if (allowed_emails !== undefined) {
      // allowed_emails should be an array of strings or null to clear
      updates.allowed_emails = Array.isArray(allowed_emails) && allowed_emails.length > 0
        ? allowed_emails
        : null
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', project_id)
      .eq('researcher_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ project: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { project_id } = await req.json()
    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    const supabase = createServerSideClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', project_id)
      .eq('researcher_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}