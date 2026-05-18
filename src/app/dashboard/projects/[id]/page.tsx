import { createServerSideClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Project } from '@/types'
import ProjectDetailClient from './ProjectDetailClient'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props) {
  const supabase = createServerSideClient()
  const { data } = await supabase.from('projects').select('title').eq('id', params.id).single()
  return { title: data?.title || 'Project' }
}

export default async function ProjectPage({ params }: Props) {
  const supabase = createServerSideClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !project) notFound()

  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('project_id', params.id)
    .order('submitted_at', { ascending: false })

  const { data: existingReport } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('project_id', params.id)
    .single()

  const { data: existingSuggestions } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('project_id', params.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()
  const { data: usage } = await supabase
    .from('researcher_usage')
    .select('*')
    .eq('researcher_id', user!.id)
    .single()

  return (
    <ProjectDetailClient
      project={project as Project}
      responses={responses || []}
      existingReport={existingReport || null}
      existingSuggestions={existingSuggestions || []}
      usage={usage || { responses_analysed: 0, response_cap: 50, plan: 'free' }}
    />
  )
}
