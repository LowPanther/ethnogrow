import { createServerSideClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { detectFlags, FLAG_REASON_LABELS } from '@/lib/questions'
import { Question } from '@/types'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSideClient()
    const body = await req.json()

    const {
      project_id,
      session_id,
      responses,
      completion_time_seconds,
      email_hash,  // SHA-256 hash of participant email, computed client-side
    } = body

    if (!project_id || !session_id || !responses) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch project to get questions for flag detection
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('questions, status')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.status !== 'active') {
      return NextResponse.json({ error: 'This questionnaire is no longer accepting responses' }, { status: 403 })
    }

    // 2. Check for duplicate email hash if provided
    if (email_hash) {
      const { data: existing } = await supabase
        .from('response_verifications')
        .select('id')
        .eq('project_id', project_id)
        .eq('email_hash', email_hash)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'duplicate', message: 'You have already submitted a response to this questionnaire.' },
          { status: 409 }
        )
      }
    }

    // 3. Detect quality flags
    const draftResponse = {
      id: '',
      project_id,
      session_id,
      responses,
      submitted_at: new Date().toISOString(),
      completion_time_seconds,
    }

    const flagReasons = detectFlags(draftResponse, project.questions as Question[])

    // Add duplicate flag if email hash matched earlier attempts (already caught above,
    // but in case we want to surface it differently in future)
    const flagStatus = flagReasons.length > 0 ? 'flagged' : undefined

    // 4. Insert the response
    const { data: inserted, error: insertError } = await supabase
      .from('responses')
      .insert({
        project_id,
        session_id,
        responses,
        completion_time_seconds,
        flag_status: flagStatus ?? null,
        flag_reasons: flagReasons.length > 0 ? flagReasons : null,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    // 5. Store email hash for future deduplication
    if (email_hash) {
      await supabase
        .from('response_verifications')
        .insert({ project_id, email_hash })
    }

    return NextResponse.json({ success: true, id: inserted.id })
  } catch (err) {
    console.error('Response submission error:', err)
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}