'use client'

import { useState } from 'react'
import { Question, MultipleChoiceQuestion, ScaleQuestion, OpenTextQuestion, YesNoQuestion } from '@/types'
import { getQuestionTypeMeta } from '@/lib/questions'
import { clsx } from 'clsx'
import { Sparkles, ArrowRight, RefreshCw, AlertCircle, Check, ChevronDown, ChevronUp } from 'lucide-react'

interface GeneratedQuestion {
  text: string
  type: 'open_text' | 'scale' | 'multiple_choice' | 'yes_no'
  required: boolean
  rationale: string
  config: any
}

interface GeneratedSet {
  title: string
  description: string
  questions: GeneratedQuestion[]
}

interface QuestionGeneratorProps {
  onAccept: (title: string, description: string, questions: Question[]) => void
  onDismiss: () => void
}

type Step = 'brief' | 'review'

export function QuestionGenerator({ onAccept, onDismiss }: QuestionGeneratorProps) {
  const [step, setStep] = useState<Step>('brief')
  const [topic, setTopic] = useState('')
  const [goal, setGoal] = useState('')
  const [audience, setAudience] = useState('')
  const [context, setContext] = useState('')
  const [questionCount, setQuestionCount] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GeneratedSet | null>(null)
  const [expandedRationale, setExpandedRationale] = useState<Set<number>>(new Set())
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  async function handleGenerate() {
    if (!topic.trim() || !goal.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, goal, audience, context, question_count: questionCount }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate questions')

      setGenerated(data)
      setSelectedIndices(new Set(data.questions.map((_: any, i: number) => i)))
      setStep('review')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleRationale(i: number) {
    setExpandedRationale(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleSelect(i: number) {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function handleAccept() {
    if (!generated) return
    const selectedQuestions = generated.questions
      .filter((_, i) => selectedIndices.has(i))
      .map((q, i) => buildQuestion(q, i))
    onAccept(generated.title, generated.description, selectedQuestions)
  }

  // ── Brief form ─────────────────────────────────────────────────────────────

  if (step === 'brief') {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-[200px_1fr] gap-12 items-start">

          <div className="sticky top-6">
            <p className="text-xs font-medium tracking-widest uppercase text-ink-faint">Generate</p>
          </div>

          <div className="max-w-xl">
            <h1
              className="font-display font-light text-ink mb-2"
              style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.2' }}
            >
              Generate with AI
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed mb-10">
              Tell us what you want to find out and we'll design a set of questions to help you get there.
              You can review and pick the ones you want before they go into your questionnaire.
            </p>

            <div className="space-y-6">
              <div>
                <label className="label">What is your study about? <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="input"
                  placeholder="e.g. How small business owners find new clients in South Africa"
                />
              </div>

              <div>
                <label className="label">What do you want to find out? <span className="text-red-400">*</span></label>
                <textarea
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  className="textarea"
                  rows={3}
                  placeholder="e.g. I want to understand what barriers prevent small business owners from using digital marketing, and what they actually need from a lead generation tool"
                />
              </div>

              <div>
                <label className="label">
                  Who are you asking?{' '}
                  <span className="text-ink-faint font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  className="input"
                  placeholder="e.g. Contractors and tradespeople aged 25–50 in urban areas"
                />
              </div>

              <div>
                <label className="label">
                  Any other context?{' '}
                  <span className="text-ink-faint font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  className="textarea"
                  rows={2}
                  placeholder="e.g. This is for a product we're building. We want to understand pain points before we design features."
                />
              </div>

              <div>
                <label className="label">How many questions?</label>
                <div className="flex items-center gap-2">
                  {[5, 8, 10, 12].map(n => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      className={clsx(
                        'px-3 py-1.5 text-sm border transition-colors',
                        questionCount === n
                          ? 'border-ink bg-ink text-white'
                          : 'border-paper-border text-ink-muted hover:border-ink/30'
                      )}
                      style={{ borderRadius: '3px' }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink-faint mt-2">
                  We recommend 8 for a good balance of depth and completion rate.
                </p>
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 px-4 py-3 text-sm text-red-700 animate-slide-down"
                  style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: '4px' }}
                >
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button onClick={onDismiss} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || !goal.trim() || loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Generating…</>
                  ) : (
                    <><Sparkles size={14} /> Generate questions</>
                  )}
                </button>
              </div>

              <p className="text-xs text-ink-faint leading-relaxed">
                Each generation uses a small amount of your monthly AI allowance.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Review step ────────────────────────────────────────────────────────────

  if (!generated) return null

  const selectedCount = selectedIndices.size

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      <div className="grid grid-cols-[200px_1fr] gap-12 items-start">

        <div className="sticky top-6">
          <p className="text-xs font-medium tracking-widest uppercase text-ink-faint mb-2">Review</p>
          <p className="text-xs text-ink-faint leading-relaxed">
            {selectedCount} of {generated.questions.length} selected
          </p>
        </div>

        <div className="max-w-xl">
          <h1
            className="font-display font-light text-ink mb-2"
            style={{ fontSize: '28px', letterSpacing: '-0.02em', lineHeight: '1.2' }}
          >
            {generated.title}
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed mb-8">
            {generated.description}
          </p>

          <p className="text-xs text-ink-faint mb-6 leading-relaxed">
            Deselect any questions you don't want. Tap "Why this question?" to see the reasoning.
            You can edit everything in the builder afterwards.
          </p>

          <div className="space-y-2 mb-8">
            {generated.questions.map((q, i) => {
              const meta = getQuestionTypeMeta(q.type)
              const isSelected = selectedIndices.has(i)
              const isExpanded = expandedRationale.has(i)

              return (
                <div
                  key={i}
                  className={clsx('overflow-hidden transition-all duration-150', !isSelected && 'opacity-40')}
                  style={{
                    backgroundColor: 'rgba(15,15,15,0.03)',
                    border: '0.5px solid rgba(15,15,15,0.08)',
                    borderRadius: '4px',
                  }}
                >
                  <div className="flex items-start gap-3 p-4">
                    <button
                      onClick={() => toggleSelect(i)}
                      className={clsx(
                        'flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5 transition-colors border-2',
                        isSelected ? 'bg-ink border-ink' : 'border-paper-border'
                      )}
                      style={{ borderRadius: '3px' }}
                    >
                      {isSelected && <Check size={11} className="text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={clsx('type-badge', meta.bgColor, meta.color)}>
                          {meta.icon} {meta.label}
                        </span>
                        {q.config?.max && (
                          <span className="text-xs text-ink-faint font-mono">1–{q.config.max}</span>
                        )}
                      </div>
                      <p
                        className="font-display font-normal text-ink leading-snug"
                        style={{ fontSize: '15px', letterSpacing: '-0.01em' }}
                      >
                        {q.text}
                      </p>

                      {q.type === 'multiple_choice' && q.config?.options && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {q.config.options.slice(0, 4).map((opt: string, j: number) => (
                            <span
                              key={j}
                              className="text-xs px-2 py-0.5 text-ink-muted"
                              style={{ background: 'rgba(15,15,15,0.05)', borderRadius: '3px' }}
                            >
                              {opt}
                            </span>
                          ))}
                          {q.config.options.length > 4 && (
                            <span className="text-xs text-ink-faint">+{q.config.options.length - 4} more</span>
                          )}
                        </div>
                      )}

                      {q.type === 'scale' && q.config?.min_label && (
                        <p className="text-xs text-ink-faint mt-1.5">
                          {q.config.min_label} → {q.config.max_label}
                        </p>
                      )}

                      <button
                        onClick={() => toggleRationale(i)}
                        className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink-muted mt-2.5 transition-colors"
                      >
                        Why this question?
                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>

                      {isExpanded && (
                        <p className="text-xs text-ink-muted mt-2 leading-relaxed border-t border-paper-border pt-2 animate-slide-down">
                          {q.rationale}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-paper-border">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('brief')} className="btn-ghost text-sm">
                ← Edit brief
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="btn-ghost text-sm"
              >
                <RefreshCw size={12} className={clsx(loading && 'animate-spin')} />
                Regenerate
              </button>
            </div>
            <button
              onClick={handleAccept}
              disabled={selectedCount === 0}
              className="btn-primary"
            >
              <Check size={14} />
              Add {selectedCount} question{selectedCount !== 1 ? 's' : ''} to questionnaire
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Convert generated question to Question type ──────────────────────────────

function buildQuestion(q: GeneratedQuestion, order: number): Question {
  const base = {
    id: crypto.randomUUID(),
    type: q.type,
    text: q.text,
    required: q.required ?? true,
    order,
  }

  switch (q.type) {
    case 'multiple_choice':
      return {
        ...base,
        type: 'multiple_choice',
        options: q.config?.options || ['Option 1', 'Option 2'],
        allow_multiple: q.config?.allow_multiple || false,
      } as MultipleChoiceQuestion

    case 'scale':
      return {
        ...base,
        type: 'scale',
        min: q.config?.min || 1,
        max: q.config?.max || 5,
        min_label: q.config?.min_label,
        max_label: q.config?.max_label,
      } as ScaleQuestion

    case 'open_text':
      return {
        ...base,
        type: 'open_text',
        placeholder: q.config?.placeholder || 'Type your answer here…',
        max_length: q.config?.max_length || 1000,
      } as OpenTextQuestion

    case 'yes_no':
      return {
        ...base,
        type: 'yes_no',
        yes_label: q.config?.yes_label || 'Yes',
        no_label: q.config?.no_label || 'No',
      } as YesNoQuestion

    default:
      return { ...base, type: 'open_text', placeholder: '' } as OpenTextQuestion
  }
}
