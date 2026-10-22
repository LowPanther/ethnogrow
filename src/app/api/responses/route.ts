import { createServiceRoleClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { detectFlags } from '@/lib/questions'
import { Question } from '@/types'

function emailMatchesAllowlist(email: string, allowlist: string[]): boolean {
  const normalised = email.trim().toLowerCase()
  const domain = normalised.split('@')[1]
  return allowlist.some(entry => {
    const e = entry.trim().toLowerCase().replace(/^@/, '')
    if (e.includes('@')) return normalised === e
    return domain === e
  })
}

async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const body = await req.json()

    const {
      project_id,
      session_id,
      responses,
      completion_time_seconds,
      email,
      participant_token,
    } = body

    if (!project_id || !session_id || !participant_token || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('questions, status, allowed_emails')
      .eq('participant_token', participant_token)
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.status !== 'active') {
      return NextResponse.json({ error: 'This questionnaire is no longer accepting responses.' }, { status: 403 })
    }

    // 2. Allowlist check — second gate (server-side, cannot be bypassed)
    if (project.allowed_emails && project.allowed_emails.length > 0) {
      if (typeof email !== 'string' || !email.trim()) {
        return NextResponse.json({ error: 'Email is required for this questionnaire' }, { status: 403 })
      }
      const allowed = emailMatchesAllowlist(email, project.allowed_emails)
      if (!allowed) {
        return NextResponse.json({
          error: 'not_allowed',
          message: 'This questionnaire is only available to specific participants.',
        }, { status: 403 })
      }
    }

    // 3. Compute hash server-side if plain email provided
    let finalHash: string | undefined
    if (typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      finalHash = await hashEmail(email)
    } else {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    // Flagging is still calculated in the application; insertion and de-duplication
    // must happen atomically in the database to avoid concurrent double-submissions.
    const draftResponse = {
      id: '',
      project_id,
      session_id,
      responses,
      submitted_at: new Date().toISOString(),
      completion_time_seconds,
    }
    const flagReasons = detectFlags(draftResponse, project.questions as Question[])

    const { data: insertedId, error: submitError } = await supabase.rpc(
      'submit_survey_response_atomic',
      {
        p_project_id: project_id,
        p_email_hash: finalHash,
        p_session_id: session_id,
        p_responses: responses,
        p_completion_time_seconds: completion_time_seconds ?? null,
        p_flag_reasons: flagReasons.length ? flagReasons : null,
      }
    )

    if (submitError) {
      if (submitError.code === '23505' || submitError.message.includes('already_submitted')) {
        return NextResponse.json(
          { error: 'duplicate', message: 'You have already submitted a response to this questionnaire.' },
          { status: 409 }
        )
      }
      throw submitError
    }

    return NextResponse.json({ success: true, id: insertedId })
  } catch (err) {
    console.error('Response submission error:', err)
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}