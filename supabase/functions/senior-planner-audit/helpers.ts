// Helper functions for Senior Planner Audit Edge Function
// Eliminates code duplication and improves maintainability

import { AuditResult, AuditResponse, DocumentTypeConfig } from "./types.ts";

// CORS headers used across all responses
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model configuration
export const GEMINI_MODEL = "gemini-2.5-pro";
export const FALLBACK_MODEL = "gemini-2.5-flash";

// Response factory functions - DRY principle
export function createJsonResponse(data: object, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

export function createErrorResponse(error: string, status = 400, details?: string): Response {
  return createJsonResponse({ error, ...(details && { details }) }, status);
}

export function createSuccessResponse(audit: AuditResult, documentType: string, modelUsed: string): Response {
  const response: AuditResponse = {
    success: true,
    audit,
    documentType,
    modelUsed,
    timestamp: new Date().toISOString()
  };
  return createJsonResponse(response);
}

export function createContentRestrictionResponse(message?: string): Response {
  return createJsonResponse({
    success: false,
    error: message || "This document does not appear to be related to NDIS, Healthcare, Disability Support, or Mental Health services.",
    contentRestriction: true,
    timestamp: new Date().toISOString()
  });
}

// Parse JSON from AI response, handling markdown code blocks
export function parseAuditResponse(text: string, documentType: string): AuditResult {
  try {
    let jsonStr = text;

    // Handle markdown code blocks
    if (text.includes("```json")) {
      jsonStr = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      jsonStr = text.split("```")[1].split("```")[0].trim();
    }

    return JSON.parse(jsonStr);
  } catch {
    // Return fallback structured response on parse failure
    return createFallbackAuditResult(text, documentType);
  }
}

// Create fallback result when JSON parsing fails
function createFallbackAuditResult(rawText: string, documentType: string): AuditResult {
  return {
    overallScore: 50,
    status: "revision_required",
    scores: {
      compliance: 50,
      nexus: 50,
      valueForMoney: 50,
      evidenceQuality: 50,
      significantChange: documentType === "change_of_circumstances" ? 50 : null
    },
    plannerSummary: "Unable to complete structured analysis. Manual review recommended.",
    strengths: [],
    improvements: [{
      category: "Analysis Error",
      issue: "The document requires manual review",
      severity: "medium",
      quote: "",
      remediation: "Please review the document manually or try again"
    }],
    redFlags: [],
    languageFixes: [],
    plannerQuestions: ["Please resubmit for analysis"],
    rawResponse: rawText
  };
}

// Normalize status based on score thresholds
export function normalizeStatus(result: AuditResult): AuditResult {
  if (result.overallScore >= 80) {
    result.status = "approved";
  } else if (result.overallScore >= 60) {
    result.status = "revision_required";
  } else {
    result.status = "critical";
  }
  return result;
}

// Build the document-specific audit prompt
export function buildAuditPrompt(
  docConfig: DocumentTypeConfig,
  systemPrompt: string,
  documentContent?: string,
  isPdf = false
): string {
  // Get current date in Australian Eastern Time (AEST/AEDT)
  const australianDate = new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  // Replace the date placeholder in the system prompt
  const promptWithDate = systemPrompt.replace('{{CURRENT_DATE}}', australianDate);

  const basePrompt = `
════════════════════════════════════════════════════════════════════════════════
DOCUMENT UNDER REVIEW
════════════════════════════════════════════════════════════════════════════════

DOCUMENT TYPE: ${docConfig.name}
PRIMARY FOCUS: ${docConfig.focus}
SECTION 34 FOCUS AREAS: ${docConfig.section34Focus.join(", ")}

KEY PLANNER QUESTIONS FOR THIS DOCUMENT TYPE:
${docConfig.keyQuestions.map((q, i) => `  ${i + 1}. ${q}`).join("\n")}

KNOWN RED FLAGS (High Priority Detection):
${docConfig.redFlags.map((rf) => `  ⚠️ ${rf}`).join("\n")}

APPROVAL SUCCESS FACTORS:
${docConfig.approvalTips.map((tip) => `  ✓ ${tip}`).join("\n")}

════════════════════════════════════════════════════════════════════════════════`;

  const contentValidation = `
════════════════════════════════════════════════════════════════════════════════
CRITICAL FIRST STEP - CONTENT VALIDATION
════════════════════════════════════════════════════════════════════════════════

Before performing any audit, you MUST verify the document relates to ANY of the following:
- NDIS (National Disability Insurance Scheme) documents
- Disability support services or reports
- Healthcare or allied health reports
- Mental health assessments or support plans
- Aged care documentation
- Support coordination reports
- Therapy reports (OT, Physio, Speech, Psychology)
- Participant assessments or functional capacity evaluations

IF THE DOCUMENT IS NOT RELATED TO THESE TOPICS:
Return EXACTLY this JSON and nothing else:
{
  "error": "CONTENT_RESTRICTION",
  "message": "This Senior NDIS Planner tool is designed exclusively for auditing NDIS, Healthcare, Disability Support, Mental Health, and Aged Care documentation. The provided document does not appear to relate to these topics. Please submit documentation related to disability support services, healthcare, or NDIS participant support."
}

IF THE DOCUMENT IS RELATED TO ALLOWED TOPICS:
Proceed with the full audit as instructed below.

`;

  const instructions = `
════════════════════════════════════════════════════════════════════════════════
AUDIT INSTRUCTIONS
════════════════════════════════════════════════════════════════════════════════

Execute your ULTRA-THINK 3-PASS analysis pipeline on this document:

PASS 1 — THE SKEPTIC (Fatal Flaw Detection):
• Search for reasons to REJECT this document
• Check health-system crossovers (Medicare vs NDIS)
• Flag medical language that should be functional
• Identify mainstream service duplication
• Look for vague or unsubstantiated claims

PASS 2 — THE VALIDATOR (Nexus & Evidence Check):
• Verify the evidence chain: Impairment → Need → Support → Outcome
• Assess validated tool usage (WHODAS, I-CAN, COPM, GAS, etc.)
• Check goal alignment — does every support link to a participant goal?
• Evaluate frequency/duration justification
• Confirm professional scope appropriateness

PASS 3 — THE OUTCOME PREDICTOR (Approval Probability):
• Apply 2024-25 PACE guidelines and funding trends
• Assess Value for Money — would NDIA find cheaper alternatives?
• For CoC: verify Significant Change is permanent and disability-related
• Check Price Guide alignment and support categorisation

OUTPUT REQUIREMENTS:
1. Respond ONLY with valid JSON (no markdown code blocks)
2. Every criticism must quote specific document text
3. Every remediation must provide replacement wording
4. Use Section 34 subsection references (a-f) throughout
5. Write in Senior Planner voice — direct, professional, legislative
6. Score honestly — 80%+ means genuinely ready for lodgement

Your response must be the complete JSON object as specified in the system prompt.`;

  // Build final prompt based on content type
  if (isPdf) {
    return `${promptWithDate}

${contentValidation}

${basePrompt}

The document to audit is attached as a PDF file. Please extract and analyze all text content from the PDF.

${instructions}`;
  }

  return `${promptWithDate}

${contentValidation}

${basePrompt}

DOCUMENT TO AUDIT:
---
${documentContent}
---

${instructions}`;
}

// Logging helper for consistent format
export function log(message: string, data?: unknown): void {
  if (data !== undefined) {
    console.log(message, data);
  } else {
    console.log(message);
  }
}

export function logError(message: string, error?: unknown): void {
  console.error(message, error);
}
