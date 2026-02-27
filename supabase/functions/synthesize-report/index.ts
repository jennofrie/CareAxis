import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SynthesisRequest {
  reportText?: string;
  reportTexts?: string; // For backward compatibility
  coordinatorNotes?: string;
  reportingInstructions?: string; // For backward compatibility
  selectedModel?: string; // Kept for backward compatibility - always uses Gemini 2.5 Pro
}

// Template-friendly flat structure for docxtemplater
interface TemplateData {
  participant_name: string;
  ndis_number: string;
  date_of_birth: string;
  report_type: string;
  assessment_date: string;
  provider: string;
  professional_name: string;
  functional_capacity: string;
  strengths: string;
  challenges: string;
  impact_on_daily_life: string;
  risks: string;
  mitigation_strategies: string;
  recommended_supports: string;
  frequency: string;
  duration: string;
  goals: string;
  summary: string;
}

// Call Gemini 2.5 Pro API
async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  needsSynthesis: boolean
): Promise<{ success: boolean; text?: string; error?: string }> {
  const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    console.log(`Calling Gemini with model: ${model}`);
    const startTime = Date.now();

    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: userContent }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 16384,
          responseMimeType: needsSynthesis ? 'text/plain' : 'application/json'
        }
      }),
    });

    const elapsed = Date.now() - startTime;
    console.log(`Gemini response received in ${elapsed}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return { success: false, error: `Gemini API error: ${response.status}` };
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('No generated text in Gemini response');
      return { success: false, error: 'No content generated from Gemini' };
    }

    console.log(`Gemini generated ${generatedText.length} characters`);
    return { success: true, text: generatedText };
  } catch (error) {
    console.error('Gemini call failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown Gemini error' };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const requestData: SynthesisRequest = await req.json();

    // Handle both old and new parameter names for backward compatibility
    const reportText = requestData.reportText || requestData.reportTexts;
    const coordinatorNotes = requestData.coordinatorNotes || requestData.reportingInstructions;

    if (!reportText) {
      return new Response(
        JSON.stringify({ error: 'Report text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing report synthesis request...');
    console.log('Report text length:', reportText.length);
    console.log('Coordinator notes length:', coordinatorNotes?.length || 0);
    console.log('Using model: gemini-2.5-pro');

    // Build the system prompt based on whether we need structured data or synthesized text
    // Check if coordinatorNotes contains synthesis instructions (indicating we need a full report)
    const needsSynthesis = coordinatorNotes && coordinatorNotes.length > 100 && 
                          (coordinatorNotes.includes('synthesize') || coordinatorNotes.includes('summary') || 
                           coordinatorNotes.includes('comprehensive') || coordinatorNotes.includes('format'));

    let systemPrompt: string;
    let userContent: string;

    if (needsSynthesis) {
      // Generate a synthesized report based on instructions
      systemPrompt = `You are an expert NDIS Support Coordinator with 10+ years of experience analyzing allied health reports and synthesizing comprehensive NDIS documentation. You have deep knowledge of Section 34 "Reasonable and Necessary" criteria, NDIS Practice Standards, and current PACE operational guidelines.

═══════════════════════════════════════════════════════════════════════════════
CORE SYNTHESIS PRINCIPLES
═══════════════════════════════════════════════════════════════════════════════

YOUR TASK: Analyze allied health reports and create a professional NDIS synthesis report that TRANSLATES clinical findings into NDIS-fundable evidence.

CRITICAL TRANSLATION PROCESS:
1. Extract clinical findings from OT, Physio, Psychology, and medical reports
2. Translate medical/clinical language into FUNCTIONAL IMPACT language
3. Connect every finding to how it affects daily living, participation, and goals
4. Ensure every recommendation has a clear NEXUS: impairment → need → support → outcome

═══════════════════════════════════════════════════════════════════════════════
WRITING STYLE — MANDATORY REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

VOICE:
- Write in first-person as the professional specified in the instructions
- Sound like a real human professional writing their own report
- Use natural language with professional authority
- Be specific — reference actual details from the attached reports

ABSOLUTELY PROHIBITED:
- NO asterisks (*) for bullet points
- NO markdown formatting (**, ##, -, etc.)
- NO generic AI phrases ("As an AI...", "I don't have access to...")
- NO filler phrases ("It is important to note...", "In conclusion...")

FORMATTING:
- Use numbered lists (1. 2. 3.) when listing items
- Use clear section headings
- Write in flowing paragraphs, not bullet-point lists
- Keep Australian English spelling (organise, behaviour, programme)

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE-BASED DOCUMENTATION
═══════════════════════════════════════════════════════════════════════════════

For each recommendation, ensure (woven naturally, not labelled):
- Evidence from allied health reports supporting the need
- Functional impact on daily living/participation
- Why this intensity/frequency is appropriate (not more, not less)
- Connection to participant's stated NDIS goals
- Why NDIS is the appropriate funder (not Health/Education/mainstream)

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return the complete synthesized report as PLAIN TEXT:
- Use clear section headings (just text, no special formatting)
- Write naturally flowing content under each heading
- Do NOT wrap in JSON or code blocks
- Do NOT use markdown syntax
- Ensure every section is substantive and complete`;

      userContent = `═══════════════════════════════════════════════════════════════════════════════
ALLIED HEALTH REPORTS TO SYNTHESIZE
═══════════════════════════════════════════════════════════════════════════════

${reportText}

═══════════════════════════════════════════════════════════════════════════════
SYNTHESIS INSTRUCTIONS (FOLLOW EXACTLY)
═══════════════════════════════════════════════════════════════════════════════

${coordinatorNotes || 'Please synthesize into a comprehensive NDIS summary report.'}

═══════════════════════════════════════════════════════════════════════════════

Analyze the reports above and create a comprehensive NDIS synthesis report following the exact structure and professional voice specified in the instructions. Remember: write as the professional specified, NOT as an AI.`;
    } else {
      // Extract structured data for template (original functionality)
      systemPrompt = `You are an expert NDIS Support Coordinator. Analyze the attached allied health report text. Extract all relevant information.

CRITICAL: Return the result as a JSON object with these EXACT keys (use underscores, not camelCase). This is for filling a Word document template:

{
  "participant_name": "string (extract from report or 'Not specified')",
  "ndis_number": "string (extract from report or 'Not specified')",
  "date_of_birth": "string (extract from report or 'Not specified')",
  "report_type": "string (e.g., 'Occupational Therapy Assessment', 'Physiotherapy Report')",
  "assessment_date": "string (the date of assessment)",
  "provider": "string (organization/clinic name)",
  "professional_name": "string (name of the assessing professional)",
  "functional_capacity": "string (detailed summary of current functional level - 2-3 paragraphs)",
  "strengths": "string (bullet-point list of identified strengths, each on new line starting with •)",
  "challenges": "string (bullet-point list of challenges/limitations, each on new line starting with •)",
  "impact_on_daily_life": "string (how limitations affect daily activities - 1-2 paragraphs)",
  "risks": "string (bullet-point list of identified risks, each on new line starting with •)",
  "mitigation_strategies": "string (bullet-point list of risk mitigation strategies, each on new line starting with •)",
  "recommended_supports": "string (bullet-point list of recommended supports/services, each on new line starting with •)",
  "frequency": "string (recommended frequency of supports)",
  "duration": "string (recommended duration of supports)",
  "goals": "string (bullet-point list of suggested goals, each on new line starting with •)",
  "summary": "string (comprehensive 3-4 paragraph coordinator summary incorporating any coordinator notes provided)"
}

Be thorough and professional. Format multi-item fields as bullet points with • character. If information is not found, write 'Not specified'.
Do NOT include any markdown code blocks or formatting - return pure JSON only.`;

      userContent = `Allied Health Report Text:
${reportText}

${coordinatorNotes ? `Support Coordinator's Additional Notes and Context:
${coordinatorNotes}` : ''}

Please analyze this report and extract the structured information as specified. Remember to return ONLY valid JSON with the exact keys specified.`;
    }

    // Execute Gemini 2.5 Pro call
    console.log('Using Gemini 2.5 Pro');

    const geminiResult = await callGemini(
      GEMINI_API_KEY,
      'gemini-2.5-pro',
      systemPrompt,
      userContent,
      needsSynthesis
    );

    if (!geminiResult.success || !geminiResult.text) {
      throw new Error(`Gemini API failed: ${geminiResult.error}`);
    }

    const generatedText = geminiResult.text;
    console.log('Gemini synthesis successful');
    console.log('Raw response length:', generatedText.length);
    console.log('First 500 chars:', generatedText.substring(0, 500));

    // Handle different response types
    if (needsSynthesis) {
      // Return synthesized text report
      const synthesizedText = generatedText.trim();
      console.log('Report synthesis completed successfully (synthesized text)');

      return new Response(
        JSON.stringify({
          synthesizedText,
          model: 'gemini-2.5-pro',
          usedFallback: false,
          requestedModel: 'gemini-pro',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Parse the JSON response for structured data
      let templateData: TemplateData;
      try {
        // Clean the response - remove any markdown code blocks if present
        let cleanJson = generatedText.trim();
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

        templateData = JSON.parse(cleanJson);
        console.log('Successfully parsed templateData with keys:', Object.keys(templateData));
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', generatedText);
        throw new Error('Failed to parse AI response as JSON');
      }

      console.log('Report synthesis completed successfully (structured data)');

      return new Response(
        JSON.stringify({
          templateData,
          model: 'gemini-2.5-pro',
          usedFallback: false,
          requestedModel: 'gemini-pro',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in synthesize-report function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
