import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase-server'
import { Question, ParticipantResponse, QuestionResponse } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { project_id, report_id } = await req.json()
    if (!project_id || !report_id) {
      return NextResponse.json({ error: 'project_id and report_id required' }, { status: 400 })
    }

    const supabase = createServerSideClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch project — verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .eq('researcher_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch the report — we pass this to Claude as context
    const { data: report, error: reportError } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('id', report_id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Fetch responses — read only, never written to
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('project_id', project_id)

    if (responsesError) throw responsesError

    const questions = project.questions as Question[]
    const responseList = (responses || []) as ParticipantResponse[]

    // ── Build prompt ──────────────────────────────────────────

    const prompt = buildSuggestionsPrompt(
      project.title,
      questions,
      responseList,
      report
    )

    // ── Call Anthropic ────────────────────────────────────────

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: `You are a research design assistant. Your job is to look at questionnaire data and suggest follow-up questions that would help the researcher go deeper.

Critical rules:
- You ONLY suggest new questions. You never modify, interpret, or add to the existing response data.
- Your suggestions must be grounded in actual patterns visible in the data — not speculation.
- Every suggestion must reference a specific, observable pattern as its reason.
- You write in plain, simple language. No research jargon.
- You always respond with valid JSON only, no markdown, no preamble.`,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error('Anthropic error:', err)
      throw new Error('AI suggestion generation failed')
    }

    const anthropicData = await anthropicRes.json()
    const rawText = anthropicData.content?.[0]?.text || ''

    let suggestionsData
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      suggestionsData = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse suggestions response:', rawText)
      throw new Error('Failed to parse AI response')
    }

    // ── Delete old pending suggestions for this project ───────

    await supabase
      .from('ai_suggestions')
      .delete()
      .eq('project_id', project_id)
      .eq('status', 'pending')

    // ── Save new suggestions ──────────────────────────────────
    // Suggestions are their own data — completely separate from responses

    const toInsert = (suggestionsData.suggestions || []).map((s: any) => ({
      project_id,
      report_id,
      question_text: s.question_text,
      question_type: s.question_type,
      rationale: s.rationale,
      source_pattern: s.source_pattern,
      status: 'pending',
    }))

    if (toInsert.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const { data: savedSuggestions, error: saveError } = await supabase
      .from('ai_suggestions')
      .insert(toInsert)
      .select()

    if (saveError) throw saveError

    return NextResponse.json({ suggestions: savedSuggestions })

  } catch (err: any) {
    console.error('Suggestion generation error:', err)
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  // Update suggestion status (added / dismissed)
  try {
    const { suggestion_id, status } = await req.json()
    if (!suggestion_id || !status) {
      return NextResponse.json({ error: 'suggestion_id and status required' }, { status: 400 })
    }

    const supabase = createServerSideClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('ai_suggestions')
      .update({ status })
      .eq('id', suggestion_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ suggestion: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildSuggestionsPrompt(
  title: string,
  questions: Question[],
  responses: ParticipantResponse[],
  report: any
): string {
  const responseCount = responses.length

  // Build a factual summary of what the data actually shows
  // This is strictly derived from real data — no inference
  const questionSummaries = questions.map(q => {
    const answers = responses
      .flatMap(r => r.responses || [])
      .filter((r: QuestionResponse) => r.question_id === q.id)
      .filter((r: QuestionResponse) => r.value !== '__NA__')

    if (answers.length === 0) return `"${q.text}" — no responses`

    let summary = `"${q.text}" (${q.type})`

    if (q.type === 'scale') {
      const values = answers.map((a: QuestionResponse) => Number(a.value)).filter(v => !isNaN(v))
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const low = values.filter(v => v <= 2).length
      const high = values.filter(v => v >= 4).length
      summary += `\n  Average: ${avg.toFixed(1)} | Low scores (1-2): ${low} | High scores (4-5): ${high}`
      if (low > 0 && high > 0) summary += `\n  PATTERN: Polarised responses — both low and high scores present`
    }

    if (q.type === 'multiple_choice') {
      const counts: Record<string, number> = {}
      answers.forEach((a: QuestionResponse) => {
        const vals = Array.isArray(a.value) ? a.value : [a.value]
        vals.forEach((v: any) => { counts[String(v)] = (counts[String(v)] || 0) + 1 })
      })
      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
      const otherCount = sorted.filter(([k]) => k.startsWith('Other')).reduce((sum, [, v]) => sum + v, 0)
      summary += '\n  ' + sorted.map(([opt, count]) => `"${opt}": ${count}`).join(', ')
      if (otherCount > 0) summary += `\n  PATTERN: ${otherCount} people selected Other — unexplored category`
      if (sorted[0]?.[1] / answers.length > 0.6) summary += `\n  PATTERN: Strong majority chose "${sorted[0][0]}" — possible probe opportunity`
    }

    if (q.type === 'yes_no') {
      const yes = answers.filter((a: QuestionResponse) => a.value === true || a.value === 'Yes').length
      const no = answers.length - yes
      summary += `\n  Yes: ${yes} | No: ${no}`
      if (yes > 0 && no > 0) summary += `\n  PATTERN: Split response — reasons on each side unexplored`
    }

    if (q.type === 'open_text') {
      const texts = answers.map((a: QuestionResponse) => String(a.value).trim()).filter(v => v.length > 2)
      summary += `\n  ${texts.length} responses:`
      texts.forEach((t, i) => { summary += `\n  ${i + 1}. "${t}"` })
    }

    return summary
  })

  return `You are helping a researcher improve their questionnaire based on what the data is actually showing.

PROJECT: "${title}"
RESPONSES COLLECTED: ${responseCount}

EXISTING QUESTIONS AND WHAT THE DATA SHOWS:
${questionSummaries.join('\n\n')}

REPORT THEMES ALREADY IDENTIFIED:
${JSON.stringify(report.themes || [], null, 2)}

REPORT KEY FINDINGS:
${(report.key_findings || []).map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}

---

Based ONLY on the patterns visible in the data above, suggest 3-5 follow-up questions that would help the researcher go deeper.

For each suggestion you must:
1. Point to a specific, observable pattern in the data that triggered this suggestion
2. Explain in plain English why this question would be valuable
3. Choose the most appropriate question type
4. Write the question itself

Important:
- Only suggest questions grounded in real patterns from the data above
- Do not invent patterns that are not visible in the data
- Do not suggest questions that are already being asked
- Write questions in the same language as the existing questions
- Prefer open text when the goal is to understand WHY, scale when measuring degree, multiple choice when the options are predictable

Respond with this exact JSON structure:
{
  "suggestions": [
    {
      "question_text": "The actual question the researcher should ask",
      "question_type": "open_text|scale|multiple_choice|yes_no",
      "rationale": "Plain English explanation of why this question would be useful — one sentence",
      "source_pattern": "The specific thing in the data that triggered this suggestion — be precise, e.g. '40% selected Other on question 2' or 'Scale responses were polarised with 3 low and 3 high scores'"
    }
  ]
}`
}