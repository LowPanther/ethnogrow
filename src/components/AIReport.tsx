'use client'

import { useState } from 'react'
import { FollowUpSuggestions } from './FollowUpSuggestions'
import { Question } from '@/types'
import { clsx } from 'clsx'
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, Quote, Lightbulb, BarChart2, ChevronDown, ChevronUp, Download, ArrowUpCircle } from 'lucide-react'
import { exportReportPDF, exportReportCSV } from '@/lib/exportUtils'
import Link from 'next/link'

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
  projectTitle?: string
  responseCount: number
  existingReport?: SavedReport | null
  existingSuggestions?: any[]
  onAddQuestion?: (question: Question) => void
}

const MIN_RESPONSES = 3

export function AIReport({ projectId, projectTitle = 'Research Report', responseCount, existingReport, existingSuggestions = [], onAddQuestion }: AIReportProps) {
  const [report, setReport] = useState<SavedReport | null>(existingReport || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [limitDetails, setLimitDetails] = useState<{ message: string; plan: string } | null>(null)
  const [expandedThemes, setExpandedThemes] = useState<Set<number>>(new Set([0]))
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null)

  async function generateReport() {
    setLoading(true)
    setError(null)
    setLimitReached(false)
    setLimitDetails(null)

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'report_limit_reached') {
          setLimitReached(true)
          setLimitDetails({ message: data.message, plan: data.plan })
          return
        }
        throw new Error(data.error || 'Failed to generate report')
      }

      setReport(data.report)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportPDF() {
    if (!report) return
    setExporting('pdf')
    try {
      await exportReportPDF(report, projectTitle)
    } finally {
      setExporting(null)
    }
  }

  async function handleExportCSV() {
    if (!report) return
    setExporting('csv')
    try {
      exportReportCSV(report, projectTitle)
    } finally {
      setExporting(null)
    }
  }

  function toggleTheme(index: number) {
    setExpandedThemes(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  // Not enough responses
  if (responseCount < MIN_RESPONSES) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-2xl text-ink-faint mb-5">◎</p>
        <h3
          className="font-display font-light text-ink mb-2"
          style={{ fontSize: '22px', letterSpacing: '-0.02em' }}
        >
          Not enough responses yet
        </h3>
        <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
          You need at least {MIN_RESPONSES} responses to generate a meaningful report.
          You currently have {responseCount}.
        </p>
      </div>
    )
  }

  // Report limit reached
  if (limitReached && limitDetails) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className="w-12 h-12 flex items-center justify-center mb-5"
          style={{ backgroundColor: 'rgba(232,160,32,0.1)', borderRadius: '6px' }}
        >
          <ArrowUpCircle size={22} className="text-amber-signal" />
        </div>
        <h3
          className="font-display font-light text-ink mb-2"
          style={{ fontSize: '22px', letterSpacing: '-0.02em' }}
        >
          Monthly report limit reached
        </h3>
        <p className="text-sm text-ink-muted max-w-sm leading-relaxed mb-6">
          {limitDetails.message}
        </p>
        <Link href="/dashboard/upgrade" className="btn-primary">
          <ArrowUpCircle size={14} />
          Upgrade plan
        </Link>
        <button
          onClick={() => { setLimitReached(false); setLimitDetails(null) }}
          className="btn-ghost text-sm mt-3"
        >
          Dismiss
        </button>
      </div>
    )
  }

  // No report yet
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className="w-12 h-12 flex items-center justify-center mb-5"
          style={{ backgroundColor: 'rgba(8,155,247,0.08)', borderRadius: '6px' }}
        >
          <Sparkles size={22} className="text-teal" />
        </div>
        <h3
          className="font-display font-light text-ink mb-2"
          style={{ fontSize: '22px', letterSpacing: '-0.02em' }}
        >
          Ready to analyse
        </h3>
        <p className="text-sm text-ink-muted max-w-xs mb-6 leading-relaxed">
          Claude will analyse your {responseCount} response{responseCount !== 1 ? 's' : ''} and produce a plain-language report with themes, insights, and key findings.
        </p>
        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 text-sm mb-4 max-w-sm rounded"
            style={{ backgroundColor: 'rgba(201,54,56,0.06)', border: '0.5px solid rgba(201,54,56,0.2)', color: '#c93638' }}
          >
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}
        <button onClick={generateReport} disabled={loading} className="btn-primary">
          {loading
            ? <><RefreshCw size={14} className="animate-spin" /> Analysing responses…</>
            : <><Sparkles size={14} /> Generate AI report</>
          }
        </button>
      </div>
    )
  }

  const reportData = report as SavedReport & { question_insights: QuestionInsight[]; sample_note?: string }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-teal" />
            <span className="text-xs font-medium text-teal uppercase tracking-wide">AI Report</span>
          </div>
          <p className="text-xs text-ink-faint">
            Based on {report.response_count} response{report.response_count !== 1 ? 's' : ''} · Generated {formatDate(report.generated_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} disabled={!!exporting} className="btn-secondary text-xs py-1.5 px-3">
            <Download size={12} />
            {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
          </button>
          <button onClick={handleExportCSV} disabled={!!exporting} className="btn-secondary text-xs py-1.5 px-3">
            <Download size={12} />
            {exporting === 'csv' ? 'Exporting…' : 'CSV'}
          </button>
          <button onClick={generateReport} disabled={loading} className="btn-ghost text-xs">
            <RefreshCw size={12} className={clsx(loading && 'animate-spin')} />
            {loading ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 text-sm rounded"
          style={{ backgroundColor: 'rgba(201,54,56,0.06)', border: '0.5px solid rgba(201,54,56,0.2)', color: '#c93638' }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Summary */}
      <div
        className="p-6"
        style={{ backgroundColor: 'rgba(8,155,247,0.06)', border: '0.5px solid rgba(8,155,247,0.15)', borderRadius: '4px' }}
      >
        <h2
          className="font-display font-light text-ink mb-3"
          style={{ fontSize: '18px', letterSpacing: '-0.01em' }}
        >
          Summary
        </h2>
        <p className="text-sm text-ink leading-relaxed">{report.summary}</p>
        {reportData.sample_note && (
          <p className="text-xs text-ink-muted mt-3 italic border-t pt-3" style={{ borderColor: 'rgba(8,155,247,0.15)' }}>
            {reportData.sample_note}
          </p>
        )}
      </div>

      {/* Key findings */}
      {report.key_findings?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            {/* Lightbulb matches text colour — amber is illegible at small sizes */}
            <Lightbulb size={15} className="text-ink" />
            <h2
              className="font-display font-light text-ink"
              style={{ fontSize: '18px', letterSpacing: '-0.01em' }}
            >
              Key findings
            </h2>
          </div>
          <div className="space-y-3">
            {report.key_findings.map((finding, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4"
                style={{ backgroundColor: 'rgba(15,15,15,0.03)', borderRadius: '4px' }}
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-xs font-mono font-medium mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-ink leading-relaxed">{finding}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question insights */}
      {(reportData.question_insights ?? []).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={15} className="text-ink-muted" />
            <h2
              className="font-display font-light text-ink"
              style={{ fontSize: '18px', letterSpacing: '-0.01em' }}
            >
              Question insights
            </h2>
          </div>
          <div className="space-y-3">
            {(reportData.question_insights ?? []).map((insight, i) => (
              <div
                key={i}
                className="p-4"
                style={{ backgroundColor: 'rgba(15,15,15,0.03)', borderRadius: '4px' }}
              >
                <div className="flex items-start gap-3">
                  {/* All question type badges use the same neutral style — colour adds no meaning here */}
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-mono font-medium mt-0.5 bg-paper-warm text-ink-muted">
                    {insight.type.replace('_', ' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      {/* Question text: promoted from text-xs to text-sm — it's readable content */}
                      <p className="text-sm text-ink-muted leading-snug flex-1">{insight.question}</p>
                      {insight.response_count !== undefined && insight.total_responses !== undefined && (
                        <span className={clsx(
                          'flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded',
                          insight.response_count < insight.total_responses
                            ? 'bg-coral-pale text-coral'
                            : 'bg-paper-warm text-ink-faint'
                        )}>
                          {insight.response_count}/{insight.total_responses}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-ink mb-1">{insight.headline}</p>
                    {/* Detail text: promoted from text-xs to text-sm — it's readable content */}
                    <p className="text-sm text-ink-muted leading-relaxed">{insight.detail}</p>
                    {/* Coverage note: coral because it's important information, not a warning */}
                    {insight.coverage_note && (
                      <p className="text-sm text-coral mt-1.5 italic">{insight.coverage_note}</p>
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
            <h2
              className="font-display font-light text-ink"
              style={{ fontSize: '18px', letterSpacing: '-0.01em' }}
            >
              Themes
            </h2>
            <span className="text-xs text-ink-faint">from open text responses</span>
          </div>
          <div className="space-y-2">
            {report.themes.map((theme, i) => (
              <div
                key={i}
                className="overflow-hidden"
                style={{ backgroundColor: 'rgba(15,15,15,0.03)', borderRadius: '4px' }}
              >
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
                      {/* Theme description: promoted from text-xs to text-sm */}
                      <p className="text-sm text-ink-muted mt-0.5">{theme.description}</p>
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
                        {/* Supporting quotes: promoted from text-xs to text-sm */}
                        <p className="text-sm text-ink-muted italic leading-relaxed">"{quote}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up suggestions */}
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
