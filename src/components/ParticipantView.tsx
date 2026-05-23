'use client'

import { useState, useEffect } from 'react'
import { Question, QuestionResponse, MultipleChoiceQuestion, ScaleQuestion, OpenTextQuestion, YesNoQuestion, NumericQuestion, NumericResponse } from '@/types'
import { createClient } from '@/lib/supabase-browser'
import { clsx } from 'clsx'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'

interface ParticipantViewProps {
  projectId: string
  title: string
  description?: string
  questions: Question[]
}

const NA_VALUE = '__NA__'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export function ParticipantView({ projectId, title, description, questions }: ParticipantViewProps) {
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [responses, setResponses] = useState<Map<string, QuestionResponse>>(new Map())
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableHeight, setAvailableHeight] = useState<number | null>(null)
  const sessionId = useState(() => generateUUID())[0]

  const total = questions.length
  const isWelcome = currentIndex === -1
  const isDone = currentIndex >= total
  const currentQuestion = questions[currentIndex]

  useEffect(() => {
    function update() {
      setAvailableHeight(window.visualViewport?.height ?? window.innerHeight)
    }
    update()
    window.visualViewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)
    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  function setResponse(questionId: string, value: QuestionResponse['value'], type: Question['type']) {
    setResponses(prev => {
      const next = new Map(prev)
      next.set(questionId, { question_id: questionId, question_type: type, value })
      return next
    })
  }

  function setNA(questionId: string, type: Question['type']) {
    setResponses(prev => {
      const next = new Map(prev)
      const existing = next.get(questionId)
      if (existing?.value === NA_VALUE) {
        next.delete(questionId)
      } else {
        next.set(questionId, { question_id: questionId, question_type: type, value: NA_VALUE })
      }
      return next
    })
  }

  function isNA(questionId: string): boolean {
    return responses.get(questionId)?.value === NA_VALUE
  }

  function canAdvance(): boolean {
    if (isWelcome) return true
    if (!currentQuestion) return false
    if (!currentQuestion.required) return true
    const resp = responses.get(currentQuestion.id)
    if (!resp) return false
    if (resp.value === NA_VALUE) return true

    if (currentQuestion.type === 'numeric') {
      const numQ = currentQuestion as NumericQuestion
      const val = resp.value as NumericResponse
      if (!val || val.number === undefined || val.number === null || isNaN(val.number)) return false
      if (numQ.show_text_field && numQ.text_required) {
        return !!(val.text && val.text.trim().length > 0)
      }
      return true
    }

    if (typeof resp.value === 'string') return resp.value.trim().length > 0
    if (Array.isArray(resp.value)) return resp.value.length > 0
    return resp.value !== undefined && resp.value !== null
  }

  function advance() {
    if (!canAdvance()) return
    setCurrentIndex(prev => prev + 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('responses').insert({
        project_id: projectId,
        session_id: sessionId,
        responses: Array.from(responses.values()),
      })
      if (error) throw error
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const heightStyle = availableHeight ? { height: `${availableHeight}px` } : {}
  const safePadding = { paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }

  // ── Submitted ──────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col items-center justify-center px-8 text-center participant-root" style={heightStyle}>
        <div className="w-12 h-12 bg-ink rounded-full flex items-center justify-center mb-6">
          <Check size={20} className="text-white" />
        </div>
        <h1
          className="font-display font-light text-ink mb-3"
          style={{ fontSize: '28px', letterSpacing: '-0.02em', lineHeight: '1.2' }}
        >
          Thank you
        </h1>
        <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
          Your responses have been submitted. Your insights help make this research meaningful.
        </p>
        <p className="text-xs text-ink-faint mt-8" style={{ letterSpacing: '-0.01em' }}>Ethnogrow</p>
      </div>
    )
  }

  // ── Welcome ────────────────────────────────────────────────────────────────

  if (isWelcome) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col participant-root" style={heightStyle}>
        <div className="flex-1 flex flex-col justify-center px-8">
          <div className="w-full max-w-md mx-auto">
            <p className="text-xs font-medium tracking-widest uppercase text-ink-faint mb-8">
              Ethnogrow
            </p>
            <h1
              className="font-display font-light text-ink mb-4 leading-tight"
              style={{ fontSize: '32px', letterSpacing: '-0.025em', lineHeight: '1.15' }}
            >
              {title}
            </h1>
            {description && (
              <p className="text-sm text-ink-muted leading-relaxed mb-6 max-w-sm">{description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-ink-faint">
              <span>{total} question{total !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>~{Math.max(1, Math.round(total * 0.75))} min</span>
              <span>·</span>
              <span>Anonymous</span>
            </div>
          </div>
        </div>
        <div className="px-8 py-5" style={safePadding}>
          <div className="max-w-md mx-auto">
            <button
              onClick={advance}
              className="btn-primary w-full justify-center py-4 text-base"
              style={{ borderRadius: '6px' }}
            >
              Begin <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Review / submit ────────────────────────────────────────────────────────

  if (isDone) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col participant-root" style={heightStyle}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-12 h-12 bg-ink rounded-full flex items-center justify-center mb-6">
            <Check size={20} className="text-white" />
          </div>
          <h2
            className="font-display font-light text-ink mb-3"
            style={{ fontSize: '28px', letterSpacing: '-0.02em' }}
          >
            All done
          </h2>
          <p className="text-sm text-ink-muted mb-6 max-w-xs mx-auto leading-relaxed">
            You've answered all {total} question{total !== 1 ? 's' : ''}. Ready to submit?
          </p>
          {error && (
            <p className="text-xs text-lobster-dark bg-lobster-pale border border-lobster/20 rounded px-3 py-2 mb-4 max-w-xs">{error}</p>
          )}
          <button onClick={() => setCurrentIndex(total - 1)} className="btn-ghost text-sm">
            Review answers
          </button>
        </div>
        <div className="px-8 py-5" style={safePadding}>
          <div className="max-w-md mx-auto">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary w-full justify-center py-4 text-base"
              style={{ borderRadius: '6px' }}
            >
              {submitting ? 'Submitting…' : <>Submit responses <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Question view ──────────────────────────────────────────────────────────

  const response = responses.get(currentQuestion.id)
  const naActive = isNA(currentQuestion.id)
  const ready = canAdvance()
  const showNA = (currentQuestion as any).allow_na === true
  const isTapOnly = currentQuestion.type === 'yes_no' || currentQuestion.type === 'scale'

  return (
    <div className="fixed inset-0 bg-paper flex flex-col participant-root" style={heightStyle}>

      {/* Counter */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 pt-6 pb-2">
        <span className="font-mono text-sm text-ink-muted">
          {String(currentIndex + 1).padStart(2, '0')}
          <span className="text-ink-faint">/{String(total).padStart(2, '0')}</span>
        </span>
        {!currentQuestion.required && (
          <span className="text-xs text-ink-faint">Optional</span>
        )}
      </div>

      {isTapOnly ? (
        <div className="flex-1 flex flex-col px-8 pt-2">
          <div className="max-w-md mx-auto w-full flex flex-col h-full">
            <div className="flex-[2] flex flex-col justify-end pb-8">
              <h2
                className="font-display font-light text-ink leading-snug"
                style={{ fontSize: '24px', letterSpacing: '-0.02em', lineHeight: '1.3' }}
              >
                {currentQuestion.text}
              </h2>
            </div>
            <div className="flex-[3] flex flex-col">
              <div className={clsx('transition-opacity duration-150', naActive && 'opacity-25 pointer-events-none')}>
                {currentQuestion.type === 'scale' && (
                  <ScaleInput
                    question={currentQuestion as ScaleQuestion}
                    value={response?.value as number | undefined}
                    onChange={v => setResponse(currentQuestion.id, v, 'scale')}
                  />
                )}
                {currentQuestion.type === 'yes_no' && (
                  <YesNoInput
                    question={currentQuestion as YesNoQuestion}
                    value={response?.value as boolean | undefined}
                    onChange={v => setResponse(currentQuestion.id, v, 'yes_no')}
                  />
                )}
              </div>
              {showNA && (
                <div className="mt-5">
                  <NAButton naActive={naActive} onToggle={() => setNA(currentQuestion.id, currentQuestion.type)} />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-8 pt-2">
          <div className="max-w-md mx-auto pb-4">
            <h2
              className="font-display font-light text-ink mb-7 leading-snug"
              style={{ fontSize: '24px', letterSpacing: '-0.02em', lineHeight: '1.3' }}
            >
              {currentQuestion.text}
            </h2>
            <div className={clsx('transition-opacity duration-150', naActive && 'opacity-25 pointer-events-none')}>
              {currentQuestion.type === 'open_text' && (
                <OpenTextInput
                  question={currentQuestion as OpenTextQuestion}
                  value={(response?.value as string) || ''}
                  onChange={v => setResponse(currentQuestion.id, v, 'open_text')}
                />
              )}
              {currentQuestion.type === 'multiple_choice' && (
                <MultipleChoiceInput
                  question={currentQuestion as MultipleChoiceQuestion}
                  value={(response?.value as string | string[]) || []}
                  onChange={v => setResponse(currentQuestion.id, v, 'multiple_choice')}
                />
              )}
              {currentQuestion.type === 'numeric' && (
                <NumericInput
                  question={currentQuestion as NumericQuestion}
                  value={(response?.value as NumericResponse) || { number: undefined as any, text: '' }}
                  onChange={v => setResponse(currentQuestion.id, v, 'numeric')}
                />
              )}
            </div>
            {showNA && (
              <div className="mt-5">
                <NAButton naActive={naActive} onToggle={() => setNA(currentQuestion.id, currentQuestion.type)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex-shrink-0 bg-paper border-t border-paper-border px-8 pt-4" style={safePadding}>
        <div className="max-w-md mx-auto flex items-center gap-3 pb-1">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(-1, prev - 1))}
            disabled={currentIndex === 0}
            className={clsx(
              'flex items-center gap-1.5 px-5 py-3.5 rounded text-sm font-medium transition-all active:scale-95',
              'border border-paper-border text-ink-muted bg-paper',
              currentIndex === 0 && 'opacity-30 pointer-events-none'
            )}
            style={{ borderRadius: '6px' }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <button
            onClick={advance}
            disabled={!ready}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all active:scale-95',
              ready
                ? 'bg-ink text-white'
                : 'bg-paper-mid text-ink-faint cursor-not-allowed'
            )}
            style={{ borderRadius: '6px' }}
          >
            {currentIndex === total - 1 ? 'Review' : 'Next'}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

    </div>
  )
}

// ─── N/A Button ───────────────────────────────────────────────────────────────

function NAButton({ naActive, onToggle }: { naActive: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        'w-full flex items-center justify-center gap-2.5 py-3 px-4',
        'text-sm font-medium border transition-all duration-150 active:scale-95',
        naActive
          ? 'border-ink bg-ink text-white'
          : 'border-paper-border bg-paper text-ink-muted'
      )}
      style={{ borderRadius: '6px' }}
    >
      <span className={clsx(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold',
        naActive ? 'border-white text-white' : 'border-ink-faint text-ink-faint'
      )}>
        N/A
      </span>
      {naActive ? 'Not applicable — tap to undo' : "This doesn't apply to me"}
    </button>
  )
}

// ─── Input components ─────────────────────────────────────────────────────────

function OpenTextInput({ question, value, onChange }: {
  question: OpenTextQuestion; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={question.placeholder || 'Type your answer here…'}
        rows={4}
        maxLength={question.max_length}
        className="textarea text-base leading-relaxed"
      />
      {question.max_length && (
        <p className="text-xs text-ink-faint text-right mt-1">{value.length} / {question.max_length}</p>
      )}
    </div>
  )
}

function MultipleChoiceInput({ question, value, onChange }: {
  question: MultipleChoiceQuestion; value: string | string[]; onChange: (v: string | string[]) => void
}) {
  const [otherText, setOtherText] = useState('')
  const selected = Array.isArray(value) ? value : (value ? [value] : [])

  function toggle(option: string) {
    if (option === 'Other') {
      if (question.allow_multiple) {
        const withoutOther = selected.filter(s => !s.startsWith('Other:') && s !== 'Other')
        if (selected.some(s => s.startsWith('Other:') || s === 'Other')) {
          onChange(withoutOther); setOtherText('')
        } else {
          onChange([...withoutOther, otherText ? `Other: ${otherText}` : 'Other'])
        }
      } else {
        onChange(selected.includes('Other') ? '' : 'Other')
      }
      return
    }
    if (question.allow_multiple) {
      onChange(selected.includes(option) ? selected.filter(s => s !== option) : [...selected, option])
    } else {
      onChange(option)
    }
  }

  const otherSelected = selected.some(s => s === 'Other' || s.startsWith('Other:'))

  return (
    <div className="space-y-2.5">
      {question.options.map(opt => {
        const isOtherOption = opt === 'Other'
        const isSelected = isOtherOption ? otherSelected : selected.includes(opt)
        return (
          <div key={opt}>
            <button
              onClick={() => toggle(opt)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-4 text-left',
                'transition-all duration-150 text-sm font-medium active:scale-[0.98] border',
                isSelected ? 'bg-ink text-white border-ink' : 'bg-paper text-ink border-paper-border'
              )}
              style={{ borderRadius: '6px' }}
            >
              <span className={clsx(
                'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                isSelected ? 'border-white' : 'border-ink-faint'
              )}>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              {opt}
            </button>
            {isOtherOption && otherSelected && (
              <input
                type="text"
                value={otherText}
                onChange={e => {
                  setOtherText(e.target.value)
                  if (question.allow_multiple) {
                    const wo = selected.filter(s => !s.startsWith('Other:') && s !== 'Other')
                    onChange([...wo, e.target.value ? `Other: ${e.target.value}` : 'Other'])
                  } else {
                    onChange(e.target.value ? `Other: ${e.target.value}` : 'Other')
                  }
                }}
                placeholder="Please specify…"
                className="input mt-2 text-sm"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ScaleInput({ question, value, onChange }: {
  question: ScaleQuestion; value: number | undefined; onChange: (v: number) => void
}) {
  const steps = Array.from({ length: question.max - question.min + 1 }, (_, i) => i + question.min)
  const is10 = question.max >= 10
  return (
    <div>
      {is10 ? (
        <div className="grid grid-cols-5 gap-2.5">
          {steps.map(n => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={clsx(
                'aspect-square text-base font-mono font-medium border',
                'transition-all duration-150 active:scale-95 flex items-center justify-center',
                value === n ? 'bg-ink text-white border-ink' : 'bg-paper text-ink border-paper-border'
              )}
              style={{ borderRadius: '6px' }}
            >{n}</button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2.5">
          {steps.map(n => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={clsx(
                'flex-1 aspect-square text-lg font-mono font-medium border',
                'transition-all duration-150 active:scale-95 flex items-center justify-center',
                value === n ? 'bg-ink text-white border-ink' : 'bg-paper text-ink border-paper-border'
              )}
              style={{ borderRadius: '6px' }}
            >{n}</button>
          ))}
        </div>
      )}
      {(question.min_label || question.max_label) && (
        <div className="flex items-center justify-between mt-3 px-0.5">
          <span className="text-xs text-ink-faint">{question.min_label}</span>
          <span className="text-xs text-ink-faint">{question.max_label}</span>
        </div>
      )}
    </div>
  )
}

function YesNoInput({ question, value, onChange }: {
  question: YesNoQuestion; value: boolean | undefined; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex gap-3">
      {[
        { label: question.yes_label || 'Yes', val: true },
        { label: question.no_label || 'No', val: false },
      ].map(({ label, val }) => (
        <button
          key={label}
          onClick={() => onChange(val)}
          className={clsx(
            'flex-1 py-7 text-lg font-medium border',
            'transition-all duration-150 active:scale-95',
            value === val ? 'bg-ink text-white border-ink' : 'bg-paper text-ink border-paper-border'
          )}
          style={{ borderRadius: '8px' }}
        >{label}</button>
      ))}
    </div>
  )
}

function NumericInput({ question, value, onChange }: {
  question: NumericQuestion
  value: NumericResponse
  onChange: (v: NumericResponse) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        {question.number_label && (
          <label className="block text-sm text-ink-muted mb-2">{question.number_label}</label>
        )}
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={value?.number ?? ''}
            onChange={e => onChange({
              ...value,
              number: e.target.value === '' ? undefined as any : parseFloat(e.target.value),
            })}
            placeholder="0"
            className={clsx(
              'w-36 text-3xl font-display font-light text-ink text-center',
              'bg-paper border border-paper-border py-4 px-3',
              'focus:border-ink outline-none transition-colors',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            )}
            style={{ borderRadius: '6px' }}
          />
          {question.unit && (
            <span className="text-sm text-ink-muted font-medium">{question.unit}</span>
          )}
        </div>
      </div>
      {question.show_text_field && (
        <div>
          {question.text_label && (
            <label className="block text-sm text-ink-muted mb-2">
              {question.text_label}
              {!question.text_required && <span className="text-ink-faint ml-1">(optional)</span>}
            </label>
          )}
          <textarea
            value={value?.text || ''}
            onChange={e => onChange({ ...value, text: e.target.value })}
            placeholder={question.text_placeholder || 'Please elaborate…'}
            rows={3}
            className="textarea text-base leading-relaxed"
          />
        </div>
      )}
    </div>
  )
}
