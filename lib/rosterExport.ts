/**
 * Roster CSV and PDF export utilities
 */
import type { AnalysisResult } from "@/app/(authenticated)/roster-analyzer/page";

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function generateRosterCSV(result: AnalysisResult, filename?: string): string {
  let csv = "";
  const exportDate = new Date().toLocaleDateString("en-AU");

  // Header metadata
  csv += `Roster Analysis Export\n`;
  csv += `Export Date,${exportDate}\n`;
  csv += `\n`;

  // Summary
  if (result.summary) {
    csv += `Summary\n`;
    csv += `"${result.summary.replace(/"/g, '""')}"\n`;
    csv += `\n`;
  }

  // Category breakdown
  if (result.categoryBreakdown && result.categoryBreakdown.length > 0) {
    csv += `Category Breakdown\n`;
    csv += `Category,Budgeted ($),Projected ($),Variance ($)\n`;
    for (const row of result.categoryBreakdown) {
      const variance = row.variance < 0 ? `-${Math.abs(row.variance).toFixed(2)}` : row.variance.toFixed(2);
      csv += `"${row.category}",${row.budgeted.toFixed(2)},${row.projected.toFixed(2)},${variance}\n`;
    }
    csv += `\n`;
  }

  // Weekly projections
  if (result.weeklyProjections && result.weeklyProjections.length > 0) {
    csv += `Weekly Projections\n`;
    csv += `Week,Category,Spending ($)\n`;
    for (const row of result.weeklyProjections) {
      csv += `"${row.week}","${row.category}",${row.spending.toFixed(2)}\n`;
    }
    csv += `\n`;
  }

  // Alerts
  if (result.alerts && result.alerts.length > 0) {
    csv += `Alerts\n`;
    csv += `Severity,Message\n`;
    for (const alert of result.alerts) {
      csv += `${alert.severity},"${alert.message.replace(/"/g, '""')}"\n`;
    }
    csv += `\n`;
  }

  // Raw roster data
  if (result.rosterData && result.rosterData.length > 0) {
    csv += `Roster Data\n`;
    const headers = Object.keys(result.rosterData[0]!);
    csv += headers.map((h) => `"${h}"`).join(",") + "\n";
    for (const row of result.rosterData) {
      csv += headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",") + "\n";
    }
  }

  return csv;
}

export function downloadRosterCSV(result: AnalysisResult): void {
  const csv = generateRosterCSV(result);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CareAxis_Roster_Analysis_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export async function downloadRosterPDF(result: AnalysisResult, penaltyStats?: import("./victoriaHolidays").PenaltyStats): Promise<void> {
  const jsPDF = (await import("jspdf")).default;
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  const NAVY = [30, 58, 95] as [number, number, number];
  const BLUE = [37, 99, 235] as [number, number, number];
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  let y = 0;

  // ─── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("CareAxis", 14, 13);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Powered NDIS Toolkit", pageW - 14, 13, { align: "right" });

  // ─── Title ────────────────────────────────────────────────────────────────
  doc.setTextColor(...NAVY);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Roster Analysis Report", 14, 32);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`, 14, 39);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.8);
  doc.line(14, 43, pageW - 14, 43);
  y = 50;

  // ─── Summary ─────────────────────────────────────────────────────────────
  if (result.summary) {
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(14, y, pageW - 28, 8, 1, 1, "F");
    doc.setTextColor(...NAVY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ANALYSIS SUMMARY", 17, y + 5.5);
    y += 12;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(result.summary, pageW - 28);
    doc.text(summaryLines, 14, y);
    y += summaryLines.length * 5 + 8;
  }

  // ─── Penalty Stats ────────────────────────────────────────────────────────
  if (penaltyStats && penaltyStats.totalShifts > 0) {
    if (y > pageH - 60) { doc.addPage(); y = 20; }
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(14, y, pageW - 28, 8, 1, 1, "F");
    doc.setTextColor(...NAVY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PENALTY RATE BREAKDOWN", 17, y + 5.5);
    y += 12;

    autoTable(doc, {
      startY: y,
      head: [["Day Type", "Shifts", "Hours", "Multiplier", "Cost Impact"]],
      body: [
        ["Weekday", penaltyStats.weekdayShifts, penaltyStats.weekdayHours.toFixed(1) + "h", "1.0×", "-"],
        ["Saturday", penaltyStats.saturdayShifts, penaltyStats.saturdayHours.toFixed(1) + "h", "1.25×", penaltyStats.saturdayHours > 0 ? `+$${((penaltyStats.saturdayHours * 65 * 0.25)).toFixed(0)}` : "-"],
        ["Sunday", penaltyStats.sundayShifts, penaltyStats.sundayHours.toFixed(1) + "h", "1.35×", penaltyStats.sundayHours > 0 ? `+$${((penaltyStats.sundayHours * 65 * 0.35)).toFixed(0)}` : "-"],
        ["Public Holiday", penaltyStats.publicHolidayShifts, penaltyStats.publicHolidayHours.toFixed(1) + "h", "2.25×", penaltyStats.publicHolidayHours > 0 ? `+$${((penaltyStats.publicHolidayHours * 65 * 1.25)).toFixed(0)}` : "-"],
        ["TOTAL PREMIUM", penaltyStats.totalShifts, (penaltyStats.weekdayHours + penaltyStats.saturdayHours + penaltyStats.sundayHours + penaltyStats.publicHolidayHours).toFixed(1) + "h", "-", `$${penaltyStats.penaltyPremium.toFixed(2)}`],
      ],
      headStyles: { fillColor: NAVY, fontSize: 9 },
      styles: { fontSize: 9 },
      footStyles: { fillColor: [241, 245, 249], fontStyle: "bold" },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── Category Breakdown ───────────────────────────────────────────────────
  if (result.categoryBreakdown && result.categoryBreakdown.length > 0) {
    if (y > pageH - 60) { doc.addPage(); y = 20; }
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(14, y, pageW - 28, 8, 1, 1, "F");
    doc.setTextColor(...NAVY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CATEGORY BREAKDOWN", 17, y + 5.5);
    y += 12;

    autoTable(doc, {
      startY: y,
      head: [["Category", "Budgeted ($)", "Projected ($)", "Variance ($)"]],
      body: result.categoryBreakdown.map((r: { category: string; budgeted: number; projected: number; variance: number }) => [
        r.category,
        `$${r.budgeted.toLocaleString()}`,
        `$${r.projected.toLocaleString()}`,
        `${r.variance >= 0 ? "+" : ""}$${r.variance.toLocaleString()}`,
      ]),
      headStyles: { fillColor: NAVY, fontSize: 9 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────
  if (result.alerts && result.alerts.length > 0) {
    if (y > pageH - 40) { doc.addPage(); y = 20; }
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(14, y, pageW - 28, 8, 1, 1, "F");
    doc.setTextColor(...NAVY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ALERTS", 17, y + 5.5);
    y += 12;
    for (const alert of result.alerts) {
      if (y > pageH - 25) { doc.addPage(); y = 20; }
      const color = alert.severity === "error" ? [220, 38, 38] : alert.severity === "warning" ? [217, 119, 6] : [37, 99, 235];
      doc.setTextColor(...(color as [number, number, number]));
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`[${alert.severity.toUpperCase()}]`, 14, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      const msgLines = doc.splitTextToSize(alert.message, pageW - 50);
      doc.text(msgLines, 45, y);
      y += msgLines.length * 5 + 4;
    }
  }

  // ─── Footers ──────────────────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("CONFIDENTIAL — CareAxis AI-Generated Document — For Professional Use Only", 14, pageH - 8);
    doc.text(`Page ${i} of ${total}`, pageW - 14, pageH - 8, { align: "right" });
  }

  doc.save(`CareAxis_Roster_Analysis_${new Date().toISOString().slice(0, 10)}.pdf`);
}
