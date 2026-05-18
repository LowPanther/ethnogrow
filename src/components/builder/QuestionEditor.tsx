'use client'

import { useState } from 'react'
import { Question, MultipleChoiceQuestion, ScaleQuestion, OpenTextQuestion, YesNoQuestion, NumericQuestion } from '@/types'
import { getQuestionTypeMeta } from '@/lib/questions'
import { clsx } from 'clsx'
import { Trash2, Plus, GripVertical, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react'

interface QuestionEditorProps {
  question: Question
  index: number
  isActive: boolean
  onUpdate: (updated: Question) => void
  onDelete: () => void
  onFocus: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
}

export function QuestionEditor({
  question, index, isActive, onUpdate, onDelete, onFocus, dragHandleProps,
}: QuestionEditorProps) {
  const meta = getQuestionTypeMeta(question.type)
  const [isExpanded, setIsExpanded] = useState(true)

  function update(patch: Partial<Question>) {
    onUpdate({ ...question, ...patch } as Question)
  }

  return (
    <div
      className={clsx(
        'card transition-all duration-200 overflow-hidden',
        isActive ? 'ring-2 ring-ink/10 shadow-lifted' : 'hover:shadow-card'
      )}
      onClick={onFocus}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          className="flex-shrink-0 mt-1 text-ink-faint hover:text-ink-muted cursor-grab active:cursor-grabbing transition-colors"
          {...dragHandleProps}
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-shrink-0 mt-1">
          <span className="text-xs font-mono text-ink-faint">{String(index + 1).padStart(2, '0')}</span>
        </div>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={question.text}
            onChange={e => update({ text: e.target.value })}
            placeholder="Write your question here..."
            className={clsx(
              'w-full text-sm font-medium text-ink bg-transparent outline-none',
              'placeholder:text-ink-faint leading-snug',
              'border-b border-transparent focus:border-ink/20 pb-0.5 transition-colors'
            )}
            onClick={e => e.stopPropagation()}
          />
          <div className="flex items-center gap-2 mt-2">
            <span className={clsx('type-badge', meta.bgColor, meta.color)}>
              {meta.icon} {meta.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setIsExpanded(!isExpanded) }}
            className="btn-ghost p-1.5"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="btn-ghost p-1.5 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-paper-border px-4 pb-4 pt-3 space-y-3 animate-slide-down">
          {question.type === 'multiple_choice' && (
            <MultipleChoiceSettings question={question as MultipleChoiceQuestion} onUpdate={onUpdate} />
          )}
          {question.type === 'scale' && (
            <ScaleSettings question={question as ScaleQuestion} onUpdate={onUpdate} />
          )}
          {question.type === 'open_text' && (
            <OpenTextSettings question={question as OpenTextQuestion} onUpdate={onUpdate} />
          )}
          {question.type === 'yes_no' && (
            <YesNoSettings question={question as YesNoQuestion} onUpdate={onUpdate} />
          )}
          {question.type === 'numeric' && (
            <NumericSettings question={question as NumericQuestion} onUpdate={onUpdate} />
          )}

          <div className="flex items-center justify-between pt-2 border-t border-paper-border">
            <span className="text-xs text-ink-muted">Required</span>
            <button
              onClick={e => { e.stopPropagation(); update({ required: !question.required }) }}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-medium transition-colors',
                question.required ? 'text-ink' : 'text-ink-faint'
              )}
            >
              {question.required
                ? <ToggleRight size={16} className="text-sage-DEFAULT" />
                : <ToggleLeft size={16} />
              }
              {question.required ? 'Yes' : 'No'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-paper-border">
            <div>
              <span className="text-xs text-ink-muted">Allow "Not applicable"</span>
              <p className="text-xs text-ink-faint mt-0.5">Participants can skip with an N/A reason</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); update({ allow_na: !question.allow_na }) }}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-medium transition-colors flex-shrink-0 ml-4',
                question.allow_na ? 'text-ink' : 'text-ink-faint'
              )}
            >
              {question.allow_na
                ? <ToggleRight size={16} className="text-sage-DEFAULT" />
                : <ToggleLeft size={16} />
              }
              {question.allow_na ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────

function MultipleChoiceSettings({
  question, onUpdate,
}: {
  question: MultipleChoiceQuestion
  onUpdate: (q: MultipleChoiceQuestion) => void
}) {
  const hasOther = question.options.includes('Other')

  function updateOption(index: number, value: string) {
    const options = [...question.options]
    options[index] = value
    onUpdate({ ...question, options })
  }

  function addOption() {
    const options = [...question.options]
    const otherIndex = options.indexOf('Other')
    if (otherIndex !== -1) {
      options.splice(otherIndex, 0, '')
    } else {
      options.push('')
    }
    onUpdate({ ...question, options })
  }

  function addOther() {
    if (!hasOther) {
      onUpdate({ ...question, options: [...question.options, 'Other'] })
    }
  }

  function removeOption(index: number) {
    if (question.options.length <= 2) return
    const options = question.options.filter((_, i) => i !== index)
    onUpdate({ ...question, options })
  }

  return (
    <div className="space-y-2">
      <label className="label">Options</label>
      {question.options.map((opt, i) => {
        const isOther = opt === 'Other'
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-paper-border flex-shrink-0" />
            {isOther ? (
              <div className="flex-1 px-3 py-1.5 text-sm text-ink-muted bg-paper-warm border border-paper-border rounded italic">
                Other <span className="text-xs text-ink-faint">(participant fills in)</span>
              </div>
            ) : (
              <input
                type="text"
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                className="input py-1.5 text-sm"
                placeholder={`Option ${i + 1}`}
                onClick={e => e.stopPropagation()}
              />
            )}
            {question.options.length > 2 && (
              <button
                onClick={e => { e.stopPropagation(); removeOption(i) }}
                className="flex-shrink-0 text-ink-faint hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )
      })}

      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={e => { e.stopPropagation(); addOption() }}
          className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
        >
          <Plus size={12} /> Add option
        </button>
        {!hasOther && (
          <>
            <span className="text-ink-faint text-xs">·</span>
            <button
              onClick={e => { e.stopPropagation(); addOther() }}
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <Plus size={12} /> Add "Other"
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-ink-muted">Allow multiple selections</span>
        <button
          onClick={e => { e.stopPropagation(); onUpdate({ ...question, allow_multiple: !question.allow_multiple }) }}
          className={clsx(
            'flex items-center gap-1.5 text-xs font-medium transition-colors',
            question.allow_multiple ? 'text-ink' : 'text-ink-faint'
          )}
        >
          {question.allow_multiple
            ? <ToggleRight size={16} className="text-sage-DEFAULT" />
            : <ToggleLeft size={16} />
          }
          {question.allow_multiple ? 'Yes' : 'No'}
        </button>
      </div>
    </div>
  )
}

// ─── Scale ────────────────────────────────────────────────────────────────────

function ScaleSettings({ question, onUpdate }: { question: ScaleQuestion; onUpdate: (q: ScaleQuestion) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Scale range</label>
        <div className="flex items-center gap-2">
          {[5, 10].map(max => (
            <button
              key={max}
              onClick={e => { e.stopPropagation(); onUpdate({ ...question, max }) }}
              className={clsx(
                'px-3 py-1.5 text-sm rounded border transition-colors',
                question.max === max
                  ? 'border-ink bg-ink text-[#FAFAF8]'
                  : 'border-paper-border text-ink-muted hover:border-ink/30'
              )}
            >
              1 – {max}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Low end label</label>
          <input
            type="text"
            value={question.min_label || ''}
            onChange={e => onUpdate({ ...question, min_label: e.target.value })}
            className="input py-1.5 text-sm"
            placeholder="Not at all"
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div>
          <label className="label">High end label</label>
          <input
            type="text"
            value={question.max_label || ''}
            onChange={e => onUpdate({ ...question, max_label: e.target.value })}
            className="input py-1.5 text-sm"
            placeholder="Very much"
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Open Text ────────────────────────────────────────────────────────────────

function OpenTextSettings({ question, onUpdate }: { question: OpenTextQuestion; onUpdate: (q: OpenTextQuestion) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Placeholder text</label>
        <input
          type="text"
          value={question.placeholder || ''}
          onChange={e => onUpdate({ ...question, placeholder: e.target.value })}
          className="input py-1.5 text-sm"
          placeholder="Type your answer here..."
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div>
        <label className="label">Character limit (optional)</label>
        <input
          type="number"
          value={question.max_length || ''}
          onChange={e => onUpdate({ ...question, max_length: parseInt(e.target.value) || undefined })}
          className="input py-1.5 text-sm w-32"
          placeholder="1000"
          min={50}
          max={5000}
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

// ─── Yes/No ───────────────────────────────────────────────────────────────────

function YesNoSettings({ question, onUpdate }: { question: YesNoQuestion; onUpdate: (q: YesNoQuestion) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="label">Positive label</label>
        <input
          type="text"
          value={question.yes_label || 'Yes'}
          onChange={e => onUpdate({ ...question, yes_label: e.target.value })}
          className="input py-1.5 text-sm"
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div>
        <label className="label">Negative label</label>
        <input
          type="text"
          value={question.no_label || 'No'}
          onChange={e => onUpdate({ ...question, no_label: e.target.value })}
          className="input py-1.5 text-sm"
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

// ─── Numeric ──────────────────────────────────────────────────────────────────

function NumericSettings({ question, onUpdate }: { question: NumericQuestion; onUpdate: (q: NumericQuestion) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Number field label</label>
          <input
            type="text"
            value={question.number_label || ''}
            onChange={e => onUpdate({ ...question, number_label: e.target.value })}
            className="input py-1.5 text-sm"
            placeholder="e.g. Number of units"
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div>
          <label className="label">Unit (optional)</label>
          <input
            type="text"
            value={question.unit || ''}
            onChange={e => onUpdate({ ...question, unit: e.target.value })}
            className="input py-1.5 text-sm"
            placeholder="e.g. years, units, km"
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Elaboration field toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-paper-border">
        <div>
          <span className="text-xs text-ink-muted">Include elaboration field</span>
          <p className="text-xs text-ink-faint mt-0.5">Ask participant to expand on their number</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onUpdate({ ...question, show_text_field: !question.show_text_field }) }}
          className={clsx(
            'flex items-center gap-1.5 text-xs font-medium transition-colors flex-shrink-0 ml-4',
            question.show_text_field ? 'text-ink' : 'text-ink-faint'
          )}
        >
          {question.show_text_field
            ? <ToggleRight size={16} className="text-sage-DEFAULT" />
            : <ToggleLeft size={16} />
          }
          {question.show_text_field ? 'On' : 'Off'}
        </button>
      </div>

      {/* Elaboration field options — only shown when toggled on */}
      {question.show_text_field && (
        <div className="space-y-2 pl-3 border-l-2 border-paper-border animate-slide-down">
          <div>
            <label className="label">Elaboration label</label>
            <input
              type="text"
              value={question.text_label || ''}
              onChange={e => onUpdate({ ...question, text_label: e.target.value })}
              className="input py-1.5 text-sm"
              placeholder="e.g. Please elaborate"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div>
            <label className="label">Elaboration placeholder</label>
            <input
              type="text"
              value={question.text_placeholder || ''}
              onChange={e => onUpdate({ ...question, text_placeholder: e.target.value })}
              className="input py-1.5 text-sm"
              placeholder="Please elaborate..."
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-ink-muted">Elaboration required</span>
            <button
              onClick={e => { e.stopPropagation(); onUpdate({ ...question, text_required: !question.text_required }) }}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-medium transition-colors',
                question.text_required ? 'text-ink' : 'text-ink-faint'
              )}
            >
              {question.text_required
                ? <ToggleRight size={16} className="text-sage-DEFAULT" />
                : <ToggleLeft size={16} />
              }
              {question.text_required ? 'Yes' : 'No'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
