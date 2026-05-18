'use client'

import { Question, ParticipantResponse, NumericResponse } from '@/types'

interface Props {
  question: Question
  responses: ParticipantResponse[]
}

export function QuestionVisualisation({ question, responses }: Props) {
  const rawValues = responses
    .flatMap(r => r.responses)
    .filter(r => r.question_id === question.id)

  const naCount = rawValues.filter(r => r.value === '__NA__').length
  const values = rawValues.filter(r => r.value !== '__NA__').map(r => r.value)
  const total = values.length

  if (total === 0 && naCount === 0) return null

  if (total === 0) {
    return (
      <div className="mt-3 rounded-lg bg-paper-warm border border-paper-border px-4 py-3">
        <p className="text-xs text-ink-faint italic">
          {naCount} {naCount === 1 ? 'response' : 'responses'} marked N/A — no data to display
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-lg bg-paper-warm border border-paper-border px-4 py-4">
      {question.type === 'open_text' && (
        <OpenTextVis values={values as string[]} naCount={naCount} />
      )}
      {question.type === 'multiple_choice' && (
        <MultipleChoiceVis question={question} values={values} total={total} naCount={naCount} />
      )}
      {question.type === 'scale' && (
        <ScaleVis question={question} values={values as number[]} total={total} naCount={naCount} />
      )}
      {question.type === 'yes_no' && (
        <YesNoVis question={question} values={values} total={total} naCount={naCount} />
      )}
      {question.type === 'numeric' && (
        <NumericVis question={question} values={values as NumericResponse[]} total={total} naCount={naCount} />
      )}
    </div>
  )
}

// ─── Open Text ────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','it','its','was','are','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','can',
  'i','you','he','she','we','they','my','your','his','her','our','their',
  'this','that','these','those','not','no','so','if','as','by','from',
  'up','about','into','than','then','there','when','where','who','which',
  'what','how','all','just','also','more','very','really','quite','like',
  'get','got','make','made','think','know','see','go','going','one','some',
])

function extractKeywords(values: string[]): { word: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const v of values) {
    const words = v
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
    const seen = new Set<string>()
    for (const w of words) {
      if (!seen.has(w)) {
        counts[w] = (counts[w] || 0) + 1
        seen.add(w)
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count]) => ({ word, count }))
}

function OpenTextVis({ values, naCount }: { values: string[]; naCount: number }) {
  const keywords = extractKeywords(values)
  const max = keywords[0]?.count || 1

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-semibold text-ink">{values.length}</span>
        <span className="text-xs text-ink-muted">response{values.length !== 1 ? 's' : ''}</span>
      </div>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map(({ word, count }) => {
            const intensity = count / max
            return (
              <span
                key={word}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                style={{
                  backgroundColor: `rgba(74, 124, 111, ${0.08 + intensity * 0.18})`,
                  borderColor: `rgba(74, 124, 111, ${0.15 + intensity * 0.25})`,
                  color: intensity > 0.5 ? '#2D5C52' : '#4A7C6F',
                  fontWeight: intensity > 0.6 ? 500 : 400,
                }}
              >
                {word}
                <span className="font-mono opacity-60">{count}</span>
              </span>
            )
          })}
        </div>
      )}
      {naCount > 0 && <NaNote count={naCount} />}
    </div>
  )
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────

function MultipleChoiceVis({
  question, values, total, naCount,
}: {
  question: any; values: any[]; total: number; naCount: number
}) {
  const flat = values.flatMap(v => (Array.isArray(v) ? v : [v])) as string[]

  const counts: Record<string, number> = {}
  for (const opt of question.options) counts[opt] = 0
  for (const v of flat) {
    if (v in counts) counts[v]++
    else counts[v] = (counts[v] || 0) + 1
  }

  return (
    <div className="space-y-2.5">
      {Object.entries(counts).map(([label, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-ink leading-snug">{label}</span>
              <span className="text-xs font-mono text-ink-muted ml-4 shrink-0">{count} · {pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: '#E0DFD8' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: '#4A7C6F',
                  transition: 'width 0.5s ease',
                  minWidth: count > 0 ? '4px' : '0',
                }}
              />
            </div>
          </div>
        )
      })}
      {naCount > 0 && <NaNote count={naCount} />}
    </div>
  )
}

// ─── Scale ────────────────────────────────────────────────────────────────────

function ScaleVis({
  question, values, total, naCount,
}: {
  question: any; values: number[]; total: number; naCount: number
}) {
  const nums = values.map(v => Number(v)).filter(v => !isNaN(v))
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length
  const range = Array.from({ length: question.max - question.min + 1 }, (_, i) => i + question.min)

  const counts: Record<number, number> = {}
  for (const n of range) counts[n] = 0
  for (const v of nums) counts[v] = (counts[v] || 0) + 1
  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold text-ink">{avg.toFixed(1)}</span>
        <span className="text-xs text-ink-muted">avg out of {question.max}</span>
        {question.min_label && question.max_label && (
          <span className="text-xs text-ink-faint ml-1">({question.min_label} → {question.max_label})</span>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        {range.map(n => {
          const count = counts[n] || 0
          const height = Math.max((count / max) * 48, count > 0 ? 6 : 2)
          const isAboveAvg = n > avg
          return (
            <div key={n} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xs font-mono text-ink-faint">{count > 0 ? count : ''}</span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${height}px`,
                  backgroundColor: isAboveAvg ? '#4A7C6F' : '#E8F2F0',
                  opacity: count === 0 ? 0.3 : 1,
                  transition: 'height 0.5s ease',
                }}
              />
              <span className="text-xs font-mono text-ink-muted">{n}</span>
            </div>
          )
        })}
      </div>
      {naCount > 0 && <NaNote count={naCount} />}
    </div>
  )
}

// ─── Yes / No ─────────────────────────────────────────────────────────────────

function YesNoVis({
  question, values, total, naCount,
}: {
  question: any; values: any[]; total: number; naCount: number
}) {
  const yesLabel = question.yes_label || 'Yes'
  const noLabel = question.no_label || 'No'

  const yesCount = values.filter(v => v === true || v === 'true' || v === yesLabel).length
  const noCount = values.filter(v => v === false || v === 'false' || v === noLabel).length
  const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : 0
  const noPct = total > 0 ? Math.round((noCount / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg bg-white border border-paper-border px-4 py-3">
          <span className="font-display text-2xl font-semibold text-sage-DEFAULT">{yesCount}</span>
          <p className="text-xs text-ink-muted mt-0.5">{yesLabel} · {yesPct}%</p>
        </div>
        <div className="flex-1 rounded-lg bg-white border border-paper-border px-4 py-3">
          <span className="font-display text-2xl font-semibold text-ink-muted">{noCount}</span>
          <p className="text-xs text-ink-muted mt-0.5">{noLabel} · {noPct}%</p>
        </div>
      </div>
      {naCount > 0 && <NaNote count={naCount} />}
    </div>
  )
}

// ─── Numeric ──────────────────────────────────────────────────────────────────

function NumericVis({
  question, values, total, naCount,
}: {
  question: any; values: NumericResponse[]; total: number; naCount: number
}) {
  const nums = values
    .map(v => (typeof v === 'object' && v !== null ? Number(v.number) : Number(v)))
    .filter(v => !isNaN(v))

  if (nums.length === 0) return <p className="text-xs text-ink-faint italic">No numeric data yet</p>

  const avg = nums.reduce((a, b) => a + b, 0) / nums.length
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const unit = question.unit ? ` ${question.unit}` : ''

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg bg-white border border-paper-border px-4 py-3">
          <span className="font-display text-2xl font-semibold text-ink">
            {avg % 1 === 0 ? avg : avg.toFixed(1)}{unit}
          </span>
          <p className="text-xs text-ink-muted mt-0.5">average</p>
        </div>
        <div className="flex-1 rounded-lg bg-white border border-paper-border px-4 py-3">
          <span className="font-display text-2xl font-semibold text-ink-muted">{min}{unit}</span>
          <p className="text-xs text-ink-faint mt-0.5">min</p>
        </div>
        <div className="flex-1 rounded-lg bg-white border border-paper-border px-4 py-3">
          <span className="font-display text-2xl font-semibold text-ink-muted">{max}{unit}</span>
          <p className="text-xs text-ink-faint mt-0.5">max</p>
        </div>
      </div>
      {naCount > 0 && <NaNote count={naCount} />}
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function NaNote({ count }: { count: number }) {
  return (
    <p className="text-xs text-ink-faint">
      {count} {count === 1 ? 'response' : 'responses'} marked N/A — excluded
    </p>
  )
}
