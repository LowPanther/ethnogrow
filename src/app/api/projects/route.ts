import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase-server'

// PATCH — archive or unarchive
export async function PATCH(req: NextRequest) {
  try {
    const { project_id, status } = await req.json()
    if (!project_id || !status) {
      return NextResponse.json({ error: 'project_id and status required' }, { status: 400 })
    }

    const validStatuses = ['draft', 'active', 'closed', 'archived']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = createServerSideClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('projects')
      .update({ status, updated_at: new Date().toISOString() })
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

// DELETE — permanent
export async function DELETE(req: NextRequest) {
  try {
    const { project_id } = await req.json()
    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    const supabase = createServerSideClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify ownership before deleting
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('researcher_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete related data first (responses, reports, suggestions)
    await supabase.from('ai_suggestions').delete().eq('project_id', project_id)
    await supabase.from('ai_reports').delete().eq('project_id', project_id)
    await supabase.from('responses').delete().eq('project_id', project_id)

    // Delete the project
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