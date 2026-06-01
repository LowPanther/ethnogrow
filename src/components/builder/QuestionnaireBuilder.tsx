'use client'

import { useState, useRef, useEffect } from 'react'
import { Question, QuestionType, Project } from '@/types'
import { createQuestion, validateProject, QUESTION_TYPES, getQuestionTypeMeta } from '@/lib/questions'
import { QuestionEditor } from './QuestionEditor'
import { QuestionTypeSelector } from './QuestionTypeSelector'
import { createClient } from '@/lib/supabase-browser'
import { clsx } from 'clsx'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Sparkles, Save, Share2, Eye, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/** Returns children of a given parent id, in array order */
function getChildren(questions: Question[], parentId: string): Question[] {
  return questions.filter(q => q.parent_id === parentId)
}

/** Returns top-level questions only */
function getTopLevel(questions: Question[]): Question[] {
  return questions.filter(q => !q.parent_id)
}

/** Re-orders the flat array so each parent is immediately followed by its children */
function buildOrderedList(questions: Question[]): Question[] {
  const result: Question[] = []
  for (const q of questions.filter(q => !q.parent_id)) {
    result.push(q)
    result.push(...questions.filter(c => c.parent_id === q.id))
  }
  return result
}

// ─── Sortable wrappers ────────────────────────────────────────────────────────

function SortableQuestion({
  question, index, isActive, onUpdate, onDelete, onFocus,
  isChild, partLabel, onUnlink,
  isDropTarget,
}: {
  question: Question
  index: number
  isActive: boolean
  onUpdate: (q: Question) => void
  onDelete: () => void
  onFocus: () => void
  isChild?: boolean
  partLabel?: string
  onUnlink?: () => void
  isDropTarget?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id, disabled: !!question.parent_id && isChild })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={clsx(
        'transition-all duration-150',
        isDropTarget && 'ring-2 ring-teal ring-offset-1 rounded'
      )}
    >
      <QuestionEditor
        question={question}
        index={index}
        isActive={isActive}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onFocus={onFocus}
        dragHandleProps={!isChild ? { ...attributes, ...listeners } : undefined}
        isChild={isChild}
        partLabel={partLabel}
        onUnlink={onUnlink}
      />
    </div>
  )
}

// ─── Props / types ────────────────────────────────────────────────────────────

interface QuestionnaireBuilderProps {
  initialProject?: Partial<Project>
  onSaved?: (project: Project) => void
  onPublished?: () => void
  onBack?: () => void
  pendingQuestion?: Question | null
  onPendingQuestionConsumed?: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// ─── Main component ───────────────────────────────────────────────────────────

export function QuestionnaireBuilder({
  initialProject, onSaved, onPublished, onBack, pendingQuestion, onPendingQuestionConsumed,
}: QuestionnaireBuilderProps) {
  const [title, setTitle] = useState(initialProject?.title || '')
  const [description, setDescription] = useState(initialProject?.description || '')
  const [questions, setQuestions] = useState<Question[]>(
    (initialProject?.questions || []).map(q => ({ ...q, parent_id: q.parent_id ?? null }))
  )
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null)
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  // Per-parent "add follow-up" type menu visibility
  const [followUpMenuFor, setFollowUpMenuFor] = useState<string | null>(null)

  const addQuestionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pendingQuestion) {
      setQuestions(prev => {
        if (prev.find(q => q.id === pendingQuestion.id)) return prev
        return [...prev, { ...pendingQuestion, parent_id: pendingQuestion.parent_id ?? null, order: prev.length }]
      })
      setActiveQuestionId(pendingQuestion.id)
      onPendingQuestionConsumed?.()
    }
  }, [pendingQuestion])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // ── Question CRUD ────────────────────────────────────────────────────────────

  function addQuestion(type: QuestionType) {
    const newQ: Question = { ...createQuestion(type, questions.length), parent_id: null }
    setQuestions(prev => [...prev, newQ])
    setActiveQuestionId(newQ.id)
    setShowTypeMenu(false)
  }

  function addFollowUp(parentId: string, type: QuestionType) {
    const newQ: Question = {
      ...createQuestion(type, questions.length),
      parent_id: parentId,
    }
    setQuestions(prev => {
      // Insert immediately after the last child of this parent (or after the parent itself)
      const ordered = buildOrderedList(prev)
      const lastChildIndex = (() => {
        let idx = ordered.findIndex(q => q.id === parentId)
        while (idx + 1 < ordered.length && ordered[idx + 1].parent_id === parentId) idx++
        return idx
      })()
      const result = [...ordered]
      result.splice(lastChildIndex + 1, 0, newQ)
      return result.map((q, i) => ({ ...q, order: i }))
    })
    setActiveQuestionId(newQ.id)
    setFollowUpMenuFor(null)
  }

  function updateQuestion(id: string, updated: Question) {
    setQuestions(prev => prev.map(q => q.id === id ? updated : q))
  }

  function deleteQuestion(id: string) {
    setQuestions(prev => {
      // If parent: promote children to top-level
      const promoted = prev.map(q => q.parent_id === id ? { ...q, parent_id: null } : q)
      return promoted.filter(q => q.id !== id).map((q, i) => ({ ...q, order: i }))
    })
    if (activeQuestionId === id) setActiveQuestionId(null)
  }

  function unlinkQuestion(id: string) {
    setQuestions(prev =>
      buildOrderedList(
        prev.map(q => q.id === id ? { ...q, parent_id: null } : q)
      ).map((q, i) => ({ ...q, order: i }))
    )
  }

  // ── Drag and drop ────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) { setDropTargetId(null); return }

    const draggedQ = questions.find(q => q.id === active.id)
    const overQ = questions.find(q => q.id === over.id)
    if (!draggedQ || !overQ) { setDropTargetId(null); return }

    // Can only link top-level onto top-level
    const canLink = !draggedQ.parent_id && !overQ.parent_id && draggedQ.id !== overQ.id
    setDropTargetId(canLink ? String(over.id) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setDraggingId(null)
    setDropTargetId(null)

    if (!over || active.id === over.id) return

    const draggedQ = questions.find(q => q.id === active.id)
    const overQ = questions.find(q => q.id === over.id)
    if (!draggedQ || !overQ) return

    // Drop top-level onto top-level → link as child
    if (!draggedQ.parent_id && !overQ.parent_id) {
      setQuestions(prev => {
        const linked = prev.map(q => q.id === draggedQ.id ? { ...q, parent_id: overQ.id } : q)
        return buildOrderedList(linked).map((q, i) => ({ ...q, order: i }))
      })
      return
    }

    // Drop child onto top-level position that isn't its own parent → unlink and reorder
    if (draggedQ.parent_id && !overQ.parent_id && overQ.id !== draggedQ.parent_id) {
      setQuestions(prev => {
        const unlinked = prev.map(q => q.id === draggedQ.id ? { ...q, parent_id: null } : q)
        const ordered = buildOrderedList(unlinked)
        const oldIndex = ordered.findIndex(q => q.id === draggedQ.id)
        const newIndex = ordered.findIndex(q => q.id === overQ.id)
        return arrayMove(ordered, oldIndex, newIndex).map((q, i) => ({ ...q, order: i }))
      })
      return
    }

    // Standard reorder among top-level
    if (!draggedQ.parent_id && !overQ.parent_id) {
      setQuestions(prev => {
        const ordered = buildOrderedList(prev)
        const oldIndex = ordered.findIndex(q => q.id === active.id)
        const newIndex = ordered.findIndex(q => q.id === over.id)
        return arrayMove(ordered, oldIndex, newIndex).map((q, i) => ({ ...q, order: i }))
      })
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave(status: 'draft' | 'active' = 'draft') {
    const errors = validateProject(title, questions)
    if (errors.length > 0) { setSaveError(errors[0]); return }

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
      if (status === 'active') onPublished?.()
      setTimeout(() => setSaveState('idle'), 2000)
    } catch (err) {
      console.error('Save error:', err)
      setSaveState('error')
      setSaveError('Failed to save. Please try again.')
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────────

  const orderedQuestions = buildOrderedList(questions)
  const topLevelQuestions = getTopLevel(questions)
  const childCount = questions.filter(q => !!q.parent_id).length
  const questionCount = topLevelQuestions.length
  const totalCount = questions.length
  const isValid = title.trim().length > 0 && questionCount > 0

  const typeCounts = QUESTION_TYPES.map(({ type, label, icon }) => ({
    type, label, icon,
    count: questions.filter(q => q.type === type).length,
  })).filter(t => t.count > 0)

  function openTypeMenu() {
    setShowTypeMenu(true)
    setTimeout(() => {
      addQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-paper">

      {/* Sub-header */}
      <header className="sticky top-0 z-40 backdrop-blur-sm border-b border-paper-border" style={{ backgroundColor: 'rgba(250,250,248,0.9)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:h-12 py-2 sm:py-0 gap-2">
            <div className="flex items-center gap-2 text-sm min-w-0">
              {onBack ? (
                <button onClick={onBack} className="text-ink-muted hover:text-ink transition-colors flex-shrink-0" style={{ letterSpacing: '-0.01em' }}>
                  Projects
                </button>
              ) : (
                <a href="/dashboard" className="text-ink-muted hover:text-ink transition-colors flex-shrink-0" style={{ letterSpacing: '-0.01em' }}>
                  Projects
                </a>
              )}
              <span className="text-ink-faint flex-shrink-0">/</span>
              <span className="text-ink-muted truncate">{title || 'Untitled project'}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {saveState === 'saved' && (
                <span className="flex items-center gap-1.5 text-xs text-green-700 animate-fade-in">
                  <CheckCircle2 size={12} /> Saved
                </span>
              )}
              {saveState === 'error' && (
                <span className="flex items-center gap-1.5 text-xs text-red-500 animate-fade-in">
                  <AlertCircle size={12} /> Error saving
                </span>
              )}
              <button onClick={() => handleSave('draft')} disabled={saveState === 'saving'} className="btn-secondary text-xs py-1.5 px-3">
                <Save size={12} />
                {saveState === 'saving' ? 'Saving…' : 'Save draft'}
              </button>
              <button onClick={() => handleSave('active')} disabled={!isValid || saveState === 'saving'} className="btn-primary text-xs py-1.5 px-3">
                <Share2 size={12} />
                Publish
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8 lg:gap-10 items-start">

          {/* Main content */}
          <div className="space-y-6">
            <div className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Project title"
                className={clsx(
                  'w-full font-display font-light text-ink bg-transparent',
                  'outline-none border-b border-transparent focus:border-ink/20 pb-2',
                  'placeholder:text-ink-faint transition-colors'
                )}
                style={{ fontSize: 'clamp(22px, 4vw, 28px)', letterSpacing: '-0.025em', lineHeight: '1.2' }}
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
              <div className="flex items-center gap-2 px-4 py-3 rounded text-sm text-red-700 animate-slide-down"
                style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} /> {saveError}
              </div>
            )}

            {questionCount > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedQuestions.map(q => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {topLevelQuestions.map((parent, parentIdx) => {
                      const children = getChildren(questions, parent.id)
                      const hasChildren = children.length > 0
                      const totalParts = hasChildren ? children.length + 1 : 0

                      return (
                        <div key={parent.id} className="space-y-0">
                          {/* Parent question */}
                          <SortableQuestion
                            question={parent}
                            index={orderedQuestions.findIndex(q => q.id === parent.id)}
                            isActive={activeQuestionId === parent.id}
                            onUpdate={updated => updateQuestion(parent.id, updated)}
                            onDelete={() => deleteQuestion(parent.id)}
                            onFocus={() => setActiveQuestionId(parent.id)}
                            isDropTarget={dropTargetId === parent.id}
                            partLabel={hasChildren ? 'Part 1 of ' + totalParts : undefined}
                          />

                          {/* Children */}
                          {children.map((child, childIdx) => (
                            <div key={child.id} className="ml-6 mt-1.5 relative">
                              {/* Connector line */}
                              <div
                                className="absolute left-0 top-0 bottom-0 w-px"
                                style={{
                                  left: '-12px',
                                  backgroundColor: 'rgba(15,15,15,0.12)',
                                  top: childIdx === 0 ? '12px' : '0',
                                }}
                              />
                              <SortableQuestion
                                question={child}
                                index={orderedQuestions.findIndex(q => q.id === child.id)}
                                isActive={activeQuestionId === child.id}
                                onUpdate={updated => updateQuestion(child.id, updated)}
                                onDelete={() => deleteQuestion(child.id)}
                                onFocus={() => setActiveQuestionId(child.id)}
                                isChild
                                partLabel={`Part ${childIdx + 2} of ${totalParts}`}
                                onUnlink={() => unlinkQuestion(child.id)}
                              />
                            </div>
                          ))}

                          {/* Add follow-up button */}
                          {!parent.parent_id && (
                            <div className={clsx('ml-6 mt-1.5', hasChildren && 'relative')}>
                              {hasChildren && (
                                <div
                                  className="absolute left-0 w-px"
                                  style={{ left: '-12px', top: 0, height: '20px', backgroundColor: 'rgba(15,15,15,0.12)' }}
                                />
                              )}
                              {followUpMenuFor === parent.id ? (
                                <div
                                  className="p-3 animate-slide-down"
                                  style={{
                                    backgroundColor: 'white',
                                    border: '0.5px solid rgba(15,15,15,0.12)',
                                    borderRadius: '4px',
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-ink-faint font-medium uppercase tracking-widest">Add follow-up question</p>
                                    <button
                                      onClick={() => setFollowUpMenuFor(null)}
                                      className="text-xs text-ink-faint hover:text-ink transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <QuestionTypeSelector onSelect={type => addFollowUp(parent.id, type)} />
                                </div>
                              ) : (
                                <button
                                  onClick={() => setFollowUpMenuFor(parent.id)}
                                  className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink transition-colors py-1"
                                >
                                  <Plus size={11} />
                                  Add follow-up
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
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
                    'w-full flex items-center justify-center gap-2 py-3',
                    'border border-dashed text-sm font-medium transition-all duration-150',
                    showTypeMenu
                      ? 'border-ink/20 bg-paper-warm text-ink'
                      : 'border-paper-border text-ink-muted hover:border-ink/20 hover:text-ink hover:bg-paper-warm'
                  )}
                  style={{ borderRadius: '4px' }}
                >
                  <Plus size={14} />
                  Add question
                  <ChevronDown size={13} className={clsx('transition-transform', showTypeMenu && 'rotate-180')} />
                </button>

                {showTypeMenu && (
                  <div
                    className="mt-2 p-4 shadow-float z-30 animate-slide-down"
                    style={{ backgroundColor: 'white', border: '0.5px solid rgba(15,15,15,0.12)', borderRadius: '4px' }}
                  >
                    <p className="text-xs text-ink-faint font-medium uppercase tracking-widest mb-3">Choose question type</p>
                    <QuestionTypeSelector onSelect={addQuestion} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block space-y-3 sticky top-[60px]">
            <div className="p-4 space-y-3" style={{ backgroundColor: 'rgba(15,15,15,0.03)', borderRadius: '4px' }}>
              <p className="text-xs font-medium tracking-widest uppercase text-ink-faint">Questionnaire</p>
              <div className="space-y-2">
                <Stat label="Questions" value={questionCount} />
                {childCount > 0 && <Stat label="Follow-ups" value={childCount} />}
                <Stat label="Required" value={questions.filter(q => q.required).length} />
                <Stat label="Est. time" value={`~${Math.max(1, Math.round(totalCount * 0.75))} min`} />
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

            <div className="p-4 space-y-2" style={{ backgroundColor: 'rgba(15,15,15,0.03)', borderRadius: '4px' }}>
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-ink-faint" />
                <span className="text-xs font-medium text-ink-faint uppercase tracking-widest">Research tip</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">{getTip(questionCount, childCount)}</p>
            </div>

            {questionCount > 0 && initialProject?.id && (
              <a
                href={`/p/${(initialProject as any).participant_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn-secondary justify-center text-xs"
              >
                <Eye size={12} />
                Preview participant view
              </a>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

// ─── Supporting components ────────────────────────────────────────────────────

function EmptyState({ onAddQuestion }: { onAddQuestion: (type: QuestionType) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
      <p className="text-2xl text-ink-faint mb-5">✦</p>
      <h3 className="font-display font-light text-ink mb-2" style={{ fontSize: '20px', letterSpacing: '-0.02em' }}>
        Start building
      </h3>
      <p className="text-sm text-ink-muted mb-8 max-w-xs leading-relaxed">
        Add your first question. You can drag to reorder, and each type has its own settings.
      </p>
      <div className="w-full max-w-sm">
        <p className="text-xs text-ink-faint font-medium uppercase tracking-widest mb-3">Choose a question type</p>
        <QuestionTypeSelector onSelect={onAddQuestion} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-xs font-mono text-ink">{value}</span>
    </div>
  )
}

function getTip(questionCount: number, childCount: number): string {
  if (questionCount === 0) return 'A well-scoped questionnaire asks 5–12 focused questions. Start with context-setting, then go deeper.'
  if (childCount === 0 && questionCount >= 2) return 'Use follow-up questions to dig deeper — click "Add follow-up" under any question, or drag one question onto another to link them.'
  if (childCount > 0) return 'Follow-up questions appear as parts of the same group. Participants tap "Next part" to move between them without losing context.'
  if (questionCount < 5) return 'Mix question types to keep participants engaged. Open text reveals nuance that scales and checkboxes miss.'
  if (questionCount < 10) return "You're building well. Consider whether each question earns its place — every question adds friction for participants."
  return 'More than 10 questions can reduce completion rates. Consider whether some questions can be merged or cut.'
}
