// ─── Question Types ───────────────────────────────────────────────────────────

export type QuestionType =
  | 'multiple_choice'
  | 'scale'
  | 'open_text'
  | 'yes_no'
  | 'numeric'
  | 'contact_details'

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
  unit?: string
  number_label?: string
  show_text_field: boolean
  text_label?: string
  text_required: boolean
  text_placeholder?: string
}

export interface ContactDetailsQuestion extends BaseQuestion {
  type: 'contact_details'
  collect_name: boolean
  collect_email: boolean
  collect_phone: boolean
  name_required: boolean
  email_required: boolean
  phone_required: boolean
  // When true, participants who skip all fields cannot submit
  require_at_least_one: boolean
}

export type Question =
  | MultipleChoiceQuestion
  | ScaleQuestion
  | OpenTextQuestion
  | YesNoQuestion
  | NumericQuestion
  | ContactDetailsQuestion

// ─── Project / Questionnaire ──────────────────────────────────────────────────

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
  value: string | string[] | number | boolean | NumericResponse | ContactDetailsResponse
}

export interface NumericResponse {
  number: number
  text?: string
}

export interface ContactDetailsResponse {
  name?: string
  email?: string
  phone?: string
}

// Flag reasons applied automatically based on quality signals
export type FlagReason =
  | 'completed_too_quickly'   // Under 30s for any questionnaire
  | 'open_text_too_short'     // Open text response under 5 characters
  | 'straight_lining'         // Same scale value selected for every scale question
  | 'all_na'                  // N/A selected for every question that allowed it
  | 'duplicate_suspected'     // Same email hash already exists for this project

// Researcher action on a flagged response
export type FlagStatus =
  | 'flagged'             // Unreviewed — included in analysis, flag visible
  | 'reviewed_included'   // Researcher reviewed and decided to include
  | 'reviewed_excluded'   // Researcher reviewed and decided to exclude

export interface ParticipantResponse {
  id: string
  project_id: string
  responses: QuestionResponse[]
  submitted_at: string
  session_id: string
  completion_time_seconds?: number
  // Quality signals
  flag_status?: FlagStatus
  flag_reasons?: FlagReason[]
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
  excluded_count?: number
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