import { QuestionType, Question, MultipleChoiceQuestion, ScaleQuestion, OpenTextQuestion, YesNoQuestion, NumericQuestion } from '@/types'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function uuid() { return generateUUID() }

// ─── Question type metadata ───────────────────────────────────────────────────

export const QUESTION_TYPES: {
  type: QuestionType
  label: string
  description: string
  icon: string
  color: string
  bgColor: string
}[] = [
  {
    type: 'open_text',
    label: 'Open text',
    description: 'Free-form written response',
    icon: '✦',
    color: 'text-sage-DEFAULT',
    bgColor: 'bg-sage-pale',
  },
  {
    type: 'multiple_choice',
    label: 'Multiple choice',
    description: 'Choose one or many options',
    icon: '◉',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    type: 'scale',
    label: 'Scale rating',
    description: 'Numeric scale from 1 to 5 or 10',
    icon: '▬',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    type: 'yes_no',
    label: 'Yes / No',
    description: 'Simple binary response',
    icon: '⦿',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    type: 'numeric',
    label: 'Numeric',
    description: 'A number, with optional elaboration',
    icon: '#',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
]

export function getQuestionTypeMeta(type: QuestionType) {
  return QUESTION_TYPES.find(qt => qt.type === type)!
}

// ─── Question factories ───────────────────────────────────────────────────────

export function createQuestion(type: QuestionType, order: number): Question {
  const base = {
    id: uuid(),
    type,
    text: '',
    required: true,
    allow_na: false,
    order,
  }

  switch (type) {
    case 'multiple_choice':
      return {
        ...base,
        type: 'multiple_choice',
        options: ['Option 1', 'Option 2'],
        allow_multiple: false,
      } as MultipleChoiceQuestion

    case 'scale':
      return {
        ...base,
        type: 'scale',
        min: 1,
        max: 5,
        min_label: 'Not at all',
        max_label: 'Very much',
      } as ScaleQuestion

    case 'open_text':
      return {
        ...base,
        type: 'open_text',
        placeholder: 'Type your answer here...',
        max_length: 1000,
      } as OpenTextQuestion

    case 'yes_no':
      return {
        ...base,
        type: 'yes_no',
        yes_label: 'Yes',
        no_label: 'No',
      } as YesNoQuestion

    case 'numeric':
      return {
        ...base,
        type: 'numeric',
        number_label: '',
        unit: '',
        show_text_field: false,
        text_label: '',
        text_required: false,
        text_placeholder: 'Please elaborate...',
      } as NumericQuestion
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateQuestion(q: Question): string[] {
  const errors: string[] = []
  if (!q.text.trim()) errors.push('Question text is required')

  if (q.type === 'multiple_choice') {
    const mc = q as MultipleChoiceQuestion
    if (mc.options.length < 2) errors.push('At least 2 options required')
    if (mc.options.some(o => !o.trim())) errors.push('Options cannot be empty')
  }

  return errors
}

export function validateProject(title: string, questions: Question[]): string[] {
  const errors: string[] = []
  if (!title.trim()) errors.push('Project title is required')
  if (questions.length === 0) errors.push('Add at least one question')
  questions.forEach((q, i) => {
    const qErrors = validateQuestion(q)
    qErrors.forEach(e => errors.push(`Question ${i + 1}: ${e}`))
  })
  return errors
}