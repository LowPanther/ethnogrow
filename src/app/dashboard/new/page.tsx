'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { QuestionnaireBuilder } from '@/components/builder/QuestionnaireBuilder'
import { QuestionGenerator } from '@/components/QuestionGenerator'
import { Project, Question } from '@/types'
import { Wand2, PenLine } from 'lucide-react'

type Mode = 'choose' | 'generate' | 'build'

export default function NewProjectPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('choose')
  const [generatedProject, setGeneratedProject] = useState<Partial<Project> | null>(null)

  function handleSaved(project: Project) {
    router.push(`/dashboard/projects/${project.id}`)
  }

  function handleGeneratorAccept(title: string, description: string, questions: Question[]) {
    setGeneratedProject({ title, description, questions })
    setMode('build')
  }

  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-lg">

          <h1
            className="font-display font-light text-ink mb-2 text-center"
            style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.2' }}
          >
            New project
          </h1>
          <p className="text-sm text-ink-muted text-center mb-10">
            How would you like to build your questionnaire?
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('generate')}
              className="p-8 text-left border border-paper-border hover:border-ink/20 hover:bg-paper-warm transition-colors"
              style={{ borderRadius: '4px' }}
            >
              <div
                className="w-9 h-9 flex items-center justify-center mb-5"
                style={{ backgroundColor: 'rgba(8,155,247,0.1)', borderRadius: '4px' }}
              >
                <Wand2 size={17} className="text-teal" />
              </div>
              <h3
                className="font-display font-normal text-ink mb-2"
                style={{ fontSize: '16px', letterSpacing: '-0.01em' }}
              >
                Generate with AI
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Describe your study and we'll design the questions for you.
              </p>
            </button>

            <button
              onClick={() => setMode('build')}
              className="p-8 text-left border border-paper-border hover:border-ink/20 hover:bg-paper-warm transition-colors"
              style={{ borderRadius: '4px' }}
            >
              <div
                className="w-9 h-9 flex items-center justify-center mb-5"
                style={{ backgroundColor: 'rgba(15,15,15,0.06)', borderRadius: '4px' }}
              >
                <PenLine size={17} className="text-ink-muted" />
              </div>
              <h3
                className="font-display font-normal text-ink mb-2"
                style={{ fontSize: '16px', letterSpacing: '-0.01em' }}
              >
                Build from scratch
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Start with a blank questionnaire and add your own questions.
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
