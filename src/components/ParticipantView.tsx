'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Question, QuestionResponse,
  MultipleChoiceQuestion, ScaleQuestion, OpenTextQuestion,
  YesNoQuestion, NumericQuestion, NumericResponse,
  ContactDetailsQuestion, ContactDetailsResponse,
  InfoBlockQuestion,
} from '@/types'
import { clsx } from 'clsx'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'

interface ParticipantViewProps {
  projectId: string
  title: string
  description?: string
  questions: Question[]
  hasAllowlist?: boolean
}

const NA_VALUE = '__NA__'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function hashEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase()
  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Group helpers ────────────────────────────────────────────────────────────

function buildOrderedList(questions: Question[]): Question[] {
  const result: Question[] = []
  for (const q of questions.filter(q => !q.parent_id)) {
    result.push(q)
    result.push(...questions.filter(c => c.parent_id === q.id))
  }
  return result
}

function getTopLevel(questions: Question[]): Question[] {
  return questions.filter(q => !q.parent_id && q.type !== 'info_block')
}

function getPartLabel(question: Question, allQuestions: Question[]): string | null {
  if (question.type === 'info_block') return null
  if (!question.parent_id) {
    const children = allQuestions.filter(q => q.parent_id === question.id)
    if (children.length === 0) return null
    return `Part 1 of ${children.length + 1}`
  } else {
    const siblings = allQuestions.filter(q => q.parent_id === question.parent_id)
    const childIndex = siblings.findIndex(q => q.id === question.id)
    return `Part ${childIndex + 2} of ${siblings.length + 1}`
  }
}

function isNextPartTransition(currentQ: Question, nextQ: Question): boolean {
  if (!nextQ) return false
  if (!currentQ.parent_id && nextQ.parent_id === currentQ.id) return true
  if (currentQ.parent_id && nextQ.parent_id === currentQ.parent_id) return true
  return false
}

function getTopLevelIndex(question: Question, allQuestions: Question[]): number {
  const topLevel = getTopLevel(allQuestions)
  if (!question.parent_id) {
    return topLevel.findIndex(q => q.id === question.id)
  } else {
    return topLevel.findIndex(q => q.id === question.parent_id)
  }
}

// ─── Parent answer summary ────────────────────────────────────────────────────

function getParentAnswerSummary(
  question: Question,
  allQuestions: Question[],
  responses: Map<string, QuestionResponse>
): string | null {
  if (!question.parent_id) return null
  const parent = allQuestions.find(q => q.id === question.parent_id)
  if (!parent) return null
  const resp = responses.get(parent.id)
  if (!resp || resp.value === NA_VALUE || resp.value === undefined || resp.value === null) return null

  switch (parent.type) {
    case 'yes_no': {
      const yesNo = parent as YesNoQuestion
      return resp.value === true
        ? (yesNo.yes_label || 'Yes')
        : (yesNo.no_label || 'No')
    }
    case 'scale': {
      const scale = parent as ScaleQuestion
      const num = resp.value as number
      if (scale.min_label && scale.max_label) {
        return `${num} — ${num <= Math.floor((scale.min + scale.max) / 2) ? scale.min_label : scale.max_label}`
      }
      return `${num} out of ${scale.max}`
    }
    case 'multiple_choice': {
      const vals = Array.isArray(resp.value) ? resp.value : [resp.value as string]
      return vals.join(', ')
    }
    case 'open_text': {
      const text = resp.value as string
      return text.length > 80 ? text.slice(0, 80).trimEnd() + '…' : text
    }
    case 'numeric': {
      const num = resp.value as NumericResponse
      const numParent = parent as NumericQuestion
      if (num?.number !== undefined && num.number !== null) {
        return numParent.unit ? `${num.number} ${numParent.unit}` : String(num.number)
      }
      return null
    }
    default:
      return null
  }
}

export function ParticipantView({ projectId, title, description, questions, hasAllowlist }: ParticipantViewProps) {
  const orderedQuestions = buildOrderedList(questions)
  const topLevelQuestions = getTopLevel(questions)

  const [currentIndex, setCurrentIndex] = useState(-1)
  const [responses, setResponses] = useState<Map<string, QuestionResponse>>(new Map())
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableHeight, setAvailableHeight] = useState<number | null>(null)
  const [participantEmail, setParticipantEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [notAllowed, setNotAllowed] = useState(false)
  const [notAllowedMessage, setNotAllowedMessage] = useState('')
  const [validating, setValidating] = useState(false)
  const [slideDown, setSlideDown] = useState(false)
  const sessionId = useState(() => generateUUID())[0]
  const startedAt = useRef<number | null>(null)

  const total = orderedQuestions.length
  const topLevelTotal = topLevelQuestions.length
  const isWelcome = currentIndex === -1
  const isDone = currentIndex >= total
  const currentQuestion = orderedQuestions[currentIndex]
  const nextQuestion = orderedQuestions[currentIndex + 1]
  const storageKey = `eg_submitted_${projectId}`

  const isInfoBlock = currentQuestion?.type === 'info_block'
  const partLabel = currentQuestion ? getPartLabel(currentQuestion, questions) : null
  const isNextPart = currentQuestion && nextQuestion
    ? isNextPartTransition(currentQuestion, nextQuestion)
    : false
  const topLevelIndex = currentQuestion
    ? getTopLevelIndex(currentQuestion, questions)
    : 0

  const parentAnswerSummary = currentQuestion
    ? getParentAnswerSummary(currentQuestion, questions, responses)
    : null

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem(storageKey)) setAlreadySubmitted(true)
    }
  }, [storageKey])

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
    if (isWelcome) {
      if (!participantEmail.trim()) return false
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(participantEmail.trim())
    }
    if (!currentQuestion) return false
    if (isInfoBlock) return true
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

    if (currentQuestion.type === 'contact_details') {
      const cdQ = currentQuestion as ContactDetailsQuestion
      const val = resp.value as ContactDetailsResponse
      if (!cdQ.require_at_least_one) return true
      return !!(val?.name?.trim() || val?.email?.trim() || val?.phone?.trim())
    }

    if (typeof resp.value === 'string') return resp.value.trim().length > 0
    if (Array.isArray(resp.value)) return resp.value.length > 0
    return resp.value !== undefined && resp.value !== null
  }

  async function advance() {
    if (isWelcome) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!participantEmail.trim() || !emailRegex.test(participantEmail.trim())) {
        setEmailError('Please enter a valid email address to continue.')
        return
      }
      setEmailError(null)
      setValidating(true)
      try {
        const res = await fetch('/api/validate-participant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, email: participantEmail.trim() }),
        })
        const data = await res.json()
        if (!data.allowed) {
          setNotAllowed(true)
          setNotAllowedMessage(data.message || 'You are not eligible to participate in this questionnaire.')
          return
        }
      } catch {
        setEmailError('Something went wrong. Please try again.')
        return
      } finally {
        setValidating(false)
        startedAt.current = Date.now()
      }
    }
    if (!canAdvance()) return

    const willBeNextPart = nextQuestion && currentQuestion
      ? isNextPartTransition(currentQuestion, nextQuestion)
      : false
    if (willBeNextPart) {
      setSlideDown(true)
      setTimeout(() => setSlideDown(false), 400)
    }

    setCurrentIndex(prev => prev + 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    try {
      const completionTime = startedAt.current
        ? Math.round((Date.now() - startedAt.current) / 1000)
        : undefined

      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          session_id: sessionId,
          responses: Array.from(responses.values()),
          completion_time_seconds: completionTime,
          email: participantEmail.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'duplicate') {
          setAlreadySubmitted(true)
          return
        }
        throw new Error(data.error || 'Submission failed')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, '1')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const heightStyle = availableHeight ? { height: `${availableHeight}px` } : {}
  const safePadding = { paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }
  // Prevent pull-to-refresh across all participant screens
  const noOverscroll = { overscrollBehavior: 'none' as const }

  // ── Already submitted ──────────────────────────────────────────────────────

  if (alreadySubmitted) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col items-center justify-center px-8 text-center participant-root" style={{ ...heightStyle, ...noOverscroll }}>
        <div className="w-12 h-12 bg-ink rounded-full flex items-center justify-center mb-6">
          <Check size={20} className="text-white" />
        </div>
        <h1 className="font-display font-light text-ink mb-3" style={{ fontSize: '28px', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
          Already submitted
        </h1>
        <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
          You've already completed this questionnaire. Each person can only submit once.
        </p>
        <p className="text-xs text-ink-faint mt-8">Ethnogrow</p>
      </div>
    )
  }

  // ── Not allowed ────────────────────────────────────────────────────────────

  if (notAllowed) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col items-center justify-center px-8 text-center participant-root" style={{ ...heightStyle, ...noOverscroll }}>
        <div className="w-12 h-12 flex items-center justify-center mb-6 text-2xl">✕</div>
        <h1 className="font-display font-light text-ink mb-3" style={{ fontSize: '28px', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
          Not eligible
        </h1>
        <p className="text-sm text-ink-muted max-w-xs leading-relaxed">{notAllowedMessage}</p>
        <p className="text-xs text-ink-faint mt-8">Ethnogrow</p>
      </div>
    )
  }

  // ── Submitted ──────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col items-center justify-center px-8 text-center participant-root" style={{ ...heightStyle, ...noOverscroll }}>
        <div className="w-12 h-12 bg-ink rounded-full flex items-center justify-center mb-6">
          <Check size={20} className="text-white" />
        </div>
        <h1 className="font-display font-light text-ink mb-3" style={{ fontSize: '28px', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
          Thank you
        </h1>
        <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
          Your responses have been submitted. Your insights help make this research meaningful.
        </p>
        <p className="text-xs text-ink-faint mt-8">Ethnogrow</p>
      </div>
    )
  }

  // ── Welcome ────────────────────────────────────────────────────────────────

  if (isWelcome) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col participant-root" style={{ ...heightStyle, ...noOverscroll }}>
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-8 pt-12 pb-6">
          <div className="w-full max-w-md mx-auto">
            <p className="text-xs font-medium tracking-widest uppercase text-ink-faint mb-8">Ethnogrow</p>
            <h1 className="font-display font-light text-ink mb-4 leading-tight" style={{ fontSize: '32px', letterSpacing: '-0.025em', lineHeight: '1.15' }}>
              {title}
            </h1>
            {description && (
              <p className="text-sm text-ink-muted leading-relaxed mb-6 max-w-sm">{description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-ink-faint mb-10">
              <span>{topLevelTotal} question{topLevelTotal !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>~{Math.max(1, Math.round(topLevelTotal * 0.75))} min</span>
              <span>·</span>
              <span>Anonymous</span>
            </div>

            <div className="p-5 mb-2" style={{ backgroundColor: 'rgba(15,15,15,0.03)', border: '0.5px solid rgba(15,15,15,0.1)', borderRadius: '6px' }}>
              <label className="block text-sm font-medium text-ink mb-1">
                Your email address
                {hasAllowlist && <span className="ml-1.5 text-xs font-normal text-ink-faint">(required for access)</span>}
              </label>
              <p className="text-xs text-ink-muted mb-3 leading-relaxed">
                {hasAllowlist
                  ? "This questionnaire is restricted to specific participants. We use your email to verify eligibility and ensure each person only submits once. It's never shared with the researcher or used for any other purpose."
                  : "We use this to make sure each person only submits once. It's never shared with the researcher or used for any other purpose."
                }
              </p>
              <input
                type="email"
                value={participantEmail}
                onChange={e => { setParticipantEmail(e.target.value); setEmailError(null) }}
                placeholder="you@example.com"
                className="input text-sm"
                autoComplete="email"
                inputMode="email"
              />
              {emailError && (
                <p className="text-xs mt-2" style={{ color: '#c93638' }}>{emailError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sticky bottom button */}
        <div className="flex-shrink-0 bg-paper border-t border-paper-border px-8 pt-4" style={safePadding}>
          <div className="max-w-md mx-auto pb-1">
            <button
              onClick={advance}
              disabled={!participantEmail.trim() || validating}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-4 text-base font-medium transition-all active:scale-95',
                participantEmail.trim() && !validating
                  ? 'bg-ink text-white'
                  : 'bg-paper-mid text-ink-faint cursor-not-allowed'
              )}
              style={{ borderRadius: '6px' }}
            >
              {validating ? 'Checking…' : <> Begin <ArrowRight size={18} /> </>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Review / submit ────────────────────────────────────────────────────────

  if (isDone) {
    return (
      <div className="fixed inset-0 bg-paper flex flex-col participant-root" style={{ ...heightStyle, ...noOverscroll }}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-12 h-12 bg-ink rounded-full flex items-center justify-center mb-6">
            <Check size={20} className="text-white" />
          </div>
          <h2 className="font-display font-light text-ink mb-3" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>
            All done
          </h2>
          <p className="text-sm text-ink-muted mb-6 max-w-xs mx-auto leading-relaxed">
            You've answered all {topLevelTotal} question{topLevelTotal !== 1 ? 's' : ''}. Ready to submit?
          </p>
          {error && (
            <p className="text-xs mb-4 max-w-xs px-3 py-2 rounded" style={{ color: '#c93638', backgroundColor: 'rgba(201,54,56,0.06)', border: '0.5px solid rgba(201,54,56,0.2)' }}>
              {error}
            </p>
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
              className="bg-ink text-white w-full flex items-center justify-center gap-2 py-4 text-base font-medium transition-all active:scale-95"
              style={{ borderRadius: '6px' }}
            >
              {submitting ? 'Submitting…' : <>Submit responses <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Question / info block view ─────────────────────────────────────────────

  const response = responses.get(currentQuestion.id)
  const naActive = isNA(currentQuestion.id)
  const ready = canAdvance()
  const showNA = !isInfoBlock && (currentQuestion as any).allow_na === true
  const isTapOnly = !isInfoBlock && (currentQuestion.type === 'yes_no' || currentQuestion.type === 'scale')
  const isLastQuestion = currentIndex === total - 1

  let nextLabel = 'Next'
  if (isLastQuestion) nextLabel = 'Review'
  else if (isInfoBlock) nextLabel = 'Continue'
  else if (isNextPart) nextLabel = 'Next part'

  return (
    <div
      className={clsx(
        'fixed inset-0 bg-paper flex flex-col participant-root',
        slideDown && 'animate-slide-down'
      )}
      style={{ ...heightStyle, ...noOverscroll }}
    >
      {/* Counter — hidden for info blocks */}
      {!isInfoBlock && (
        <div className="flex-shrink-0 flex items-center justify-between px-8 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-ink-muted">
              {String(topLevelIndex + 1).padStart(2, '0')}
              <span className="text-ink-faint">/{String(topLevelTotal).padStart(2, '0')}</span>
            </span>
            {partLabel && (
              <span className="text-xs text-ink-faint font-mono">{partLabel}</span>
            )}
          </div>
          {!currentQuestion.required && (
            <span className="text-xs text-ink-faint">Optional</span>
          )}
        </div>
      )}

      {/* Info block */}
      {isInfoBlock ? (
        <div className="flex-1 overflow-y-auto px-8 pt-10">
          <div className="max-w-md mx-auto pb-4">
            {(currentQuestion as InfoBlockQuestion).heading && (
              <h2
                className="font-display font-light text-ink mb-4 leading-snug"
                style={{ fontSize: '24px', letterSpacing: '-0.02em', lineHeight: '1.3' }}
              >
                {(currentQuestion as InfoBlockQuestion).heading}
              </h2>
            )}
            <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
              {currentQuestion.text}
            </p>
          </div>
        </div>
      ) : isTapOnly ? (
        <div className="flex-1 overflow-y-auto px-8 pt-2">
          <div className="max-w-md mx-auto w-full flex flex-col h-full">
            <div className="flex-[2] flex flex-col justify-end pb-8">
              {/* Parent answer callout for tap-only child questions */}
              {parentAnswerSummary && (
                <p className="text-xs text-ink-faint mb-3 font-mono">
                  You said: <span className="text-ink-muted">{parentAnswerSummary}</span>
                </p>
              )}
              <h2 className="font-display font-light text-ink leading-snug" style={{ fontSize: '24px', letterSpacing: '-0.02em', lineHeight: '1.3' }}>
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
            {/* Parent answer callout for scrollable child questions */}
            {parentAnswerSummary && (
              <p className="text-xs text-ink-faint mt-4 mb-3 font-mono">
                You said: <span className="text-ink-muted">{parentAnswerSummary}</span>
              </p>
            )}
            <h2 className="font-display font-light text-ink mb-7 leading-snug" style={{ fontSize: '24px', letterSpacing: '-0.02em', lineHeight: '1.3' }}>
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
              {currentQuestion.type === 'contact_details' && (
                <ContactDetailsInput
                  question={currentQuestion as ContactDetailsQuestion}
                  value={(response?.value as ContactDetailsResponse) || {}}
                  onChange={v => setResponse(currentQuestion.id, v, 'contact_details')}
                />
              )}
            </div>
            {showNA && currentQuestion.type !== 'contact_details' && (
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
          {!isInfoBlock && (
            <button
              onClick={() => setCurrentIndex(prev => Math.max(-1, prev - 1))}
              disabled={currentIndex === 0}
              className={clsx(
                'flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium transition-all active:scale-95',
                'border border-paper-border text-ink-muted bg-paper',
                currentIndex === 0 && 'opacity-30 pointer-events-none'
              )}
              style={{ borderRadius: '6px' }}
            >
              <ArrowLeft size={15} /> Back
            </button>
          )}
          <button
            onClick={advance}
            disabled={!ready}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all active:scale-95',
              ready ? 'bg-ink text-white' : 'bg-paper-mid text-ink-faint cursor-not-allowed'
            )}
            style={{ borderRadius: '6px' }}
          >
            {nextLabel}
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
        naActive ? 'border-ink bg-ink text-white' : 'border-paper-border bg-paper text-ink-muted'
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
            <button key={n} onClick={() => onChange(n)}
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
            <button key={n} onClick={() => onChange(n)}
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
        <button key={label} onClick={() => onChange(val)}
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
  question: NumericQuestion; value: NumericResponse; onChange: (v: NumericResponse) => void
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

function ContactDetailsInput({ question, value, onChange }: {
  question: ContactDetailsQuestion
  value: ContactDetailsResponse
  onChange: (v: ContactDetailsResponse) => void
}) {
  return (
    <div className="space-y-4">
      {question.collect_name && (
        <div>
          <label className="block text-sm text-ink-muted mb-2">
            Full name
            {!question.name_required && <span className="text-ink-faint ml-1">(optional)</span>}
          </label>
          <input
            type="text"
            value={value?.name || ''}
            onChange={e => onChange({ ...value, name: e.target.value })}
            placeholder="Your name"
            className="input text-base"
            autoComplete="name"
          />
        </div>
      )}
      {question.collect_email && (
        <div>
          <label className="block text-sm text-ink-muted mb-2">
            Email address
            {!question.email_required && <span className="text-ink-faint ml-1">(optional)</span>}
          </label>
          <input
            type="email"
            value={value?.email || ''}
            onChange={e => onChange({ ...value, email: e.target.value })}
            placeholder="you@example.com"
            className="input text-base"
            autoComplete="email"
            inputMode="email"
          />
        </div>
      )}
      {question.collect_phone && (
        <div>
          <label className="block text-sm text-ink-muted mb-2">
            Phone number
            {!question.phone_required && <span className="text-ink-faint ml-1">(optional)</span>}
          </label>
          <input
            type="tel"
            value={value?.phone || ''}
            onChange={e => onChange({ ...value, phone: e.target.value })}
            placeholder="+27 00 000 0000"
            className="input text-base"
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
      )}
    </div>
  )
}