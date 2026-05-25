// Export utilities — runs client-side, no server needed

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function exportResponsesCSV(
    responses: any[],
    questions: any[],
    projectTitle: string
  ) {
    // Build header row from question texts
    const headers = ['Response #', 'Submitted at', ...questions.map(q => q.text)]
  
    // Build data rows
    const rows = responses.map((r, i) => {
      const rowData: string[] = [
        String(responses.length - i),
        new Date(r.submitted_at).toLocaleString('en-GB'),
      ]
  
      for (const question of questions) {
        const response = r.responses?.find((resp: any) => resp.question_id === question.id)
        if (!response) {
          rowData.push('')
        } else if (response.value === '__NA__') {
          rowData.push('N/A')
        } else if (typeof response.value === 'object' && response.value !== null && 'number' in response.value) {
          // Numeric type
          const val = response.value
          rowData.push(val.text ? `${val.number} — ${val.text}` : String(val.number))
        } else if (Array.isArray(response.value)) {
          rowData.push(response.value.join('; '))
        } else {
          rowData.push(String(response.value))
        }
      }
  
      return rowData
    })
  
    // Convert to CSV string
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
  
    downloadFile(
      csvContent,
      `${slugify(projectTitle)}-responses.csv`,
      'text/csv;charset=utf-8;'
    )
  }
  
  export function exportReportCSV(report: any, projectTitle: string) {
    const rows: string[][] = []
  
    rows.push(['Ethnogrow AI Report'])
    rows.push([`Project: ${projectTitle}`])
    rows.push([`Generated: ${new Date(report.generated_at).toLocaleString('en-GB')}`])
    rows.push([`Responses analysed: ${report.response_count}`])
    rows.push([])
  
    rows.push(['SUMMARY'])
    rows.push([report.summary])
    rows.push([])
  
    if (report.key_findings?.length > 0) {
      rows.push(['KEY FINDINGS'])
      report.key_findings.forEach((f: string, i: number) => {
        rows.push([`${i + 1}.`, f])
      })
      rows.push([])
    }
  
    if (report.question_insights?.length > 0) {
      rows.push(['QUESTION INSIGHTS'])
      rows.push(['Question', 'Type', 'Headline', 'Detail'])
      report.question_insights.forEach((insight: any) => {
        rows.push([insight.question, insight.type, insight.headline, insight.detail])
      })
      rows.push([])
    }
  
    if (report.themes?.length > 0) {
      rows.push(['THEMES'])
      rows.push(['Theme', 'Description', 'Frequency', 'Supporting quotes'])
      report.themes.forEach((theme: any) => {
        rows.push([
          theme.label,
          theme.description,
          String(theme.frequency),
          (theme.supporting_quotes || []).join(' | ')
        ])
      })
    }
  
    const csvContent = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
  
    downloadFile(
      csvContent,
      `${slugify(projectTitle)}-report.csv`,
      'text/csv;charset=utf-8;'
    )
  }
  
  // ─── PDF Export ───────────────────────────────────────────────────────────────
  
  export async function exportReportPDF(report: any, projectTitle: string) {
    const res = await fetch('/api/export/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: report.project_id }),
    })
  
    if (!res.ok) {
      throw new Error('PDF generation failed')
    }
  
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${slugify(projectTitle)}-report.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  export async function exportResponsesPDF(
    responses: any[],
    questions: any[],
    projectTitle: string
  ) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    let y = margin
  
    function checkPageBreak(needed: number = 10) {
      if (y + needed > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
    }
  
    // ── Cover ──
    doc.setFillColor(12, 30, 39)
    doc.rect(0, 0, pageWidth, 50, 'F')
  
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(projectTitle, margin, 25)
  
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 215, 220)
    doc.text('Raw Responses · Ethnogrow', margin, 35)
    doc.text(`Exported ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 43)
  
    y = 65
  
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(118, 118, 118)
    doc.text(`${responses.length} response${responses.length !== 1 ? 's' : ''} · ${questions.length} question${questions.length !== 1 ? 's' : ''}`, margin, y)
    y += 12
  
    doc.setDrawColor(209, 209, 209)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10
  
    // ── Responses ──
    responses.forEach((r, i) => {
      checkPageBreak(20)
  
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(12, 30, 39)
      doc.text(`Response #${responses.length - i}`, margin, y)
  
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(118, 118, 118)
      doc.text(new Date(r.submitted_at).toLocaleString('en-GB'), pageWidth - margin, y, { align: 'right' })
      y += 6
  
      for (const question of questions) {
        const response = r.responses?.find((resp: any) => resp.question_id === question.id)
        if (!response) continue
  
        checkPageBreak(12)
  
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(74, 74, 74)
        const qLines = doc.splitTextToSize(question.text, contentWidth)
        doc.text(qLines, margin, y)
        y += qLines.length * 4 + 1
  
        let valueStr = ''
        if (response.value === '__NA__') {
          valueStr = 'N/A'
        } else if (typeof response.value === 'object' && response.value !== null && 'number' in response.value) {
          const val = response.value
          valueStr = val.text ? `${val.number} — ${val.text}` : String(val.number)
        } else if (Array.isArray(response.value)) {
          valueStr = response.value.join(', ')
        } else {
          valueStr = String(response.value)
        }
  
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(12, 30, 39)
        const vLines = doc.splitTextToSize(valueStr, contentWidth - 4)
        checkPageBreak(vLines.length * 5 + 4)
        doc.text(vLines, margin + 2, y)
        y += vLines.length * 5 + 3
      }
  
      doc.setDrawColor(228, 228, 228)
      doc.line(margin, y, pageWidth - margin, y)
      y += 8
    })
  
    // ── Footer ──
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(180, 180, 180)
      doc.text(`Ethnogrow · ${projectTitle} · Page ${i} of ${totalPages}`, margin, pageHeight - 10)
    }
  
    doc.save(`${slugify(projectTitle)}-responses.pdf`)
  }
  
  // ─── Helpers ──────────────────────────────────────────────────────────────────
  
  function slugify(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
  
  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }