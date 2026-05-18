import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase-server'
import { Question, ParticipantResponse, QuestionResponse } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { project_id } = await req.json()
    if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    const supabase = createServerSideClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .eq('researcher_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch responses
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('project_id', project_id)
      .order('submitted_at', { ascending: true })

    if (responsesError) throw responsesError

    if (!responses || responses.length < 1) {
      return NextResponse.json({ error: 'No responses to analyse' }, { status: 400 })
    }

    // ── Check usage cap ───────────────────────────────────────

    let { data: usage } = await supabase
      .from('researcher_usage')
      .select('*')
      .eq('researcher_id', user.id)
      .single()

    // Auto-create usage record if missing
    if (!usage) {
      const { data: newUsage } = await supabase
        .from('researcher_usage')
        .insert({ researcher_id: user.id })
        .select()
        .single()
      usage = newUsage
    }

    const responseCap = usage?.response_cap ?? 50
    const plan = usage?.plan ?? 'free'

    // Cap the responses sent to Claude — never block data collection
    const cappedResponses = responses.slice(0, responseCap)
    const isCapped = responses.length > responseCap

    const questions = project.questions as Question[]

    // ── Build the prompt ──────────────────────────────────────

    const prompt = buildPrompt(project.title, project.description, questions, cappedResponses as ParticipantResponse[], isCapped, responses.length, responseCap)

    // ── Call Anthropic API ────────────────────────────────────

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4000,
        system: `You are a research analyst who writes reports for everyday people — not just academics or experts. Your job is to take questionnaire data and explain what it means in plain, simple English that anyone can understand.

Rules for your writing:
- Write like you are explaining findings to a smart friend who knows nothing about research
- Use short sentences. Avoid jargon. Never use words like "respondents", "cohort", "statistically significant", "findings indicate" — say "people said", "most people", "the data shows"
- Be specific with numbers — say "7 out of 10 people" or "67%" rather than "most people"
- Every insight should answer the question: so what does this mean?
- Detect the primary language used in the open text responses and write the entire report in that language
- You always respond with valid JSON only, no markdown, no preamble`,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error('Anthropic error:', err)
      throw new Error('AI analysis failed')
    }

    const anthropicData = await anthropicRes.json()
    const rawText = anthropicData.content?.[0]?.text || ''

    // Parse JSON response
    let reportData
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      reportData = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse AI response:', rawText)
      throw new Error('Failed to parse AI response')
    }

    // ── Save report to Supabase ───────────────────────────────

    const { data: savedReport, error: saveError } = await supabase
      .from('ai_reports')
      .upsert({
        project_id,
        summary: reportData.summary,
        themes: reportData.themes || [],
        key_findings: reportData.key_findings || [],
        question_insights: reportData.question_insights || [],
        sample_note: reportData.sample_note || null,
        response_count: cappedResponses.length,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'project_id' })
      .select()
      .single()

    if (saveError) throw saveError

    // Update responses_analysed count
    await supabase
      .from('researcher_usage')
      .update({
        responses_analysed: cappedResponses.length,
        updated_at: new Date().toISOString(),
      })
      .eq('researcher_id', user.id)

    return NextResponse.json({
      report: savedReport,
      capped: isCapped,
      total_responses: responses.length,
      analysed_responses: cappedResponses.length,
      response_cap: responseCap,
    })

  } catch (err: any) {
    console.error('Report generation error:', err)
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 })
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  title: string,
  description: string | null,
  questions: Question[],
  responses: ParticipantResponse[],
  isCapped: boolean = false,
  totalResponses: number = 0,
  responseCap: number = 50
): string {
  const responseCount = responses.length

  // Build per-question data
  const questionSummaries = questions.map(q => {
    const allAnswers = responses
      .flatMap(r => r.responses || [])
      .filter((r: QuestionResponse) => r.question_id === q.id)

    // Exclude N/A responses from analysis
    const answers = allAnswers.filter((r: QuestionResponse) => r.value !== '__NA__')
    const naCount = allAnswers.length - answers.length

    if (answers.length === 0) return null

    let dataBlock = ''

    if (q.type === 'scale') {
      const values = answers
        .map((a: QuestionResponse) => Number(a.value))
        .filter(v => !isNaN(v))
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const min = Math.min(...values)
      const max = Math.max(...values)
      const distribution: Record<number, number> = {}
      values.forEach(v => { distribution[v] = (distribution[v] || 0) + 1 })
      dataBlock = `Type: Scale (${(q as any).min}–${(q as any).max})
Average: ${avg.toFixed(2)}
Min: ${min}, Max: ${max}
Distribution: ${Object.entries(distribution).sort(([a], [b]) => Number(a) - Number(b)).map(([k, v]) => `${k}: ${v} responses`).join(', ')}`
    }

    else if (q.type === 'multiple_choice') {
      const counts: Record<string, number> = {}
      answers.forEach((a: QuestionResponse) => {
        const vals = Array.isArray(a.value) ? a.value : [a.value]
        vals.forEach((v: any) => { counts[String(v)] = (counts[String(v)] || 0) + 1 })
      })
      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
      dataBlock = `Type: Multiple choice
Responses: ${answers.length}
Results:
${sorted.map(([opt, count]) => `  - "${opt}": ${count} (${Math.round(count / answers.length * 100)}%)`).join('\n')}`
    }

    else if (q.type === 'yes_no') {
      const yes = answers.filter((a: QuestionResponse) => a.value === true || a.value === 'true' || a.value === 'Yes').length
      const no = answers.length - yes
      dataBlock = `Type: Yes/No
Yes: ${yes} (${Math.round(yes / answers.length * 100)}%)
No: ${no} (${Math.round(no / answers.length * 100)}%)`
    }

    else if (q.type === 'open_text') {
      const texts = answers
        .map((a: QuestionResponse) => String(a.value).trim())
        .filter(v => v.length > 0)
      dataBlock = `Type: Open text
Responses (${texts.length}):
${texts.map((t, i) => `  ${i + 1}. "${t}"`).join('\n')}`
    }

    const naNote = naCount > 0 ? `\nNote: ${naCount} participant(s) marked this question as N/A and are excluded from the above.` : ''
    const coverageNote = answers.length < responseCount ? `\nCOVERAGE: Only ${answers.length} of ${responseCount} total participants answered this question.` : ''
    return `QUESTION: "${q.text}"
${dataBlock}${naNote}${coverageNote}`
  }).filter(Boolean)

  const cappedNote = isCapped
    ? `\nNOTE: This researcher has ${totalResponses} total responses but their plan allows analysis of ${responseCap}. This report is based on the first ${responseCap} responses only. Mention this clearly in your sample_note.`
    : ''

  return `You are analysing responses to a research questionnaire.

PROJECT: "${title}"
${description ? `DESCRIPTION: ${description}` : ''}
TOTAL RESPONSES COLLECTED: ${totalResponses || responseCount}
RESPONSES INCLUDED IN THIS ANALYSIS: ${responseCount}${cappedNote}

Here is the data for each question:

${questionSummaries.join('\n\n---\n\n')}

---

Produce a research report as a JSON object with this exact structure:

{
  "summary": "3-4 sentence executive summary of the most important findings. Plain language. Specific, not vague.",
  "question_insights": [
    {
      "question": "exact question text",
      "type": "scale|multiple_choice|yes_no|open_text",
      "response_count": number of responses that answered this specific question,
      "total_responses": total number of responses collected for the project,
      "coverage_note": "only include this if response_count is less than total_responses — explain plainly that this question was added later or not all participants answered it",
      "headline": "one sentence plain-language finding",
      "detail": "2-3 sentences expanding on what the data means, not just what it says. Include specific numbers."
    }
  ],
  "themes": [
    {
      "label": "short theme name (2-4 words)",
      "description": "one sentence describing this theme",
      "frequency": number of responses that touch on this theme,
      "supporting_quotes": ["quote 1", "quote 2"]
    }
  ],
  "key_findings": [
    "Finding 1 — specific, actionable, backed by data",
    "Finding 2 — specific, actionable, backed by data",
    "Finding 3 — specific, actionable, backed by data"
  ],
  "sample_note": "one sentence about the sample size and what that means for confidence in these findings"
}

Rules:
- Write everything in the same language as the open text responses. If responses are in Zulu, write the report in Zulu. If in French, write in French. If mixed, use the dominant language.
- Themes should only come from open text responses
- Include 3-5 themes if there are open text questions, otherwise omit the themes array
- Key findings should be the 3 most important things someone making a decision would want to know
- Be specific with numbers — "7 out of 10 people said X" or "67% said X", never "most respondents said X"
- Exclude any responses marked as N/A from your analysis — they mean the question did not apply to that person
- For each question, include response_count (how many answered it) and total_responses (total in the project). If these differ, add a coverage_note explaining this plainly — e.g. "This question was added after the first 5 responses were collected, so only 3 people answered it"
- Never treat a low response count on a question as meaning people skipped it — it may just be a newer question
- If sample size is under 10, note this clearly and say findings should be treated as early signals, not firm conclusions
- Write summaries and insights a non-researcher could immediately act on
- Return only valid JSON, nothing else`
}
