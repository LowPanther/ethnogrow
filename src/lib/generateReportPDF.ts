/**
 * Ethnogrow AI Report — PDFKit Generator
 * src/lib/generateReportPDF.ts
 *
 * Called from src/app/api/export/report/route.ts
 * Fonts are loaded from public/fonts/ at the project root.
 */

import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ReportKeyFinding {
  title: string
  body?: string
}

export interface ReportQuestionInsight {
  question: string
  headline: string
  detail:   string
}

export interface ReportTheme {
  label:              string
  frequency:          number
  supporting_quotes?: string[]
}

export interface ReportData {
  summary?:           string
  key_findings?:      any[]
  question_insights?: ReportQuestionInsight[]
  themes?:            ReportTheme[]
  sample_note?:       string
}

export interface GenerateReportOptions {
  reportData:          ReportData
  projectTitle:        string
  projectDescription?: string
  generatedDate:       string
  responseCount:       number
}

// ── Geometry ───────────────────────────────────────────────────────────────────

const PAGE_W  = 595.28
const PAGE_H  = 841.89
const ML      = 51
const MR      = 51
const MT      = 45
const MB      = 45
const CW      = PAGE_W - ML - MR
const BOX_PAD = 28

const HEADER_BAR_H = 7
const HEADER_H     = 30
const FOOTER_H     = 24

// ── Colours ────────────────────────────────────────────────────────────────────

const C = {
  ink:          '#0F0F0F',
  teal:         '#2A7B6F',
  tealLight:    '#EAF3F1',
  coral:        '#E8603A',
  muted:        '#6B6B6B',
  rule:         '#E0E0DC',
  bgLight:      '#F5F5F3',
  white:        '#FFFFFF',
  coverCircle1: '#1F6059',
  coverCircle2: '#236860',
  coverSub:     '#C8E6E2',
  coverMeta:    '#A8CEC9',
  headerGrey:   '#AAAAAA',
}

// ── Fonts ──────────────────────────────────────────────────────────────────────

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')

function fp(file: string): string {
  const p = path.join(FONT_DIR, file)
  if (!fs.existsSync(p)) throw new Error(`Font not found: ${p}. Ensure fonts are in public/fonts/`)
  return p
}

const FONTS = {
  display:       () => fp('Fraunces/Fraunces-VariableFont_SOFT,WONK,opsz,wght.ttf'),
  displayItalic: () => fp('Fraunces/Fraunces-Italic-VariableFont_SOFT,WONK,opsz,wght.ttf'),
  body:          () => fp('Manrope/static/Manrope-Regular.ttf'),
  bodyMedium:    () => fp('Manrope/static/Manrope-Medium.ttf'),
  bodyBold:      () => fp('Manrope/static/Manrope-Bold.ttf'),
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function wrapText(doc: PDFKit.PDFDocument, text: string, maxWidth: number): string[] {
  const words = String(text).split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (doc.widthOfString(test) <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawWrapped(doc: PDFKit.PDFDocument, text: string, x: number, y: number, maxWidth: number, lineH: number): number {
  const lines = wrapText(doc, text, maxWidth)
  lines.forEach((line, i) => doc.text(line, x, y + i * lineH, { lineBreak: false }))
  return lines.length * lineH
}

function measureH(doc: PDFKit.PDFDocument, text: string, maxWidth: number, lineH: number): number {
  return wrapText(doc, text, maxWidth).length * lineH
}

interface State { projectTitle: string }

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number, state: State): number {
  const maxY = PAGE_H - MB - FOOTER_H
  if (y + needed > maxY) {
    doc.addPage()
    drawInnerHeader(doc, state.projectTitle)
    drawInnerFooter(doc)
    return MT + HEADER_H
  }
  return y
}

// ── Page decorations ───────────────────────────────────────────────────────────

function drawCoverPage(doc: PDFKit.PDFDocument, opts: GenerateReportOptions): void {
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.teal)
  doc.circle(PAGE_W + 5, 0, 90).fill(C.coverCircle1)
  doc.circle(PAGE_W - 20, 35, 55).fill(C.coverCircle2)

  const panelH = 80
  doc.rect(0, PAGE_H - panelH, PAGE_W, panelH).fill(C.white)
  doc.rect(0, PAGE_H - panelH - 3, PAGE_W, 3).fill(C.coral)

  // Wordmark
  doc.font(FONTS.display()).fontSize(13).fillColor(C.white)
     .text('Ethnogrow', ML, MT, { lineBreak: false })

  // Eyebrow
  doc.font(FONTS.body()).fontSize(8).fillColor(C.coverMeta)
     .text('AI RESEARCH REPORT', ML, MT + 20, { lineBreak: false })

  // Title
  doc.font(FONTS.display()).fontSize(26).fillColor(C.white)
  const titleLines = wrapText(doc, opts.projectTitle, CW - 20)
  let ty = MT + 48
  titleLines.forEach(line => {
    doc.text(line, ML, ty, { lineBreak: false })
    ty += 36
  })

  // Description
  if (opts.projectDescription) {
    const desc = opts.projectDescription.length > 110
      ? opts.projectDescription.slice(0, 107) + '…'
      : opts.projectDescription
    doc.font(FONTS.body()).fontSize(10).fillColor(C.coverSub)
       .text(desc, ML, ty + 4, { lineBreak: false })
  }

  // Meta row
  const metaItems = [
    { label: 'GENERATED', value: opts.generatedDate },
    { label: 'RESPONSES', value: String(opts.responseCount) },
    { label: 'ETHNOGROW', value: 'ethnogrow.com' },
  ]
  const metaY    = PAGE_H - panelH + 22
  const metaValY = metaY + 14
  let mx = ML
  metaItems.forEach(({ label, value }) => {
    doc.font(FONTS.body()).fontSize(7).fillColor(C.muted)
       .text(label, mx, metaY, { lineBreak: false })
    doc.font(FONTS.bodyMedium()).fontSize(9).fillColor(C.ink)
       .text(value, mx, metaValY, { lineBreak: false })
    mx += 165
  })
}

function drawInnerHeader(doc: PDFKit.PDFDocument, projectTitle: string): void {
  doc.rect(0, 0, PAGE_W, HEADER_BAR_H).fill(C.teal)

  doc.font(FONTS.display()).fontSize(10).fillColor(C.white)
     .text('Ethnogrow', ML, HEADER_BAR_H + 6, { lineBreak: false })

  const display = projectTitle.length > 48 ? projectTitle.slice(0, 45) + '…' : projectTitle
  doc.font(FONTS.body()).fontSize(7.5).fillColor(C.headerGrey)
     .text(`· ${display}`, ML + 68, HEADER_BAR_H + 7.5, { lineBreak: false })

  const pageStr = `Page ${(doc as any)._pageBuffer?.length ?? doc.bufferedPageRange().count}`
  doc.fontSize(7.5).fillColor(C.muted)
     .text(pageStr, PAGE_W - MR - 40, HEADER_BAR_H + 7.5, { lineBreak: false, width: 40, align: 'right' })

  doc.moveTo(ML, HEADER_BAR_H + 22)
     .lineTo(PAGE_W - MR, HEADER_BAR_H + 22)
     .strokeColor(C.rule).lineWidth(0.5).stroke()
}

function drawInnerFooter(doc: PDFKit.PDFDocument): void {
  const fy = PAGE_H - MB - 4
  doc.moveTo(ML, fy - 8).lineTo(PAGE_W - MR, fy - 8)
     .strokeColor(C.rule).lineWidth(0.5).stroke()
  doc.font(FONTS.body()).fontSize(7.5).fillColor(C.muted)
     .text('AI Research Report · Ethnogrow · ethnogrow.com', ML, fy, { lineBreak: false })
}

function drawRule(doc: PDFKit.PDFDocument, y: number): void {
  doc.moveTo(ML, y).lineTo(PAGE_W - MR, y)
     .strokeColor(C.rule).lineWidth(0.5).stroke()
}

// ── Section components ────────────────────────────────────────────────────────

function drawSectionHeader(doc: PDFKit.PDFDocument, eyebrow: string, title: string, y: number, state: State): number {
  y = ensureSpace(doc, y, 52, state)

  doc.font(FONTS.bodyMedium()).fontSize(7).fillColor(C.teal)
     .text(eyebrow.toUpperCase(), ML, y, { lineBreak: false, characterSpacing: 1.2 })
  y += 14

  doc.font(FONTS.display()).fontSize(17).fillColor(C.ink)
  const titleH = measureH(doc, title, CW, 22)
  y = ensureSpace(doc, y, titleH + 16, state)
  y += drawWrapped(doc, title, ML, y, CW, 22) + 8

  drawRule(doc, y)
  return y + 10
}

function drawSummaryBox(doc: PDFKit.PDFDocument, text: string, y: number, state: State): number {
  const innerW = CW - BOX_PAD * 2 - 4
  doc.font(FONTS.body()).fontSize(10)
  const boxH = measureH(doc, text, innerW, 16) + BOX_PAD * 2

  y = ensureSpace(doc, y, boxH, state)

  doc.roundedRect(ML, y, CW, boxH, 4).fill(C.tealLight)
  doc.roundedRect(ML, y, 4, boxH, 2).fill(C.teal)
  doc.fillColor(C.ink)
  drawWrapped(doc, text, ML + 4 + BOX_PAD, y + BOX_PAD, innerW, 16)

  return y + boxH
}

function drawFindingBox(doc: PDFKit.PDFDocument, number: number, title: string, body: string, y: number, state: State): number {
  const numColW = 28
  const textX   = ML + numColW + BOX_PAD
  const textW   = CW - numColW - BOX_PAD * 2

  doc.font(FONTS.bodyMedium()).fontSize(9.5)
  const titleH = measureH(doc, title, textW, 14)
  let bodyH = 0
  if (body) {
    doc.font(FONTS.body()).fontSize(8.5)
    bodyH = measureH(doc, body, textW, 13) + 5
  }
  const boxH = titleH + bodyH + BOX_PAD * 2

  y = ensureSpace(doc, y, boxH, state)

  doc.roundedRect(ML, y, CW, boxH, 4).fill(C.bgLight)

  const cx = ML + numColW / 2
  const cy = y + boxH / 2
  doc.circle(cx, cy, 10).fill(C.coral)
  doc.font(FONTS.bodyBold()).fontSize(9).fillColor(C.white)
     .text(String(number), cx - 4, cy - 4.5, { lineBreak: false })

  doc.font(FONTS.bodyMedium()).fontSize(9.5).fillColor(C.ink)
  drawWrapped(doc, title, textX, y + BOX_PAD, textW, 14)

  if (body) {
    doc.font(FONTS.body()).fontSize(8.5).fillColor(C.muted)
    drawWrapped(doc, body, textX, y + BOX_PAD + titleH + 5, textW, 13)
  }

  return y + boxH
}

function drawQuoteBox(doc: PDFKit.PDFDocument, text: string, y: number, state: State): number {
  const innerW = CW - BOX_PAD * 2 - 4
  const quoted = `"${text}"`
  doc.font(FONTS.display()).fontSize(9.5)
  const boxH = measureH(doc, quoted, innerW, 15) + BOX_PAD * 2

  y = ensureSpace(doc, y, boxH, state)

  doc.roundedRect(ML, y, CW, boxH, 4).fill(C.tealLight)
  doc.roundedRect(ML, y, 4, boxH, 2).fill(C.teal)
  doc.fillColor(C.ink)
  drawWrapped(doc, quoted, ML + 4 + BOX_PAD, y + BOX_PAD, innerW, 15)

  return y + boxH
}

// ── Section builders ──────────────────────────────────────────────────────────

function buildSummary(doc: PDFKit.PDFDocument, text: string, y: number, state: State): number {
  y = drawSectionHeader(doc, 'Overview', 'Summary', y, state)
  y = drawSummaryBox(doc, text, y, state)
  return y + 20
}

function buildKeyFindings(doc: PDFKit.PDFDocument, findings: any[], y: number, state: State): number {
  y = drawSectionHeader(doc, 'Analysis', 'Key Findings', y, state)
  findings.forEach((f, i) => {
    // Support both plain strings and {title, body} objects
    const title = typeof f === 'string' ? f : f.title
    const body  = typeof f === 'string' ? '' : (f.body || '')
    y = drawFindingBox(doc, i + 1, title, body, y, state)
    y += 8
  })
  return y + 12
}

function buildQuestionInsights(doc: PDFKit.PDFDocument, questions: ReportQuestionInsight[], y: number, state: State): number {
  y = drawSectionHeader(doc, 'Question by Question', 'Question Insights', y, state)

  questions.forEach(q => {
    doc.font(FONTS.display()).fontSize(10)
    const qH = measureH(doc, q.question, CW, 15)
    doc.font(FONTS.bodyMedium()).fontSize(9.5)
    const iH = measureH(doc, q.headline, CW, 14)
    doc.font(FONTS.body()).fontSize(9)
    const dH = measureH(doc, q.detail, CW, 14)

    if (y + qH + 6 + iH + 20 > PAGE_H - MB - FOOTER_H) {
      doc.addPage()
      drawInnerHeader(doc, state.projectTitle)
      drawInnerFooter(doc)
      y = MT + HEADER_H
    }

    doc.font(FONTS.display()).fontSize(10).fillColor(C.muted)
    y += drawWrapped(doc, q.question, ML, y, CW, 15) + 6

    doc.font(FONTS.bodyMedium()).fontSize(9.5).fillColor(C.ink)
    y += drawWrapped(doc, q.headline, ML, y, CW, 14) + 6

    doc.font(FONTS.body()).fontSize(9).fillColor(C.muted)
    y += drawWrapped(doc, q.detail, ML, y, CW, 14) + 12

    drawRule(doc, y)
    y += 14
  })

  return y + 8
}

function buildThemes(doc: PDFKit.PDFDocument, themes: ReportTheme[], y: number, state: State): number {
  y = drawSectionHeader(doc, 'Patterns', 'Themes', y, state)

  themes.forEach(t => {
    const firstQuoteH = t.supporting_quotes?.length ? BOX_PAD * 2 + 30 : 0
    y = ensureSpace(doc, y, 14 + 13 + 8 + firstQuoteH, state)

    doc.font(FONTS.bodyMedium()).fontSize(9.5).fillColor(C.ink)
    drawWrapped(doc, t.label, ML, y, CW, 14)
    y += 14 + 3

    doc.font(FONTS.body()).fontSize(8).fillColor(C.muted)
    doc.text(`${t.frequency} mention${t.frequency !== 1 ? 's' : ''}`, ML, y, { lineBreak: false })
    y += 13 + 8

    if (t.supporting_quotes?.length) {
      t.supporting_quotes.forEach((q: string) => {
        y = drawQuoteBox(doc, q, y, state)
        y += 7
      })
    }

    y += 10
  })

  return y
}

function buildSampleNote(doc: PDFKit.PDFDocument, note: string, y: number, state: State): void {
  y = ensureSpace(doc, y, 60, state)
  drawRule(doc, y)
  y += 10

  doc.font(FONTS.bodyMedium()).fontSize(7).fillColor(C.teal)
     .text('A NOTE ON SAMPLE SIZE', ML, y, { lineBreak: false, characterSpacing: 1.2 })
  y += 14

  doc.font(FONTS.body()).fontSize(8).fillColor(C.muted)
  drawWrapped(doc, note, ML, y, CW, 13)
}

// ── Main export ────────────────────────────────────────────────────────────────

export function generateReportPDF(opts: GenerateReportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true,
      info: {
        Title:   opts.projectTitle,
        Author:  'Ethnogrow',
        Subject: 'AI Research Report',
      },
    })

    doc.on('data',  (chunk: Buffer) => chunks.push(chunk))
    doc.on('end',   ()              => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const state: State = { projectTitle: opts.projectTitle }
    const { reportData } = opts

    // Cover
    drawCoverPage(doc, opts)

    // Inner pages
    doc.addPage()
    drawInnerHeader(doc, opts.projectTitle)
    drawInnerFooter(doc)
    let y = MT + HEADER_H

    if (reportData.summary) {
      y = buildSummary(doc, reportData.summary, y, state)
    }
    if (reportData.key_findings?.length) {
      y = buildKeyFindings(doc, reportData.key_findings, y, state)
    }
    if (reportData.question_insights?.length) {
      y = buildQuestionInsights(doc, reportData.question_insights, y, state)
    }
    if (reportData.themes?.length) {
      y = buildThemes(doc, reportData.themes, y, state)
    }
    if (reportData.sample_note) {
      buildSampleNote(doc, reportData.sample_note, y, state)
    }

    doc.end()
  })
}