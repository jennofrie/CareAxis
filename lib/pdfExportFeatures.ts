import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  addPageHeader,
  addAllFooters,
  writeSection,
  formatDateAU,
} from "./pdfExport";

// ─── A. Report Synthesizer ────────────────────────────────────────────────────
export function exportReportSynthesizerPdf(
  sections: Record<string, string>,
  personaTitle: string,
  docNames: string[]
) {
  const doc = new jsPDF();
  let y = addPageHeader(
    doc,
    "Synthesised Report",
    `${personaTitle} — ${docNames.join(", ")}`
  );

  // Date + CONFIDENTIAL info box
  doc.setFillColor("#dbeafe");
  doc.roundedRect(14, y, 182, 12, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor("#1e3a5f");
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${formatDateAU()}`, 18, y + 5);
  doc.text("CONFIDENTIAL — For Professional Use Only", 18, y + 9.5);
  y += 18;

  for (const [title, content] of Object.entries(sections)) {
    y = writeSection(doc, title, content, y);
  }

  addAllFooters(doc);
  doc.save(`CareAxis_Report_Synthesis_${Date.now()}.pdf`);
}

// ─── B. Plan Management Expert ────────────────────────────────────────────────
export function exportPlanManagementPdf(
  result: any,
  query: string,
  documentName?: string
) {
  const doc = new jsPDF();
  const subtitleQuery =
    query.length > 80 ? query.substring(0, 77) + "..." : query;
  let y = addPageHeader(doc, "Plan Management Advisory", subtitleQuery);

  // Summary
  if (result.summary) {
    y = writeSection(doc, "Summary", result.summary, y);
  }

  // Sections
  if (result.sections && Array.isArray(result.sections)) {
    for (const section of result.sections) {
      y = writeSection(doc, section.title, section.content, y);
    }
  }

  // Pricing References
  if (result.pricingReferences && result.pricingReferences.length > 0) {
    const pricingText = result.pricingReferences
      .map(
        (p: any) =>
          `${p.item} (${p.code}): ${p.price}${p.notes ? " — " + p.notes : ""}`
      )
      .join("\n");
    y = writeSection(doc, "Pricing References", pricingText, y);
  }

  // Warnings
  if (result.warnings && result.warnings.length > 0) {
    const warningsText = result.warnings.map((w: string) => `• ${w}`).join("\n");
    y = writeSection(doc, "Warnings", warningsText, y);
  }

  // Recommendations
  if (result.recommendations && result.recommendations.length > 0) {
    const recsText = result.recommendations
      .map((r: string) => `• ${r}`)
      .join("\n");
    y = writeSection(doc, "Recommendations", recsText, y);
  }

  addAllFooters(doc);
  doc.save(`CareAxis_Plan_Management_${Date.now()}.pdf`);
}

// ─── C. CoC Cover Letter ──────────────────────────────────────────────────────
export function exportCoCCoverLetterPdf(
  coverLetterData: any,
  scLevel: number | string
) {
  const doc = new jsPDF();
  let y = addPageHeader(
    doc,
    "Change of Circumstances Cover Letter",
    `Support Coordination Level ${scLevel} — ${formatDateAU()}`
  );

  // Participant Overview
  if (coverLetterData.overview?.summaryText) {
    y = writeSection(
      doc,
      "Participant Overview",
      coverLetterData.overview.summaryText,
      y
    );
  }

  // Key Changes
  if (coverLetterData.keyChanges && coverLetterData.keyChanges.length > 0) {
    const changesText = coverLetterData.keyChanges
      .map((c: any, i: number) => `${i + 1}. ${c.title}\n   ${c.description}`)
      .join("\n\n");
    y = writeSection(doc, "Key Changes in Circumstances", changesText, y);
  }

  // Clinical Evidence
  if (coverLetterData.clinicalEvidence) {
    const ce = coverLetterData.clinicalEvidence;
    let ceText = ce.introText || "";
    if (ce.assessments && ce.assessments.length > 0) {
      ceText +=
        "\n\nAssessment Results:\n" +
        ce.assessments
          .map(
            (a: any) => `  - ${a.measure}: ${a.score} (${a.interpretation})`
          )
          .join("\n");
    }
    if (ce.conclusionText) {
      ceText += "\n\n" + ce.conclusionText;
    }
    y = writeSection(doc, "Clinical Evidence", ceText, y);
  }

  // SC Request
  if (coverLetterData.scRequest) {
    const sc = coverLetterData.scRequest;
    let scText = sc.introText || "";
    if (sc.comparison) {
      scText += `\n\nCurrent Level: ${sc.comparison.currentLevel}`;
      scText += `\nRecommended Level: ${sc.comparison.recommendedLevel}`;
      scText += `\nCurrent Hours (Annual): ${sc.comparison.currentHoursAnnual}`;
      scText += `\nRecommended Hours (Annual): ${sc.comparison.recommendedHoursAnnual}`;
    }
    if (sc.activities && sc.activities.length > 0) {
      scText +=
        "\n\n" +
        (sc.activitiesIntro || "Key Activities:") +
        "\n" +
        sc.activities
          .map((a: any) => `  - ${a.area}: ${a.description}`)
          .join("\n");
    }
    y = writeSection(doc, "Support Coordination Request", scText, y);
  }

  // Anticipated Questions
  if (
    coverLetterData.anticipatedQuestions &&
    coverLetterData.anticipatedQuestions.length > 0
  ) {
    const qaText = coverLetterData.anticipatedQuestions
      .map((q: any, i: number) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.response}`)
      .join("\n\n");
    y = writeSection(doc, "Anticipated Questions", qaText, y);
  }

  // Closing Statement
  if (coverLetterData.closing) {
    let closingText = coverLetterData.closing.statementText || "";
    if (
      coverLetterData.closing.priorityReasons &&
      coverLetterData.closing.priorityReasons.length > 0
    ) {
      closingText +=
        "\n\nPriority Reasons:\n" +
        coverLetterData.closing.priorityReasons
          .map((r: string, i: number) => `${i + 1}. ${r}`)
          .join("\n");
    }
    y = writeSection(doc, "Closing Statement", closingText, y);
  }

  addAllFooters(doc);
  doc.save(`CareAxis_CoC_Letter_${Date.now()}.pdf`);
}

// ─── D. Senior Planner Audit ──────────────────────────────────────────────────
export function exportSeniorPlannerPdf(result: any, docNames: string[]) {
  const doc = new jsPDF();
  let y = addPageHeader(
    doc,
    "Senior Planner Audit Report",
    docNames.join(", ")
  );

  // Overall Score badge
  const score = result.overallScore ?? 0;
  const badgeColor =
    score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  const pageH = doc.internal.pageSize.height;

  if (y > pageH - 50) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(badgeColor);
  doc.roundedRect(14, y, 50, 14, 3, 3, "F");
  doc.setTextColor("#ffffff");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Overall Score: ${score}/100`, 18, y + 9);
  y += 20;

  // Overall Summary
  if (result.overallSummary) {
    y = writeSection(doc, "Overall Summary", result.overallSummary, y);
  }

  // Dimensions
  const dimensions = result.dimensions || {};
  const dimLabels: Record<string, string> = {
    compliance: "Compliance",
    nexus: "Nexus",
    vfm: "Value for Money",
    evidence: "Evidence",
    significantChange: "Significant Change",
  };

  for (const [key, data] of Object.entries(dimensions) as [string, any][]) {
    const label = dimLabels[key] || key;
    let content = `Score: ${data.score}/100`;
    if (data.summary) content += `\n${data.summary}`;
    if (data.findings && data.findings.length > 0) {
      content +=
        "\n\nFindings:\n" + data.findings.map((f: string) => `• ${f}`).join("\n");
    }
    y = writeSection(doc, label, content, y);
  }

  addAllFooters(doc);
  doc.save(`CareAxis_Senior_Planner_Audit_${Date.now()}.pdf`);
}

// ─── E. Weekly Summary ────────────────────────────────────────────────────────
export function exportWeeklySummaryPdf(
  parsedSections: Array<{ title: string; content: string }>,
  participantName: string,
  startDate: string,
  endDate: string,
  noteCount: number
) {
  const doc = new jsPDF();
  const subtitle = `${participantName || "All Participants"} — ${startDate} to ${endDate} (${noteCount} notes)`;
  let y = addPageHeader(doc, "Weekly Summary Report", subtitle);

  for (const section of parsedSections) {
    y = writeSection(doc, section.title, section.content, y);
  }

  addAllFooters(doc);
  doc.save(`CareAxis_Weekly_Summary_${startDate}_to_${endDate}.pdf`);
}

// ─── F. Justification Drafter ─────────────────────────────────────────────────
export function exportJustificationPdf(
  justification: string,
  participantName: string,
  itemName?: string
) {
  const doc = new jsPDF();
  let y = addPageHeader(
    doc,
    "Assistive Technology Justification Letter",
    `${participantName}${itemName ? ` — ${itemName}` : ""}`
  );

  // Date + CONFIDENTIAL info box
  doc.setFillColor("#dbeafe");
  doc.roundedRect(14, y, 182, 12, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor("#1e3a5f");
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${formatDateAU()}`, 18, y + 5);
  doc.text("CONFIDENTIAL — For Professional Use Only", 18, y + 9.5);
  y += 18;

  // Write justification text as paragraphs
  const paragraphs = justification.split(/\n\n+/);
  const pageH = doc.internal.pageSize.height;
  const bottomMargin = 25;

  doc.setTextColor("#1e293b");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;
    const lines = doc.splitTextToSize(paragraph.trim(), 182);
    for (const line of lines) {
      if (y > pageH - bottomMargin) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 14, y);
      y += 5;
    }
    y += 3; // paragraph spacing
  }

  addAllFooters(doc);
  doc.save(
    `CareAxis_Justification_${participantName.replace(/\s+/g, "_")}_${Date.now()}.pdf`
  );
}

// ─── G. Budget Forecaster ─────────────────────────────────────────────────────
export function exportBudgetForecastPdf(
  result: any,
  budgets: any,
  planStart: string,
  planEnd: string
) {
  const doc = new jsPDF();
  let y = addPageHeader(
    doc,
    "Budget Forecast Report",
    `Plan Period: ${planStart} to ${planEnd}`
  );

  // Summary table using autoTable
  if (result.categories && result.categories.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Category", "Budget", "Spent", "Projected", "Status"]],
      body: result.categories.map((c: any) => [
        c.category,
        `$${c.budget.toLocaleString()}`,
        `$${c.spent.toLocaleString()}`,
        `$${c.projected.toLocaleString()}`,
        c.status,
      ]),
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 10
      : y + 40;
  }

  // Alerts
  if (result.alerts && result.alerts.length > 0) {
    for (const alert of result.alerts) {
      y = writeSection(doc, "Alert", alert, y);
    }
  }

  // Recommendations
  if (result.recommendations && result.recommendations.length > 0) {
    const recsText = result.recommendations
      .map((r: string) => `• ${r}`)
      .join("\n");
    y = writeSection(doc, "Recommendations", recsText, y);
  }

  addAllFooters(doc);
  doc.save(`CareAxis_Budget_Forecast_${Date.now()}.pdf`);
}

// ─── H. Roster Analyzer ──────────────────────────────────────────────────────
export function exportRosterPdf(result: any) {
  const doc = new jsPDF();
  let y = addPageHeader(doc, "Roster Analysis Report");

  // Summary
  if (result.summary) {
    y = writeSection(doc, "Analysis Summary", result.summary, y);
  }

  // Alerts table
  if (result.alerts && result.alerts.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Severity", "Alert"]],
      body: result.alerts.map((a: any) => [
        a.severity?.toUpperCase() || "INFO",
        a.message,
      ]),
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 10
      : y + 40;
  }

  // Category breakdown table
  if (result.categoryBreakdown && result.categoryBreakdown.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Category", "Budgeted", "Projected", "Variance"]],
      body: result.categoryBreakdown.map((c: any) => [
        c.category,
        `$${c.budgeted.toLocaleString()}`,
        `$${c.projected.toLocaleString()}`,
        `${c.variance < 0 ? "-" : "+"}$${Math.abs(c.variance).toLocaleString()}`,
      ]),
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 10
      : y + 40;
  }

  // Weekly spending projections table
  if (result.weeklyProjections && result.weeklyProjections.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Week", "Category", "Spending"]],
      body: result.weeklyProjections.map((w: any) => [
        w.week,
        w.category,
        `$${w.spending.toLocaleString()}`,
      ]),
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  addAllFooters(doc);
  doc.save(`CareAxis_Roster_Analysis_${Date.now()}.pdf`);
}
