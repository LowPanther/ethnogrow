'use client'

import { QuestionType } from '@/types'
import { QUESTION_TYPES } from '@/lib/questions'
import { clsx } from 'clsx'

interface QuestionTypeSelectorProps {
  onSelect: (type: QuestionType) => void
}

export function QuestionTypeSelector({ onSelect }: QuestionTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {QUESTION_TYPES.map(({ type, label, description, icon, color, bgColor }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={clsx(
            'flex items-start gap-3 p-3 rounded-lg border border-paper-border text-left',
            'transition-all duration-150 hover:border-ink/20 hover:shadow-card',
            'active:scale-[0.98] group'
          )}
        >
          <span className={clsx(
            'flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-sm font-mono mt-0.5',
            bgColor, color
          )}>
            {icon}
          </span>
          <div>
            <div className="text-sm font-medium text-ink leading-tight">{label}</div>
            <div className="text-xs text-ink-muted mt-0.5 leading-snug">{description}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
