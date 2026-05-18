'use client'

import { useState, useEffect } from 'react'
import { Question, QuestionResponse, MultipleChoiceQuestion, ScaleQuestion, OpenTextQuestion, YesNoQuestion, NumericQuestion, NumericResponse } from '@/types'
import { createClient } from '@/lib/supabase-browser'
import { clsx } from 'clsx'
import { ArrowRight, ArrowLeft, Check, Layers } from 'lucide-react'

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

    // Numeric: number is required, text may also be required
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

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col items-center justify-center px-6 text-center" style={heightStyle}>
        <div className="w-16 h-16 bg-sage-pale rounded-2xl flex items-center justify-center mb-5 text-2xl">✦</div>
        <h1 className="font-display font-semibold text-ink text-2xl mb-2">Thank you</h1>
        <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
          Your responses have been submitted. Your insights help make this research meaningful.
        </p>
      </div>
    )
  }

  if (isWelcome) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col" style={heightStyle}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 justify-center mb-10 opacity-40">
              <Layers size={14} />
              <span className="text-xs font-medium tracking-tight">ethnogrow</span>
            </div>
            <h1 className="font-display font-semibold text-ink text-2xl sm:text-3xl text-center mb-3 leading-tight">{title}</h1>
            {description && (
              <p className="text-sm text-ink-muted text-center mb-6 leading-relaxed max-w-sm mx-auto">{description}</p>
            )}
            <div className="flex items-center justify-center gap-4 text-xs text-ink-faint flex-wrap">
              <span>{total} question{total !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>~{Math.max(1, Math.round(total * 0.75))} min</span>
              <span>·</span>
              <span>Anonymous</span>
            </div>
          </div>
        </div>
        <div className="px-6 py-5" style={safePadding}>
          <button onClick={advance} className="btn-primary w-full justify-center py-4 text-base rounded-xl">
            Begin <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  if (isDone) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col" style={heightStyle}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-14 h-14 bg-ink rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Check size={24} className="text-[#FAFAF8]" />
          </div>
          <h2 className="font-display font-semibold text-ink text-2xl mb-2">All done</h2>
          <p className="text-sm text-ink-muted mb-4 max-w-xs mx-auto leading-relaxed">
            You've answered all {total} question{total !== 1 ? 's' : ''}. Ready to submit?
          </p>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3 max-w-xs">{error}</p>
          )}
          <button onClick={() => setCurrentIndex(total - 1)} className="btn-ghost text-sm">Review answers</button>
        </div>
        <div className="px-6 py-5" style={safePadding}>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full justify-center py-4 text-base rounded-xl">
            {submitting ? 'Submitting...' : 'Submit responses'}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    )
  }

  // ── Question view ──────────────────────────────────────────

  const response = responses.get(currentQuestion.id)
  const naActive = isNA(currentQuestion.id)
  const ready = canAdvance()
  const showNA = (currentQuestion as any).allow_na === true

  // Numeric is scrollable like open_text; tap-only only for yes_no and scale
  const isTapOnly = currentQuestion.type === 'yes_no' || currentQuestion.type === 'scale'

  return (
    <div className="fixed inset-0 bg-paper flex flex-col" style={heightStyle}>

      {/* Counter */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-2">
        <span className="text-sm font-mono font-medium text-ink-muted">
          {String(currentIndex + 1).padStart(2, '0')}
          <span className="text-ink-faint">/{String(total).padStart(2, '0')}</span>
        </span>
        {!currentQuestion.required && (
          <span className="text-xs text-ink-faint bg-paper-warm px-2 py-1 rounded-md border border-paper-border">Optional</span>
        )}
      </div>

      {isTapOnly ? (
        <div className="flex-1 flex flex-col px-5 pt-3">
          <div className="max-w-lg mx-auto w-full flex flex-col h-full">
            <div className="flex-[2] flex flex-col justify-end pb-6">
              <h2 className="font-display font-medium text-ink text-xl sm:text-2xl leading-snug">
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
        <div className="flex-1 overflow-y-auto px-5 pt-3">
          <div className="max-w-lg mx-auto pb-4">
            <h2 className="font-display font-medium text-ink text-xl sm:text-2xl mb-6 leading-snug">
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
      <div className="flex-shrink-0 bg-paper px-5 pt-3" style={safePadding}>
        <div className="max-w-lg mx-auto flex items-center gap-3 pb-2">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(-1, prev - 1))}
            disabled={currentIndex === 0}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all active:scale-95',
              'border-paper-border text-ink-muted bg-white',
              currentIndex === 0 && 'opacity-30 pointer-events-none'
            )}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <button
            onClick={advance}
            disabled={!ready}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-95',
              ready
                ? 'bg-ink text-[#FAFAF8] border-2 border-ink'
                : 'bg-paper-mid text-ink-faint border-2 border-paper-mid cursor-not-allowed'
            )}
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
        'w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl',
        'text-sm font-medium border-2 transition-all duration-150 active:scale-95',
        naActive
          ? 'border-ink bg-ink text-[#FAFAF8]'
          : 'border-paper-border bg-white text-ink-muted'
      )}
    >
      <span className={clsx(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold',
        naActive ? 'border-[#FAFAF8] text-[#FAFAF8]' : 'border-ink-faint text-ink-faint'
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
        placeholder={question.placeholder || 'Type your answer here...'}
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
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left',
                'transition-all duration-150 text-sm font-medium active:scale-[0.98]',
                isSelected ? 'bg-ink text-[#FAFAF8] border-ink' : 'bg-white text-ink border-paper-border'
              )}
            >
              <span className={clsx(
                'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                isSelected ? 'border-[#FAFAF8] bg-[#FAFAF8]/20' : 'border-current'
              )}>
                {isSelected && <span className="w-2 h-2 rounded-full bg-[#FAFAF8]" />}
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
                placeholder="Please specify..."
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
        <div className="grid grid-cols-5 gap-3">
          {steps.map(n => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={clsx(
                'aspect-square rounded-xl border-2 text-base font-mono font-medium',
                'transition-all duration-150 active:scale-95 flex items-center justify-center',
                value === n ? 'bg-ink text-[#FAFAF8] border-ink' : 'bg-white text-ink border-paper-border'
              )}
            >{n}</button>
          ))}
        </div>
      ) : (
        <div className="flex gap-3">
          {steps.map(n => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={clsx(
                'flex-1 aspect-square rounded-xl border-2 text-lg font-mono font-medium',
                'transition-all duration-150 active:scale-95 flex items-center justify-center',
                value === n ? 'bg-ink text-[#FAFAF8] border-ink' : 'bg-white text-ink border-paper-border'
              )}
            >{n}</button>
          ))}
        </div>
      )}
      {(question.min_label || question.max_label) && (
        <div className="flex items-center justify-between mt-3 px-1">
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
            'flex-1 py-6 rounded-2xl border-2 text-lg font-medium',
            'transition-all duration-150 active:scale-95',
            value === val ? 'bg-ink text-[#FAFAF8] border-ink' : 'bg-white text-ink border-paper-border'
          )}
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
      {/* Number field */}
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
              'w-36 text-3xl font-display font-semibold text-ink text-center',
              'bg-white border-2 border-paper-border rounded-xl py-4 px-3',
              'focus:border-ink outline-none transition-colors',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            )}
          />
          {question.unit && (
            <span className="text-sm text-ink-muted font-medium">{question.unit}</span>
          )}
        </div>
      </div>

      {/* Elaboration text field */}
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
            placeholder={question.text_placeholder || 'Please elaborate...'}
            rows={3}
            className="textarea text-base leading-relaxed"
          />
        </div>
      )}
    </div>
  )
}
