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
  const supabase = createServerSideClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, title, description, questions, status, allowed_emails')
    .eq('participant_token', params.token)
    .single()

  if (error || !project) notFound()

  if (project.status !== 'active') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-8 text-center">
        <p className="text-2xl text-ink-faint mb-5">◎</p>
        <h1
          className="font-display font-light text-ink mb-2"
          style={{ fontSize: '28px', letterSpacing: '-0.02em', lineHeight: '1.2' }}
        >
          This questionnaire is closed
        </h1>
        <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
          The researcher has closed this study. Thank you for your interest.
        </p>
        <p className="text-xs text-ink-faint mt-8">Ethnogrow</p>
      </div>
    )
  }

  const hasAllowlist = Array.isArray(project.allowed_emails) && project.allowed_emails.length > 0

  return (
    <ParticipantView
      projectId={project.id}
      title={project.title}
      description={project.description}
      questions={project.questions as Question[]}
      hasAllowlist={hasAllowlist}
    />
  )
}
