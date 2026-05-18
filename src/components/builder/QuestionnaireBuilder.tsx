'use client'

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Question, QuestionType, Project } from '@/types'
import { createQuestion, validateProject, QUESTION_TYPES, getQuestionTypeMeta } from '@/lib/questions'
import { QuestionEditor } from './QuestionEditor'
import { QuestionTypeSelector } from './QuestionTypeSelector'
import { createClient } from '@/lib/supabase-browser'
import { clsx } from 'clsx'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Sparkles, Save, Share2, Eye, ChevronDown, Layers, CheckCircle2, AlertCircle, Copy } from 'lucide-react'

function SortableQuestion({
  question, index, isActive, onUpdate, onDelete, onFocus,
}: {
  question: Question
  index: number
  isActive: boolean
  onUpdate: (q: Question) => void
  onDelete: () => void
  onFocus: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id })

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <QuestionEditor
        question={question}
        index={index}
        isActive={isActive}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onFocus={onFocus}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function PublishPopover({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    const t = setTimeout(onDismiss, 12000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="absolute top-full right-0 mt-2 z-50 animate-slide-down w-80">
      <div className="bg-ink rounded-xl shadow-float p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
            <CheckCircle2 size={13} className="text-sage-light" />
            Published — share this link
          </span>
          <button onClick={onDismiss} className="text-lg leading-none" style={{ color: 'rgba(255,255,255,0.3)' }}>×</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono truncate flex-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{url}</span>
          <button
            onClick={copy}
            className="flex-shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: copied ? 'rgba(74,124,111,0.4)' : 'rgba(255,255,255,0.12)', color: 'white' }}
          >
            <Copy size={11} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface QuestionnaireBuilderProps {
  initialProject?: Partial<Project>
  onSaved?: (project: Project) => void
  pendingQuestion?: Question | null
  onPendingQuestionConsumed?: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function QuestionnaireBuilder({ initialProject, onSaved, pendingQuestion, onPendingQuestionConsumed }: QuestionnaireBuilderProps) {
  const [title, setTitle] = useState(initialProject?.title || '')
  const [description, setDescription] = useState(initialProject?.description || '')
  const [questions, setQuestions] = useState<Question[]>(initialProject?.questions || [])
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null)
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)

  const addQuestionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pendingQuestion) {
      setQuestions(prev => {
        if (prev.find(q => q.id === pendingQuestion.id)) return prev
        return [...prev, { ...pendingQuestion, order: prev.length }]
      })
      setActiveQuestionId(pendingQuestion.id)
      onPendingQuestionConsumed?.()
    }
  }, [pendingQuestion])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function addQuestion(type: QuestionType) {
    const newQ = createQuestion(type, questions.length)
    setQuestions(prev => [...prev, newQ])
    setActiveQuestionId(newQ.id)
    setShowTypeMenu(false)
  }

  function openTypeMenu() {
    setShowTypeMenu(true)
    setTimeout(() => {
      addQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  function updateQuestion(id: string, updated: Question) {
    setQuestions(prev => prev.map(q => q.id === id ? updated : q))
  }

  function deleteQuestion(id: string) {
    setQuestions(prev => prev.filter(q => q.id !== id))
    if (activeQuestionId === id) setActiveQuestionId(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setQuestions(prev => {
        const oldIndex = prev.findIndex(q => q.id === active.id)
        const newIndex = prev.findIndex(q => q.id === over.id)
        return arrayMove(prev, oldIndex, newIndex).map((q, i) => ({ ...q, order: i }))
      })
    }
  }

  async function handleSave(status: 'draft' | 'active' = 'draft') {
    const errors = validateProject(title, questions)
    if (errors.length > 0) {
      setSaveError(errors[0])
      return
    }

    setSaveState('saving')
    setSaveError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const projectData = {
        researcher_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        questions,
        status,
        updated_at: new Date().toISOString(),
      }

      let result

      if (initialProject?.id) {
        result = await supabase.from('projects').update(projectData).eq('id', initialProject.id).select().single()
      } else {
        result = await supabase.from('projects').insert(projectData).select().single()
      }

      if (result.error) throw result.error

      setSaveState('saved')
      onSaved?.(result.data as Project)

      if (status === 'active') {
        const token = (result.data as any).participant_token
        setPublishedUrl(`${window.location.origin}/p/${token}`)
      }

      setTimeout(() => setSaveState('idle'), 2000)
    } catch (err) {
      console.error('Save error:', err)
      setSaveState('error')
      setSaveError('Failed to save. Please try again.')
    }
  }

  const questionCount = questions.length
  const isValid = title.trim().length > 0 && questionCount > 0

  const typeCounts = QUESTION_TYPES.map(({ type, label, icon }) => ({
    type, label, icon,
    count: questions.filter(q => q.type === type).length,
  })).filter(t => t.count > 0)

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-sm border-b border-paper-border">
        <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-ink-muted hover:text-ink transition-colors">
              <Layers size={16} />
            </a>
            <span className="text-ink-faint">/</span>
            <span className="text-sm text-ink-muted font-medium">{title || 'Untitled project'}</span>
          </div>
          <div className="flex items-center gap-2 relative">
            {saveState === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs text-sage-DEFAULT animate-fade-in">
                <CheckCircle2 size={13} /> Saved
              </span>
            )}
            {saveState === 'error' && (
              <span className="flex items-center gap-1.5 text-xs text-red-500 animate-fade-in">
                <AlertCircle size={13} /> Error saving
              </span>
            )}
            <button onClick={() => handleSave('draft')} disabled={saveState === 'saving'} className="btn-secondary text-xs py-1.5 px-3">
              <Save size={13} />
              {saveState === 'saving' ? 'Saving...' : 'Save draft'}
            </button>
            <button onClick={() => handleSave('active')} disabled={!isValid || saveState === 'saving'} className="btn-primary text-xs py-1.5 px-3">
              <Share2 size={13} />
              Publish & share
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-[1fr_280px] gap-8 items-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Project title"
                className={clsx(
                  'w-full text-2xl font-display font-semibold text-ink bg-transparent',
                  'outline-none border-b-2 border-transparent focus:border-ink/20 pb-1',
                  'placeholder:text-ink-faint/60 transition-colors'
                )}
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add a brief description of this research (optional)"
                rows={2}
                className={clsx(
                  'w-full text-sm text-ink-muted bg-transparent outline-none resize-none',
                  'border-b border-transparent focus:border-ink/20 pb-1',
                  'placeholder:text-ink-faint transition-colors leading-relaxed'
                )}
              />
            </div>

            {saveError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 animate-slide-down">
                <AlertCircle size={14} /> {saveError}
              </div>
            )}

            {questionCount > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {questions.map((q, i) => (
                      <SortableQuestion
                        key={q.id}
                        question={q}
                        index={i}
                        isActive={activeQuestionId === q.id}
                        onUpdate={updated => updateQuestion(q.id, updated)}
                        onDelete={() => deleteQuestion(q.id)}
                        onFocus={() => setActiveQuestionId(q.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <EmptyState onAddQuestion={addQuestion} />
            )}

            {questionCount > 0 && (
              <div className="relative" ref={addQuestionRef}>
                <button
                  onClick={openTypeMenu}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 py-3 rounded-lg',
                    'border-2 border-dashed text-sm font-medium transition-all duration-150',
                    showTypeMenu
                      ? 'border-ink/20 bg-paper-warm text-ink'
                      : 'border-paper-border text-ink-muted hover:border-ink/20 hover:text-ink hover:bg-paper-warm'
                  )}
                >
                  <Plus size={15} />
                  Add question
                  <ChevronDown size={13} className={clsx('transition-transform', showTypeMenu && 'rotate-180')} />
                </button>

                {showTypeMenu && (
                  <div className="mt-2 p-3 card shadow-float z-30 animate-slide-down">
                    <p className="text-xs text-ink-faint font-medium uppercase tracking-wide mb-3">Choose question type</p>
                    <QuestionTypeSelector onSelect={addQuestion} />
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-4 sticky top-[72px]">
            <div className="card p-4 space-y-3">
              <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wide">Questionnaire</h3>
              <div className="space-y-2">
                <Stat label="Questions" value={questionCount} />
                <Stat label="Required" value={questions.filter(q => q.required).length} />
                <Stat label="Est. time" value={`~${Math.max(1, Math.round(questionCount * 0.75))} min`} />
              </div>
              {typeCounts.length > 0 && (
                <div className="pt-2 border-t border-paper-border space-y-1.5">
                  {typeCounts.map(({ type, label, icon, count }) => {
                    const meta = getQuestionTypeMeta(type)
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <span className={clsx('flex items-center gap-1.5 text-xs', meta.color)}>
                          <span className="font-mono">{icon}</span>{label}
                        </span>
                        <span className="text-xs font-mono text-ink-muted">{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card p-4 bg-sage-pale border-sage-pale space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-sage-DEFAULT" />
                <span className="text-xs font-medium text-sage-DEFAULT uppercase tracking-wide">Research tip</span>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed">{getTip(questionCount)}</p>
            </div>

            {questionCount > 0 && initialProject?.id && (
              <a
                href={`/p/${(initialProject as any).participant_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn-secondary justify-center text-xs"
              >
                <Eye size={13} />
                Preview participant view
              </a>
            )}
          </aside>
        </div>
      </div>

      {publishedUrl && <PublishPopover url={publishedUrl} onDismiss={() => setPublishedUrl(null)} />}
    </div>
  )
}

function EmptyState({ onAddQuestion }: { onAddQuestion: (type: QuestionType) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-xl bg-paper-warm border border-paper-border flex items-center justify-center mb-4 text-2xl">✦</div>
      <h3 className="font-display font-medium text-ink mb-1">Start building</h3>
      <p className="text-sm text-ink-muted mb-6 max-w-xs leading-relaxed">
        Add your first question. You can drag to reorder, and each type has its own settings.
      </p>
      <div className="w-full max-w-sm">
        <p className="text-xs text-ink-faint font-medium uppercase tracking-wide mb-3">Choose a question type</p>
        <QuestionTypeSelector onSelect={onAddQuestion} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-xs font-mono font-medium text-ink">{value}</span>
    </div>
  )
}

function getTip(questionCount: number): string {
  if (questionCount === 0) return 'A well-scoped questionnaire asks 5–12 focused questions. Start with context-setting, then go deeper.'
  if (questionCount < 5) return 'Mix question types to keep participants engaged. Open text reveals nuance that scales and checkboxes miss.'
  if (questionCount < 10) return "You're building well. Consider whether each question earns its place — every question adds friction for participants."
  return 'More than 10 questions can reduce completion rates. Consider whether some questions can be merged or cut.'
}
