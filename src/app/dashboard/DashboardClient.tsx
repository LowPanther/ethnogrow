'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { Plus, FileText, Users, Clock, MoreVertical, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { UsageIndicator } from '@/components/UsageIndicator'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectWithCount = Project & { responses: { count: number }[] }

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  draft:    { dot: 'bg-ink-faint',    text: 'text-ink-muted',   label: 'Draft' },
  active:   { dot: 'bg-green-500',    text: 'text-green-700',   label: 'Active' },
  closed:   { dot: 'bg-amber-signal', text: 'text-amber-600',   label: 'Closed' },
  archived: { dot: 'bg-paper-border', text: 'text-ink-faint',   label: 'Archived' },
}

// ─── Page (client component so we can update state without full reload) ───────

interface DashboardClientProps {
  initialProjects: ProjectWithCount[]
  usage: { responses_analysed: number; response_cap: number; plan: string } | null
}

export default function DashboardClient({ initialProjects, usage }: DashboardClientProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()

  const visibleProjects = projects.filter(p => p.status !== 'archived')
  const archivedProjects = projects.filter(p => p.status === 'archived')
  const totalResponses = visibleProjects.reduce((sum, p) => sum + (p.responses?.[0]?.count ?? 0), 0)

  async function handleArchive(projectId: string) {
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    const newStatus = project.status === 'archived' ? 'closed' : 'archived'

    const res = await fetch('/api/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, status: newStatus }),
    })
    if (res.ok) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus as any } : p))
    }
  }

  async function handleDelete(projectId: string) {
    const res = await fetch('/api/projects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
    })
    if (res.ok) {
      setProjects(prev => prev.filter(p => p.id !== projectId))
      setDeleteConfirm(null)
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-8 py-10">
      <div className="grid grid-cols-[1fr_300px] gap-10 items-start">

        {/* ── Main column ── */}
        <div>
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-display font-semibold text-ink">Your projects</h1>
              <p className="text-sm text-ink-muted mt-1">
                {visibleProjects.length === 0
                  ? 'Create your first research project'
                  : `${visibleProjects.length} project${visibleProjects.length !== 1 ? 's' : ''} · ${totalResponses} total responses`
                }
              </p>
            </div>
            <Link href="/dashboard/new" className="btn-primary">
              <Plus size={15} />
              New project
            </Link>
          </div>

          {visibleProjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onArchive={() => handleArchive(project.id)}
                  onDeleteRequest={() => setDeleteConfirm(project.id)}
                />
              ))}
              <Link
                href="/dashboard/new"
                className={clsx(
                  'border-2 border-dashed border-paper-border rounded-lg p-5',
                  'flex flex-col items-center justify-center gap-2 text-center',
                  'text-ink-muted hover:text-ink hover:border-ink/20 hover:bg-paper-warm',
                  'transition-all duration-150 min-h-[160px] group'
                )}
              >
                <div className="w-9 h-9 rounded-lg border border-dashed border-paper-border flex items-center justify-center group-hover:border-ink/30 transition-colors">
                  <Plus size={15} />
                </div>
                <span className="text-sm font-medium">New project</span>
              </Link>
            </div>
          ) : (
            <EmptyDashboard />
          )}

          {/* Archived projects */}
          {archivedProjects.length > 0 && (
            <div className="mt-12">
              <h2 className="text-sm font-medium text-ink-faint uppercase tracking-wide mb-4">
                Archived ({archivedProjects.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {archivedProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onArchive={() => handleArchive(project.id)}
                    onDeleteRequest={() => setDeleteConfirm(project.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-4 sticky top-[72px]">
          <UsageIndicator
            responsesAnalysed={usage?.responses_analysed ?? 0}
            responseCap={usage?.response_cap ?? 50}
            plan={(usage?.plan ?? 'free') as any}
          />
        </aside>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <DeleteModal
          project={projects.find(p => p.id === deleteConfirm)!}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </main>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onArchive,
  onDeleteRequest,
}: {
  project: ProjectWithCount
  onArchive: () => void
  onDeleteRequest: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.draft
  const responseCount = project.responses?.[0]?.count ?? 0
  const questionCount = (project.questions || []).length
  const isArchived = project.status === 'archived'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div className={clsx('card p-5 group relative', isArchived && 'opacity-60')}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-paper-warm border border-paper-border flex items-center justify-center group-hover:bg-teal-pale transition-colors">
          <FileText size={15} className="text-ink-muted group-hover:text-teal transition-colors" />
        </div>
        <div className="flex items-center gap-1">
          <span className={clsx('flex items-center gap-1.5 text-xs font-medium', statusStyle.text)}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
            {statusStyle.label}
          </span>

          {/* Kebab menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={e => { e.preventDefault(); setMenuOpen(!menuOpen) }}
              className="p-1 rounded ml-1 transition-colors"
              style={{ color: '#767676' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fdede7'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#f04b0f'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#767676'
              }}
            >
              <MoreVertical size={14} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 card shadow-float z-50 py-1 animate-fade-in">
                <button
                  onClick={e => { e.preventDefault(); setMenuOpen(false); onArchive() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-paper-warm transition-colors"
                >
                  {isArchived
                    ? <><ArchiveRestore size={14} className="text-ink-muted" /> Unarchive</>
                    : <><Archive size={14} className="text-ink-muted" /> Archive</>
                  }
                </button>
                <div className="border-t border-paper-border my-1" />
                <button
                  onClick={e => { e.preventDefault(); setMenuOpen(false); onDeleteRequest() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-lobster hover:bg-lobster-pale transition-colors"
                >
                  <Trash2 size={14} />
                  Delete permanently
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Link href={`/dashboard/projects/${project.id}`} className="block">
        <h3 className="font-medium text-ink text-sm leading-snug mb-1 line-clamp-2 group-hover:text-teal transition-colors">
          {project.title}
        </h3>

        {project.description && (
          <p className="text-xs text-ink-muted line-clamp-2 mb-3 leading-relaxed">
            {project.description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-auto pt-3 border-t border-paper-border">
          <span className="flex items-center gap-1 text-xs text-ink-muted">
            <FileText size={11} />
            {questionCount} q{questionCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1 text-xs text-ink-muted">
            <Users size={11} />
            {responseCount} resp.
          </span>
          <span className="flex items-center gap-1 text-xs text-ink-faint ml-auto">
            <Clock size={11} />
            {formatDate(project.updated_at)}
          </span>
        </div>
      </Link>
    </div>
  )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({
  project,
  onConfirm,
  onCancel,
}: {
  project: ProjectWithCount
  onConfirm: () => void
  onCancel: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    await onConfirm()
    setConfirming(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card shadow-float p-6 w-full max-w-md animate-slide-up">
        <h2 className="font-display font-semibold text-ink text-lg mb-2">Delete project?</h2>
        <p className="text-sm text-ink-muted leading-relaxed mb-1">
          <strong className="text-ink">"{project.title}"</strong> and all of its responses, reports, and suggestions will be permanently deleted.
        </p>
        <p className="text-sm text-lobster mb-6">This cannot be undone.</p>
        <div className="flex items-center gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="btn-danger"
          >
            <Trash2 size={14} />
            {confirming ? 'Deleting...' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-paper-warm border border-paper-border flex items-center justify-center mb-5 text-2xl">
        ✦
      </div>
      <h2 className="font-display font-semibold text-ink text-xl mb-2">
        Start your first project
      </h2>
      <p className="text-sm text-ink-muted max-w-sm mb-8 leading-relaxed">
        Build a questionnaire, share it with participants, and get AI-powered insights from the responses.
      </p>
      <Link href="/dashboard/new" className="btn-primary">
        <Plus size={15} />
        Create your first project
      </Link>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
