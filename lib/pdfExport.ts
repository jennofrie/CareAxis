import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PdfSection {
  title: string;
  content: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const NAVY = "#1e3a5f";
const BLUE = "#2563eb";
const LIGHT = "#dbeafe";
const FOOTER_TEXT =
  "CONFIDENTIAL — CareAxis AI-Generated Document — For Professional Use Only";

// ─── Helper: add page header ──────────────────────────────────────────────────
export function addPageHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string
): number {
  // Blue top bar
  doc.setFillColor(NAVY);
  doc.rect(0, 0, 210, 20, "F");
  // App name
  doc.setTextColor("#ffffff");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("CareAxis", 14, 13);
  // Tagline right
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Powered NDIS Toolkit", 196, 13, { align: "right" });
  // Report title below bar
  doc.setTextColor(NAVY);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 32);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#64748b");
    const subtitleLines = doc.splitTextToSize(subtitle, 182);
    let subY = 39;
    for (const line of subtitleLines) {
      doc.text(line, 14, subY);
      subY += 4;
    }
    // Accent underline
    doc.setDrawColor(BLUE);
    doc.setLineWidth(0.8);
    doc.line(14, subY + 1, 196, subY + 1);
    return subY + 8;
  }
  // Accent underline
  doc.setDrawColor(BLUE);
  doc.setLineWidth(0.8);
  doc.line(14, 36, 196, 36);
  return 43;
}

// ─── Helper: add footer on current page ──────────────────────────────────────
function addFooter(doc: jsPDF, pageNum: number, total: number): void {
  const pageH = doc.internal.pageSize.height;
  doc.setDrawColor("#e2e8f0");
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 14, 196, pageH - 14);
  doc.setFontSize(7);
  doc.setTextColor("#94a3b8");
  doc.setFont("helvetica", "normal");
  doc.text(FOOTER_TEXT, 14, pageH - 8);
  doc.text(`Page ${pageNum} of ${total}`, 196, pageH - 8, { align: "right" });
}

// ─── Helper: add all footers ──────────────────────────────────────────────────
export function addAllFooters(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addFooter(doc, i, total);
  }
}

// ─── Helper: write a section ─────────────────────────────────────────────────
export function writeSection(
  doc: jsPDF,
  title: string,
  content: string,
  y: number,
  marginLeft = 14,
  maxWidth = 182
): number {
  const pageH = doc.internal.pageSize.height;
  const bottomMargin = 25;

  // Check page break for section title
  if (y > pageH - bottomMargin - 20) {
    doc.addPage();
    y = 20;
  }

  // Section heading
  doc.setFillColor(LIGHT);
  doc.roundedRect(marginLeft, y, maxWidth, 8, 1, 1, "F");
  doc.setTextColor(NAVY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), marginLeft + 3, y + 5.5);
  y += 12;

  // Content
  doc.setTextColor("#1e293b");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(content, maxWidth);
  for (const line of lines) {
    if (y > pageH - bottomMargin) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, marginLeft, y);
    y += 5;
  }
  return y + 6;
}

// ─── Helper: date string ─────────────────────────────────────────────────────
export function formatDateAU(date = new Date()): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
