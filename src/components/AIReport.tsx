'use client'

import { useState } from 'react'
import { FollowUpSuggestions } from './FollowUpSuggestions'
import { Question } from '@/types'
import { clsx } from 'clsx'
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, Quote, Lightbulb, BarChart2, ChevronDown, ChevronUp } from 'lucide-react'

interface QuestionInsight {
  question: string
  type: string
  response_count?: number
  total_responses?: number
  coverage_note?: string
  headline: string
  detail: string
}

interface Theme {
  label: string
  description: string
  frequency: number
  supporting_quotes?: string[]
}

interface ReportData {
  summary: string
  question_insights: QuestionInsight[]
  themes: Theme[]
  key_findings: string[]
  sample_note: string
}

interface SavedReport {
  id: string
  summary: string
  themes: Theme[]
  key_findings: string[]
  response_count: number
  generated_at: string
  question_insights?: QuestionInsight[]
  sample_note?: string
}

interface AIReportProps {
  projectId: string
  responseCount: number
  existingReport?: SavedReport | null
  existingSuggestions?: any[]
  onAddQuestion?: (question: Question) => void
}

const MIN_RESPONSES = 3

export function AIReport({ projectId, responseCount, existingReport, existingSuggestions = [], onAddQuestion }: AIReportProps) {
  const [report, setReport] = useState<SavedReport | null>(existingReport || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedThemes, setExpandedThemes] = useState<Set<number>>(new Set([0]))

  async function generateReport() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to generate report')

      setReport(data.report)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleTheme(index: number) {
    setExpandedThemes(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  // ── Not enough responses ───────────────────────────────────

  if (responseCount < MIN_RESPONSES) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-xl bg-paper-warm border border-paper-border flex items-center justify-center mx-auto mb-4 text-2xl">
          ◎
        </div>
        <h3 className="font-display font-medium text-ink mb-1">Not enough responses yet</h3>
        <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
          You need at least {MIN_RESPONSES} responses to generate a meaningful report.
          You currently have {responseCount}.
        </p>
      </div>
    )
  }

  // ── No report yet ──────────────────────────────────────────

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-xl bg-sage-pale border border-sage-DEFAULT/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={22} className="text-sage-DEFAULT" />
        </div>
        <h3 className="font-display font-medium text-ink mb-1">Ready to analyse</h3>
        <p className="text-sm text-ink-muted max-w-xs mb-6 leading-relaxed">
          Claude will analyse your {responseCount} responses and produce a plain-language report with themes, insights, and key findings.
        </p>
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 mb-4 max-w-sm">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}
        <button
          onClick={generateReport}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Analysing responses...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Generate AI report
            </>
          )}
        </button>
      </div>
    )
  }

  // ── Report ─────────────────────────────────────────────────

  const reportData = report as SavedReport & { question_insights: QuestionInsight[]; sample_note?: string }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-sage-DEFAULT" />
            <span className="text-xs font-medium text-sage-DEFAULT uppercase tracking-wide">AI Report</span>
          </div>
          <p className="text-xs text-ink-faint">
            Based on {report.response_count} response{report.response_count !== 1 ? 's' : ''} · Generated {formatDate(report.generated_at)}
          </p>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="btn-ghost text-xs"
        >
          <RefreshCw size={12} className={clsx(loading && 'animate-spin')} />
          {loading ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Executive summary */}
      <div className="card p-6 bg-sage-pale border-sage-DEFAULT/15">
        <h2 className="font-display font-semibold text-ink text-lg mb-3">Summary</h2>
        <p className="text-sm text-ink leading-relaxed">{report.summary}</p>
        {reportData.sample_note && (
          <p className="text-xs text-ink-muted mt-3 italic border-t border-sage-DEFAULT/15 pt-3">
            {reportData.sample_note}
          </p>
        )}
      </div>

      {/* Key findings */}
      {report.key_findings?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={15} className="text-amber-signal" />
            <h2 className="font-display font-semibold text-ink text-lg">Key findings</h2>
          </div>
          <div className="space-y-3">
            {report.key_findings.map((finding, i) => (
              <div key={i} className="flex items-start gap-3 p-4 card">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ink text-[#FAFAF8] flex items-center justify-center text-xs font-mono font-medium mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-ink leading-relaxed">{finding}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-question insights */}
      {(reportData.question_insights ?? []).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={15} className="text-ink-muted" />
            <h2 className="font-display font-semibold text-ink text-lg">Question insights</h2>
          </div>
          <div className="space-y-3">
            {(reportData.question_insights ?? []).map((insight, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-start gap-3">
                  <span className={clsx(
                    'flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-mono font-medium mt-0.5',
                    insight.type === 'scale' && 'bg-amber-50 text-amber-600',
                    insight.type === 'multiple_choice' && 'bg-blue-50 text-blue-600',
                    insight.type === 'yes_no' && 'bg-purple-50 text-purple-600',
                    insight.type === 'open_text' && 'bg-sage-pale text-sage-DEFAULT',
                  )}>
                    {insight.type.replace('_', ' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <p className="text-xs text-ink-muted leading-snug flex-1">{insight.question}</p>
                      {insight.response_count !== undefined && insight.total_responses !== undefined && (
                        <span className={clsx(
                          'flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded',
                          insight.response_count < insight.total_responses
                            ? 'bg-amber-pale text-amber-600'
                            : 'bg-paper-warm text-ink-faint'
                        )}>
                          {insight.response_count}/{insight.total_responses}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-ink mb-1">{insight.headline}</p>
                    <p className="text-xs text-ink-muted leading-relaxed">{insight.detail}</p>
                    {insight.coverage_note && (
                      <p className="text-xs text-amber-600 mt-1.5 italic">{insight.coverage_note}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Themes */}
      {report.themes?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-ink-muted" />
            <h2 className="font-display font-semibold text-ink text-lg">Themes</h2>
            <span className="text-xs text-ink-faint">From open text responses</span>
          </div>
          <div className="space-y-2">
            {report.themes.map((theme, i) => (
              <div key={i} className="card overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => toggleTheme(i)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-paper-warm border border-paper-border flex items-center justify-center text-xs font-mono text-ink-muted flex-shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{theme.label}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{theme.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-xs text-ink-faint font-mono">{theme.frequency} mention{theme.frequency !== 1 ? 's' : ''}</span>
                    {expandedThemes.has(i) ? <ChevronUp size={14} className="text-ink-faint" /> : <ChevronDown size={14} className="text-ink-faint" />}
                  </div>
                </button>

                {expandedThemes.has(i) && theme.supporting_quotes && theme.supporting_quotes.length > 0 && (
                  <div className="border-t border-paper-border px-4 pb-4 pt-3 space-y-2">
                    {theme.supporting_quotes.map((quote, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <Quote size={12} className="text-ink-faint flex-shrink-0 mt-1" />
                        <p className="text-xs text-ink-muted italic leading-relaxed">"{quote}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Follow-up suggestions — only shown when report exists */}
      {report && (
        <div className="border-t border-paper-border pt-8">
          <FollowUpSuggestions
            projectId={projectId}
            reportId={report.id}
            existingSuggestions={existingSuggestions}
            onAddQuestion={onAddQuestion || (() => {})}
          />
        </div>
      )}

    </div>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
