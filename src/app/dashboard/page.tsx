import { createServerSideClient } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'

export const metadata = { title: 'Dashboard — Ethnogrow' }

export default async function DashboardPage() {
  const supabase = createServerSideClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, responses(count)')
    .order('updated_at', { ascending: false })

  let { data: usage } = await supabase
    .from('researcher_usage')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  if (!usage) {
    const { data: newUsage } = await supabase
      .from('researcher_usage')
      .insert({ user_id: user!.id })
      .select()
      .single()
    usage = newUsage
  }

  return (
    <DashboardClient
      initialProjects={(projects || []) as any}
      usage={usage}
    />
  )
}
