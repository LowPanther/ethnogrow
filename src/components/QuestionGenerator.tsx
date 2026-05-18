'use client'

import { useState } from 'react'
import { Question, MultipleChoiceQuestion, ScaleQuestion, OpenTextQuestion, YesNoQuestion } from '@/types'
import { getQuestionTypeMeta } from '@/lib/questions'
import { clsx } from 'clsx'
import { Sparkles, ArrowRight, RefreshCw, AlertCircle, Check, ChevronDown, ChevronUp, Wand2 } from 'lucide-react'

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
      // Select all by default
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

  // ── Brief form ─────────────────────────────────────────────

  if (step === 'brief') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 size={16} className="text-sage-DEFAULT" />
            <h1 className="font-display font-semibold text-ink text-2xl">Generate questions with AI</h1>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            Tell us what you want to find out and we'll design a set of questions to help you get there.
            You can review, edit, and pick the ones you want before they go into your questionnaire.
          </p>
        </div>

        <div className="card p-6 space-y-5">
          {/* Topic */}
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

          {/* Goal */}
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

          {/* Audience */}
          <div>
            <label className="label">Who are you asking? <span className="text-ink-faint font-normal normal-case">(optional)</span></label>
            <input
              type="text"
              value={audience}
              onChange={e => setAudience(e.target.value)}
              className="input"
              placeholder="e.g. Contractors and tradespeople aged 25–50 in urban areas"
            />
          </div>

          {/* Context */}
          <div>
            <label className="label">Any other context? <span className="text-ink-faint font-normal normal-case">(optional)</span></label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              className="textarea"
              rows={2}
              placeholder="e.g. This is for a product we're building. We want to understand pain points before we design features."
            />
          </div>

          {/* Question count */}
          <div>
            <label className="label">How many questions?</label>
            <div className="flex items-center gap-2">
              {[5, 8, 10, 12].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded border transition-colors',
                    questionCount === n
                      ? 'border-ink bg-ink text-[#FAFAF8]'
                      : 'border-paper-border text-ink-muted hover:border-ink/30'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-faint mt-1.5">We recommend 8 for a good balance of depth and completion rate</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
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
                <><RefreshCw size={14} className="animate-spin" /> Generating questions...</>
              ) : (
                <><Sparkles size={14} /> Generate questions</>
              )}
            </button>
          </div>
        </div>

        {/* Cost note */}
        <p className="text-xs text-ink-faint text-center mt-4 leading-relaxed">
          This feature uses AI to generate questions. Each generation uses a small amount of your API allowance.
        </p>
      </div>
    )
  }

  // ── Review step ────────────────────────────────────────────

  if (!generated) return null

  const selectedCount = selectedIndices.size

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-sage-DEFAULT" />
          <span className="text-xs font-medium text-sage-DEFAULT uppercase tracking-wide">Questions generated</span>
        </div>
        <h1 className="font-display font-semibold text-ink text-xl mb-1">{generated.title}</h1>
        <p className="text-sm text-ink-muted leading-relaxed">{generated.description}</p>
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-3 p-4 bg-sage-pale rounded-lg mb-6">
        <Sparkles size={13} className="text-sage-DEFAULT flex-shrink-0 mt-0.5" />
        <p className="text-xs text-ink-soft leading-relaxed">
          Review each question below. Deselect any you don't want. Tap "Why this question?" to see the reasoning.
          Hit <strong>Add to questionnaire</strong> when you're ready — you can edit them in the builder afterwards.
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-2 mb-6">
        {generated.questions.map((q, i) => {
          const meta = getQuestionTypeMeta(q.type)
          const isSelected = selectedIndices.has(i)
          const isExpanded = expandedRationale.has(i)

          return (
            <div
              key={i}
              className={clsx(
                'card overflow-hidden transition-all duration-150',
                !isSelected && 'opacity-50'
              )}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(i)}
                  className={clsx(
                    'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors',
                    isSelected ? 'bg-ink border-ink' : 'border-paper-border'
                  )}
                >
                  {isSelected && <Check size={11} className="text-[#FAFAF8]" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className={clsx('type-badge flex-shrink-0', meta.bgColor, meta.color)}>
                      {meta.icon} {meta.label}
                    </span>
                    {q.config?.max && (
                      <span className="text-xs text-ink-faint font-mono mt-0.5">1–{q.config.max}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink leading-snug">{q.text}</p>

                  {/* Options preview for MC */}
                  {q.type === 'multiple_choice' && q.config?.options && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.config.options.slice(0, 4).map((opt: string, j: number) => (
                        <span key={j} className="text-xs px-2 py-0.5 bg-paper-warm rounded border border-paper-border text-ink-muted">
                          {opt}
                        </span>
                      ))}
                      {q.config.options.length > 4 && (
                        <span className="text-xs text-ink-faint">+{q.config.options.length - 4} more</span>
                      )}
                    </div>
                  )}

                  {/* Scale labels */}
                  {q.type === 'scale' && q.config?.min_label && (
                    <p className="text-xs text-ink-faint mt-1">
                      {q.config.min_label} → {q.config.max_label}
                    </p>
                  )}

                  {/* Rationale toggle */}
                  <button
                    onClick={() => toggleRationale(i)}
                    className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink-muted mt-2 transition-colors"
                  >
                    Why this question?
                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>

                  {isExpanded && (
                    <p className="text-xs text-ink-muted mt-1.5 leading-relaxed border-t border-paper-border pt-2 animate-slide-down">
                      {q.rationale}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
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
  )
}

// ─── Convert generated question to proper Question type ───────────────────────

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
        placeholder: q.config?.placeholder || 'Type your answer here...',
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
