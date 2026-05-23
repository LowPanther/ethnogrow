'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { QuestionnaireBuilder } from '@/components/builder/QuestionnaireBuilder'
import { QuestionGenerator } from '@/components/QuestionGenerator'
import { Project, Question } from '@/types'
import { Wand2, PenLine } from 'lucide-react'
import { clsx } from 'clsx'

type Mode = 'choose' | 'generate' | 'build'

export default function NewProjectPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('choose')
  const [pendingQuestion, setPendingQuestion] = useState<Question | null>(null)
  const [generatedProject, setGeneratedProject] = useState<Partial<Project> | null>(null)

  function handleSaved(project: Project) {
    router.push(`/dashboard/projects/${project.id}`)
  }

  function handleGeneratorAccept(title: string, description: string, questions: Question[]) {
    // Load them into the builder one by one via pendingQuestion
    // We set the project defaults and switch to build mode
    setGeneratedProject({ title, description, questions })
    setMode('build')
  }

  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <h1 className="font-display font-semibold text-ink text-2xl mb-2">
              Start a new project
            </h1>
            <p className="text-sm text-ink-muted">
              How would you like to build your questionnaire?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('generate')}
              className={clsx(
                'card p-6 text-left transition-all duration-150',
                'hover:shadow-lifted hover:-translate-y-0.5 group'
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-sage-pale flex items-center justify-center mb-4 group-hover:bg-sage-DEFAULT/20 transition-colors">
                <Wand2 size={18} className="text-sage-DEFAULT" />
              </div>
              <h3 className="font-medium text-ink text-sm mb-1">Generate with AI</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Tell us what you want to find out and we'll design the questions for you
              </p>
            </button>

            <button
              onClick={() => setMode('build')}
              className={clsx(
                'card p-6 text-left transition-all duration-150',
                'hover:shadow-lifted hover:-translate-y-0.5 group'
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-paper-warm flex items-center justify-center mb-4 group-hover:bg-paper-mid transition-colors">
                <PenLine size={18} className="text-ink-muted" />
              </div>
              <h3 className="font-medium text-ink text-sm mb-1">Build from scratch</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Start with a blank questionnaire and add your own questions
              </p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'generate') {
    return (
      <QuestionGenerator
        onAccept={handleGeneratorAccept}
        onDismiss={() => setMode('choose')}
      />
    )
  }

  return (
    <QuestionnaireBuilder
      initialProject={generatedProject || undefined}
      onSaved={handleSaved}
    />
  )
}
