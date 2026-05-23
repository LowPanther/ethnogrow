'use client'

import { useState } from 'react'
import { Project, ParticipantResponse, Question } from '@/types'
import { QuestionnaireBuilder } from '@/components/builder/QuestionnaireBuilder'
import { AIReport } from '@/components/AIReport'
import { QuestionVisualisation } from '@/components/QuestionVisualisation'
import { clsx } from 'clsx'
import { Edit3, Users, Share2, Copy, CheckCheck, ExternalLink, Sparkles, Download } from 'lucide-react'
import { UsageIndicator } from '@/components/UsageIndicator'
import { exportResponsesPDF, exportResponsesCSV } from '@/lib/exportUtils'

type Tab = 'build' | 'responses' | 'report' | 'share'

interface Props {
  project: Project
  responses: ParticipantResponse[]
  existingReport: any | null
  existingSuggestions: any[]
  usage: { responses_analysed: number; response_cap: number; plan: string }
}

export default function ProjectDetailClient({ project, responses, existingReport, existingSuggestions, usage }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('build')
  const [currentProject, setCurrentProject] = useState(project)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState(project.status)
  const [statusLoading, setStatusLoading] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<Question | null>(null)

  async function toggleStatus() {
    const newStatus = status === 'active' ? 'closed' : 'active'
    setStatusLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: currentProject.id, status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus(newStatus)
        setCurrentProject(data.project)
      }
    } finally {
      setStatusLoading(false)
    }
  }

  function handleAddQuestion(question: Question) {
    setPendingQuestion(question)
  }

  function handlePendingConsumed() {
    setPendingQuestion(null)
  }

  const participantUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${(currentProject as any).participant_token}`

  function copyLink() {
    navigator.clipboard.writeText(participantUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number; badge?: boolean }[] = [
    { id: 'build', label: 'Builder', icon: <Edit3 size={14} /> },
    { id: 'responses', label: 'Responses', icon: <Users size={14} />, count: responses.length },
    { id: 'report', label: 'AI Report', icon: <Sparkles size={14} />, badge: !!existingReport },
    { id: 'share', label: 'Share', icon: <Share2 size={14} /> },
  ]

  return (
    <div className="min-h-screen bg-paper">

      {/* Tab bar */}
      <div className="border-b border-paper-border bg-paper">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors relative',
                    activeTab === tab.id
                      ? 'border-ink text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={clsx(
                      'inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-mono',
                      activeTab === tab.id ? 'bg-ink text-white' : 'bg-paper-mid text-ink-muted'
                    )}>
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal absolute top-2.5 right-1.5" />
                  )}
                </button>
              ))}
            </div>

            {/* Status control */}
            <div className="flex items-center gap-3 py-2">
              <span className={clsx(
                'flex items-center gap-1.5 text-xs font-medium',
                status === 'active' ? 'text-green-700' : 'text-ink-muted'
              )}>
                <span className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  status === 'active' ? 'bg-green-500' : 'bg-ink-faint'
                )} />
                {status === 'active' ? 'Accepting responses' : status === 'closed' ? 'Closed' : status === 'draft' ? 'Draft' : 'Archived'}
              </span>
              {(status === 'active' || status === 'closed') && (
                <button
                  onClick={toggleStatus}
                  disabled={statusLoading}
                  className={clsx(
                    'text-xs font-medium px-3 py-1.5 rounded border transition-all',
                    status === 'active'
                      ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
                      : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                  )}
                >
                  {statusLoading ? '…' : status === 'active' ? 'Close responses' : 'Reopen responses'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className={activeTab === 'build' ? 'block' : 'hidden'}>
        <QuestionnaireBuilder
          initialProject={currentProject}
          onSaved={setCurrentProject}
          onPublished={() => setActiveTab('share')}
          pendingQuestion={pendingQuestion}
          onPendingQuestionConsumed={handlePendingConsumed}
        />
      </div>

      <div className={activeTab === 'responses' ? 'block' : 'hidden'}>
        <ResponsesTab
          responses={responses}
          project={currentProject}
          onViewReport={() => setActiveTab('report')}
        />
      </div>

      <div className={activeTab === 'report' ? 'block' : 'hidden'}>
        <div className="max-w-7xl mx-auto px-8 py-10">
          {usage.responses_analysed / usage.response_cap >= 0.75 && (
            <div className="mb-6 max-w-2xl">
              <UsageIndicator
                responsesAnalysed={usage.responses_analysed}
                responseCap={usage.response_cap}
                plan={usage.plan as any}
                variant="full"
              />
            </div>
          )}
          <AIReport
            projectId={currentProject.id}
            projectTitle={currentProject.title}
            responseCount={responses.length}
            existingReport={existingReport}
            existingSuggestions={existingSuggestions}
            onAddQuestion={handleAddQuestion}
          />
        </div>
      </div>

      <div className={activeTab === 'share' ? 'block' : 'hidden'}>
        <ShareTab
          project={currentProject}
          participantUrl={participantUrl}
          copied={copied}
          onCopy={copyLink}
        />
      </div>
    </div>
  )
}

// ─── Responses Tab ────────────────────────────────────────────────────────────

function ResponsesTab({
  responses: initialResponses,
  project,
  onViewReport,
}: {
  responses: ParticipantResponse[]
  project: Project
  onViewReport: () => void
}) {
  const [responses, setResponses] = useState(initialResponses)
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null)

  async function handleExportPDF() {
    setExporting('pdf')
    try {
      await exportResponsesPDF(responses, project.questions, project.title)
    } finally {
      setExporting(null)
    }
  }

  function handleExportCSV() {
    setExporting('csv')
    try {
      exportResponsesCSV(responses, project.questions, project.title)
    } finally {
      setExporting(null)
    }
  }

  async function updateFlagStatus(responseId: string, status: FlagStatus) {
    const { createClient } = await import('@/lib/supabase-browser')
    const supabase = createClient()
    await supabase
      .from('responses')
      .update({ flag_status: status })
      .eq('id', responseId)
    setResponses(prev =>
      prev.map(r => r.id === responseId ? { ...r, flag_status: status } : r)
    )
  }

  const flaggedCount = responses.filter(r => r.flag_status === 'flagged').length
  const excludedCount = responses.filter(r => r.flag_status === 'reviewed_excluded').length

  if (responses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-24 text-center">
        <p className="text-2xl text-ink-faint mb-5">◎</p>
        <h3
          className="font-display font-light text-ink mb-2"
          style={{ fontSize: '22px', letterSpacing: '-0.02em' }}
        >
          No responses yet
        </h3>
        <p className="text-sm text-ink-muted">
          Share your questionnaire link to start collecting responses.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2
            className="font-display font-light text-ink"
            style={{ fontSize: '24px', letterSpacing: '-0.02em' }}
          >
            {responses.length} response{responses.length !== 1 ? 's' : ''}
          </h2>
          {(flaggedCount > 0 || excludedCount > 0) && (
            <p className="text-xs text-ink-muted mt-1">
              {flaggedCount > 0 && <span className="text-amber-600">{flaggedCount} flagged for review</span>}
              {flaggedCount > 0 && excludedCount > 0 && <span className="mx-1.5">·</span>}
              {excludedCount > 0 && <span>{excludedCount} excluded from analysis</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={!!exporting}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Download size={12} />
            {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!!exporting}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Download size={12} />
            {exporting === 'csv' ? 'Exporting…' : 'CSV'}
          </button>
          <button onClick={onViewReport} className="btn-primary">
            <Sparkles size={13} />
            View AI report
          </button>
        </div>
      </div>

      {/* Per-question visualisations */}
      <div className="space-y-3 mb-12">
        {project.questions.map((question, i) => (
          <div
            key={question.id}
            className="p-6"
            style={{ backgroundColor: 'rgba(15,15,15,0.03)', borderRadius: '4px' }}
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="text-xs font-mono text-ink-faint mt-0.5 shrink-0">Q{i + 1}</span>
              <div>
                <p
                  className="font-display font-normal text-ink leading-snug"
                  style={{ fontSize: '15px', letterSpacing: '-0.01em' }}
                >
                  {question.text}
                </p>
                <p className="text-xs text-ink-faint mt-1 capitalize">
                  {question.type.replace('_', ' ')}
                  {question.type === 'scale' ? ` · ${(question as any).min}–${(question as any).max}` : ''}
                </p>
              </div>
            </div>
            <QuestionVisualisation question={question} responses={responses} />
          </div>
        ))}
      </div>

      {/* Individual responses */}
      <div>
        <p className="text-xs font-medium tracking-widest uppercase text-ink-faint mb-4">
          Individual responses
        </p>
        <div className="space-y-3">
          {responses.map((r, i) => {
            const isFlagged = r.flag_status === 'flagged'
            const isExcluded = r.flag_status === 'reviewed_excluded'
            const isReviewedIncluded = r.flag_status === 'reviewed_included'

            return (
              <div
                key={r.id}
                className="overflow-hidden"
                style={{
                  borderRadius: '4px',
                  border: isFlagged
                    ? '1px solid rgba(232,160,32,0.4)'
                    : '0.5px solid rgba(15,15,15,0.08)',
                  backgroundColor: isFlagged
                    ? 'rgba(232,160,32,0.04)'
                    : isExcluded
                    ? 'rgba(15,15,15,0.02)'
                    : 'rgba(15,15,15,0.03)',
                  opacity: isExcluded ? 0.6 : 1,
                }}
              >
                {/* Flag banner — only on flagged responses */}
                {isFlagged && (
                  <div
                    className="flex items-start justify-between px-4 py-3 border-b"
                    style={{ borderColor: 'rgba(232,160,32,0.25)', backgroundColor: 'rgba(232,160,32,0.07)' }}
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-amber-700 mb-1">Flagged for review</p>
                        <ul className="space-y-0.5">
                          {(r.flag_reasons || []).map(reason => (
                            <li key={reason} className="text-xs text-amber-600">
                              — {FLAG_REASON_LABELS[reason]}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                      <button
                        onClick={() => updateFlagStatus(r.id, 'reviewed_included')}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded transition-colors"
                        style={{ backgroundColor: 'rgba(15,15,15,0.06)', color: '#0F0F0F', borderRadius: '3px' }}
                        title="Include in analysis"
                      >
                        <CheckCircle2 size={12} /> Include
                      </button>
                      <button
                        onClick={() => updateFlagStatus(r.id, 'reviewed_excluded')}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 transition-colors"
                        style={{ backgroundColor: 'rgba(201,54,56,0.08)', color: '#c93638', borderRadius: '3px' }}
                        title="Exclude from analysis"
                      >
                        <X size={12} /> Exclude
                      </button>
                    </div>
                  </div>
                )}

                {/* Excluded banner */}
                {isExcluded && (
                  <div
                    className="flex items-center justify-between px-4 py-2 border-b"
                    style={{ borderColor: 'rgba(15,15,15,0.08)', backgroundColor: 'rgba(15,15,15,0.04)' }}
                  >
                    <span className="text-xs text-ink-faint">Excluded from analysis</span>
                    <button
                      onClick={() => updateFlagStatus(r.id, 'flagged')}
                      className="text-xs text-ink-muted hover:text-ink transition-colors"
                    >
                      Undo
                    </button>
                  </div>
                )}

                {/* Reviewed + included banner */}
                {isReviewedIncluded && (
                  <div
                    className="flex items-center justify-between px-4 py-2 border-b"
                    style={{ borderColor: 'rgba(15,15,15,0.08)', backgroundColor: 'rgba(15,15,15,0.02)' }}
                  >
                    <span className="text-xs text-ink-faint flex items-center gap-1.5">
                      <CheckCircle2 size={11} className="text-green-600" /> Reviewed — included in analysis
                    </span>
                    <button
                      onClick={() => updateFlagStatus(r.id, 'flagged')}
                      className="text-xs text-ink-muted hover:text-ink transition-colors"
                    >
                      Undo
                    </button>
                  </div>
                )}

                {/* Response content */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-ink-faint">
                      #{String(i + 1).padStart(3, '0')}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-ink-faint">
                      {r.completion_time_seconds && (
                        <span>{r.completion_time_seconds}s</span>
                      )}
                      <span>{new Date(r.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  {r.responses.map((qr, j) => {
                    const question = project.questions.find(q => q.id === qr.question_id)
                    if (!question) return null
                    return (
                      <div key={j} className="text-xs">
                        <span className="text-ink-muted">
                          {question.text.slice(0, 60)}{question.text.length > 60 ? '…' : ''}:{' '}
                        </span>
                        <span className="text-ink font-medium">
                          {qr.value === '__NA__'
                            ? 'N/A'
                            : Array.isArray(qr.value)
                            ? qr.value.join(', ')
                            : typeof qr.value === 'object' && qr.value !== null
                            ? Object.entries(qr.value).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')
                            : String(qr.value)
                          }
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Share Tab ────────────────────────────────────────────────────────────────

function ShareTab({
  project,
  participantUrl,
  copied,
  onCopy,
}: {
  project: Project
  participantUrl: string
  copied: boolean
  onCopy: () => void
}) {
  const isActive = project.status === 'active'

  return (
    <div className="max-w-xl mx-auto px-8 py-12">
          <h2
            className="font-display font-light text-ink mb-2"
            style={{ fontSize: '28px', letterSpacing: '-0.02em', lineHeight: '1.2' }}
          >
            Share your questionnaire
          </h2>
          <p className="text-sm text-ink-muted mb-8 leading-relaxed">
            Participants don't need to create an account. Send them this link directly.
          </p>

          {!isActive && (
            <div
              className="flex items-start gap-3 p-4 mb-6 rounded"
              style={{ backgroundColor: 'rgba(232,160,32,0.08)', border: '0.5px solid rgba(232,160,32,0.3)' }}
            >
              <span className="text-amber-signal mt-0.5 text-sm">⚠</span>
              <div>
                <p className="text-sm font-medium text-ink">This project isn't published yet</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  Publish it from the Builder tab before sharing — participants won't be able to respond to a draft.
                </p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <p className="text-xs font-medium tracking-widest uppercase text-ink-faint mb-3">
              Participant link
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={participantUrl}
                readOnly
                className="input text-sm font-mono"
                style={{ backgroundColor: 'rgba(15,15,15,0.03)' }}
              />
              <button
                onClick={onCopy}
                className={clsx(
                  'flex-shrink-0 btn-secondary text-xs px-3 whitespace-nowrap',
                  copied && 'text-green-700 border-green-200 bg-green-50'
                )}
              >
                {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <a
              href={participantUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink mt-3 transition-colors"
            >
              <ExternalLink size={11} />
              Open participant view
            </a>
          </div>

          <div className="pt-8 border-t border-paper-border">
            <p className="text-xs font-medium tracking-widest uppercase text-ink-faint mb-5">
              Good to know
            </p>
            <ul className="space-y-3">
              {[
                'Participants answer one question at a time — no cognitive overload.',
                'Works on any device, no login required.',
                'Responses are saved automatically as participants progress.',
                'You can close responses at any time without losing any data.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-ink-muted">
                  <span className="text-ink-faint mt-0.5 text-xs">—</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
    </div>
  )
}
