import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Robust text cleaning utility for AI-generated content
 * Removes artifacts, citations, HTML tags, and formatting issues
 */
function cleanAIResponse(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = text;

  // 1. Remove RAG citations (e.g., [1], [2], [citation], [source])
  cleaned = cleaned.replace(/\[\d+\]/g, ''); // [1], [2], etc.
  cleaned = cleaned.replace(/\[citation\]/gi, '');
  cleaned = cleaned.replace(/\[source\]/gi, '');
  cleaned = cleaned.replace(/\[source:\s*[^\]]+\]/gi, '');
  cleaned = cleaned.replace(/\[ref:\s*[^\]]+\]/gi, '');

  // 2. Remove page delimiters and page numbers
  cleaned = cleaned.replace(/---\s*PAGE\s*\d+\s*---/gi, '');
  cleaned = cleaned.replace(/Page\s+\d+\s+of\s+\d+/gi, '');
  cleaned = cleaned.replace(/Page\s+\d+/gi, '');
  cleaned = cleaned.replace(/^\s*---\s*$/gm, ''); // Standalone --- lines

  // 3. Remove HTML tags (including nested tags) - more aggressive
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  // Remove HTML entities and decode common ones
  cleaned = cleaned.replace(/&nbsp;/gi, ' ');
  cleaned = cleaned.replace(/&amp;/gi, '&');
  cleaned = cleaned.replace(/&lt;/gi, '<');
  cleaned = cleaned.replace(/&gt;/gi, '>');
  cleaned = cleaned.replace(/&quot;/gi, '"');
  cleaned = cleaned.replace(/&#39;/gi, "'");
  cleaned = cleaned.replace(/&[a-z0-9#]+;/gi, ' '); // Catch any remaining entities

  // 4. Remove timestamps and generation metadata
  cleaned = cleaned.replace(/Generated\s+on\s+[\d\s,:-]+/gi, '');
  cleaned = cleaned.replace(/Created\s+on\s+[\d\s,:-]+/gi, '');
  cleaned = cleaned.replace(/Date:\s*[\d\s,:-]+/gi, '');
  cleaned = cleaned.replace(/Timestamp:\s*[\d\s,:-]+/gi, '');

  // 5. Remove markdown table artifacts (isolated | characters and separators)
  // Remove lines with only | characters
  cleaned = cleaned.replace(/^\s*\|+\s*$/gm, '');
  // Remove three or more consecutive |
  cleaned = cleaned.replace(/\|{3,}/g, '');
  // Remove table separators (|---|---|, :--- :--- :---, etc.)
  cleaned = cleaned.replace(/^\s*\|[\s\-|:]+\|\s*$/gm, ''); // Standard markdown table separator
  cleaned = cleaned.replace(/^\s*:[\s\-:]+:\s*$/gm, ''); // Colon-based separators
  cleaned = cleaned.replace(/:\s*---\s*:\s*---\s*:\s*---/g, ''); // Specific pattern ":--- :--- :---"
  cleaned = cleaned.replace(/:\s*---\s*/g, ''); // Single ":---" patterns
  cleaned = cleaned.replace(/\s*:---\s*:---\s*:---\s*/g, ''); // Pattern with spaces
  // Remove single | characters that aren't part of proper tables (simplified regex for Deno compatibility)
  cleaned = cleaned.replace(/\s+\|\s+/g, ' '); // Spaces around single |
  cleaned = cleaned.replace(/\|\s+/g, ''); // Leading |
  cleaned = cleaned.replace(/\s+\|/g, ''); // Trailing |

  // 6. Remove markdown code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`[^`]+`/g, ''); // Inline code

  // 7. Remove markdown formatting artifacts
  cleaned = cleaned.replace(/\*\*\*/g, ''); // Bold italic markers
  cleaned = cleaned.replace(/\*\*/g, ''); // Bold markers
  // Remove single asterisks (simplified for Deno compatibility)
  cleaned = cleaned.replace(/(^|\s)\*(\s|$)/g, '$1$2'); // Single * with spaces
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, ''); // Markdown headers

  // 8. Remove excessive whitespace and normalize
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  cleaned = cleaned.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  cleaned = cleaned.replace(/^\s+|\s+$/gm, ''); // Trim each line

  // 9. Remove common AI artifacts
  cleaned = cleaned.replace(/^Note:\s*/gim, '');
  cleaned = cleaned.replace(/^Important:\s*/gim, '');
  cleaned = cleaned.replace(/^Disclaimer:\s*/gim, '');
  cleaned = cleaned.replace(/^AI\s+Generated\s+Content/gi, '');
  cleaned = cleaned.replace(/^This\s+content\s+was\s+generated\s+by/gi, '');

  // 10. Remove citation patterns (various formats)
  cleaned = cleaned.replace(/\(Source:\s*[^)]+\)/gi, '');
  cleaned = cleaned.replace(/\(Ref:\s*[^)]+\)/gi, '');
  cleaned = cleaned.replace(/\(See:\s*[^)]+\)/gi, '');
  cleaned = cleaned.replace(/\(Citation:\s*[^)]+\)/gi, '');

  // 11. Remove URL patterns that might be artifacts
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, ''); // Full URLs
  cleaned = cleaned.replace(/www\.[^\s]+/g, ''); // www URLs

  // 12. Remove special character artifacts and normalize
  cleaned = cleaned.replace(/[•·▪▫◦‣⁃]/g, ' '); // Various bullet points
  cleaned = cleaned.replace(/[–—―]/g, '-'); // Various dashes to standard hyphen
  cleaned = cleaned.replace(/[""]/g, '"'); // Smart quotes to standard quotes
  cleaned = cleaned.replace(/['']/g, "'"); // Smart apostrophes to standard apostrophe
  // Remove other special characters but keep essential punctuation
  cleaned = cleaned.replace(/[^\w\s\-.,;:!?()'"\/]/g, ' ');

  // 13. Improve paragraph detection and spacing
  // Detect natural paragraph breaks (sentences ending with periods, exclamation, question marks)
  // Add paragraph breaks after sentences that end paragraphs
  cleaned = cleaned.replace(/\.\s+([A-Z][a-z])/g, '.\n\n$1'); // Period followed by capital letter = new paragraph
  cleaned = cleaned.replace(/\?\s+([A-Z][a-z])/g, '?\n\n$1'); // Question mark followed by capital = new paragraph
  cleaned = cleaned.replace(/!\s+([A-Z][a-z])/g, '!\n\n$1'); // Exclamation followed by capital = new paragraph
  
  // Clean up paragraph breaks (normalize to double newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Multiple blank lines to double
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n'); // Multiple blank lines with spaces to double

  // 14. Final trim and cleanup
  cleaned = cleaned.trim();
  
  // Remove any remaining artifacts at start/end
  cleaned = cleaned.replace(/^[^\w]*/, ''); // Remove leading non-word chars
  cleaned = cleaned.replace(/[^\w]*$/, ''); // Remove trailing non-word chars
  cleaned = cleaned.trim();

  return cleaned;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JustificationRequest {
  // Participant Details
  participantName: string;
  ndisNumber: string;
  dateOfBirth: string;
  planStartDate: string;
  planEndDate: string;
  scName: string;
  scOrganisation: string;
  ndisProviderName?: string;
  
  // AT Item Details
  itemName: string;
  itemCategory: string;
  requestedAmount: number;
  isReplacement: boolean;
  brokenItemDescription?: string;
  isLowRisk: boolean;
  trialRequired: boolean;
  
  // Functional Need
  functionalImpairments: string[];
  currentBarriers: string;
  standardDevicesInsufficient: string;
  dailyLivingImpact: string;
  safetyImpact?: string;
  
  // Goals
  participantGoals: string;
  goalAlignment: string;
  capacityBuildingImpact?: string;
  
  // Quotes & Procurement
  supplierName: string;
  quoteAmount: number;
  quoteFileUrl?: string;
  deliveryTimeline?: string;
  scSetupSupport?: string;
  
  // Additional
  therapistEndorsement: boolean;
  therapistNoteUrl?: string;
  riskAssessmentNotes?: string;
  additionalContext?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Get authorization header (required when verify_jwt = true)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT to get user ID (when verify_jwt = true, token is already validated)
    let userId: string;
    try {
      // JWT format: header.payload.signature
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      userId = decoded.sub; // 'sub' contains the user ID
      
      if (!userId) {
        throw new Error('User ID not found in token');
      }
    } catch (decodeError) {
      console.error('Error decoding JWT:', decodeError);
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking tier for user: ${userId}`);

    // Create admin client with service role key to query profiles (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check user's subscription tier (using admin client to bypass RLS)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tier = profile.subscription_tier;
    console.log(`User tier: ${tier}`);

    // Only allow premium and legacy_premium users
    if (tier !== 'premium' && tier !== 'legacy_premium') {
      console.log(`Access denied for tier: ${tier}`);
      return new Response(
        JSON.stringify({ 
          error: 'Premium subscription required',
          message: 'This feature is only available to Premium subscribers. Please upgrade to access.',
          tier: tier
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gemini API key
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const requestData: JustificationRequest = await req.json();

    // Validate required fields
    if (!requestData.participantName || !requestData.ndisNumber || !requestData.itemName || 
        !requestData.itemCategory || !requestData.participantGoals || !requestData.goalAlignment) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating LC-AT justification for:', requestData.participantName);

    // Build comprehensive LC-AT system prompt
    const systemPrompt = `You are an experienced NDIS Support Coordinator Level 2/3 creating a fully compliant Low-Cost Assistive Technology justification report for a plan variation.

Your Output: A structured, audit-ready justification that meets all NDIS Low-Cost AT, Reasonable & Necessary criteria, and plan variation requirements.

MASTER RULE-SET (Global AT Justification Logic):

A. Follow NDIS Low-Cost Assistive Technology rules:
   - LC-AT <$1,500 each (simple/new items)
   - LC-AT <$5,000 (replacement of previously funded device)
   - Must be low-risk, off-the-shelf, no trial required unless risk exists
   - SC can provide justification for low-risk AT
   - Therapist endorsement optional but preferred

B. Use Reasonable & Necessary criteria mapping:
   Every justification must explicitly address:
   - Pursues participant goals
   - Supports daily living
   - Social/economic participation
   - Value for money
   - Effective & beneficial
   - Uses informal support appropriately
   - Most appropriate funding body

C. Use NDIS plan variation template wording style:
   - Straight, factual, outcome-focused
   - Professional but easy to read
   - No jargon unless necessary
   - Explicitly reference LC-AT guidelines
   - Explicitly reference Plan Variation rules
   - Always explain consequences of NOT funding
   - Always justify why requested item is most appropriate

REQUIRED PDF STRUCTURE (MANDATORY SECTIONS - Output in this exact order):

SECTION 1: Summary of Request
- The exact item being requested
- Cost
- Whether it's new or replacement
- Whether it fits LC-AT low-risk classification
- Whether a trial is required

SECTION 2: Participant Goals
- List relevant goals from plan
- Link each goal to the AT need

SECTION 3: Functional Need / Barriers
- Functional impairments (cognitive, psychosocial, physical, sensory)
- How current barriers prevent daily living
- Why standard devices are insufficient

SECTION 4: Item Justification (Why this AT?)
- Specific reasons (e.g., banking, budgeting, communication, therapy apps, independence, safety)
- How this AT addresses identified needs

SECTION 5: Value for Money Assessment
- Compare alternatives
- Funding categories
- Cost-effectiveness analysis

SECTION 6: Risk Assessment
- Low-risk AT classification
- No trial required (or trial justification if required)
- Safe to use independently

SECTION 7: Quotes & Procurement Pathway
- Supplier
- Price
- Delivery timeline
- How SC will support setup

SECTION 8: Reasonable & Necessary Criteria Mapping
Address ALL 7 criteria explicitly:
- Pursues participant goals
- Supports daily living
- Social/economic participation
- Value for money
- Effective & beneficial
- Uses informal support appropriately
- Most appropriate funding body

SECTION 9: Daily Living Impact
- How AT supports activities of daily living
- Specific examples of use

SECTION 10: Social & Economic Participation Impact
- How AT enables participation
- Economic benefits

SECTION 11: Support Coordinator Professional Statement
Short paragraph summarising:
- Why this AT is needed now
- Why a plan variation is appropriate
- Why delaying is harmful
- Why LC-AT guidelines support approval

OUTPUT QUALITY RULES:
- Write in SC professional tone
- Avoid medical advice
- Avoid diagnosing
- Use NDIS language
- Be clear, structured, and audit-proof
- Produce a single consolidated justification
- Auto-generate R&N mapping
- Auto-integrate plan goals
- Use bullet points (-) or numbered lists for structured data, NOT markdown tables
- Add double line breaks (\n\n) after each "SECTION X:" header before content
- Do NOT use backticks, code blocks, or markdown formatting

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY plain text with section markers: "SECTION 1:", "SECTION 2:", etc.
- Do NOT include citations, references, or source tags
- Do NOT include page delimiters, page numbers, or document metadata
- Do NOT include timestamps or generation dates
- Do NOT include markdown table syntax, pipe characters (|), or table separators
- Do NOT include HTML tags or markdown code blocks (no backticks ` `)
- Do NOT use markdown tables - use bullet points (-) or numbered lists instead
- Use only standard paragraph breaks (double line breaks between sections)
- After each "SECTION X:" header, add a double line break before the content
- Write in clean, professional prose suitable for official NDIS documentation
- Ensure the output is ready for direct use in PDF or Word documents without additional cleaning`;

    // Build comprehensive user prompt from request data
    let userPrompt = `Create a comprehensive Low-Cost Assistive Technology justification for the following NDIS plan variation request:

PARTICIPANT DETAILS:
- Full Name: ${requestData.participantName}
- NDIS Number: ${requestData.ndisNumber}
- Date of Birth: ${requestData.dateOfBirth}
- Plan Dates: ${requestData.planStartDate} to ${requestData.planEndDate}
- Support Coordinator: ${requestData.scName}
- SC Organisation: ${requestData.scOrganisation}
${requestData.ndisProviderName ? `- NDIS Provider: ${requestData.ndisProviderName}` : ''}

AT ITEM DETAILS:
- Item Name/Description: ${requestData.itemName}
- Category: ${requestData.itemCategory}
- Requested Amount: $${requestData.requestedAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
- Is Replacement: ${requestData.isReplacement ? 'Yes' : 'No'}
${requestData.isReplacement && requestData.brokenItemDescription ? `- Broken Item Description: ${requestData.brokenItemDescription}` : ''}
- Low-Risk Classification: ${requestData.isLowRisk ? 'Yes' : 'No'}
- Trial Required: ${requestData.trialRequired ? 'Yes' : 'No'}

FUNCTIONAL NEED & BARRIERS:
- Functional Impairments: ${requestData.functionalImpairments.join(', ')}
- Current Barriers: ${requestData.currentBarriers}
- Why Standard Devices Insufficient: ${requestData.standardDevicesInsufficient}
- Daily Living Impact: ${requestData.dailyLivingImpact}
${requestData.safetyImpact ? `- Safety Impact: ${requestData.safetyImpact}` : ''}

PARTICIPANT GOALS & ALIGNMENT:
- Participant Goals: ${requestData.participantGoals}
- How AT Links to Goals: ${requestData.goalAlignment}
${requestData.capacityBuildingImpact ? `- Capacity Building Impact: ${requestData.capacityBuildingImpact}` : ''}

QUOTES & PROCUREMENT:
- Supplier Name: ${requestData.supplierName}
- Quote Amount: $${requestData.quoteAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
${requestData.deliveryTimeline ? `- Delivery Timeline: ${requestData.deliveryTimeline}` : ''}
${requestData.scSetupSupport ? `- SC Setup Support: ${requestData.scSetupSupport}` : ''}

ADDITIONAL INFORMATION:
- Therapist Endorsement: ${requestData.therapistEndorsement ? 'Yes' : 'No'}
${requestData.riskAssessmentNotes ? `- Risk Assessment Notes: ${requestData.riskAssessmentNotes}` : ''}
${requestData.additionalContext ? `- Additional Context: ${requestData.additionalContext}` : ''}

Generate a complete justification following the 11-section structure outlined in the system prompt. Ensure all sections are clearly marked with "SECTION 1:", "SECTION 2:", etc. Address all 7 Reasonable & Necessary criteria explicitly in SECTION 8.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: userPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096, // Increased for comprehensive 11-section output
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    let justificationText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!justificationText) {
      console.error('No text in Gemini response:', geminiData);
      return new Response(
        JSON.stringify({ error: 'Invalid response from AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the AI response to remove artifacts
    justificationText = cleanAIResponse(justificationText);

    console.log('Justification generated and cleaned successfully');

    return new Response(
      JSON.stringify({
        success: true,
        justification: justificationText,
        participantName: requestData.participantName,
        supportType: requestData.itemCategory,
        generatedAt: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error processing justification request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Provide more specific error messages
    let statusCode = 500;
    let userMessage = errorMessage;
    
    if (errorMessage.includes('GEMINI_API_KEY')) {
      userMessage = 'AI service not configured. Please contact support.';
      statusCode = 500;
    } else if (errorMessage.includes('SERVICE_ROLE_KEY')) {
      userMessage = 'Server configuration error. Please contact support.';
      statusCode = 500;
    } else if (errorMessage.includes('Invalid token')) {
      userMessage = 'Authentication error. Please try logging in again.';
      statusCode = 401;
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: userMessage,
        // Include error details for debugging (can be removed in production if needed)
        details: errorMessage,
        stack: errorStack
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

