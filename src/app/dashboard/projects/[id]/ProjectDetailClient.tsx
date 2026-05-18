'use client'

import { useState } from 'react'
import { Project, ParticipantResponse, Question } from '@/types'
import { QuestionnaireBuilder } from '@/components/builder/QuestionnaireBuilder'
import { AIReport } from '@/components/AIReport'
import { QuestionVisualisation } from '@/components/QuestionVisualisation'
import { clsx } from 'clsx'
import { Edit3, Users, Share2, Copy, CheckCheck, ExternalLink, Sparkles } from 'lucide-react'
import { UsageIndicator } from '@/components/UsageIndicator'
import { exportResponsesPDF, exportResponsesCSV } from '@/lib/exportUtils'
import { Download } from 'lucide-react'

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
                    'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors relative',
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
                      activeTab === tab.id ? 'bg-ink text-[#FAFAF8]' : 'bg-paper-mid text-ink-muted'
                    )}>
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-DEFAULT absolute top-2.5 right-1.5" />
                  )}
                </button>
              ))}
            </div>

            {/* Status control — right side of tab bar */}
            <div className="flex items-center gap-3 py-2">
              <span className={clsx(
                'flex items-center gap-1.5 text-xs font-medium',
                status === 'active' ? 'text-sage-DEFAULT' : 'text-ink-muted'
              )}>
                <span className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  status === 'active' ? 'bg-sage-DEFAULT' : 'bg-ink-faint'
                )} />
                {status === 'active' ? 'Accepting responses' : status === 'closed' ? 'Closed' : status === 'draft' ? 'Draft' : 'Archived'}
              </span>
              {(status === 'active' || status === 'closed') && (
                <button
                  onClick={toggleStatus}
                  disabled={statusLoading}
                  className={clsx(
                    'text-xs font-medium px-3 py-1.5 rounded-lg border transition-all',
                    status === 'active'
                      ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
                      : 'border-sage-DEFAULT/30 text-sage-DEFAULT bg-sage-pale hover:bg-sage-pale/80'
                  )}
                >
                  {statusLoading ? '...' : status === 'active' ? 'Close responses' : 'Reopen responses'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab content — all mounted, shown/hidden with CSS to preserve state */}
      <div className={activeTab === 'build' ? 'block' : 'hidden'}>
        <QuestionnaireBuilder
          initialProject={currentProject}
          onSaved={setCurrentProject}
          pendingQuestion={pendingQuestion}
          onPendingQuestionConsumed={handlePendingConsumed}
        />
      </div>

      <div className={activeTab === 'responses' ? 'block' : 'hidden'}>
        <ResponsesTab responses={responses} project={currentProject} onViewReport={() => setActiveTab('report')} />
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
  responses,
  project,
  onViewReport,
}: {
  responses: ParticipantResponse[]
  project: Project
  onViewReport: () => void
}) {
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

  if (responses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-16 text-center">
        <div className="w-14 h-14 rounded-xl bg-paper-warm border border-paper-border flex items-center justify-center mx-auto mb-4 text-xl">
          ◎
        </div>
        <h3 className="font-display font-medium text-ink mb-1">No responses yet</h3>
        <p className="text-sm text-ink-muted">
          Share your questionnaire link to start collecting responses.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-semibold text-ink text-xl">
          {responses.length} response{responses.length !== 1 ? 's' : ''}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={!!exporting}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Download size={12} />
            {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!!exporting}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Download size={12} />
            {exporting === 'csv' ? 'Exporting...' : 'CSV'}
          </button>
          <button onClick={onViewReport} className="btn-primary">
            <Sparkles size={13} />
            View AI report
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {project.questions.map((question, i) => (
          <div key={question.id} className="card p-5">
            <div className="flex items-start gap-2.5">
              <span className="text-xs font-mono text-ink-faint mt-0.5 shrink-0">Q{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-ink leading-snug">{question.text}</p>
                <p className="text-xs text-ink-faint mt-0.5 capitalize">
                  {question.type.replace('_', ' ')}
                  {question.type === 'scale'
                    ? ` · ${(question as any).min}–${(question as any).max}`
                    : ''}
                </p>
              </div>
            </div>
            <QuestionVisualisation question={question} responses={responses} />
          </div>
        ))}
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
    <div className="max-w-2xl mx-auto px-8 py-10 space-y-6">
      <div>
        <h2 className="font-display font-semibold text-ink text-xl mb-1">Share your questionnaire</h2>
        <p className="text-sm text-ink-muted">
          Participants don't need to create an account. Send them this link directly.
        </p>
      </div>

      {!isActive && (
        <div className="flex items-start gap-3 p-4 bg-amber-pale border border-amber-signal/20 rounded-lg">
          <span className="text-amber-signal mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-medium text-ink">This project is still a draft</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Publish it first before sharing — participants won't be able to respond to a draft.
            </p>
          </div>
        </div>
      )}

      <div className="card p-4 space-y-3">
        <label className="label">Participant link</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={participantUrl}
            readOnly
            className="input text-sm font-mono bg-paper-warm text-ink-muted"
          />
          <button
            onClick={onCopy}
            className={clsx(
              'flex-shrink-0 btn-secondary text-xs px-3',
              copied && 'text-sage-DEFAULT border-sage-DEFAULT/30 bg-sage-pale'
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
          className="btn-ghost text-xs"
        >
          <ExternalLink size={12} />
          Open participant view
        </a>
      </div>

      <div className="card p-4 space-y-2">
        <h3 className="text-sm font-medium text-ink">Sharing tips</h3>
        <ul className="space-y-1.5">
          {[
            'Participants answer one question at a time — no cognitive overload',
            'Works on any device, no login required',
            'Responses are saved automatically as participants complete the questionnaire',
            'You can close responses at any time from this dashboard',
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-ink-muted">
              <span className="text-sage-DEFAULT mt-0.5">✦</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
