import { createServerSideClient } from '@/lib/supabase-server'
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
    const supabase = createServerSideClient()
    const body = await req.json()

    const {
      project_id,
      session_id,
      responses,
      completion_time_seconds,
      email,      // plain text — used for allowlist check and hashing, never stored
      email_hash, // pre-computed hash from client as fallback
    } = body

    if (!project_id || !session_id || !responses) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('questions, status, allowed_emails')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.status !== 'active') {
      return NextResponse.json({ error: 'This questionnaire is no longer accepting responses.' }, { status: 403 })
    }

    // 2. Allowlist check — second gate (server-side, cannot be bypassed)
    if (project.allowed_emails && project.allowed_emails.length > 0 && email) {
      const allowed = emailMatchesAllowlist(email, project.allowed_emails)
      if (!allowed) {
        return NextResponse.json({
          error: 'not_allowed',
          message: 'This questionnaire is only available to specific participants.',
        }, { status: 403 })
      }
    }

    // 3. Compute hash server-side if plain email provided (more reliable than client hash)
    let finalHash: string | undefined = email_hash
    if (email) {
      finalHash = await hashEmail(email)
    }

    // 4. Duplicate check
    if (finalHash) {
      const { data: existing } = await supabase
        .from('response_verifications')
        .select('id')
        .eq('project_id', project_id)
        .eq('email_hash', finalHash)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'duplicate', message: 'You have already submitted a response to this questionnaire.' },
          { status: 409 }
        )
      }
    }

    // 5. Detect quality flags
    const draftResponse = {
      id: '',
      project_id,
      session_id,
      responses,
      submitted_at: new Date().toISOString(),
      completion_time_seconds,
    }

    const flagReasons = detectFlags(draftResponse, project.questions as Question[])
    const flagStatus = flagReasons.length > 0 ? 'flagged' : null

    // 6. Insert response
    const { data: inserted, error: insertError } = await supabase
      .from('responses')
      .insert({
        project_id,
        session_id,
        responses,
        completion_time_seconds,
        flag_status: flagStatus,
        flag_reasons: flagReasons.length > 0 ? flagReasons : null,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    // 7. Store email hash for deduplication
    if (finalHash) {
      await supabase
        .from('response_verifications')
        .insert({ project_id, email_hash: finalHash })
    }

    return NextResponse.json({ success: true, id: inserted.id })
  } catch (err) {
    console.error('Response submission error:', err)
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}