import PizZip from "pizzip";
import { saveAs } from "file-saver";

const PERSONA_LABELS: Record<string, string> = {
  "sc-level-2": "Support Coordinator Level 2",
  "ssc-level-3": "Senior Support Coordinator Level 3",
  "recovery-coach": "Psychosocial Recovery Coach",
};

const CASE_NOTE_SECTIONS = [
  { key: "caseNoteSubject", label: "Case Note Subject" },
  { key: "dateOfService", label: "Date of Service" },
  { key: "interactionType", label: "Interaction Type" },
  { key: "goalAlignment", label: "Goal Alignment" },
  { key: "detailsOfSupport", label: "Details of Support Provided" },
  { key: "participantPresentation", label: "Participant Presentation and Engagement" },
  { key: "progressAndOutcomes", label: "Progress and Outcomes" },
  { key: "actionPlan", label: "Action Plan and Next Steps" },
] as const;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDateAU(date = new Date()): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildContentParagraphs(content: string): string {
  return content
    .split("\n")
    .map(
      (line) =>
        `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`
    )
    .join("");
}

export function exportCaseNoteDocx(
  result: Record<string, string>,
  persona: string
): void {
  const personaLabel = PERSONA_LABELS[persona] || persona;
  const dateStr = formatDateAU();

  // Build section paragraphs
  let sectionXml = "";
  for (const section of CASE_NOTE_SECTIONS) {
    const content = result[section.key] ?? "";
    if (!content) continue;

    // Section header (UPPERCASE, bold, 10pt, navy background highlight)
    sectionXml += `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="1E3A5F"/><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="FFFFFF"/></w:rPr><w:t>${escapeXml(section.label.toUpperCase())}</w:t></w:r></w:p>`;

    // Content (9pt, normal)
    sectionXml += buildContentParagraphs(content);

    // Spacer
    sectionXml += `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    <w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/><w:color w:val="1E3A5F"/></w:rPr><w:t>Visual Case Note</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>${escapeXml(personaLabel)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="94A3B8"/></w:rPr><w:t>Generated ${escapeXml(dateStr)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="E2E8F0"/></w:pBdr><w:spacing w:after="200"/></w:pPr></w:p>
    ${sectionXml}
    <w:p><w:pPr><w:spacing w:before="200"/></w:pPr><w:r><w:rPr><w:sz w:val="14"/><w:szCs w:val="14"/><w:color w:val="94A3B8"/><w:i/></w:rPr><w:t>CONFIDENTIAL — CareAxis AI-Generated Document — For Professional Use Only</w:t></w:r></w:p>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", documentRelsXml);

  const blob = zip.generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  saveAs(blob, `CareAxis_Case_Note_${Date.now()}.docx`);
}
