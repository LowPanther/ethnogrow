import { QuestionType, Question, MultipleChoiceQuestion, ScaleQuestion, OpenTextQuestion, YesNoQuestion, NumericQuestion, ContactDetailsQuestion, InfoBlockQuestion } from '@/types'

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
  {
    type: 'contact_details',
    label: 'Contact details',
    description: 'Name, email, and/or phone number',
    icon: '@',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    type: 'info_block',
    label: 'Information',
    description: 'Display text with no response required',
    icon: '①',
    color: 'text-ink-muted',
    bgColor: 'bg-paper-mid',
  },
]

export function getQuestionTypeMeta(type: QuestionType) {
  return QUESTION_TYPES.find(qt => qt.type === type)!
}

// ─── Question factories ───────────────────────────────────────────────────────

export function createQuestion(type: QuestionType, order: number): Question {
  const base = {
    id: uuid(),
    parent_id: null,
    type,
    text: '',
    required: false,
    allow_na: false,
    order,
  }

  switch (type) {
    case 'multiple_choice':
      return {
        ...base,
        type: 'multiple_choice',
        required: true,
        options: ['Option 1', 'Option 2'],
        allow_multiple: false,
      } as MultipleChoiceQuestion

    case 'scale':
      return {
        ...base,
        type: 'scale',
        required: true,
        min: 1,
        max: 5,
        min_label: 'Not at all',
        max_label: 'Very much',
      } as ScaleQuestion

    case 'open_text':
      return {
        ...base,
        type: 'open_text',
        required: true,
        placeholder: 'Type your answer here...',
        max_length: 1000,
      } as OpenTextQuestion

    case 'yes_no':
      return {
        ...base,
        type: 'yes_no',
        required: true,
        yes_label: 'Yes',
        no_label: 'No',
      } as YesNoQuestion

    case 'numeric':
      return {
        ...base,
        type: 'numeric',
        required: true,
        number_label: '',
        unit: '',
        show_text_field: false,
        text_label: '',
        text_required: false,
        text_placeholder: 'Please elaborate...',
      } as NumericQuestion

    case 'contact_details':
      return {
        ...base,
        type: 'contact_details',
        text: 'Before you go — would you like to share your contact details?',
        required: false,
        collect_name: true,
        collect_email: true,
        collect_phone: false,
        name_required: false,
        email_required: false,
        phone_required: false,
        require_at_least_one: false,
      } as ContactDetailsQuestion

    case 'info_block':
      return {
        ...base,
        type: 'info_block',
        required: false,
        allow_na: false,
        heading: '',
        text: '',
      } as InfoBlockQuestion
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateQuestion(q: Question): string[] {
  const errors: string[] = []

  if (q.type === 'info_block') {
    if (!q.text.trim()) errors.push('Information block body is required')
    return errors
  }

  if (!q.text.trim()) errors.push('Question text is required')

  if (q.type === 'multiple_choice') {
    const mc = q as MultipleChoiceQuestion
    if (mc.options.length < 2) errors.push('At least 2 options required')
    if (mc.options.some(o => !o.trim())) errors.push('Options cannot be empty')
  }

  if (q.type === 'contact_details') {
    const cd = q as ContactDetailsQuestion
    if (!cd.collect_name && !cd.collect_email && !cd.collect_phone) {
      errors.push('At least one contact field must be enabled')
    }
  }

  return errors
}

export function validateProject(title: string, questions: Question[]): string[] {
  const errors: string[] = []
  if (!title.trim()) errors.push('Project title is required')
  if (questions.filter(q => q.type !== 'info_block').length === 0) errors.push('Add at least one question')
  questions.forEach((q, i) => {
    const qErrors = validateQuestion(q)
    qErrors.forEach(e => errors.push(`Question ${i + 1}: ${e}`))
  })
  return errors
}

// ─── Response quality flagging ────────────────────────────────────────────────

import { ParticipantResponse, FlagReason } from '@/types'

export function detectFlags(
  response: ParticipantResponse,
  questions: Question[]
): FlagReason[] {
  const flags: FlagReason[] = []
  const { responses, completion_time_seconds } = response

  // 1. Completed too quickly
  if (completion_time_seconds !== undefined && completion_time_seconds < 30) {
    flags.push('completed_too_quickly')
  }

  // 2. Open text responses too short
  const openTextResponses = responses.filter(r => r.question_type === 'open_text')
  const hasShortOpenText = openTextResponses.some(r => {
    const val = r.value as string
    return val && val !== '__NA__' && val.trim().length < 5
  })
  if (hasShortOpenText) flags.push('open_text_too_short')

  // 3. Straight-lining on scale questions
  const scaleResponses = responses.filter(
    r => r.question_type === 'scale' && r.value !== '__NA__'
  )
  if (scaleResponses.length >= 3) {
    const values = scaleResponses.map(r => r.value as number)
    const allSame = values.every(v => v === values[0])
    if (allSame) flags.push('straight_lining')
  }

  // 4. All N/A
  const naAllowedQuestions = questions.filter(q => q.allow_na)
  if (naAllowedQuestions.length >= 3) {
    const naResponses = responses.filter(r => r.value === '__NA__')
    if (naResponses.length === naAllowedQuestions.length) {
      flags.push('all_na')
    }
  }

  return flags
}

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  completed_too_quickly: 'Completed in under 30 seconds',
  open_text_too_short:   'Open text response is very short',
  straight_lining:       'Same scale value selected for every scale question',
  all_na:                'Every applicable question was marked N/A',
  duplicate_suspected:   'Possible duplicate submission',
}