import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CoCRequest {
  reportText: string;
  scLevel: 2 | 3;
}

// Model configuration - using Gemini 2.0 Flash for speed
const GEMINI_MODEL = "gemini-2.5-flash";

// System prompt for CoC Cover Letter generation from SC report
const COC_SYSTEM_PROMPT = `You are a SENIOR EXPERT NDIS Support Coordinator with 10+ years of experience. You operate at both Level 2 (Support Coordination) and Level 3 (Specialist Support Coordination) depending on case complexity. You are creating a Change of Circumstances (CoC) Cover Letter based on your Plan Reassessment or End of Plan Report.

YOUR PROFESSIONAL IDENTITY:
- You are the Support Coordinator who has been working closely with this participant
- You have detailed knowledge of their situation from your direct involvement
- You write in first person from your professional perspective
- Your cover letter demonstrates your expertise and advocacy for the participant
- You write professionally for NDIA planners who need clear, concise, evidence-based information

CRITICAL WRITING RULES:
1. ONLY use information that is EXPLICITLY stated in the uploaded report
2. Do NOT invent or assume details not present in the document
3. Use ONLY standard ASCII characters - NO special Unicode characters, arrows, bullets, or symbols
4. Use simple hyphens (-) for lists, NOT bullet points or arrows
5. Keep all text concise and easy to read for planners
6. Use Australian English spelling (organisation, behaviour, colour)
7. Write in flowing paragraphs, not excessive bullet points

YOUR TASK:
Analyze the provided Support Coordinator progress report or end-of-plan report and extract comprehensive information for a CoC Cover Letter. Transform the clinical/professional language into a persuasive, evidence-based cover letter format that is easy for an NDIA planner to review and understand.

EXTRACTION REQUIREMENTS:

1. PARTICIPANT DETAILS
   - Extract ONLY details explicitly stated: full name, DOB, NDIS number, address, contact details
   - If not found, use empty string ""

2. PLAN DETAILS
   - Current plan start and end dates (extract from report)
   - Reporting period as stated

3. OVERVIEW/SUMMARY
   - Synthesize a compelling 2-3 paragraph overview explaining:
     - Why this CoC is being submitted
     - Key changes since the current plan commenced
     - Urgency/importance of the request
   - Write from Senior SC professional perspective
   - Reference ONLY facts from the report

4. KEY CHANGES IN CIRCUMSTANCES
   - Identify 3-5 critical changes MENTIONED in the report
   - For each change: provide title and detailed description
   - Focus on: health deterioration, housing issues, carer breakdown, new diagnoses, increased functional limitations, safety concerns, service gaps
   - Use ONLY information from the report

5. CLINICAL EVIDENCE
   - Extract ONLY clinical assessments mentioned (WHODAS, Barthel, K10, etc.)
   - Include scores and interpretations AS STATED in report
   - Do NOT invent assessment scores

6. SUPPORT COORDINATION REQUEST
   - Current SC hours vs. recommended hours (if stated)
   - Key activities requiring SC support (from report)
   - Rationale for any increase/continuation

7. ANTICIPATED QUESTIONS AND RESPONSES
   - Generate 3-5 anticipated NDIA planner questions
   - Provide professional responses based ONLY on report content
   - Questions should address common NDIA concerns:
     - Why is this change necessary?
     - Have mainstream services been considered?
     - What evidence supports this request?
     - Why is the requested intensity appropriate?

8. DOCUMENTS
   - List documents mentioned in the report
   - Identify any progressive evidence to follow

9. CLOSING STATEMENT
   - Professional closing statement
   - Key priority reasons for timely processing

OUTPUT FORMAT - STRICT JSON:

{
  "participant": {
    "name": "string (full name from report, or empty)",
    "dateOfBirth": "string (DD/MM/YYYY from report, or empty)",
    "ndisNumber": "string (from report, or empty)",
    "address": "string (from report, or empty)",
    "email": "string (from report, or empty)",
    "phone": "string (from report, or empty)"
  },
  "plan": {
    "startDate": "string (DD/MM/YYYY from report, or empty)",
    "endDate": "string (DD/MM/YYYY from report, or empty)",
    "reportingPeriod": "string (e.g., Current Plan 01/01/2025 - 31/12/2025)"
  },
  "overview": {
    "summaryText": "string (2-3 paragraph compelling overview based on report facts)"
  },
  "keyChanges": [
    {
      "title": "string (e.g., Deteriorating Mental Health)",
      "description": "string (detailed description with evidence from report)"
    }
  ],
  "clinicalEvidence": {
    "introText": "string (introduction to clinical evidence)",
    "assessments": [
      {
        "measure": "string (e.g., WHODAS 2.0)",
        "score": "string (e.g., 87/100)",
        "interpretation": "string (e.g., Severe functional limitation)"
      }
    ],
    "conclusionText": "string (clinical conclusion based on report)"
  },
  "scRequest": {
    "introText": "string (introduction to SC request)",
    "comparison": {
      "currentLevel": "string (e.g., Level 2)",
      "recommendedLevel": "string",
      "currentHoursAnnual": "string",
      "recommendedHoursAnnual": "string",
      "currentHoursMonthly": "string",
      "recommendedHoursMonthly": "string"
    },
    "activitiesIntro": "string (introduction to SC activities)",
    "activities": [
      {
        "area": "string (e.g., Crisis Management)",
        "description": "string (detailed description from report)"
      }
    ]
  },
  "anticipatedQuestions": [
    {
      "question": "string (anticipated NDIA question)",
      "response": "string (professional response using report evidence)"
    }
  ],
  "documents": {
    "included": [
      {
        "name": "string",
        "date": "string",
        "pages": "string"
      }
    ],
    "progressive": [
      {
        "name": "string",
        "expectedDate": "string"
      }
    ],
    "progressiveNote": "string or empty"
  },
  "closing": {
    "statementText": "string (professional closing statement)",
    "priorityReasons": ["string (reason 1)", "string (reason 2)"]
  }
}

CRITICAL REMINDERS:
- Return ONLY valid JSON with no markdown formatting or code blocks
- Use ONLY standard ASCII characters - no special symbols, arrows, or Unicode
- Ensure all dates are in Australian DD/MM/YYYY format
- Extract ONLY information present in the uploaded report
- If information is not in the report, leave the field empty or write "Not specified in report"
- Make the overview compelling and persuasive while being factually accurate
- Write professionally for NDIA planners - clear, concise, evidence-based`;

function createJsonResponse(data: object, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

// Parse JSON from Gemini response, handling potential formatting issues
function parseGeminiResponse(text: string): object {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Clean the response - remove markdown code blocks if present
    let cleanJson = text.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    // Try to find JSON object in the text
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error("Could not parse response as JSON");
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return createJsonResponse({ error: "API key not configured" }, 500);
    }

    const { reportText, scLevel }: CoCRequest = await req.json();

    if (!reportText || reportText.trim().length < 100) {
      return createJsonResponse({
        error: "Report text is required and must contain substantial content"
      }, 400);
    }

    console.log(`Processing CoC Cover Letter generation...`);
    console.log(`Report text length: ${reportText.length}`);
    console.log(`SC Level: ${scLevel || 2}`);

    // Build the prompt
    const userPrompt = `═══════════════════════════════════════════════════════════════════════════════
SUPPORT COORDINATOR REPORT TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

${reportText}

═══════════════════════════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════════════════════════

Analyze the Support Coordinator report above and extract/generate comprehensive CoC Cover Letter data.

Write from the perspective of a Level ${scLevel || 2} Support Coordinator.

Return ONLY the JSON object with all required fields populated. Be thorough and persuasive.`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: COC_SYSTEM_PROMPT },
                { text: userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return createJsonResponse({
        error: `AI processing failed: ${response.status}`,
        details: errorText
      }, 500);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error("No generated text in response:", JSON.stringify(data));
      return createJsonResponse({
        error: "No content generated from AI"
      }, 500);
    }

    console.log("Raw Gemini response length:", generatedText.length);

    // Parse the response
    let coverLetterData;
    try {
      coverLetterData = parseGeminiResponse(generatedText);
      console.log("Successfully parsed cover letter data");
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.error("Raw response:", generatedText.substring(0, 1000));
      return createJsonResponse({
        error: "Failed to parse AI response",
        rawResponse: generatedText.substring(0, 500)
      }, 500);
    }

    return createJsonResponse({
      success: true,
      coverLetterData,
      model: GEMINI_MODEL
    });

  } catch (error) {
    console.error("Error in coc-cover-letter-generator:", error);
    return createJsonResponse({
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString()
    }, 500);
  }
});
