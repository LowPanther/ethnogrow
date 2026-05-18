import { createServerSideClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ParticipantView } from '@/components/ParticipantView'
import { Question } from '@/types'

interface Props {
  params: { token: string }
}

export async function generateMetadata({ params }: Props) {
  const supabase = createServerSideClient()
  const { data } = await supabase
    .from('projects')
    .select('title')
    .eq('participant_token', params.token)
    .eq('status', 'active')
    .single()
  return { title: data?.title || 'Research questionnaire' }
}

export default async function ParticipantPage({ params }: Props) {
  // Use service role for public participant access
  const supabase = createServerSideClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, title, description, questions, status')
    .eq('participant_token', params.token)
    .single()

  if (error || !project) notFound()
  if (project.status !== 'active') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 bg-paper-warm rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
          ◎
        </div>
        <h1 className="font-display font-semibold text-ink text-xl mb-2">
          This questionnaire is closed
        </h1>
        <p className="text-sm text-ink-muted max-w-xs">
          The researcher has closed this study. Thank you for your interest.
        </p>
      </div>
    )
  }

  return (
    <ParticipantView
      projectId={project.id}
      title={project.title}
      description={project.description}
      questions={project.questions as Question[]}
    />
  )
}
