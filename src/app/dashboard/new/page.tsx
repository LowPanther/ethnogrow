'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { QuestionnaireBuilder } from '@/components/builder/QuestionnaireBuilder'
import { QuestionGenerator } from '@/components/QuestionGenerator'
import { Project, Question } from '@/types'
import { Wand2, PenLine, ArrowLeft } from 'lucide-react'

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

  function handleBack() {
    if (mode === 'choose') {
      router.push('/dashboard')
    } else {
      setMode('choose')
      setGeneratedProject(null)
    }
  }

  const backLabel = mode === 'choose' ? 'Dashboard' : 'New project'

  // Builder has its own full-page layout with sub-header — render it standalone
  if (mode === 'build') {
    return (
      <QuestionnaireBuilder
        initialProject={generatedProject || undefined}
        onSaved={handleSaved}
        onBack={handleBack}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">

      {/* Page-level back button */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors mb-10 md:mb-12"
      >
        <ArrowLeft size={14} />
        {backLabel}
      </button>

      {mode === 'choose' && (
        <div className="max-w-lg">
          <h1
            className="font-display font-light text-ink mb-2"
            style={{ fontSize: 'clamp(24px, 5vw, 32px)', letterSpacing: '-0.02em', lineHeight: '1.2' }}
          >
            New project
          </h1>
          <p className="text-sm text-ink-muted mb-8 md:mb-10">
            How would you like to build your questionnaire?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMode('generate')}
              className="tint-card p-6 md:p-8 text-left"
            >
              <div
                className="w-9 h-9 flex items-center justify-center mb-4 md:mb-5"
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
              className="tint-card p-6 md:p-8 text-left"
            >
              <div
                className="w-9 h-9 flex items-center justify-center mb-4 md:mb-5"
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
      )}

      {mode === 'generate' && (
        <QuestionGenerator
          onAccept={handleGeneratorAccept}
        />
      )}

    </div>
  )
}
