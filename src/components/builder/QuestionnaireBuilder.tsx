'use client'

import { useState, useRef, useEffect } from 'react'
import { Question, QuestionType, Project, InfoBlockQuestion } from '@/types'
import { createQuestion, validateProject, QUESTION_TYPES, getQuestionTypeMeta } from '@/lib/questions'
import { QuestionEditor } from './QuestionEditor'
import { QuestionTypeSelector } from './QuestionTypeSelector'
import { createClient } from '@/lib/supabase-browser'
import { clsx } from 'clsx'
import { Plus, Sparkles, Save, Share2, Eye, ChevronDown, CheckCircle2, AlertCircle, Link } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildOrderedList(questions: Question[]): Question[] {
  const result: Question[] = []
  for (const q of questions.filter(q => !q.parent_id)) {
    result.push(q)
    result.push(...questions.filter(c => c.parent_id === q.id))
  }
  return result
}

function getTopLevel(questions: Question[]): Question[] {
  return questions.filter(q => !q.parent_id)
}

function getChildren(questions: Question[], parentId: string): Question[] {
  return questions.filter(q => q.parent_id === parentId)
}

// ─── Props ────────────────────────────────────────────────────────────────────

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

  // Per-parent follow-up panel state: null = closed, parentId = open
  const [followUpMenuFor, setFollowUpMenuFor] = useState<string | null>(null)
  // 'new' = type selector, 'existing' = link existing question
  const [followUpMode, setFollowUpMode] = useState<'new' | 'existing'>('new')

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

  // ── Question CRUD ─────────────────────────────────────────────────────────

  function addQuestion(type: QuestionType) {
    const newQ: Question = { ...createQuestion(type, questions.length), parent_id: null }
    setQuestions(prev => [...prev, newQ])
    setActiveQuestionId(newQ.id)
    setShowTypeMenu(false)
  }

  function addFollowUp(parentId: string, type: QuestionType) {
    const newQ: Question = { ...createQuestion(type, questions.length), parent_id: parentId }
    setQuestions(prev => {
      const ordered = buildOrderedList(prev)
      let insertAfter = ordered.findIndex(q => q.id === parentId)
      while (insertAfter + 1 < ordered.length && ordered[insertAfter + 1].parent_id === parentId) {
        insertAfter++
      }
      const result = [...ordered]
      result.splice(insertAfter + 1, 0, newQ)
      return result.map((q, i) => ({ ...q, order: i }))
    })
    setActiveQuestionId(newQ.id)
    setFollowUpMenuFor(null)
  }

  function linkExisting(parentId: string, childId: string) {
    setQuestions(prev => {
      const linked = prev.map(q => q.id === childId ? { ...q, parent_id: parentId } : q)
      return buildOrderedList(linked).map((q, i) => ({ ...q, order: i }))
    })
    setFollowUpMenuFor(null)
  }

  function updateQuestion(id: string, updated: Question) {
    setQuestions(prev => prev.map(q => q.id === id ? updated : q))
  }

  function deleteQuestion(id: string) {
    setQuestions(prev => {
      const promoted = prev.map(q => q.parent_id === id ? { ...q, parent_id: null } : q)
      return buildOrderedList(promoted.filter(q => q.id !== id)).map((q, i) => ({ ...q, order: i }))
    })
    if (activeQuestionId === id) setActiveQuestionId(null)
  }

  function unlinkQuestion(id: string) {
    setQuestions(prev =>
      buildOrderedList(prev.map(q => q.id === id ? { ...q, parent_id: null } : q))
        .map((q, i) => ({ ...q, order: i }))
    )
  }

  // ── Ordering ──────────────────────────────────────────────────────────────

  function moveTopLevel(id: string, direction: 'up' | 'down') {
    setQuestions(prev => {
      const topLevel = getTopLevel(prev)
      const idx = topLevel.findIndex(q => q.id === id)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= topLevel.length) return prev

      // Swap the two groups
      const newTopLevel = [...topLevel]
      ;[newTopLevel[idx], newTopLevel[swapIdx]] = [newTopLevel[swapIdx], newTopLevel[idx]]

      // Rebuild with children following their parents
      const rebuilt: Question[] = []
      for (const parent of newTopLevel) {
        rebuilt.push(parent)
        rebuilt.push(...prev.filter(q => q.parent_id === parent.id))
      }
      return rebuilt.map((q, i) => ({ ...q, order: i }))
    })
  }

  function moveChild(id: string, parentId: string, direction: 'up' | 'down') {
    setQuestions(prev => {
      const siblings = prev.filter(q => q.parent_id === parentId)
      const idx = siblings.findIndex(q => q.id === id)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= siblings.length) return prev

      const newSiblings = [...siblings]
      ;[newSiblings[idx], newSiblings[swapIdx]] = [newSiblings[swapIdx], newSiblings[idx]]

      // Rebuild full list preserving everything else
      const result: Question[] = []
      for (const parent of getTopLevel(prev)) {
        result.push(parent)
        if (parent.id === parentId) {
          result.push(...newSiblings)
        } else {
          result.push(...prev.filter(q => q.parent_id === parent.id))
        }
      }
      return result.map((q, i) => ({ ...q, order: i }))
    })
  }

  // ── Save ──────────────────────────────────────────────────────────────────

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

  // ── Derived state ─────────────────────────────────────────────────────────

  const topLevelQuestions = getTopLevel(questions)
  const childCount = questions.filter(q => !!q.parent_id).length
  const questionCount = topLevelQuestions.length
  const totalCount = questions.length
  const isValid = title.trim().length > 0 && questions.filter(q => q.type !== 'info_block').length > 0

  // Unlinked top-level questions available to link as children (excludes info_blocks as parents)
  function getAvailableToLink(parentId: string): Question[] {
    return topLevelQuestions.filter(q => q.id !== parentId && q.type !== 'info_block')
  }

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

  // ── Render ────────────────────────────────────────────────────────────────

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
              <div className="space-y-2">
                {topLevelQuestions.map((parent, parentIdx) => {
                  const children = getChildren(questions, parent.id)
                  const hasChildren = children.length > 0
                  const totalParts = hasChildren ? children.length + 1 : 0
                  const canParentMoveUp = parentIdx > 0
                  const canParentMoveDown = parentIdx < topLevelQuestions.length - 1
                  const isInfoBlock = parent.type === 'info_block'

                  return (
                    <div key={parent.id}>
                      {/* Parent */}
                      <QuestionEditor
                        question={parent}
                        index={questions.findIndex(q => q.id === parent.id)}
                        isActive={activeQuestionId === parent.id}
                        onUpdate={updated => updateQuestion(parent.id, updated)}
                        onDelete={() => deleteQuestion(parent.id)}
                        onFocus={() => setActiveQuestionId(parent.id)}
                        canMoveUp={canParentMoveUp}
                        canMoveDown={canParentMoveDown}
                        onMoveUp={() => moveTopLevel(parent.id, 'up')}
                        onMoveDown={() => moveTopLevel(parent.id, 'down')}
                        partLabel={hasChildren ? 'Part 1 of ' + totalParts : undefined}
                      />

                      {/* Children */}
                      {children.map((child, childIdx) => (
                        <div key={child.id} className="ml-6 mt-1.5 relative">
                          <div
                            className="absolute w-px"
                            style={{
                              left: '-12px',
                              top: childIdx === 0 ? '12px' : '0',
                              bottom: 0,
                              backgroundColor: 'rgba(15,15,15,0.12)',
                            }}
                          />
                          <QuestionEditor
                            question={child}
                            index={questions.findIndex(q => q.id === child.id)}
                            isActive={activeQuestionId === child.id}
                            onUpdate={updated => updateQuestion(child.id, updated)}
                            onDelete={() => deleteQuestion(child.id)}
                            onFocus={() => setActiveQuestionId(child.id)}
                            canMoveUp={childIdx > 0}
                            canMoveDown={childIdx < children.length - 1}
                            onMoveUp={() => moveChild(child.id, parent.id, 'up')}
                            onMoveDown={() => moveChild(child.id, parent.id, 'down')}
                            isChild
                            partLabel={`Part ${childIdx + 2} of ${totalParts}`}
                            onUnlink={() => unlinkQuestion(child.id)}
                          />
                        </div>
                      ))}

                      {/* Add follow-up — not available on info_block parents */}
                      {!isInfoBlock && (
                        <div className={clsx('ml-6 mt-1.5', hasChildren && 'relative')}>
                          {hasChildren && (
                            <div
                              className="absolute w-px"
                              style={{ left: '-12px', top: 0, height: '20px', backgroundColor: 'rgba(15,15,15,0.12)' }}
                            />
                          )}
                          {followUpMenuFor === parent.id ? (
                            <div
                              className="p-3 animate-slide-down"
                              style={{ backgroundColor: 'white', border: '0.5px solid rgba(15,15,15,0.12)', borderRadius: '4px' }}
                            >
                              {/* Mode tabs */}
                              <div className="flex items-center gap-3 mb-3">
                                <button
                                  onClick={() => setFollowUpMode('new')}
                                  className={clsx(
                                    'text-xs font-medium transition-colors pb-1 border-b',
                                    followUpMode === 'new'
                                      ? 'text-ink border-ink'
                                      : 'text-ink-faint border-transparent hover:text-ink'
                                  )}
                                >
                                  Create new
                                </button>
                                <button
                                  onClick={() => setFollowUpMode('existing')}
                                  className={clsx(
                                    'text-xs font-medium transition-colors pb-1 border-b',
                                    followUpMode === 'existing'
                                      ? 'text-ink border-ink'
                                      : 'text-ink-faint border-transparent hover:text-ink'
                                  )}
                                >
                                  Link existing
                                </button>
                                <button
                                  onClick={() => setFollowUpMenuFor(null)}
                                  className="ml-auto text-xs text-ink-faint hover:text-ink transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>

                              {followUpMode === 'new' ? (
                                <QuestionTypeSelector onSelect={type => addFollowUp(parent.id, type)} />
                              ) : (
                                <div className="space-y-1">
                                  {getAvailableToLink(parent.id).length === 0 ? (
                                    <p className="text-xs text-ink-faint py-2">No unlinked questions available. Create a new one instead.</p>
                                  ) : (
                                    getAvailableToLink(parent.id).map(q => {
                                      const meta = getQuestionTypeMeta(q.type)
                                      return (
                                        <button
                                          key={q.id}
                                          onClick={() => linkExisting(parent.id, q.id)}
                                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-paper-warm transition-colors rounded"
                                          style={{ borderRadius: '4px' }}
                                        >
                                          <span className={clsx('text-xs flex-shrink-0', meta.color)}>{meta.icon}</span>
                                          <span className="text-sm text-ink truncate flex-1">
                                            {q.text || <span className="text-ink-faint italic">Untitled question</span>}
                                          </span>
                                          <Link size={11} className="text-ink-faint flex-shrink-0" />
                                        </button>
                                      )
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setFollowUpMenuFor(parent.id); setFollowUpMode('new') }}
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
        Add your first question. You can reorder with the arrows, and each type has its own settings.
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
  if (childCount === 0 && questionCount >= 2) return 'Use follow-up questions to dig deeper — click "Add follow-up" under any question to link a second part.'
  if (childCount > 0) return 'Follow-up questions appear as parts of the same group. Participants tap "Next part" to move between them without losing context.'
  if (questionCount < 5) return 'Mix question types to keep participants engaged. Open text reveals nuance that scales and checkboxes miss.'
  if (questionCount < 10) return "You're building well. Consider whether each question earns its place — every question adds friction for participants."
  return 'More than 10 questions can reduce completion rates. Consider whether some questions can be merged or cut.'
}
