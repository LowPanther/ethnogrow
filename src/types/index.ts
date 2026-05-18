// ─── Question Types ───────────────────────────────────────────────────────────

export type QuestionType = 
  | 'multiple_choice' 
  | 'scale' 
  | 'open_text' 
  | 'yes_no'
  | 'numeric'

export interface BaseQuestion {
  id: string
  type: QuestionType
  text: string
  required: boolean
  allow_na: boolean
  order: number
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice'
  options: string[]
  allow_multiple: boolean
}

export interface ScaleQuestion extends BaseQuestion {
  type: 'scale'
  min: number
  max: number
  min_label?: string
  max_label?: string
}

export interface OpenTextQuestion extends BaseQuestion {
  type: 'open_text'
  placeholder?: string
  max_length?: number
}

export interface YesNoQuestion extends BaseQuestion {
  type: 'yes_no'
  yes_label?: string
  no_label?: string
}

export interface NumericQuestion extends BaseQuestion {
  type: 'numeric'
  unit?: string                  // e.g. "units", "years" — shown as suffix
  number_label?: string          // label for the number field e.g. "Number of units"
  show_text_field: boolean       // researcher toggles elaboration field on/off
  text_label?: string            // label for the text field e.g. "Please elaborate"
  text_required: boolean         // whether the text field is required (only relevant if show_text_field is true)
  text_placeholder?: string
}

export type Question = 
  | MultipleChoiceQuestion 
  | ScaleQuestion 
  | OpenTextQuestion 
  | YesNoQuestion
  | NumericQuestion

// ─── Project / Questionnaire ─────────────────────────────────────────────────

export type ProjectStatus = 'draft' | 'active' | 'closed' | 'archived'

export interface Project {
  id: string
  researcher_id: string
  title: string
  description?: string
  status: ProjectStatus
  questions: Question[]
  participant_link?: string
  created_at: string
  updated_at: string
  response_count?: number
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface QuestionResponse {
  question_id: string
  question_type: QuestionType
  value: string | string[] | number | boolean | NumericResponse
}

export interface NumericResponse {
  number: number
  text?: string
}

export interface ParticipantResponse {
  id: string
  project_id: string
  responses: QuestionResponse[]
  submitted_at: string
  session_id: string
}

// ─── Auth / User ──────────────────────────────────────────────────────────────

export interface ResearcherProfile {
  id: string
  email: string
  full_name?: string
  organisation?: string
  created_at: string
}

// ─── AI Reports ───────────────────────────────────────────────────────────────

export interface AIReport {
  id: string
  project_id: string
  summary: string
  themes: Theme[]
  key_findings: string[]
  generated_at: string
  response_count: number
}

export interface Theme {
  label: string
  description: string
  frequency: number
  supporting_quotes?: string[]
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface BuilderState {
  project: Partial<Project>
  activeQuestionId: string | null
  isDirty: boolean
  isSaving: boolean
}