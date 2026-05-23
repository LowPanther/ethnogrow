import { createServerSideClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServerSideClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = user.id

    // Delete all user data in dependency order
    // 1. AI suggestions (reference projects)
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('researcher_id', userId)

    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id)

      await supabase.from('ai_suggestions').delete().in('project_id', projectIds)
      await supabase.from('ai_reports').delete().in('project_id', projectIds)
      await supabase.from('responses').delete().in('project_id', projectIds)
      await supabase.from('projects').delete().in('id', projectIds)
    }

    // 2. Usage and profile
    await supabase.from('researcher_usage').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)

    // 3. Delete the auth user — requires service role key
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}