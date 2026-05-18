'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { Lightbulb, Plus, X, RefreshCw, ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react'
import { Question, QuestionType } from '@/types'
import { createQuestion, getQuestionTypeMeta } from '@/lib/questions'

interface Suggestion {
  id: string
  question_text: string
  question_type: QuestionType
  rationale: string
  source_pattern: string
  status: 'pending' | 'added' | 'dismissed'
}

interface FollowUpSuggestionsProps {
  projectId: string
  reportId: string
  existingSuggestions: Suggestion[]
  onAddQuestion: (question: Question) => void
}

export function FollowUpSuggestions({
  projectId,
  reportId,
  existingSuggestions,
  onAddQuestion,
}: FollowUpSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(existingSuggestions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function generateSuggestions() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, report_id: reportId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate suggestions')

      setSuggestions(data.suggestions)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(suggestion: Suggestion) {
    // Create a proper question object from the suggestion
    const newQuestion = createQuestion(suggestion.question_type, 999)
    newQuestion.text = suggestion.question_text

    // Queue in builder — researcher stays here and can add more
    onAddQuestion(newQuestion)

    // Mark as added locally immediately
    setSuggestions(prev =>
      prev.map(s => s.id === suggestion.id ? { ...s, status: 'added' } : s)
    )

    // Persist status to DB in background
    fetch('/api/suggestions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion_id: suggestion.id, status: 'added' }),
    })
  }

  async function handleDismiss(suggestion: Suggestion) {
    await fetch('/api/suggestions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion_id: suggestion.id, status: 'dismissed' }),
    })

    setSuggestions(prev =>
      prev.map(s => s.id === suggestion.id ? { ...s, status: 'dismissed' } : s)
    )
  }

  const pending = suggestions.filter(s => s.status === 'pending')
  const added = suggestions.filter(s => s.status === 'added')
  const hasSuggestions = suggestions.length > 0

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb size={15} className="text-amber-signal" />
          <h2 className="font-display font-semibold text-ink text-lg">Suggested follow-up questions</h2>
        </div>
        <button
          onClick={generateSuggestions}
          disabled={loading}
          className="btn-ghost text-xs"
        >
          <RefreshCw size={12} className={clsx(loading && 'animate-spin')} />
          {loading ? 'Analysing...' : hasSuggestions ? 'Refresh' : 'Generate'}
        </button>
      </div>

      {/* Explanation */}
      <p className="text-xs text-ink-muted leading-relaxed">
        Based on patterns in your data, these questions would help you go deeper.
        Tap <strong>Add</strong> to drop any question straight into your questionnaire.
        The original responses are never changed.
      </p>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Empty state */}
      {!hasSuggestions && !loading && (
        <div className="flex flex-col items-center justify-center py-10 text-center card">
          <div className="w-12 h-12 rounded-xl bg-amber-pale flex items-center justify-center mb-3">
            <Sparkles size={18} className="text-amber-signal" />
          </div>
          <p className="text-sm font-medium text-ink mb-1">No suggestions yet</p>
          <p className="text-xs text-ink-muted mb-4 max-w-xs leading-relaxed">
            Generate suggestions and Claude will analyse your data to find gaps and patterns worth probing.
          </p>
          <button onClick={generateSuggestions} disabled={loading} className="btn-primary text-xs">
            <Lightbulb size={13} />
            {loading ? 'Analysing data...' : 'Generate suggestions'}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-paper-mid rounded w-3/4 mb-2" />
              <div className="h-3 bg-paper-mid rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Pending suggestions */}
      {!loading && pending.length > 0 && (
        <div className="space-y-2">
          {pending.map(suggestion => {
            const meta = getQuestionTypeMeta(suggestion.question_type)
            const isExpanded = expandedId === suggestion.id

            return (
              <div key={suggestion.id} className="card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Type badge */}
                    <span className={clsx('type-badge flex-shrink-0 mt-0.5', meta.bgColor, meta.color)}>
                      {meta.icon} {meta.label}
                    </span>

                    {/* Question text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink leading-snug">
                        {suggestion.question_text}
                      </p>

                      {/* Rationale — expandable */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                        className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink-muted mt-1.5 transition-colors"
                      >
                        Why this question?
                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleDismiss(suggestion)}
                        className="btn-ghost p-1.5 hover:text-red-500 hover:bg-red-50"
                        title="Dismiss"
                      >
                        <X size={13} />
                      </button>
                      <button
                        onClick={() => handleAdd(suggestion)}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        <Plus size={12} />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Expanded rationale */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-paper-border space-y-2 animate-slide-down">
                      <div>
                        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">Why ask this</span>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">{suggestion.rationale}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">Pattern in your data</span>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed italic">"{suggestion.source_pattern}"</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Already added */}
      {added.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-ink-faint font-medium uppercase tracking-wide mb-2">
            Queued for questionnaire — save in the Builder tab to keep
          </p>
          <div className="space-y-1.5">
            {added.map(s => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-sage-pale rounded-lg">
                <span className="text-sage-DEFAULT text-xs">✦</span>
                <p className="text-xs text-ink-muted">{s.question_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
