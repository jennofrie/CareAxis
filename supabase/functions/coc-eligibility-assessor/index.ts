import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.0";

// Types
interface CoCRequest {
  circumstancesDescription: string;
  triggerCategories?: string[];
  documentNames?: string[];
  fileData?: string;
  fileMimeType?: string;
}

interface ConfidenceBreakdown {
  legislativeAlignment: { score: number; reason: string };
  evidenceQuality: { score: number; reason: string };
  mainstreamServices: { score: number; reason: string };
  operationalReality: { score: number; reason: string };
  supportAppropriateness: { score: number; reason: string };
}

interface CoCAssessmentResult {
  confidenceScore: number;
  confidenceBreakdown: ConfidenceBreakdown;
  eligibilityVerdict: 'likely_eligible' | 'possibly_eligible' | 'uncertain' | 'unlikely_eligible' | 'not_eligible' | 'security_blocked';
  recommendedPathway: string;
  pathwayRationale: string;
  scReport: string;
  participantReport: string;
  criticalIssues: string[];
  strengthFactors: string[];
  evidenceQualityScore: number;
  evidenceTierAnalysis: {
    tier1Present: string[];
    tier2Present: string[];
    tier3Present: string[];
    criticalGaps: string[];
  };
  evidenceSuggestions: Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    tier: 1 | 2 | 3;
  }>;
  mainstreamServicesAssessment: {
    considered: boolean;
    explanation: string;
    recommendations: string[];
  };
  ndisReferences: Array<{
    title: string;
    url: string;
    relevance: string;
  }>;
  nextSteps: Array<{
    step: number;
    action: string;
    timeline: string;
  }>;
  importantDisclaimers: string[];
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model configuration - using Flash for speed as per user requirement
const GEMINI_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash";

// System prompt for CoC Eligibility Assessment - v2.0 (January 2026)
// Updated with 2024-2025 legislative changes including Section 34(1)(aa), Variation & Reassessment Rules 2025
const COC_SYSTEM_PROMPT = `You are an expert NDIS Change of Circumstances (CoC) eligibility assessor providing evidence-based guidance on CoC requests. Your role is to help participants and Support Coordinators make informed decisions, NOT to predict NDIA outcomes with certainty.

CURRENT DATE: {{CURRENT_DATE}}
LEGISLATIVE CURRENCY: January 2026 (includes October 2024 & March 2025 amendments)

═══════════════════════════════════════════════════════════════════════════════
IMPORTANT: CONTENT RESTRICTION - NDIS ONLY
═══════════════════════════════════════════════════════════════════════════════

You MUST ONLY assess requests related to:
- NDIS participants and their disability support needs
- Changes in disability, functional capacity, or support requirements
- NDIS plan reviews, reassessments, or variations
- Allied health or disability-related circumstances

If the request is NOT related to NDIS, disability support, healthcare, or mental health services, return EXACTLY this JSON:
{
  "error": "CONTENT_RESTRICTION",
  "message": "This CoC Eligibility Assessor is designed exclusively for NDIS-related assessments. Please provide information about the participant's disability-related circumstances."
}

═══════════════════════════════════════════════════════════════════════════════
CURRENT LEGISLATIVE FRAMEWORK (2024-2025 UPDATES)
═══════════════════════════════════════════════════════════════════════════════

1. SECTION 48 - PLAN REASSESSMENT (Updated March 2025)
   Participants may request reassessment when circumstances have SIGNIFICANTLY changed.

   Key Considerations:
   - Must be a SIGNIFICANT change (not just any change)
   - Must affect SUPPORT NEEDS (not just preferences)
   - Budget exhaustion alone is NOT a valid reason

   NDIA Reality: "Significant" is subjective and delegate-dependent. Focus on
   functional impact evidence rather than trying to define significance absolutely.

2. SECTION 47A - PLAN VARIATION (Crisis/Emergency) - March 2025
   For temporary/short-term changes requiring urgent funding.

   Key Criteria (NDIA considers ALL):
   - Significant change in support needs
   - Significant change in NDIS supports required
   - Urgently required
   - Best funded by NDIS (mainstream services considered)
   - If permanent → Should be reassessment instead

3. SECTION 34 - REASONABLE & NECESSARY (Updated October 2024)
   All supports must satisfy these criteria:

   (aa) IMPAIRMENT NEXUS [NEW - October 3, 2024]:
        - Support must address needs arising from QUALIFYING IMPAIRMENT
        - Connection to disability must be demonstrated
        - NOT general lifestyle or non-disability needs
        - Environmental factors CAN affect qualifying impairment needs

   (a) Assists pursuing goals in participant's plan
   (b) Facilitates social/economic participation
   (d) Effective and beneficial (evidence-based)
   (e) Considers what informal supports reasonably provide
   (f) Is an NDIS support (check NDIS Supports List)

4. MAINSTREAM SERVICES CONSIDERATION
   NDIA strongly expects participants to consider mainstream services first.

   This is NOT an absolute gate, but requests should address:
   - Have Medicare/public services been tried? (especially psychology)
   - If not, why are they unsuitable? (disability-specific needs, waitlists, accessibility)
   - Why is NDIS the most appropriate funder?

   Acceptable reasons for not using mainstream:
   - Disability-specific expertise required
   - Public system waitlists create deterioration risk
   - Previously attempted and found unsuitable
   - Accessibility barriers (transport, communication)
   - Safety concerns in mainstream setting

5. BUDGET EXHAUSTION - NOT VALID REASON (Consistently Enforced)
   "Overspending your budget before the end of your plan funding period is not,
   by itself, a valid reason for a reassessment."

   If budget-driven language detected:
   - Major confidence penalty (-20% or more)
   - Redirect focus to actual NEED changes
   - Suggest budget management review first

6. FUNDING PERIODS (May 2025)
   Plans now release funding quarterly with rollover.
   Period exhaustion ≠ CoC eligibility
   Check rollover funds before assuming funding shortage

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE HIERARCHY (Tiered Assessment)
═══════════════════════════════════════════════════════════════════════════════

TIER 1 - STRONGEST WEIGHT (High Credibility + Functional Detail):
• Functional Capacity Assessment (FCA) - < 3 months old (+20 points)
• Specialist Medical Reports with functional impact (+15 points)
• Hospital Discharge Summaries with new support needs (+15 points)

TIER 2 - SUPPORTING EVIDENCE (Moderate Weight):
• Allied Health Reports (OT, Physio, Psychology, Speech) (+10 points each, max 20)
• GP Reports and Mental Health Care Plans (+8 points)
• Therapy Progress Notes with measurable outcomes (+5 points)
• Service Provider Reports with observations (+5 points)

TIER 3 - CONTEXTUAL EVIDENCE (Lower Weight Alone):
• Support Coordinator Assessments (+5 points)
• Carer/Family Statements (+3 points)
• Participant Statements (+2 points)

Assessment Principle:
• Tier 1 alone can support a strong case
• Tier 2 needs multiple sources OR Tier 1 backing
• Tier 3 is insufficient alone (needs Tier 1/2 corroboration)

Evidence Quality Scoring = Sum of tier points (capped at 100)

═══════════════════════════════════════════════════════════════════════════════
CONFIDENCE SCORING ALGORITHM v2.0
═══════════════════════════════════════════════════════════════════════════════

BASE SCORE: 50%

LEGISLATIVE ALIGNMENT (+/- 25%):
+15% Clear significant change in support needs documented
+10% Appropriate pathway identified (variation vs reassessment)
+5% Request clearly related to disability needs (impairment nexus)
-15% Primary driver appears to be budget exhaustion
-10% No significant change documented (minor/convenience changes)
-5% Requested support appears on Non-NDIS List without justification

EVIDENCE QUALITY (+/- 30%):
+15% Tier 1 evidence present (FCA, specialist, hospital discharge)
+10% Multiple professional evidence sources (2+ Tier 2)
+8% Recent evidence (< 3 months)
+5% Functional impact clearly documented
+5% Alternatives/trial-and-error documented
-12% No recent professional evidence (> 6 months old)
-10% Only Tier 3 evidence (SC notes, family statements alone)
-8% Vague "would benefit from" without functional detail

MAINSTREAM SERVICES (+/- 10%):
+8% Mainstream services attempted with documented outcomes
+6% Clear explanation why mainstream unsuitable
+4% GP Mental Health Care Plan status addressed (if applicable)
-10% No consideration of mainstream services mentioned
-8% Appears eligible for Medicare but not attempted without explanation

NDIA OPERATIONAL REALITY (+/- 10%):
+5% Request aligns with common approval patterns
+5% Clear connection to NDIS plan goals
+5% Support duration/intensity appropriate
-8% Request type historically challenging to approve
-5% Insufficient urgency for variation pathway claimed

SUPPORT APPROPRIATENESS (+/- 15%):
+10% Support clearly addresses disability-related barrier
+8% Cost reasonable for anticipated benefit
+5% Service provider availability confirmed
-10% Support request appears lifestyle rather than disability-need
-8% Cost appears excessive for stated need
-5% Unclear what problem support addresses

FINAL SCORE = 50 + Sum of adjustments (CAPPED: 0-100%)

CONFIDENCE BANDS:
85-100%: "likely_eligible" - Strong evidence, meets criteria, recommend proceeding
65-84%: "possibly_eligible" - Reasonable case, some gaps to address
45-64%: "uncertain" - Borderline, significant concerns or evidence gaps
25-44%: "unlikely_eligible" - Major issues or insufficient evidence
0-24%: "not_eligible" - Does not meet basic criteria

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RED FLAGS (Major Confidence Reducers)
═══════════════════════════════════════════════════════════════════════════════

AUTOMATIC LOW CONFIDENCE (< 40%):
• Primary driver is budget exhaustion without need change
• No recent professional evidence (> 6 months)
• Requested support clearly on Non-NDIS List without replacement justification
• Vague "would benefit" without functional basis
• No connection to disability mentioned

SIGNIFICANT CONCERN FLAGS:
• Mental health request without Medicare pathway explanation
• Therapy increase without current professional recommendation
• Equipment request without OT/professional prescription
• Personal care increase without FCA or carer breakdown evidence

═══════════════════════════════════════════════════════════════════════════════
PATHWAY DETERMINATION
═══════════════════════════════════════════════════════════════════════════════

REASSESSMENT (Section 48) - Recommend when:
• Permanent/long-term change in circumstances
• Significant change requiring new plan with new end date
• Comprehensive evidence supports changed needs

VARIATION (Section 47A) - Recommend when:
• Temporary/time-limited change (e.g., carer breakdown for 6 weeks)
• Crisis requiring immediate funding
• Short-term support need
• All variation criteria met

GATHER MORE EVIDENCE - Recommend when:
• Confidence 45-64%
• Specific evidence gaps identified
• Case could be strong with additional documentation

WAIT FOR SCHEDULED REVIEW - Recommend when:
• Minor changes that don't meet "significant" threshold
• No urgency demonstrated
• Current plan adequate with budget management

═══════════════════════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS (Enhanced Structure v2.0)
═══════════════════════════════════════════════════════════════════════════════

You MUST return a JSON object with the following structure:

{
  "confidenceScore": [0-100 integer using algorithm above],

  "confidenceBreakdown": {
    "legislativeAlignment": { "score": [0-100], "reason": "[explanation]" },
    "evidenceQuality": { "score": [0-100], "reason": "[explanation]" },
    "mainstreamServices": { "score": [0-100], "reason": "[explanation]" },
    "operationalReality": { "score": [0-100], "reason": "[explanation]" },
    "supportAppropriateness": { "score": [0-100], "reason": "[explanation]" }
  },

  "eligibilityVerdict": "likely_eligible" | "possibly_eligible" | "uncertain" | "unlikely_eligible" | "not_eligible",

  "recommendedPathway": "Plan Reassessment (Section 48)" | "Plan Variation (Section 47A)" | "Gather More Evidence" | "Wait for Scheduled Review",

  "pathwayRationale": "[2-3 sentence explanation of why this pathway is recommended]",

  "scReport": "[COMPREHENSIVE professional report for Support Coordinators - include:
    - Legislative references (Section 34, 48, 47A as applicable)
    - Evidence analysis with tier classification
    - Impairment nexus assessment
    - Mainstream services consideration
    - Strategic recommendations
    - Risk assessment
    - Timing considerations]",

  "participantReport": "[SIMPLIFIED participant-friendly explanation - use plain language, explain what this means for them, avoid jargon, be empathetic but honest, include what they need to do next]",

  "criticalIssues": ["[Array of major problems that significantly reduce approval likelihood]"],

  "strengthFactors": ["[Array of positive aspects supporting the case]"],

  "evidenceQualityScore": [0-100 based on tier analysis],

  "evidenceTierAnalysis": {
    "tier1Present": ["[List of Tier 1 evidence mentioned/provided]"],
    "tier2Present": ["[List of Tier 2 evidence mentioned/provided]"],
    "tier3Present": ["[List of Tier 3 evidence mentioned/provided]"],
    "criticalGaps": ["[Specific evidence gaps that should be addressed]"]
  },

  "evidenceSuggestions": [
    {
      "type": "[e.g., Functional Capacity Assessment, Specialist Report]",
      "description": "[What specifically is needed, from whom, and why it strengthens the case]",
      "priority": "high" | "medium" | "low",
      "tier": 1 | 2 | 3
    }
  ],

  "mainstreamServicesAssessment": {
    "considered": true | false,
    "explanation": "[Analysis of mainstream services situation]",
    "recommendations": ["[Specific actions regarding mainstream services]"]
  },

  "ndisReferences": [
    {
      "title": "[Official NDIS resource name]",
      "url": "[Actual NDIS.gov.au URL]",
      "relevance": "[Why this resource is relevant to this specific case]"
    }
  ],

  "nextSteps": [
    {
      "step": 1,
      "action": "[Specific action to take]",
      "timeline": "[When to do this - be realistic]"
    }
  ],

  "importantDisclaimers": [
    "This assessment provides guidance probability, not a guarantee of NDIA approval.",
    "NDIA delegates have discretion and individual circumstances vary.",
    "Review this assessment with your Support Coordinator before proceeding.",
    "[Add any case-specific disclaimers]"
  ]
}

═══════════════════════════════════════════════════════════════════════════════
LANGUAGE & TONE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

Use "may", "likely", "typically" rather than "will", "must", "always":
✅ "NDIA typically expects..."
❌ "NDIA will reject..."

Acknowledge NDIA discretion:
✅ "Based on common NDIA practice..."
❌ "NDIA always..."

Be realistic but constructive:
✅ "Your case has challenges but could be strengthened by..."
❌ "This will be rejected"

OFFICIAL NDIS REFERENCES TO USE:
- https://www.ndis.gov.au/participants/reviewing-your-plan/change-circumstances
- https://www.ndis.gov.au/participants/reviewing-your-plan
- https://ourguidelines.ndis.gov.au/your-plan/changing-your-plan
- https://www.ndis.gov.au/participants/using-your-plan
- https://www.ndis.gov.au/understanding/supports-funded-ndis

REMEMBER:
- You are providing guidance probability, not deterministic prediction
- NDIA delegates have discretion and practice varies
- Strong evidence can be denied; weak evidence occasionally approved
- Your role is to help make informed decisions, not guarantee outcomes
- Always acknowledge uncertainty appropriately
- Be helpful and constructive, even when identifying gaps
- Encourage Support Coordinator involvement for complex cases`;

// Helper functions
function createJsonResponse(data: object, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

function createErrorResponse(error: string, status = 400, details?: string): Response {
  return createJsonResponse({ error, ...(details && { details }) }, status);
}

function parseAssessmentResponse(text: string): CoCAssessmentResult | { error: string; message: string } {
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
    return {
      confidenceScore: 50,
      confidenceBreakdown: {
        legislativeAlignment: { score: 50, reason: 'Unable to assess - manual review required' },
        evidenceQuality: { score: 50, reason: 'Unable to assess - manual review required' },
        mainstreamServices: { score: 50, reason: 'Unable to assess - manual review required' },
        operationalReality: { score: 50, reason: 'Unable to assess - manual review required' },
        supportAppropriateness: { score: 50, reason: 'Unable to assess - manual review required' }
      },
      eligibilityVerdict: 'uncertain' as const,
      recommendedPathway: 'Gather More Evidence',
      pathwayRationale: 'Assessment could not be fully completed. Manual review by a Support Coordinator is recommended.',
      scReport: `Unable to complete structured analysis of the circumstances provided. The AI system encountered difficulties parsing the response. Manual review by a Support Coordinator is recommended.\n\nRaw Analysis:\n${text.substring(0, 2000)}`,
      participantReport: 'We were unable to fully assess your circumstances at this time. Please speak with your Support Coordinator who can review your situation manually and provide guidance on next steps.',
      criticalIssues: ['Assessment parsing failed - manual review required'],
      strengthFactors: [],
      evidenceQualityScore: 50,
      evidenceTierAnalysis: {
        tier1Present: [],
        tier2Present: [],
        tier3Present: [],
        criticalGaps: ['Unable to analyze evidence - please provide documentation for manual review']
      },
      evidenceSuggestions: [{
        type: 'Manual Review',
        description: 'Please consult with your Support Coordinator for a manual assessment',
        priority: 'high' as const,
        tier: 1 as const
      }],
      mainstreamServicesAssessment: {
        considered: false,
        explanation: 'Unable to assess mainstream services consideration',
        recommendations: ['Discuss mainstream service options with your Support Coordinator']
      },
      ndisReferences: [{
        title: 'NDIS - Change of Circumstances',
        url: 'https://www.ndis.gov.au/participants/reviewing-your-plan/change-circumstances',
        relevance: 'Official NDIS guidance on when you can request a plan review'
      }],
      nextSteps: [{
        step: 1,
        action: 'Contact your Support Coordinator to discuss your circumstances',
        timeline: 'Within the next week'
      }],
      importantDisclaimers: [
        'This assessment encountered technical difficulties and requires manual review.',
        'NDIA makes all final decisions about plan changes.',
        'Please consult with a qualified Support Coordinator for personalized guidance.'
      ]
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== CoC Eligibility Assessor Started ===");

    // Auth (requires verify_jwt = true in config.toml)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("Missing authorization header", 401);
    }

    // Extract JWT token and decode user id
    const token = authHeader.replace("Bearer ", "");
    let userId: string | undefined;
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      userId = decoded.sub;
    } catch (e) {
      console.error("Invalid token format", e);
      return createErrorResponse("Invalid token format", 401);
    }

    if (!userId) {
      return createErrorResponse("Invalid token (missing user id)", 401);
    }

    // Tier check (Premium feature)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase admin credentials not configured");
      return createErrorResponse("Server not configured", 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("User profile not found", profileError);
      return createErrorResponse("User profile not found", 404);
    }

    const tier = profile.subscription_tier as string;
    if (tier !== "premium" && tier !== "legacy_premium") {
      return createJsonResponse(
        {
          error: "Premium subscription required",
          message: "This feature is only available to Premium subscribers. Please upgrade to access.",
          tier,
        },
        403,
      );
    }

    // Parse request body
    let requestBody: CoCRequest;
    try {
      requestBody = await req.json();
      console.log("Request parsed successfully");
    } catch (parseError: unknown) {
      console.error("Failed to parse request body:", parseError);
      const message = parseError instanceof Error ? parseError.message : "Unknown error";
      return createErrorResponse("Invalid request body", 400, message);
    }

    const { circumstancesDescription, triggerCategories, documentNames, fileData, fileMimeType } = requestBody;
    console.log("Has circumstancesDescription:", !!circumstancesDescription);
    console.log("Trigger categories:", triggerCategories?.length || 0);
    console.log("Has fileData:", !!fileData);

    // Validate input
    if (!circumstancesDescription?.trim() && !fileData) {
      return createErrorResponse("Please describe the participant's circumstances or upload supporting evidence");
    }

    if (!fileData && circumstancesDescription.trim().length < 50) {
      return createErrorResponse("Please provide more detail about the circumstances (minimum 50 characters)");
    }

    // Validate API key
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured");
      return createErrorResponse("API key not configured", 500);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Get current date in Australian Eastern Time
    const australianDate = new Date().toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    // Build the prompt
    const systemPromptWithDate = COC_SYSTEM_PROMPT.replace('{{CURRENT_DATE}}', australianDate);

    const triggerContext = triggerCategories && triggerCategories.length > 0
      ? `\n\nSELECTED CIRCUMSTANCE CATEGORIES:\n${triggerCategories.map(t => `• ${t}`).join('\n')}`
      : '';

    const documentContext = documentNames && documentNames.length > 0
      ? `\n\nSUPPORTING DOCUMENTS PROVIDED:\n${documentNames.map(d => `• ${d}`).join('\n')}`
      : '';

    const userPrompt = `
═══════════════════════════════════════════════════════════════════════════════
PARTICIPANT CIRCUMSTANCES FOR ASSESSMENT
═══════════════════════════════════════════════════════════════════════════════

CIRCUMSTANCES DESCRIBED:
${circumstancesDescription}
${triggerContext}
${documentContext}

═══════════════════════════════════════════════════════════════════════════════
ASSESSMENT REQUEST (Enhanced v2.0)
═══════════════════════════════════════════════════════════════════════════════

Perform a comprehensive CoC eligibility assessment using the 2024-2025 legislative framework.

ANALYSIS STEPS:
1. CHECK FOR BUDGET EXHAUSTION LANGUAGE - If primary driver is funding running out without actual need change, apply major confidence penalty
2. ASSESS IMPAIRMENT NEXUS - Does the request clearly connect to disability-related needs (Section 34(1)(aa))?
3. EVALUATE SIGNIFICANCE - Is this a SIGNIFICANT change or minor adjustment?
4. ANALYZE EVIDENCE - Classify mentioned evidence into Tiers 1, 2, 3 and calculate evidence quality score
5. CONSIDER MAINSTREAM SERVICES - Has the participant considered/explained Medicare, public health options?
6. DETERMINE PATHWAY - Reassessment vs Variation vs Gather Evidence vs Wait

Provide your assessment in the COMPLETE JSON format including:
• Confidence score (0-100) with detailed breakdown by category
• 5-tier eligibility verdict (likely_eligible, possibly_eligible, uncertain, unlikely_eligible, not_eligible)
• Recommended pathway with rationale
• Evidence tier analysis with specific gaps identified
• Mainstream services assessment
• Comprehensive SC report with legislative references
• Participant-friendly report in plain language
• Prioritized evidence suggestions with tier classification
• Critical issues and strength factors
• NDIS reference links relevant to this specific case
• Realistic next steps with timelines
• Important disclaimers

REMEMBER:
- Apply the confidence scoring algorithm systematically
- Be constructive even when identifying gaps
- Acknowledge NDIA delegate discretion
- This is guidance probability, not certainty
- Encourage SC review before submission`;

    // Generation function
    const attemptGeneration = async (modelName: string) => {
      console.log(`Attempting with model: ${modelName}`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        }
      });

      const fullPrompt = `${systemPromptWithDate}\n\n${userPrompt}`;

      if (fileData && fileMimeType === "application/pdf") {
        console.log("Processing PDF with multimodal input");
        return model.generateContent([
          fullPrompt,
          {
            inlineData: {
              mimeType: "application/pdf",
              data: fileData
            }
          }
        ]);
      }

      console.log("Processing text content");
      return model.generateContent(fullPrompt);
    };

    // Try primary model with fallback
    let result;
    let usedModel = GEMINI_MODEL;

    try {
      result = await attemptGeneration(GEMINI_MODEL);
    } catch (modelError: unknown) {
      const message = modelError instanceof Error ? modelError.message : "Unknown error";
      console.log(`Primary model (${GEMINI_MODEL}) failed: ${message}`);
      console.log(`Falling back to ${FALLBACK_MODEL}...`);
      usedModel = FALLBACK_MODEL;
      result = await attemptGeneration(FALLBACK_MODEL);
    }

    console.log(`Successfully used model: ${usedModel}`);

    const text = result.response.text();
    console.log("Raw AI response received, length:", text.length);

    // Parse and validate response
    const assessmentResult = parseAssessmentResponse(text);

    // Check for content restriction
    if ('error' in assessmentResult && assessmentResult.error === "CONTENT_RESTRICTION") {
      console.log("Content restriction triggered");
      return createJsonResponse({
        success: false,
        error: assessmentResult.message || "This assessment tool is only for NDIS-related circumstances.",
        contentRestriction: true,
        timestamp: new Date().toISOString()
      });
    }

    // Return successful assessment
    return createJsonResponse({
      success: true,
      assessment: assessmentResult,
      modelUsed: usedModel,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error("CoC Eligibility Assessor error:", error);

    const errorObj = error instanceof Error ? error : { message: "Unknown error", name: "UnknownError" };

    return createJsonResponse({
      error: errorObj.message || "Failed to perform assessment",
      errorType: errorObj.name || "UnknownError",
      details: String(error),
      timestamp: new Date().toISOString()
    }, 500);
  }
});
